"""Smoke test of M14 hardening: attachments, 503 on database outage, (later sections: rate limits, password policy, seals).

Run against a fresh backend of the M14 worktree:
  SMOKE_PORT=8084 SMOKE_DB=iitsm_m14 SMOKE_DB_CONTAINER=iitsm-m14-db python -I -X utf8 m14_smoke.py
SMOKE_DB_CONTAINER is the Postgres container to run psql in and to STOP briefly for the 503 check: it must be a
throwaway container, never the shared iitsm-db. Set SMOKE_SKIP_OUTAGE=1 to skip the outage check.
"""
import atexit
import io
import json
import os
import secrets
import subprocess
import time
import urllib.error
import urllib.request
import uuid

PORT = os.environ.get("SMOKE_PORT", "8084")
DB = os.environ.get("SMOKE_DB", "iitsm_m14")
CONTAINER = os.environ.get("SMOKE_DB_CONTAINER", "iitsm-m14-db")
BASE = f"http://localhost:{PORT}/api/v1"
RUN = secrets.token_hex(3)
PW = "Smoke" + secrets.token_hex(4) + "9"
results = []


@atexit.register
def report_results():
    for status, name, detail in results:
        print(f"{status}  {name}" + (f"   -> {detail}" if status == "FAIL" else ""))
    print(f"\n{sum(r[0] == 'PASS' for r in results)}/{len(results)} passed")


def raw_call(method, path, data=None, headers=None, token=None):
    req = urllib.request.Request(BASE + path, data=data, method=method)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)


def call(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    s, raw, _ = raw_call(method, path, data, {"Content-Type": "application/json"}, token)
    try:
        return s, (json.loads(raw) if raw else None)
    except json.JSONDecodeError:
        return s, raw


def upload(inc_id, name, content, token, ctype="application/octet-stream", field="file"):
    boundary = "----m14" + uuid.uuid4().hex
    body = io.BytesIO()
    body.write(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{field}\"; filename=\"{name}\"\r\n"
               f"Content-Type: {ctype}\r\n\r\n".encode())
    body.write(content)
    body.write(f"\r\n--{boundary}--\r\n".encode())
    s, raw, h = raw_call("POST", f"/incidents/{inc_id}/attachments", body.getvalue(),
                         {"Content-Type": "multipart/form-data; boundary=" + boundary}, token)
    try:
        return s, json.loads(raw) if raw else None
    except json.JSONDecodeError:
        return s, raw


def check(name, ok, detail=""):
    results.append(("PASS" if ok else "FAIL", name, detail))


def sql(statement):
    out = subprocess.run(["docker", "exec", CONTAINER, "psql", "-U", "iitsm", "-d", DB, "-tAc", statement],
                         capture_output=True, text=True)
    return out.stdout.strip() or out.stderr.strip()


def login(email, password=PW):
    s, b = call("POST", "/auth/login", {"email": email, "password": password})
    return b["accessToken"] if s == 200 else None


def mail(tag):
    return f"{tag}.{RUN}@iitsm.demo"


def fields(b):
    return [f["field"] for f in (b or {}).get("fieldErrors", [])] if isinstance(b, dict) else []


PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
PDF = b"%PDF-1.4\n" + b"1 0 obj\n<<>>\nendobj\n" * 3
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
GIF = b"GIF89a" + b"\x00" * 32

# ---------------------------------------------------------------- setup
call("POST", "/auth/register", {"name": "Root Admin", "email": mail("root"), "password": PW})
root_id = int(sql(f"select id from users where email='{mail('root')}'"))
sql(f"insert into user_roles(user_id, role_type, granted_at) values ({root_id}, 'ADMINISTRATOR', now())")
sql(f"insert into administrator_profiles(user_id, scope) values ({root_id}, 'SYSTEM_ADMIN')")
A = login(mail("root"))
skill = call("POST", "/admin/skills", {"name": f"M14-{RUN}"}, token=A)[1]["id"]
svc = call("POST", "/admin/services", {"name": f"M14Svc-{RUN}", "criticality": 2, "alwaysP1": False}, token=A)[1]["id"]
cat = call("POST", "/admin/categories", {"name": f"M14Cat-{RUN}", "requiredSkillIds": [skill]}, token=A)[1]["id"]
for prio in ("P1", "P2", "P3", "P4"):
    call("POST", "/admin/sla-policies", {"serviceId": svc, "priority": prio, "responseMinutes": 60,
                                         "resolutionMinutes": 240}, token=A)


def user(tag, roles, technician=None):
    body = {"name": tag.title() + " " + RUN, "email": mail(tag), "password": PW, "roles": roles}
    if technician:
        body["technician"] = technician
    s, b = call("POST", "/admin/users", body, token=A)
    return b["id"] if s == 201 else None


user("tech", ["EMPLOYEE", "TECHNICIAN"], {"experienceLevel": 3, "escalationLevel": 0, "maxLoad": 50,
                                          "availability": "AVAILABLE", "skills": [{"skillId": skill, "proficiency": 5}]})
user("emp", ["EMPLOYEE"])
user("other", ["EMPLOYEE"])
T, E, O = login(mail("tech")), login(mail("emp")), login(mail("other"))


def new_incident(tag):
    s, b = call("POST", "/incidents", {"title": f"{tag} {RUN}", "description": f"Attachment test {tag} {RUN} printer",
                                       "serviceId": svc, "categoryId": cat, "impact": 2, "urgency": 2,
                                       "affectedUsers": 1, "confirmNotDuplicate": True}, token=E)
    return b["id"] if s == 201 else None


# ---------------------------------------------------------------- attachments
iid = new_incident("Attach")
check("incident created for attachment tests", iid is not None)

s, b = upload(iid, "screen.png", PNG, E, "image/png")
check("reporter uploads a PNG -> 201 with the Attachment shape",
      s == 201 and b["filename"] == "screen.png" and b["contentType"] == "image/png" and b["sizeBytes"] == len(PNG)
      and b["incidentId"] == iid and b["uploadedBy"]["name"].startswith("Emp") and "storagePath" not in b, (s, b))
att_png = b["id"] if s == 201 else None

s, b = upload(iid, "notes.log", b"line one\nline two\n", T, "text/plain")
check("assigned technician uploads a log -> 201 text/plain", s == 201 and b["contentType"] == "text/plain", (s, b))
s, b = upload(iid, "report.PDF", PDF, A)
check("administrator uploads a PDF (extension case ignored) -> 201", s == 201 and b["contentType"] == "application/pdf", (s, b))
check("jpg and gif accepted", upload(iid, "p.jpeg", JPG, E)[0] == 201 and upload(iid, "a.gif", GIF, E)[0] == 201)

s, b = upload(iid, "evil.png", b"MZ\x90\x00\x03\x00\x00\x00" + b"\x00" * 64, E, "image/png")
check("program renamed .png (content type lies) -> 400 on 'file'", s == 400 and fields(b) == ["file"], (s, b))
s, b = upload(iid, "photo.png", PDF, E, "image/png")
check("PDF named .png -> 400 (extension must match the content)", s == 400 and fields(b) == ["file"], (s, b))
s, b = upload(iid, "run.sh", b"#!/bin/sh\necho hi\n", E, "text/plain")
check("text content named .sh -> 400", s == 400 and fields(b) == ["file"], (s, b))
s, b = upload(iid, "bin.txt", b"abc\x00def", E, "text/plain")
check("binary named .txt -> 400", s == 400, (s, b))
s, b = upload(iid, "empty.txt", b"", E)
check("empty file -> 400", s == 400 and fields(b) == ["file"], (s, b))
s, b = upload(iid, "big.png", PNG + b"\x00" * (5 * 1024 * 1024), E, "image/png")
check("5 MB + 1 byte over -> 400 'at most 5 MB'", s == 400 and "5 MB" in json.dumps(b), (s, str(b)[:200]))
s, b = upload(iid, "ok.png", PNG + b"\x00" * (5 * 1024 * 1024 - len(PNG)), E, "image/png")
check("exactly 5 MB accepted", s == 201 and b["sizeBytes"] == 5 * 1024 * 1024, (s, str(b)[:200]))
s, b = upload(iid, "huge.png", PNG + b"\x00" * (8 * 1024 * 1024), E, "image/png")
check("8 MB (over the multipart limit) -> 400, standard body, no stack trace",
      s == 400 and isinstance(b, dict) and b.get("code") == "VALIDATION_FAILED" and "Exception" not in json.dumps(b),
      (s, str(b)[:200]))
s, raw, _ = raw_call("POST", f"/incidents/{iid}/attachments", b"x", {"Content-Type": "application/json"}, E)
check("wrong content type on upload -> 415 standard body", s == 415, s)

s, b = upload(iid, "..\\..\\..\\evil/../../etc/passwd.txt", b"harmless text", E, "text/plain")
check("path in the file name is reduced to the last segment", s == 201 and b["filename"] == "passwd.txt", (s, b))
s, b = upload(iid, "a;b%.txt", b"x y z", E, "text/plain")
check("special characters in the name are replaced", s == 201 and ";" not in b["filename"]
      and "%" not in b["filename"], (s, b))
s, b = upload(iid, 'q"x.txt', b"x y z", E, "text/plain")
check("a quote that breaks the multipart header -> 400, not 500", s in (201, 400), (s, b))
quote_ok = 1 if s == 201 else 0
if s == 201:
    sql(f"delete from incident_attachments where id={b['id']}")

# the incident now holds: png, log, pdf, jpeg, gif, 5MB ok.png, passwd.txt, a_b_.txt = 8; two more fit, then refuse
check("9th and 10th accepted", upload(iid, "n9.txt", b"nine", E)[0] == 201 and upload(iid, "n10.txt", b"ten", E)[0] == 201)
s, b = upload(iid, "n11.txt", b"eleven", E)
check("11th attachment -> 400 'maximum of 10'", s == 400 and fields(b) == ["file"] and "10" in json.dumps(b), (s, b))
check("rows in the table match (10)", sql(f"select count(*) from incident_attachments where incident_id={iid}") == "10")

paths = sql(f"select storage_path from incident_attachments where incident_id={iid} limit 3").split("\n")
check("storage paths are '<incidentId>/<uuid>' without the user's name or extension",
      all(p.startswith(f"{iid}/") and len(p) == len(str(iid)) + 37 and "." not in p for p in paths), paths)

s, b = call("GET", f"/incidents/{iid}/attachments", token=E)
check("list: 10 items, oldest first, ids ascending", s == 200 and len(b) == 10 and [x["id"] for x in b] == sorted(x["id"] for x in b), s)
s, b = call("GET", f"/incidents/{iid}/attachments", token=T)
check("list as assignee works", s == 200 and len(b) == 10, s)
s, b = call("GET", f"/incidents/{iid}/attachments", token=O)
check("stranger: list -> 404 INCIDENT_NOT_FOUND", s == 404 and b["code"] == "INCIDENT_NOT_FOUND", (s, b))
s, b = upload(iid, "x.txt", b"hello", O)
check("stranger: upload -> 404 INCIDENT_NOT_FOUND", s == 404 and b["code"] == "INCIDENT_NOT_FOUND", (s, b))
s, b = call("GET", f"/attachments/{att_png}/download", token=O)
check("stranger: download -> 404 NOT_FOUND (does not reveal the file)", s == 404 and b["code"] == "NOT_FOUND", (s, b))
s, b = call("GET", f"/attachments/{att_png}/download")
check("no token: download -> 401", s == 401, s)
s, b = call("GET", "/attachments/999999/download", token=E)
check("unknown attachment -> 404 NOT_FOUND", s == 404 and b["code"] == "NOT_FOUND", (s, b))

s, raw, h = raw_call("GET", f"/attachments/{att_png}/download", token=E)
hl = {k.lower(): v for k, v in h.items()}
check("download returns the same bytes", s == 200 and raw == PNG, (s, len(raw)))
check("download headers: attachment disposition with the name, image/png, nosniff",
      "attachment" in hl.get("content-disposition", "") and "screen.png" in hl.get("content-disposition", "")
      and hl.get("content-type") == "image/png" and hl.get("x-content-type-options") == "nosniff", hl)
s, raw, h = raw_call("GET", f"/attachments/{att_png}/download", token=A)
check("administrator downloads any attachment", s == 200 and raw == PNG, s)

hist = call("GET", f"/incidents/{iid}/history", token=E)[1]
check("each upload audited as ATTACHMENT_ADDED (10, plus one if the quote name was accepted)",
      sum(1 for e in hist if e["action"] == "ATTACHMENT_ADDED") == 10 + quote_ok, [e["action"] for e in hist][-3:])
s, b = call("GET", f"/audit?incidentId={iid}&action=ATTACHMENT_ADDED", token=A)
check("audit filter by ATTACHMENT_ADDED works", s == 200 and len(b["items"]) == 10 + quote_ok, (s, str(b)[:200]))

# a second incident has its own count
iid2 = new_incident("Attach2")
check("another incident starts with its own empty list",
      call("GET", f"/incidents/{iid2}/attachments", token=E)[1] == [] and upload(iid2, "a.txt", b"hi", E)[0] == 201)

# a file removed from the disk: 404, not 500
sql(f"update incident_attachments set storage_path='{iid}/00000000-0000-0000-0000-000000000000' where id={att_png}")
s, b = call("GET", f"/attachments/{att_png}/download", token=E)
check("file missing on disk -> 404 NOT_FOUND, not 500", s == 404 and b["code"] == "NOT_FOUND", (s, b))

# ---------------------------------------------------------------- password policy
def reg(name, email, pw):
    return call("POST", "/auth/register", {"name": name, "email": email, "password": pw})


good_pw = "Tr4in-lamp-" + secrets.token_hex(3)
s, b = reg("Policy One", mail("pol1"), "Password1")
check("common password 'Password1' -> 400 on password", s == 400 and fields(b) == ["password"] and "common" in json.dumps(b), (s, b))
s, b = reg("Policy One", mail("pol1"), "Welcome123!")
check("'Welcome123!' (blocklisted word + suffix) -> 400", s == 400 and fields(b) == ["password"], (s, b))
s, b = reg("Policy One", mail("pol1"), "xx" + f"pol1.{RUN}" + "7")
check("password containing the e-mail's first part -> 400", s == 400 and fields(b) == ["password"] and "name or" in json.dumps(b), (s, b))
s, b = reg("Priyanka Sharma", mail("pol1"), "mySharma2026zz")
check("password containing a word of the name -> 400", s == 400 and fields(b) == ["password"], (s, b))
s, b = reg("Policy One", mail("pol1"), "é" * 40 + "a1")
check("42 accented letters = 82 bytes -> 400 (BCrypt limit), not 500", s == 400 and fields(b) == ["password"], (s, b))
s, b = reg("Policy One", mail("pol1"), "abcdefgh")
check("contract rule kept: no digit -> 400", s == 400 and fields(b) == ["password"], (s, b))
s, b = reg("Policy One", mail("pol1"), good_pw)
check("a good password registers -> 201", s == 201, (s, b))
s, b = call("POST", "/admin/users", {"name": "Policy Two", "email": mail("pol2"), "password": "Qwerty123", "roles": ["EMPLOYEE"]}, token=A)
check("admin-created user with a common password -> 400 on password", s == 400 and fields(b) == ["password"], (s, b))
s, b = call("POST", "/admin/users", {"name": "Policy Two", "email": mail("pol2"), "password": good_pw, "roles": ["EMPLOYEE"]}, token=A)
check("admin-created user with a good password -> 201", s == 201, (s, b))

# ---------------------------------------------------------------- input validation limits
s, b = call("POST", "/auth/login", {"email": "a@b.com", "password": "x" * 500})
check("login with a 500-character password -> 400, not hashed", s == 400 and fields(b) == ["password"], (s, b))
s, b = call("POST", "/auth/login", {"email": "a" * 400 + "@b.com", "password": "x"})
check("login with a 400-character e-mail -> 400", s == 400 and fields(b) == ["email"], (s, b))
s, b = call("PUT", "/admin/config", [{"key": "k" * 500, "value": "1"}], token=A)
check("config key of 500 characters -> 400", s == 400, (s, b))

# ---------------------------------------------------------------- rate limits
call("PUT", "/admin/config", [{"key": "ratelimit.login.per.minute", "value": "5"},
                              {"key": "ratelimit.incident.create.per.minute", "value": "4"}], token=A)
lim_mail = mail("lim")
call("POST", "/auth/register", {"name": "Limit User", "email": lim_mail, "password": good_pw})
codes = []
for _ in range(7):
    s, raw, h = raw_call("POST", "/auth/login", json.dumps({"email": lim_mail, "password": "Wrong-pass-1"}).encode(),
                         {"Content-Type": "application/json"})
    codes.append(s)
    last_headers = {k.lower(): v for k, v in h.items()}
    last_body = raw
check("login limit 5/min per address+e-mail: 401 x5 then 429 x2", codes == [401] * 5 + [429] * 2, codes)
body = json.loads(last_body)
check("429 body is the standard RATE_LIMITED error with Retry-After 1..60",
      body["code"] == "RATE_LIMITED" and body["status"] == 429 and 1 <= int(last_headers.get("retry-after", 0)) <= 60,
      (body, last_headers.get("retry-after")))
s, b = call("POST", "/auth/login", {"email": mail("emp"), "password": PW})
check("another e-mail from the same address is not blocked by that limit", s == 200, (s, b))
s, b = call("POST", "/auth/login", {"email": ""})
check("login body is passed on intact: empty e-mail -> 400 VALIDATION_FAILED", s == 400 and b["code"] == "VALIDATION_FAILED", (s, b))

codes = []
for i in range(6):
    s, b = call("POST", "/incidents", {"title": f"Rate {i} {RUN}", "description": f"Rate limit test number {i} {RUN} printer",
                                       "serviceId": svc, "categoryId": cat, "impact": 1, "urgency": 1,
                                       "affectedUsers": 1, "confirmNotDuplicate": True}, token=O)
    codes.append(s)
check("incident creation limit 4/min per user: 201 x4 then 429 x2", codes == [201] * 4 + [429] * 2, codes)
s, b = call("POST", "/incidents", {"title": f"Other user {RUN}", "description": f"Another user is not limited {RUN} printer",
                                   "serviceId": svc, "categoryId": cat, "impact": 1, "urgency": 1, "affectedUsers": 1,
                                   "confirmNotDuplicate": True}, token=E)
check("a different user can still create", s == 201, (s, b))
check("reads are not limited (GET /incidents x10)", all(call("GET", "/incidents", token=O)[0] == 200 for _ in range(10)))

# ACCESS_DENIED audit flood: 403 on an admin endpoint, 30 times
call("PUT", "/admin/config", [{"key": "ratelimit.denied.audit.per.minute", "value": "5"}], token=A)
other_row = int(sql(f"select id from users where email='{mail('other')}'"))
before = int(sql(f"select count(*) from audit_records where action='ACCESS_DENIED' and actor_id={other_row}"))
statuses = [call("GET", "/admin/config", token=O)[0] for _ in range(30)]
after = int(sql(f"select count(*) from audit_records where action='ACCESS_DENIED' and actor_id={other_row}"))
check("30 forbidden calls all answer 403", statuses == [403] * 30, set(statuses))
check("only 5 + 1 summary entries written (limit 5/min)", after - before == 6, after - before)
summary = sql(f"select description from audit_records where action='ACCESS_DENIED' and actor_id={other_row} "
              f"and description like 'Further ACCESS_DENIED%' limit 1")
check("the summary entry says further entries are not written", "not written" in summary, summary)

# the AI endpoints keep their limit through the shared limiter
call("PUT", "/admin/config", [{"key": "ai.ratelimit.per.minute", "value": "3"}], token=A)
codes = [call("POST", "/intelligence/suggest-category", {"title": "Printer jams", "description": "Printer on floor 2 jams"}, token=T)[0]
         for _ in range(5)]
check("AI suggestion limit 3/min through the shared limiter: 200 x3 then 429 x2", codes == [200] * 3 + [429] * 2, codes)
call("PUT", "/admin/config", [{"key": "ai.ratelimit.per.minute", "value": "20"},
                              {"key": "ratelimit.login.per.minute", "value": "10"},
                              {"key": "ratelimit.incident.create.per.minute", "value": "20"},
                              {"key": "ratelimit.denied.audit.per.minute", "value": "20"}], token=A)

# ---------------------------------------------------------------- sealed audit trail (S3)
s, b = call("GET", "/audit/verify", token=E)
check("verify as a normal user -> 403", s == 403, s)
s, b = call("POST", "/audit/seal", token=E)
check("seal as a normal user -> 403", s == 403, s)
s, b = call("GET", "/audit/verify", token=A)
check("verify before the first manual seal answers 200 with the shape",
      s == 200 and "intact" in b and "unsealedRecords" in b and "firstProblem" in b, b)
s, seal1 = call("POST", "/audit/seal", token=A)
check("seal now -> 200 with id, range, count, 64-char hash",
      s == 200 and seal1["recordCount"] > 0 and len(seal1["hash"]) == 64 and seal1["toId"] >= seal1["fromId"], (s, seal1))
s, b = call("GET", "/audit/verify", token=A)
check("verify after sealing: intact, 0 unsealed, last hash equals the seal",
      s == 200 and b["intact"] and b["unsealedRecords"] == 0 and b["lastSealHash"] == seal1["hash"], b)
s, b = call("POST", "/audit/seal", token=A)
check("seal with nothing new -> 204", s == 204, s)
n_before = int(sql("select count(*) from audit_seals"))
call("POST", "/incidents/%d/comments" % iid2, {"body": "chain test comment " + RUN, "visibility": "PUBLIC"}, token=E)
call("POST", "/incidents/%d/comments" % iid2, {"body": "chain test comment two " + RUN, "visibility": "PUBLIC"}, token=T)
s, seal2 = call("POST", "/audit/seal", token=A)
check("second seal chains to the first (prevHash = first hash, ranges adjacent)",
      s == 200 and seal2["prevHash"] == seal1["hash"] and seal2["fromId"] > seal1["toId"], (s, seal2))
s, b = call("GET", "/audit/verify", token=A)
check("verify across the seals: intact", s == 200 and b["intact"] and b["sealsChecked"] == n_before + 1, b)

mid = int(sql(f"select id from audit_records where id between {seal1['fromId']} and {seal1['toId']} order by id offset 2 limit 1"))
orig = sql(f"select description from audit_records where id={mid}")
# audit_records is append-only (trigger from V7): lift it for the test-only tamper and its restore
sql(f"alter table audit_records disable trigger audit_records_no_update_delete; "
    f"update audit_records set description = description || ' (tampered)' where id={mid}; "
    f"alter table audit_records enable trigger audit_records_no_update_delete")
s, b = call("GET", "/audit/verify", token=A)
check("tampered record is named: first problem RECORD_CHANGED with that record and its seal",
      s == 200 and not b["intact"] and b["firstProblem"]["recordId"] == mid and b["firstProblem"]["problem"] == "RECORD_CHANGED"
      and b["firstProblem"]["sealId"] == seal1["id"] and b["problemCount"] == 1, b)
sql(f"alter table audit_records disable trigger audit_records_no_update_delete; "
    f"update audit_records set description = $${orig}$$ where id={mid}; "
    f"alter table audit_records enable trigger audit_records_no_update_delete")
s, b = call("GET", "/audit/verify", token=A)
check("restoring the text makes the chain intact again", s == 200 and b["intact"], b)

victim = int(sql(f"select id from audit_records where id between {seal2['fromId']} and {seal2['toId']} order by id limit 1"))
sql(f"create table audit_records_keep as select * from audit_records where id={victim}")
def seal_tamper(statement):
    """audit_seals is append-only too (trigger from V8): lift it for one test-only statement."""
    return sql("alter table audit_seals disable trigger audit_seals_no_update_delete; " + statement
               + "; alter table audit_seals enable trigger audit_seals_no_update_delete")


# A sealed record is protected twice: the append-only trigger (V7) and the foreign key from audit_seal_entries (V8).
# The replica role (the test container user is a superuser) switches both off for this one test-only delete.
delete_out = sql(f"set session_replication_role = replica; delete from audit_records where id={victim}")
s, b = call("GET", "/audit/verify", token=A)
check("a deleted record is named RECORD_MISSING", s == 200 and not b["intact"] and b["firstProblem"]["recordId"] == victim
      and b["firstProblem"]["problem"] == "RECORD_MISSING", (sql(f"select count(*) from audit_records where id={victim}"), victim, seal2["fromId"], seal2["toId"], b))
sql("insert into audit_records select * from audit_records_keep")
sql("drop table audit_records_keep")
s, b = call("GET", "/audit/verify", token=A)
check("re-inserting the saved row makes the chain intact again", s == 200 and b["intact"], b)
seal_tamper(f"update audit_seals set record_count = record_count + 1 where id={seal2['id']}")
s, b = call("GET", "/audit/verify", token=A)
check("an edited seal row is caught (SEAL_ALTERED)", not b["intact"] and any(p["problem"] == "SEAL_ALTERED" for p in b["problems"]), b)
seal_tamper(f"update audit_seals set record_count = record_count - 1 where id={seal2['id']}")
seal_tamper(f"update audit_seals set prev_hash = '{'a' * 64}' where id={seal2['id']}")
s, b = call("GET", "/audit/verify", token=A)
check("a broken chain link is caught (SEAL_CHAIN_BROKEN)", not b["intact"] and any(p["problem"] == "SEAL_CHAIN_BROKEN" for p in b["problems"]), b)
seal_tamper(f"update audit_seals set prev_hash = '{seal1['hash']}' where id={seal2['id']}")
s, b = call("GET", "/audit/verify", token=A)
check("chain restored: intact", s == 200 and b["intact"], b)
if os.environ.get("M14_LOG"):
    log_hits = open(os.environ["M14_LOG"], encoding="utf-8", errors="replace").read().count("AUDIT SEAL #")
    check("each seal hash is published to the log (M14_LOG)", log_hits >= 2, log_hits)

# ---------------------------------------------------------------- database outage
if not os.environ.get("SMOKE_SKIP_OUTAGE"):
    subprocess.run(["docker", "stop", CONTAINER], capture_output=True)
    try:
        time.sleep(2)
        t0 = time.time()
        s, raw, h = raw_call("GET", "/incidents", token=E)  # token is still valid: JWT needs no DB
        took = time.time() - t0
        body = json.loads(raw) if raw else {}
        check("DB down: GET /incidents -> 503 SERVICE_UNAVAILABLE in the standard body",
              s == 503 and body.get("code") == "SERVICE_UNAVAILABLE" and body.get("status") == 503
              and body.get("path", "").endswith("/incidents") and "fieldErrors" in body, (s, body))
        check("DB down: no stack trace, no SQL or driver text in the body",
              not any(w in raw.decode() for w in ("Exception", "org.", "jdbc", "postgres", "at com.")), raw.decode()[:300])
        check("DB down: Retry-After header present, answer within 10 s",
              any(k.lower() == "retry-after" for k in h) and took < 10, (took, h))
        s, b = call("POST", "/auth/login", {"email": mail("emp"), "password": PW})
        check("DB down: login -> 503 too", s == 503 and b["code"] == "SERVICE_UNAVAILABLE", (s, b))
        s, b = call("GET", f"/incidents/{iid}/attachments", token=E)
        check("DB down: attachments list -> 503", s == 503 and b["code"] == "SERVICE_UNAVAILABLE", (s, b))
        s, b = call("GET", "/services", token=E)
        check("DB down: another endpoint -> 503 or served from cache, never 500", s in (200, 503), (s, b))
    finally:
        subprocess.run(["docker", "start", CONTAINER], capture_output=True)
    for _ in range(40):
        time.sleep(2)
        if sql("select 1") == "1":
            break
    time.sleep(3)
    s, b = call("GET", "/incidents", token=E)
    check("DB back: the next request succeeds again (pool recovers)", s == 200, (s, b))
