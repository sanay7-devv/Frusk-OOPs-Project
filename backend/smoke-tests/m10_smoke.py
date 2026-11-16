"""Smoke test of M10, search and reports (local dev server, throwaway data, local DB only).

Port and database come from SMOKE_PORT (default 8081) and SMOKE_DB (default iitsm).
"""
import atexit
import json
import os
import secrets
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request

PORT = os.environ.get("SMOKE_PORT", "8081")
DB = os.environ.get("SMOKE_DB", "iitsm")
BASE = f"http://localhost:{PORT}/api/v1"
RUN = secrets.token_hex(3)
PW = "Ab9-Zq" + secrets.token_hex(4) + "9"
results = []


@atexit.register
def report_results():
    for status, name, detail in results:
        print(f"{status}  {name}" + (f"   -> {detail}" if status == "FAIL" else ""))
    print(f"\n{sum(r[0] == 'PASS' for r in results)}/{len(results)} passed")


def raw(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()


def call(method, path, body=None, token=None):
    status, _, content = raw(method, path, body, token)
    text = content.decode("utf-8", "replace")
    try:
        return status, (json.loads(text) if text else None)
    except json.JSONDecodeError:
        return status, text


def check(name, ok, detail=""):
    results.append(("PASS" if ok else "FAIL", name, detail))


def sql(statement):
    out = subprocess.run(["docker", "exec", os.environ.get("SMOKE_CONTAINER", "iitsm-db"), "psql", "-U", "iitsm", "-d", DB, "-tAc", statement],
                         capture_output=True, text=True)
    return out.stdout.strip() or out.stderr.strip()


def count(where, table="incidents i"):
    return int(sql(f"select count(*) from {table} where {where}"))


def login(email):
    s, b = call("POST", "/auth/login", {"email": email, "password": PW})
    return b["accessToken"] if s == 200 else None


def mail(tag):
    return f"{tag}.{RUN}@iitsm.demo"


def listing(token, query=""):
    s, b = call("GET", "/incidents?size=100" + query, token=token)
    return b if s == 200 else {"items": [], "totalItems": -1, "status": s, "body": b}


def ids(token, query=""):
    return {i["id"] for i in listing(token, query)["items"]}


def sqlids(where):
    out = sql(f"select id from incidents i where {where}")
    return {int(x) for x in out.split()} if out else set()


# ---------------------------------------------------------------- setup
call("POST", "/auth/register", {"name": "Root Admin", "email": mail("root"), "password": PW})
root_id = int(sql(f"select id from users where email='{mail('root')}'"))
sql(f"insert into user_roles(user_id, role_type, granted_at) values ({root_id}, 'ADMINISTRATOR', now())")
sql(f"insert into administrator_profiles(user_id, scope) values ({root_id}, 'SYSTEM_ADMIN')")
A = login(mail("root"))
call("PUT", "/admin/config", [{"key": "sla.monitor.interval.seconds", "value": "5"}], token=A)

skill_a = call("POST", "/admin/skills", {"name": f"SkA-{RUN}"}, token=A)[1]["id"]
skill_b = call("POST", "/admin/skills", {"name": f"SkB-{RUN}"}, token=A)[1]["id"]
svc_a = call("POST", "/admin/services", {"name": f"CritSvc-{RUN}", "criticality": 5, "alwaysP1": False}, token=A)[1]["id"]
svc_b = call("POST", "/admin/services", {"name": f"MinorSvc-{RUN}", "criticality": 2, "alwaysP1": False}, token=A)[1]["id"]
cat_a = call("POST", "/admin/categories", {"name": f"CatA-{RUN}", "requiredSkillIds": [skill_a]}, token=A)[1]["id"]
cat_b = call("POST", "/admin/categories", {"name": f"CatB-{RUN}", "requiredSkillIds": [skill_b]}, token=A)[1]["id"]
for svc in (svc_a, svc_b):
    for prio in ("P1", "P2", "P3", "P4"):
        call("POST", "/admin/sla-policies", {"serviceId": svc, "priority": prio, "responseMinutes": 60,
                                             "resolutionMinutes": 240}, token=A)


def user(tag, roles, technician=None):
    body = {"name": tag.title() + " " + RUN, "email": mail(tag), "password": PW, "roles": roles}
    if technician:
        body["technician"] = technician
    s, b = call("POST", "/admin/users", body, token=A)
    return b["id"] if s == 201 else None


def tech_body(skill, level=0):
    return {"experienceLevel": 3, "escalationLevel": level, "maxLoad": 50, "availability": "AVAILABLE",
            "skills": [{"skillId": skill, "proficiency": 5}]}


tech1 = user("tech1", ["EMPLOYEE", "TECHNICIAN"], tech_body(skill_a))
tech2 = user("tech2", ["EMPLOYEE", "TECHNICIAN"], tech_body(skill_b))
lead = user("lead", ["EMPLOYEE", "TECHNICIAN"], tech_body(skill_b, level=1))
emp1, emp2 = user("emp1", ["EMPLOYEE"]), user("emp2", ["EMPLOYEE"])
T1, T2, L, E1, E2 = (login(mail(t)) for t in ("tech1", "tech2", "lead", "emp1", "emp2"))
check("setup: users and tokens", all([A, T1, T2, L, E1, E2, tech1, tech2, lead, emp1, emp2]))


def report(token, title, svc, cat, impact=2, urgency=2, users=3):
    s, b = call("POST", "/incidents", {"confirmNotDuplicate": True, "title": title, "description": "Smoke incident for the M10 reports " + RUN,
                                       "serviceId": svc, "categoryId": cat, "impact": impact, "urgency": urgency,
                                       "affectedUsers": users}, token=token)
    return b


def resolve(inc, tech_token):
    call("POST", f"/incidents/{inc['id']}/acknowledge", token=tech_token)
    call("POST", f"/incidents/{inc['id']}/start", token=tech_token)
    return call("POST", f"/incidents/{inc['id']}/resolve",
                {"rootCause": "Smoke root cause text", "notes": "Smoke resolution notes", "timeSpentMinutes": 15},
                token=tech_token)


i1 = report(E1, f"Printer down {RUN}", svc_a, cat_a, 4, 4, 30)          # will be resolved and verified
i2 = report(E1, f"Mail slow {RUN}", svc_b, cat_b)                       # stays ASSIGNED, made violated
i3 = report(E2, f"Share offline {RUN}", svc_a, cat_a, 3, 3, 5)         # in progress, made WARNING
i4 = report(E2, f"=HYPERLINK(\"http://evil\",\"x\") {RUN}", svc_b, cat_b, 1, 1, 1)  # CSV injection title
i5 = report(E1, f"Badge reader {RUN}", svc_a, cat_a, 2, 2, 2)           # resolved, feedback test
i6 = report(E2, f"Wifi flaky {RUN}", svc_b, cat_b, 5, 5, 200)           # request-info -> PAUSED
check("setup: six incidents created", all(i and "id" in i for i in (i1, i2, i3, i4, i5, i6)), [i1, i2])
r1 = resolve(i1, T1)
call("POST", f"/incidents/{i1['id']}/verify", token=E1)
r5 = resolve(i5, T1)
call("POST", f"/incidents/{i3['id']}/acknowledge", token=T1)
call("POST", f"/incidents/{i3['id']}/start", token=T1)
call("POST", f"/incidents/{i6['id']}/acknowledge", token=T2)
call("POST", f"/incidents/{i6['id']}/start", token=T2)
s, _ = call("POST", f"/incidents/{i6['id']}/request-info", {"message": "Which floor is the wifi flaky on?"}, token=T2)
check("setup: resolve, verify, in progress, request-info worked", r1[0] == 200 and r5[0] == 200 and s == 200,
      (r1[0], r5[0], s))

# SLA flags: i2 overdue (violation), i3 at ~88 percent (first warning). The monitor runs every 5 s.
sql(f"update incidents set resolution_due = now() - interval '2 hours' where id = {i2['id']}")
sql(f"update incidents set resolution_due = now() + interval '30 minutes' where id = {i3['id']}")
import smoke_setup  # noqa: E402
smoke_setup.settle_monitors(sql, DB)  # the 5 s interval only applies after the first 60 s tick
time.sleep(14)

# ---------------------------------------------------------------- search: filters alone, against direct SQL counts
mine_ids = {i["id"] for i in (i1, i2, i3, i4, i5, i6)}
all_admin = listing(A, "&size=100")
check("admin list: total equals a direct count and includes the test incidents",
      all_admin["totalItems"] == count("true") and mine_ids <= {i["id"] for i in all_admin["items"]},
      (all_admin["totalItems"], count("true")))

for label, query, where in [
    ("status (repeatable)", "&status=RESOLVED&status=VERIFIED", "i.status in ('RESOLVED','VERIFIED')"),
    ("priority (repeatable)", "&priority=P1&priority=P2", "i.priority in ('P1','P2')"),
    ("categoryId", f"&categoryId={cat_a}", f"i.category_id = {cat_a}"),
    ("serviceId", f"&serviceId={svc_b}", f"i.service_id = {svc_b}"),
    ("assigneeId", f"&assigneeId={tech1}", f"i.assignee_id = {tech1}"),
    ("reporterId", f"&reporterId={emp2}", f"i.reporter_id = {emp2}"),
    ("code", "&code=" + urllib.parse.quote(i3["code"]), f"i.code = '{i3['code']}'"),
    ("q (text)", "&q=" + urllib.parse.quote(f"badge reader {RUN}"), f"lower(i.title) like lower('%badge reader {RUN}%')"),
    ("createdFrom", "&createdFrom=" + urllib.parse.quote("2999-01-01T00:00:00Z"), "false"),
    ("createdTo", "&createdTo=" + urllib.parse.quote("2999-01-01T00:00:00Z"), "true"),
]:
    got = listing(A, query)
    check(f"filter {label} alone = direct count", got["totalItems"] == count(where), (got["totalItems"], count(where)))

got = listing(E1, "&mine=true")
check("filter mine (employee) = own incidents", got["totalItems"] == count(f"i.reporter_id = {emp1}"), got["totalItems"])
got = listing(T1, "&assignedToMe=true")
check("filter assignedToMe (technician) = assigned", got["totalItems"] == count(f"i.assignee_id = {tech1}"),
      got["totalItems"])

# slaState filter on the stored flags
flag_where = {
    "OK": "(i.resolution_due is null or (i.status not in ('RESOLVED','VERIFIED','CLOSED') and i.paused_at is null "
          "and not i.resp_violated and not i.res_violated and not i.res_warn75_sent and not i.res_warn90_sent "
          "and not (i.acknowledged_at is null and (i.resp_warn75_sent or i.resp_warn90_sent))))",
    "WARNING": "(i.status not in ('RESOLVED','VERIFIED','CLOSED') and i.paused_at is null and not i.resp_violated "
               "and not i.res_violated and (i.res_warn75_sent or i.res_warn90_sent or (i.acknowledged_at is null "
               "and (i.resp_warn75_sent or i.resp_warn90_sent))))",
    "VIOLATED": "((i.status not in ('RESOLVED','VERIFIED','CLOSED') and i.paused_at is null "
                "and (i.resp_violated or i.res_violated)) or (i.status in ('RESOLVED','VERIFIED','CLOSED') "
                "and not (i.resolved_at is not null and i.resolved_at <= i.resolution_due and not i.resp_violated "
                "and not i.res_violated)))",
    "PAUSED": "(i.status not in ('RESOLVED','VERIFIED','CLOSED') and i.paused_at is not null)",
    "MET": "(i.status in ('RESOLVED','VERIFIED','CLOSED') and i.resolved_at is not null "
           "and i.resolved_at <= i.resolution_due and not i.resp_violated and not i.res_violated)",
}
# B1: the risk scan's flagged incidents are AT_RISK and leave OK and WARNING, so those two are checked together
at_risk_total = listing(A, "&slaState=AT_RISK")["totalItems"]
for state, where in flag_where.items():
    got = listing(A, f"&slaState={state}")
    if state in ("OK", "WARNING"):
        continue
    check(f"slaState={state} = direct count on the stored flags", got["totalItems"] == count(where),
          (got["totalItems"], count(where)))
ok_warn = listing(A, "&slaState=OK")["totalItems"] + listing(A, "&slaState=WARNING")["totalItems"] + at_risk_total
check("slaState OK + WARNING + AT_RISK = direct count of the OK and WARNING flags (AT_RISK takes over from both)",
      ok_warn == count(flag_where["OK"]) + count(flag_where["WARNING"]), (ok_warn, count(flag_where["OK"]),
                                                                             count(flag_where["WARNING"])))
check("slaState VIOLATED finds the overdue incident", i2["id"] in ids(A, "&slaState=VIOLATED"))
check("slaState WARNING finds the incident at 88 percent", i3["id"] in ids(A, "&slaState=WARNING"),
      sql(f"select res_warn75_sent, res_violated from incidents where id={i3['id']}"))
check("slaState PAUSED finds the one waiting for user info", i6["id"] in ids(A, "&slaState=PAUSED"))
check("slaState MET finds the resolved incident", i1["id"] in ids(A, "&slaState=MET"))
check("slaState bad value is 400", call("GET", "/incidents?slaState=NOPE", token=A)[0] == 400)
check("slaState AT_RISK is accepted; only open, running, not violated incidents can match",
      call("GET", "/incidents?slaState=AT_RISK", token=A)[0] == 200
      and all(i["status"] not in ("RESOLVED", "VERIFIED", "CLOSED") and i["slaState"] == "AT_RISK"
              for i in listing(A, "&slaState=AT_RISK&size=100")["items"]))

# combinations, paging, sorting
combo = listing(A, f"&serviceId={svc_a}&status=RESOLVED&status=VERIFIED&priority=P1&priority=P2&priority=P3&priority=P4")
want = count(f"i.service_id = {svc_a} and i.status in ('RESOLVED','VERIFIED')")
check("combination service + status + priority = direct count", combo["totalItems"] == want, (combo["totalItems"], want))
combo = listing(A, f"&reporterId={emp1}&categoryId={cat_a}&slaState=MET")
want = len(sqlids(f"i.reporter_id = {emp1} and i.category_id = {cat_a} and {flag_where['MET']}"))
check("combination reporter + category + slaState = direct", combo["totalItems"] == want, (combo["totalItems"], want))
p0 = call("GET", "/incidents?size=2&page=0&sort=code,asc", token=A)[1]
p1 = call("GET", "/incidents?size=2&page=1&sort=code,asc", token=A)[1]
check("paging: size 2, totalPages consistent", len(p0["items"]) == 2 and p0["totalPages"] == -(-p0["totalItems"] // 2))
check("sorting by code asc across pages", p0["items"][-1]["code"] <= p1["items"][0]["code"] and
      p0["items"][0]["code"] <= p0["items"][1]["code"])
check("bad sort field is 400", call("GET", "/incidents?sort=nope,asc", token=A)[0] == 400)

# visibility in the query
check("employee sees only own incidents", ids(E1) == sqlids(f"i.reporter_id = {emp1} or i.assignee_id = {emp1}"))
check("technician sees assigned or own", ids(T1) == sqlids(f"i.reporter_id = {tech1} or i.assignee_id = {tech1}"))
check("team lead and admin see all (the seed holds more than one page, so compare totals)",
      ids(L) == ids(A) and listing(A)["totalItems"] == listing(L)["totalItems"] == count("true"))
check("employee slaState filter stays inside their own incidents",
      ids(E2, "&slaState=VIOLATED") <= sqlids(f"i.reporter_id = {emp2}"))

# ---------------------------------------------------------------- reports: totals equal direct counts, per role
def overview(token, q=""):
    s, b = call("GET", "/reports/overview" + q, token=token)
    return b if s == 200 else {"status": s, "body": b}


OPEN = "('NEW','CLASSIFIED','ASSIGNED','ACKNOWLEDGED','IN_PROGRESS','PENDING_USER_INFO','REOPENED')"
FIN = "('RESOLVED','VERIFIED','CLOSED')"
for label, token, scope in [("admin", A, "true"), ("team lead", L, "true"),
                            ("employee 1", E1, f"i.reporter_id = {emp1} or i.assignee_id = {emp1}"),
                            ("employee 2", E2, f"i.reporter_id = {emp2} or i.assignee_id = {emp2}"),
                            ("technician 1", T1, f"i.reporter_id = {tech1} or i.assignee_id = {tech1}")]:
    o = overview(token)
    check(f"overview total = direct count ({label})", o.get("total") == count(f"({scope})"), (o, count(f"({scope})")))
    check(f"overview open and resolved = direct counts ({label})",
          o.get("open") == count(f"({scope}) and i.status in {OPEN}")
          and o.get("resolved") == count(f"({scope}) and i.status in {FIN}")
          and o.get("critical") == count(f"({scope}) and i.status in {OPEN} and i.priority = 'P1'"), o)
    check(f"overview open + resolved = total ({label})", o.get("open", -1) + o.get("resolved", -2) == o.get("total"), o)
    pd = call("GET", "/reports/priority-distribution", token=token)[1]
    cd = call("GET", "/reports/category-distribution", token=token)[1]
    sv = call("GET", "/reports/services", token=token)[1]
    check(f"distributions and services sum to the total ({label})",
          sum(r["count"] for r in pd) == o["total"] and sum(r["count"] for r in cd) == o["total"]
          and sum(r["count"] for r in sv) == o["total"], (pd, cd, sv))
    sc = call("GET", "/reports/sla-compliance?groupBy=service", token=token)[1]
    check(f"sla-compliance met + violated = total per row, violated sums to overview ({label})",
          all(r["met"] + r["violated"] == r["total"] for r in sc)
          and sum(r["violated"] for r in sc) == o["slaViolations"], (sc, o))
check("overview slaViolations counts the overdue incident",
      overview(A)["slaViolations"] >= 1 and count("exists (select 1 from sla_violations v where v.incident_id = i.id)") >= 1)
check("priority distribution always lists P1 to P4",
      [r["label"] for r in call("GET", "/reports/priority-distribution", token=E1)[1]][:4] == ["P1", "P2", "P3", "P4"])
o_range = overview(A, "?from=" + urllib.parse.quote("2999-01-01T00:00:00Z"))
check("overview range with no incidents is all zero", o_range.get("total") == 0 and o_range.get("avgSatisfaction") is None)
check("overview to before from is 400", call("GET", "/reports/overview?from=2026-05-01T00:00:00Z&to=2026-04-01T00:00:00Z",
                                             token=A)[0] == 400)
for group in ("priority", "service", "technician"):
    check(f"sla-compliance groupBy={group} works", call("GET", f"/reports/sla-compliance?groupBy={group}", token=A)[0] == 200)
check("sla-compliance bad groupBy is 400", call("GET", "/reports/sla-compliance?groupBy=nope", token=A)[0] == 400)

tr = call("GET", "/reports/trends", token=A)[1]
check("trends: 30 or 31 daily points, created and resolved sums equal direct counts",
      len(tr) in (30, 31) and sum(p["created"] for p in tr) == count("i.created_at > now() - interval '30 days' and i.created_at <= now()")
      and sum(p["resolved"] for p in tr) == count("i.resolved_at > now() - interval '30 days' and i.resolved_at <= now()"),
      (len(tr), sum(p["created"] for p in tr)))
tw = call("GET", "/reports/trends?bucket=week", token=A)[1]
check("trends: weekly buckets start on Monday", len(tw) >= 12 and all(
    __import__("datetime").date.fromisoformat(p["date"]).weekday() == 0 for p in tw))
te = call("GET", "/reports/trends", token=E1)[1]
check("trends: employee counts only their incidents",
      sum(p["created"] for p in te) == count(f"(i.reporter_id = {emp1} or i.assignee_id = {emp1}) "
                                             "and i.created_at > now() - interval '30 days'"))
check("trends: bad bucket is 400", call("GET", "/reports/trends?bucket=month", token=A)[0] == 400)

wl = call("GET", "/reports/workload", token=A)
check("workload: admin and team lead allowed, rows have load and maxLoad",
      wl[0] == 200 and any(r["technicianId"] == tech1 and r["maxLoad"] == 50 for r in wl[1])
      and call("GET", "/reports/workload", token=L)[0] == 200, wl[0])
check("workload: employee and technician are refused (403)",
      call("GET", "/reports/workload", token=E1)[0] == 403 and call("GET", "/reports/workload", token=T1)[0] == 403)
check("report endpoints need a login", call("GET", "/reports/overview")[0] == 401)

# ---------------------------------------------------------------- CSV export
s, h, body = raw("GET", "/reports/export?type=incidents", token=A)
text = body.decode("utf-8")
lines = text.strip().split("\r\n")
check("export incidents: CSV content type, header, one line per incident",
      s == 200 and "text/csv" in h.get("Content-Type", "") and lines[0].startswith("code,title,status")
      and len(lines) - 1 >= count("true") - 5 and len(lines) - 1 <= count("true"), (s, len(lines), count("true")))
check("export: formula title is neutralised with a leading apostrophe",
      "'=HYPERLINK" in text and ",=HYPERLINK" not in text and '"=HYPERLINK' not in text, text[:300])
check("export: no cell starts with = + - @",
      not any(c[:1] in "=+-@" for line in lines[1:] for c in [part.strip('"') for part in line.split(",")] if c.startswith(("=", "+", "@"))))
s, _, body = raw("GET", "/reports/export?type=incidents", token=E1)
check("export: employee gets only own incidents",
      s == 200 and len(body.decode().strip().split("\r\n")) - 1 == count(f"i.reporter_id = {emp1} or i.assignee_id = {emp1}"))
for t in ("overview", "services", "trends", "priority-distribution", "category-distribution", "sla-compliance"):
    check(f"export type {t} works", raw("GET", f"/reports/export?type={t}", token=A)[0] == 200)
check("export workload: admin 200, employee 403",
      raw("GET", "/reports/export?type=workload", token=A)[0] == 200 and raw("GET", "/reports/export?type=workload", token=E1)[0] == 403)
check("export unknown type is 400", raw("GET", "/reports/export?type=secrets", token=A)[0] == 400)
# PDF format (gap B2)
for t in ("incidents", "overview", "services", "trends", "priority-distribution", "category-distribution", "sla-compliance", "workload"):
    s, h, body = raw("GET", f"/reports/export?type={t}&format=pdf", token=A)
    check(f"export pdf type {t}: 200, application/pdf, %PDF magic, filename",
          s == 200 and h.get("Content-Type", "").startswith("application/pdf") and body[:5] == b"%PDF-"
          and f'{t}.pdf' in h.get("Content-Disposition", ""), (s, h.get("Content-Type"), body[:20]))
check("export pdf: format is case-insensitive and csv stays the default",
      raw("GET", "/reports/export?type=overview&format=PDF", token=A)[2][:4] == b"%PDF"
      and raw("GET", "/reports/export?type=overview&format=csv", token=A)[1].get("Content-Type", "").startswith("text/csv")
      and raw("GET", "/reports/export?type=overview", token=A)[1].get("Content-Type", "").startswith("text/csv"))
s, body = call("GET", "/reports/export?type=overview&format=docx", token=A)
check("export unknown format is 400 VALIDATION_FAILED with fieldErrors on format",
      s == 400 and body["code"] == "VALIDATION_FAILED" and any(f.get("field") == "format" for f in body["fieldErrors"]), (s, body))
s, body = call("GET", "/reports/export?type=secrets&format=pdf", token=A)
check("export pdf unknown type is 400 VALIDATION_FAILED on type",
      s == 400 and body["code"] == "VALIDATION_FAILED" and any(f.get("field") == "type" for f in body["fieldErrors"]), (s, body))
check("export pdf: employee workload 403, employee own incidents 200, no login 401",
      raw("GET", "/reports/export?type=workload&format=pdf", token=E1)[0] == 403
      and raw("GET", "/reports/export?type=incidents&format=pdf", token=E1)[2][:4] == b"%PDF"
      and raw("GET", "/reports/export?type=overview&format=pdf")[0] == 401)
check("export pdf: range parameters accepted",
      raw("GET", "/reports/export?type=services&format=pdf&from=2020-01-01T00:00:00Z&to=2099-01-01T00:00:00Z", token=A)[2][:4] == b"%PDF"
      and raw("GET", "/reports/export?type=trends&format=pdf&from=2020-01-01T00:00:00Z&to=2099-01-01T00:00:00Z", token=A)[0] in (200, 400),
      raw("GET", "/reports/export?type=services&format=pdf&from=2020-01-01T00:00:00Z&to=2099-01-01T00:00:00Z", token=A)[:2])
call("PUT", "/admin/config", [{"key": "report.export.max.rows", "value": "3"}], token=A)
s, _, body = raw("GET", "/reports/export?type=incidents", token=A)
check("export row cap (setting report.export.max.rows) is honoured", len(body.decode().strip().split("\r\n")) == 4)
call("PUT", "/admin/config", [{"key": "report.export.max.rows", "value": "10000"}], token=A)

# ---------------------------------------------------------------- E3 coverage risk
def coverage(token, extra=""):
    s, b = call("GET", "/reports/coverage-risk" + extra, token=token)
    return b if s == 200 else {"status": s, "body": b, "items": []}


def pair(rep, svc, cat):
    return next((i for i in rep["items"] if i["service"]["id"] == svc and i["category"]["id"] == cat), None)


cv = coverage(A)
item = pair(cv, svc_a, cat_a)
check("coverage: critical service whose category has one holder is flagged SINGLE_HOLDER",
      item and item["flagged"] and item["level"] == "SINGLE_HOLDER" and item["eligibleCount"] == 1
      and item["eligibleTechnicians"][0]["id"] == tech1 and item["requiredSkills"][0]["holders"] == 1, item)
item_b = pair(cv, svc_b, cat_b)
check("coverage: minor service with two holders is not flagged",
      item_b and not item_b["flagged"] and item_b["eligibleCount"] == 2 and item_b["level"] == "COVERED", item_b)
check("coverage: flagged pairs come first and are counted", cv["flaggedCount"] >= 1 and cv["items"][0]["flagged"])
check("coverage: onlyFlagged keeps only flagged", all(i["flagged"] for i in coverage(A, "?onlyFlagged=true")["items"]))
call("PUT", "/technicians/me/availability", {"availability": "OFF_DUTY"}, token=T1)
item = pair(coverage(A), svc_a, cat_a)
check("coverage: the only holder going OFF_DUTY gives NO_COVERAGE", item and item["level"] == "NO_COVERAGE"
      and item["eligibleCount"] == 0 and item["flagged"], item)
call("PUT", "/technicians/me/availability", {"availability": "AVAILABLE"}, token=T1)
check("coverage: staff only (employee 403, team lead 200)",
      call("GET", "/reports/coverage-risk", token=E1)[0] == 403 and call("GET", "/reports/coverage-risk", token=L)[0] == 200)

# ---------------------------------------------------------------- E4 post-incident report and PDF
s, pr = call("GET", f"/incidents/{i1['id']}/post-incident-report", token=A)
actions = [t["action"] for t in pr["timeline"]] if s == 200 else []
check("post-incident: timeline is the whole audit trail, in order",
      s == 200 and actions[:4] == ["INCIDENT_CREATED", "CLASSIFIED", "PRIORITY_CALCULATED", "ASSIGNED"]
      and "RESOLVED" in actions and "VERIFIED" in actions
      and len(actions) == int(sql(f"select count(*) from audit_records where incident_id={i1['id']}")), actions)
st = {d["status"]: d for d in pr["timeInStatus"]}
check("post-incident: time in status covers the lifecycle, VERIFIED is the current stay",
      {"NEW", "ASSIGNED", "RESOLVED", "VERIFIED"} <= set(st) and st["VERIFIED"]["stillIn"], list(st))
check("post-incident: SLA outcome MET with no violations", pr["sla"]["outcome"] == "MET" and pr["sla"]["violations"] == []
      and pr["sla"]["responseMet"] is True and pr["sla"]["resolutionMet"] is True, pr["sla"])
names = {p["person"]["id"]: p["roles"] for p in pr["people"]}
check("post-incident: people are the reporter and the technician",
      "REPORTER" in names.get(emp1, []) and "ASSIGNEE" in names.get(tech1, []), names)
check("post-incident: resolution and totals present", pr["resolution"]["timeSpentMinutes"] == 15 and pr["complete"]
      and pr["totalSeconds"] >= 0 and pr["code"] == i1["code"])
sv2 = call("GET", f"/incidents/{i2['id']}/post-incident-report", token=A)[1]
check("post-incident: an overdue open incident shows its violation", sv2["sla"]["outcome"].startswith("VIOLATED")
      and len(sv2["sla"]["violations"]) >= 1 and not sv2["complete"], sv2["sla"])
check("post-incident: a stranger gets 404, the reporter 200",
      call("GET", f"/incidents/{i1['id']}/post-incident-report", token=E2)[0] == 404
      and call("GET", f"/incidents/{i1['id']}/post-incident-report", token=E1)[0] == 200)
s, h, pdf = raw("GET", f"/incidents/{i1['id']}/post-incident-report/pdf", token=A)
pdf_path = os.path.join(__import__("tempfile").gettempdir(), f"m10_{RUN}.pdf")
open(pdf_path, "wb").write(pdf)
txt = subprocess.run(["pdftotext", "-layout", pdf_path, "-"], capture_output=True, text=True).stdout
check("PDF: 200, application/pdf, starts with %PDF", s == 200 and "pdf" in h.get("Content-Type", "") and pdf[:4] == b"%PDF")
check("PDF: contains the code, SLA outcome, a status duration and the people",
      i1["code"] in txt and "MET" in txt and "Time in each status" in txt and f"Emp1 {RUN}" in txt and f"Tech1 {RUN}" in txt,
      txt[:400])
check("PDF: a stranger gets 404", raw("GET", f"/incidents/{i1['id']}/post-incident-report/pdf", token=E2)[0] == 404)

# ---------------------------------------------------------------- feedback
check("feedback before RESOLVED is 409", call("POST", f"/incidents/{i3['id']}/feedback", {"rating": 4}, token=E2)[0] == 409)
check("feedback by the assigned technician (not the reporter) is 403",
      call("POST", f"/incidents/{i5['id']}/feedback", {"rating": 4}, token=T1)[0] == 403)
check("feedback by someone who cannot see the incident is 404",
      call("POST", f"/incidents/{i5['id']}/feedback", {"rating": 4}, token=E2)[0] == 404)
check("feedback rating 0 and 6 are 400",
      call("POST", f"/incidents/{i5['id']}/feedback", {"rating": 0}, token=E1)[0] == 400
      and call("POST", f"/incidents/{i5['id']}/feedback", {"rating": 6}, token=E1)[0] == 400)
d = call("GET", f"/incidents/{i5['id']}", token=E1)[1]
check("detail offers GIVE_FEEDBACK to the reporter once resolved", "GIVE_FEEDBACK" in d["allowedActions"] and d["feedback"] is None)
check("detail does not offer GIVE_FEEDBACK before resolved",
      "GIVE_FEEDBACK" not in call("GET", f"/incidents/{i3['id']}", token=E2)[1]["allowedActions"])
s, fb = call("POST", f"/incidents/{i5['id']}/feedback", {"rating": 4, "comment": "Fixed quickly"}, token=E1)
check("feedback by the reporter on a RESOLVED incident is 201", s == 201 and fb["rating"] == 4, (s, fb))
check("feedback a second time is 409", call("POST", f"/incidents/{i5['id']}/feedback", {"rating": 5}, token=E1)[0] == 409)
s, fb1 = call("POST", f"/incidents/{i1['id']}/feedback", {"rating": 5}, token=E1)
check("feedback on a VERIFIED incident is 201", s == 201, s)
d = call("GET", f"/incidents/{i5['id']}", token=E1)[1]
check("detail now shows the feedback and no GIVE_FEEDBACK", d["feedback"]["rating"] == 4
      and "GIVE_FEEDBACK" not in d["allowedActions"], d["feedback"])
check("feedback table has one row per incident", int(sql(f"select count(*) from feedback where incident_id in ({i1['id']},{i5['id']})")) == 2)
o = overview(A)
check("overview avgSatisfaction = direct average", abs(o["avgSatisfaction"] - float(sql("select avg(rating) from feedback"))) < 0.06,
      (o["avgSatisfaction"], sql("select avg(rating) from feedback")))

# ---------------------------------------------------------------- saved views
body = {"name": f"Open critical {RUN}", "filter": {"status": ["ASSIGNED", "IN_PROGRESS"], "priority": ["P1"], "slaState": "WARNING",
                                                   "serviceId": svc_a, "mine": False, "sort": "createdAt,desc"}}
s, sv = call("POST", "/saved-filters", body, token=E1)
check("saved view: create is 201 and echoes the filters", s == 201 and sv["filter"]["slaState"] == "WARNING"
      and sv["filter"]["status"] == ["ASSIGNED", "IN_PROGRESS"], (s, sv))
check("saved view: list shows it", [v["id"] for v in call("GET", "/saved-filters", token=E1)[1]] == [sv["id"]])
check("saved view: private (another user lists none, delete is 404)",
      call("GET", "/saved-filters", token=E2)[1] == [] and call("DELETE", f"/saved-filters/{sv['id']}", token=E2)[0] == 404)
check("saved view: same name again is 400", call("POST", "/saved-filters", body, token=E1)[0] == 400)
check("saved view: unknown key and bad value are 400",
      call("POST", "/saved-filters", {"name": "x1", "filter": {"role": "admin"}}, token=E1)[0] == 400
      and call("POST", "/saved-filters", {"name": "x2", "filter": {"status": ["NOPE"]}}, token=E1)[0] == 400
      and call("POST", "/saved-filters", {"name": "", "filter": {}}, token=E1)[0] == 400)
check("saved view: stored as JSONB in saved_filters",
      sql(f"select jsonb_typeof(filter_json) from saved_filters where id={sv['id']}") == "object")
check("saved view: delete is 204 and gone", call("DELETE", f"/saved-filters/{sv['id']}", token=E1)[0] == 204
      and call("GET", "/saved-filters", token=E1)[1] == [])
call("PUT", "/admin/config", [{"key": "saved.filters.max", "value": "1"}], token=A)
call("POST", "/saved-filters", {"name": "one", "filter": {}}, token=E1)
check("saved view: limit setting saved.filters.max is enforced", call("POST", "/saved-filters", {"name": "two", "filter": {}}, token=E1)[0] == 400)
call("PUT", "/admin/config", [{"key": "saved.filters.max", "value": "20"}], token=A)
check("saved view needs a login", call("GET", "/saved-filters")[0] == 401)

# ---------------------------------------------------------------- priority what-if
def what_if(token, **kw):
    return call("POST", "/priority/what-if", kw, token=token)


s, w = what_if(E1, serviceId=svc_a, categoryId=cat_a, impact=4, urgency=4, affectedUsers=30)
d1 = call("GET", f"/incidents/{i1['id']}", token=A)[1]
check("what-if raw input equals the priority a real incident got (same inputs)",
      s == 200 and w["whatIf"]["priority"] == d1["priority"] and w["whatIf"]["score"] == d1["priorityScore"]
      and w["current"] is None and w["whatIf"]["slaResolutionMinutes"] == 240, (w["whatIf"], d1["priority"], d1["priorityScore"]))
before_state = (call("GET", f"/incidents/{i3['id']}", token=A)[1]["version"],
                int(sql(f"select count(*) from audit_records where incident_id={i3['id']}")))
s, w = what_if(E2, incidentId=i3["id"], impact=5, urgency=5, affectedUsers=500)
d3 = call("GET", f"/incidents/{i3['id']}", token=A)[1]
check("what-if for an incident shows current and what-if, with a higher score",
      s == 200 and w["current"]["priority"] == d3["priority"] and w["whatIf"]["score"] > w["current"]["score"]
      and w["scoreDifference"] == w["whatIf"]["score"] - w["current"]["score"], w)
check("what-if changes nothing (version, priority, audit rows)",
      (d3["version"], int(sql(f"select count(*) from audit_records where incident_id={i3['id']}"))) == before_state
      and d3["priority"] == call("GET", f"/incidents/{i3['id']}", token=E2)[1]["priority"])
check("what-if on someone else's incident is 404", what_if(E1, incidentId=i3["id"], impact=2, urgency=2, affectedUsers=2)[0] == 404)
check("what-if unknown service is 404", what_if(E1, serviceId=999999, impact=2, urgency=2, affectedUsers=2)[0] == 404)
check("what-if without incident or service is 400", what_if(E1, impact=2, urgency=2, affectedUsers=2)[0] == 400)
check("what-if out-of-range values are 400", what_if(E1, serviceId=svc_a, impact=9, urgency=2, affectedUsers=2)[0] == 400)
lo = what_if(E1, serviceId=svc_b, impact=1, urgency=1, affectedUsers=1)[1]["whatIf"]["priority"]
hi = what_if(E1, serviceId=svc_b, impact=5, urgency=5, affectedUsers=500)[1]["whatIf"]["priority"]
check("what-if low and high inputs give different priorities", lo != hi, (lo, hi))

# nothing the reports did changed the data
check("reports left the incident count unchanged", count("true") == all_admin["totalItems"])
