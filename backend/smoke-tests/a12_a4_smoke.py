"""Smoke test of A12 (password reset, two-step verification) and A4 (simulated mobile push).

Local dev server with the Flyway seed (profile dev), Mailpit on 8025 for the reset mails, local DB only.
Port and database come from SMOKE_PORT (default 8081) and SMOKE_DB (default iitsm). Run on a fresh database: it
changes the passwords of employee2 and employee3, and puts MFA on employee4 to employee6.
The TOTP codes are computed here by an independent implementation (checked against the RFC 4226 vector first), so
a pass also proves the Java and the Python versions agree.
"""
import atexit
import base64
import hashlib
import hmac
import json
import os
import re
import struct
import subprocess
import time
import urllib.error
import urllib.request

PORT = os.environ.get("SMOKE_PORT", "8081")
DB = os.environ.get("SMOKE_DB", "iitsm")
BASE = f"http://localhost:{PORT}/api/v1"
MAIL = "http://localhost:8025/api/v1"
PW = "Demo@1234"
NEWPW = "Tr4in-lamp-91x"
results = []


@atexit.register
def report_results():
    for status, name, detail in results:
        print(f"{status}  {name}" + (f"   -> {detail}" if status == "FAIL" else ""))
    print(f"\n{sum(r[0] == 'PASS' for r in results)}/{len(results)} passed")


def http(method, url, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            text = r.read().decode("utf-8", "replace")
            try:
                return r.status, (json.loads(text) if text else None)
            except json.JSONDecodeError:
                return r.status, text
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(text)
        except json.JSONDecodeError:
            return e.code, text


def call(method, path, body=None, token=None):
    return http(method, BASE + path, body, token)


def check(name, ok, detail=""):
    results.append(("PASS" if ok else "FAIL", name, detail))


def sql(statement):
    out = subprocess.run(["docker", "exec", os.environ.get("SMOKE_CONTAINER", "iitsm-db"), "psql", "-U", "iitsm", "-d", DB, "-tAc", statement],
                         capture_output=True, text=True)
    return out.stdout.strip() or out.stderr.strip()


def login(email, password=PW, totp=None):
    body = {"email": email, "password": password}
    if totp is not None:
        body["totp"] = totp
    return call("POST", "/auth/login", body)


def token_of(email, password=PW):
    status, body = login(email, password)
    assert status == 200, f"login {email}: {status} {body}"
    return body["accessToken"]


# ---- an independent TOTP (RFC 6238 / 4226), checked against the RFC vector ---------------------------------
def hotp(secret_bytes, counter):
    digest = hmac.new(secret_bytes, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return f"{value % 1_000_000:06d}"


def totp(base32_secret, step):
    return hotp(base64.b32decode(base32_secret + "=" * (-len(base32_secret) % 8)), step)


def now_step():
    return int(time.time()) // 30


check("python TOTP matches the RFC 4226 vector (counter 1 = 287082)", hotp(b"12345678901234567890", 1) == "287082")


# ===================================================== A12: password reset =====================================
def mails():
    return http("GET", MAIL + "/messages")[1]["messages"]


def mail_token_for(address, wait=8):
    deadline = time.time() + wait
    while time.time() < deadline:
        for m in mails():
            if any(t["Address"].lower() == address.lower() for t in m["To"]):
                text = http("GET", MAIL + "/message/" + m["ID"])[1]["Text"]
                found = re.search(r"reset-password\?token=([A-Za-z0-9_-]+)", text)
                if found:
                    return found.group(1), text, m["Subject"]
        time.sleep(0.5)
    return None, "", ""


http("DELETE", MAIL + "/messages")
old_refresh = call("POST", "/auth/login", {"email": "employee2@iitsm.demo", "password": PW})[1]["refreshToken"]

s1, b1 = call("POST", "/auth/password-reset/request", {"email": "nobody.here@iitsm.demo"})
s2, b2 = call("POST", "/auth/password-reset/request", {"email": "employee2@iitsm.demo"})
check("an unknown e-mail is answered 202", s1 == 202, f"{s1}")
check("a known e-mail is answered 202", s2 == 202, f"{s2}")
check("the two answers are identical (no way to find who has an account)", b1 == b2, f"{b1!r} vs {b2!r}")

secret, mail_text, subject = mail_token_for("employee2@iitsm.demo")
check("the reset mail arrives with a link", secret is not None and len(secret) >= 40, f"{secret!r}")
check("the mail has a sensible subject", "password" in subject.lower(), subject)
check("the link points at the frontend reset page", "/reset-password?token=" in mail_text)
check("the link says how long it works", "30 minutes" in mail_text, mail_text[:160].replace("\n", " "))
time.sleep(1)
check("no mail was sent for the unknown e-mail", len([m for m in mails()
      if any("nobody.here" in t["Address"] for t in m["To"])]) == 0)
check("only a hash of the secret is stored", sql("select count(*) from password_reset_tokens") == "1"
      and sql(f"select count(*) from password_reset_tokens where token_hash = '{secret}'") == "0"
      and len(sql("select token_hash from password_reset_tokens limit 1")) == 64)

check("a wrong secret is 400 on the token field", call("POST", "/auth/password-reset/confirm",
      {"token": "not-a-real-secret-not-a-real-secret-0000", "newPassword": NEWPW})[0] == 400)
status, weak = call("POST", "/auth/password-reset/confirm", {"token": secret, "newPassword": "Password1"})
check("a weak password is refused with a field error on newPassword",
      status == 400 and any(f["field"] == "newPassword" for f in weak.get("fieldErrors", [])), str(weak)[:200])
check("the link still works after a refused password", sql("select count(*) from password_reset_tokens where used_at is null") == "1")
check("confirming with the secret and a good password is 204",
      call("POST", "/auth/password-reset/confirm", {"token": secret, "newPassword": NEWPW})[0] == 204)
check("the new password logs in", login("employee2@iitsm.demo", NEWPW)[0] == 200)
check("the old password no longer works", login("employee2@iitsm.demo", PW)[0] == 401)
check("the link cannot be used twice", call("POST", "/auth/password-reset/confirm",
      {"token": secret, "newPassword": "Another-Pass-77x"})[0] == 400)
check("sessions from before the reset are signed out",
      call("POST", "/auth/refresh", {"refreshToken": old_refresh})[0] == 401)

# a second request cancels the first link
http("DELETE", MAIL + "/messages")
call("POST", "/auth/password-reset/request", {"email": "employee3@iitsm.demo"})
first, _, _ = mail_token_for("employee3@iitsm.demo")
http("DELETE", MAIL + "/messages")
call("POST", "/auth/password-reset/request", {"email": "employee3@iitsm.demo"})
second, _, _ = mail_token_for("employee3@iitsm.demo")
check("asking again sends a different link", first and second and first != second)
check("the older link is cancelled", call("POST", "/auth/password-reset/confirm",
      {"token": first, "newPassword": NEWPW})[0] == 400)
sql("update password_reset_tokens set expires_at = now() - interval '1 minute' where used_at is null")
check("an expired link is 400", call("POST", "/auth/password-reset/confirm",
      {"token": second, "newPassword": NEWPW})[0] == 400)
check("both steps are audited",
      int(sql("select count(*) from audit_records where action = 'PASSWORD_RESET_REQUESTED'")) >= 3
      and int(sql("select count(*) from audit_records where action = 'PASSWORD_CHANGED'")) == 1)

# ===================================================== A12: two-step verification ===============================
emp4 = token_of("employee4@iitsm.demo")
check("two-step is off to begin with", call("GET", "/auth/mfa", None, emp4)[1] == {"enabled": False})
status, setup = call("POST", "/auth/mfa/setup", None, emp4)
secret4 = setup["secret"]
check("setup gives a Base32 secret and an otpauth address", status == 200 and re.fullmatch(r"[A-Z2-7]{32}", secret4)
      and setup["otpauthUri"].startswith("otpauth://totp/I-ITSM") and "secret=" + secret4 in setup["otpauthUri"], str(setup)[:200])
check("setup alone does not switch it on", call("GET", "/auth/mfa", None, emp4)[1] == {"enabled": False})
check("login still needs no code before enabling", login("employee4@iitsm.demo")[0] == 200)
step = now_step()
check("enable with a wrong code is 400", call("POST", "/auth/mfa/enable", {"code": totp(secret4, step + 9)}, emp4)[0] == 400)
check("a malformed code is 400", call("POST", "/auth/mfa/enable", {"code": "12ab56"}, emp4)[0] == 400)
step = now_step()
used_code = totp(secret4, step)
check("enable with the right code is 204", call("POST", "/auth/mfa/enable", {"code": used_code}, emp4)[0] == 204)
check("two-step is now on", call("GET", "/auth/mfa", None, emp4)[1] == {"enabled": True})
check("setup again while on is refused", call("POST", "/auth/mfa/setup", None, emp4)[0] == 400)
check("turning on is audited", int(sql("select count(*) from audit_records where action = 'MFA_ENABLED'")) == 1)

s, b = login("employee4@iitsm.demo")
check("right password without a code is 401 MFA_REQUIRED", s == 401 and b["code"] == "MFA_REQUIRED", f"{s} {b}")
s, b = login("employee4@iitsm.demo", PW, totp(secret4, now_step() + 9))
check("a wrong code is 401 INVALID_MFA_CODE", s == 401 and b["code"] == "INVALID_MFA_CODE", f"{s} {b}")
s, b = login("employee4@iitsm.demo", PW, used_code)
check("the code that switched it on cannot be replayed", s == 401 and b["code"] == "INVALID_MFA_CODE", f"{s} {b}")
next_code = totp(secret4, now_step() + 1)  # inside the one-step drift window and later than the last accepted step
s, b = login("employee4@iitsm.demo", PW, next_code)
check("the next step's code is accepted (drift of one step)", s == 200 and "accessToken" in b, f"{s} {b}")
s, b = login("employee4@iitsm.demo", PW, next_code)
check("that code cannot be used twice", s == 401 and b["code"] == "INVALID_MFA_CODE", f"{s} {b}")
s, b = login("employee4@iitsm.demo", "Wrong-password-1", totp(secret4, now_step() + 1))
check("a wrong password with a good code is still the generic 401", s == 401 and b["code"] == "INVALID_CREDENTIALS", f"{s} {b}")
check("failed codes are audited as failed logins",
      int(sql("select count(*) from audit_records where action = 'LOGIN_FAILED' and description like '%verification code%'")) >= 2)

check("disable with a wrong code is 400", call("POST", "/auth/mfa/disable", {"code": totp(secret4, now_step() + 9)}, emp4)[0] == 400)

# turning it off with a current code (a later step than the one that switched it on)
emp7 = token_of("employee7@iitsm.demo")
secret7 = call("POST", "/auth/mfa/setup", None, emp7)[1]["secret"]
call("POST", "/auth/mfa/enable", {"code": totp(secret7, now_step())}, emp7)
check("employee7 needs a code now", login("employee7@iitsm.demo")[1].get("code") == "MFA_REQUIRED")
check("disable with the code that switched it on is refused (already used)",
      call("POST", "/auth/mfa/disable", {"code": totp(secret7, now_step())}, emp7)[0] == 400)
check("disable with the next code is 204", call("POST", "/auth/mfa/disable", {"code": totp(secret7, now_step() + 1)}, emp7)[0] == 204)
check("after disabling, login needs no code", login("employee7@iitsm.demo")[0] == 200)
check("two-step is off again", call("GET", "/auth/mfa", None, emp7)[1] == {"enabled": False})

# a user who lost the phone: the administrator resets it
emp6 = token_of("employee6@iitsm.demo")
secret6 = call("POST", "/auth/mfa/setup", None, emp6)[1]["secret"]
call("POST", "/auth/mfa/enable", {"code": totp(secret6, now_step())}, emp6)
check("employee6 now needs a code", login("employee6@iitsm.demo")[1].get("code") == "MFA_REQUIRED")
admin = token_of("asha.rao@iitsm.demo")
emp6_id = sql("select id from users where email = 'employee6@iitsm.demo'")
check("an employee cannot reset someone's two-step", call("POST", f"/admin/users/{emp6_id}/mfa/reset", None, emp4)[0] == 403)
check("an administrator can (204)", call("POST", f"/admin/users/{emp6_id}/mfa/reset", None, admin)[0] == 204)
check("after the reset the login needs no code", login("employee6@iitsm.demo")[0] == 200)
check("the reset is audited as MFA_DISABLED by the administrator",
      int(sql("select count(*) from audit_records where action = 'MFA_DISABLED' and description like '%administrator%'")) == 1)

# guessing codes locks the account like guessing passwords
emp5 = token_of("employee5@iitsm.demo")
secret5 = call("POST", "/auth/mfa/setup", None, emp5)[1]["secret"]
call("POST", "/auth/mfa/enable", {"code": totp(secret5, now_step())}, emp5)
codes = []
for i in range(5):
    codes.append(login("employee5@iitsm.demo", PW, f"{(i * 7919) % 900000 + 100000:06d}")[0])
s, b = login("employee5@iitsm.demo", PW, totp(secret5, now_step() + 1))
check("five wrong codes lock the account (423, even with a right code)", s == 423 and b["code"] == "ACCOUNT_LOCKED",
      f"codes {codes}, then {s} {b}")

# ===================================================== A4: simulated mobile push ===============================
emp1 = token_of("employee1@iitsm.demo")
tech_emails = ["tech1", "tech2", "tech3", "tech4", "tech5", "priya.nair", "karthik", "neha"]
check("no devices to begin with", call("GET", "/notifications/devices", None, emp1)[1] == [])
S, d1 = call("POST", "/notifications/devices", {"token": "fcm-token-employee1-abcdef123456", "platform": "ANDROID"}, emp1)
check("registering a device is 201", S == 201 and d1["platform"] == "ANDROID", f"{S} {d1}")
check("the token is shown only as a hint", d1["tokenHint"].endswith("123456") and "fcm-token" not in json.dumps(d1))
S, d1b = call("POST", "/notifications/devices", {"token": "fcm-token-employee1-abcdef123456", "platform": "ANDROID"}, emp1)
check("registering the same device again is 200 with the same id", S == 200 and d1b["id"] == d1["id"], f"{S} {d1b}")
check("a bad platform is 400", call("POST", "/notifications/devices", {"token": "fcm-token-xxxxxxxx", "platform": "FAX"}, emp1)[0] == 400)
check("a too short token is 400", call("POST", "/notifications/devices", {"token": "short", "platform": "WEB"}, emp1)[0] == 400)

emp2 = token_of("employee2@iitsm.demo", NEWPW)
ids = []
for i in range(5):
    S, d = call("POST", "/notifications/devices", {"token": f"web-token-employee2-device-{i}-aaaa", "platform": "WEB"}, emp2)
    ids.append(d["id"] if S == 201 else None)
S, over = call("POST", "/notifications/devices", {"token": "web-token-employee2-device-6-aaaa", "platform": "WEB"}, emp2)
check("a sixth device is refused (the limit is a setting, 5 by default)", S == 400 and None not in ids, f"{S} {over}")
check("another user cannot remove my device", call("DELETE", f"/notifications/devices/{ids[0]}", None, emp1)[0] == 404)
check("I can remove my own (204)", call("DELETE", f"/notifications/devices/{ids[0]}", None, emp2)[0] == 204)
check("it is gone from my list", all(d["id"] != ids[0] for d in call("GET", "/notifications/devices", None, emp2)[1]))

# a device handed to someone else moves to them
emp3 = token_of("employee3@iitsm.demo")
S, moved = call("POST", "/notifications/devices", {"token": "fcm-token-employee1-abcdef123456", "platform": "IOS"}, emp3)
check("registering another person's device token moves it (200)", S == 200 and moved["id"] == d1["id"] and moved["platform"] == "IOS", f"{S} {moved}")
check("the first owner no longer has it", call("GET", "/notifications/devices", None, emp1)[1] == [])
call("POST", "/notifications/devices", {"token": "fcm-token-employee1-abcdef123456", "platform": "ANDROID"}, emp1)  # back to employee1

# every technician registers a device, then a P1 is reported on Payment
tech_tokens = {}
for e in tech_emails:
    t = token_of(e + "@iitsm.demo")
    tech_tokens[e] = t
    call("POST", "/notifications/devices", {"token": f"fcm-token-{e}-0123456789abcdef", "platform": "ANDROID"}, t)


def push_rows(tok):
    S, page = call("GET", "/notifications?channel=PUSH_SIM&size=100", None, tok)
    return page["items"] if S == 200 else []


def total_push():
    return sum(len(push_rows(t)) for t in tech_tokens.values()) + len(push_rows(emp1))


before = total_push()
services = {s["name"]: s["id"] for s in call("GET", "/services", None, emp1)[1]}
cats = {}


def walk(nodes):
    for n in nodes:
        cats[n["name"]] = n["id"]
        walk(n.get("children", []))


walk(call("GET", "/categories", None, emp1)[1])
S, p4 = call("POST", "/incidents", {"title": "Printer on floor two prints blank pages", "description": "The printer on floor two prints only blank pages since this morning for everyone.",
              "serviceId": services["Printing"], "categoryId": cats.get("Hardware", next(iter(cats.values()))), "impact": 1, "urgency": 1,
              "affectedUsers": 1, "confirmNotDuplicate": True}, emp1)
time.sleep(3)
check("a P3 or P4 incident pushes nothing urgent", S == 201 and p4["priority"] in ("P3", "P4") and total_push() == before,
      f"{S} {p4.get('priority')} before {before} after {total_push()}")
S, p1 = call("POST", "/incidents", {"title": "Payment application is unavailable", "description": "The payment application is unavailable and users cannot complete any transaction at all.",
              "serviceId": services["Payment"], "categoryId": cats.get("Application", next(iter(cats.values()))), "impact": 5, "urgency": 5,
              "affectedUsers": 150, "confirmNotDuplicate": True}, emp1)
check("the P1 is created", S == 201 and p1["priority"] == "P1", f"{S} {str(p1)[:160]}")
time.sleep(4)
pushed = [(e, r) for e, t in tech_tokens.items() for r in push_rows(t)]
check("the P1 pushes to a technician's device", len(pushed) >= 1 and total_push() > before, f"{[(e, r['eventType']) for e, r in pushed]}")
check("pushed rows are labelled PUSH_SIM and name the incident",
      all(r["channel"] == "PUSH_SIM" and r.get("incidentId") == p1["id"] for _, r in pushed), str(pushed[:1])[:200])
check("the inbox row and the push are separate", call("GET", "/notifications?size=100", None, tech_tokens[pushed[0][0]])[1]["totalItems"] >= 1)

assignee = next((e for e, r in pushed if r["eventType"] == "INCIDENT_ASSIGNED"), None)
if assignee:
    t = tech_tokens[assignee]
    call("POST", f"/incidents/{p1['id']}/acknowledge", {}, t)
    call("POST", f"/incidents/{p1['id']}/start", {}, t)
    before_reporter = len(push_rows(emp1))
    S, _ = call("POST", f"/incidents/{p1['id']}/request-info", {"message": "Which payment screen shows the error and what does it say?"}, t)
    time.sleep(3)
    rows = push_rows(emp1)
    check("asking the reporter for information pushes to their device",
          S in (200, 201) and len(rows) > before_reporter and any(r["eventType"] == "INFO_REQUESTED" for r in rows), f"{S} {[r['eventType'] for r in rows]}")
else:
    check("with nobody to assign, the team lead is pushed the triage alert",
          any(r["eventType"] == "TRIAGE_NEEDED" for r in push_rows(tech_tokens["priya.nair"])),
          str([r["eventType"] for r in push_rows(tech_tokens["priya.nair"])]))

S, prefs = call("GET", "/notifications/preferences", None, emp1)
check("the preference switches did not change (still 60, push is not a switch)",
      S == 200 and len(prefs) == 60 and all(p["channel"] != "PUSH_SIM" for p in prefs), f"{len(prefs)}")
check("a person with no device gets no push rows", len(push_rows(call("POST", "/auth/login", {"email": "employee8@iitsm.demo", "password": PW})[1]["accessToken"])) == 0)
check("CHAT and EMAIL are still not listable", call("GET", "/notifications?channel=EMAIL", None, emp1)[0] == 400)
