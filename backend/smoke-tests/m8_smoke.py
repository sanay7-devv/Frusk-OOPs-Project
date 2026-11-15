"""Smoke test of M8, events and the audit trail (local dev server on 8081, throwaway data, local DB only)."""
import os
import atexit
import json
import secrets
import subprocess
import time
import urllib.error
import urllib.request

BASE = "http://localhost:" + os.environ.get("SMOKE_PORT", "8081") + "/api/v1"
RUN = secrets.token_hex(3)
PW = "Ab9-Zq" + secrets.token_hex(4) + "9"
results = []


@atexit.register
def report_results():
    for status, name, detail in results:
        print(f"{status}  {name}" + (f"   -> {detail}" if status == "FAIL" else ""))
    print(f"\n{sum(r[0] == 'PASS' for r in results)}/{len(results)} passed")


def call(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw


def check(name, ok, detail=""):
    results.append(("PASS" if ok else "FAIL", name, detail))


def sql(statement):
    out = subprocess.run(["docker", "exec", os.environ.get("SMOKE_CONTAINER", "iitsm-db"), "psql", "-U", "iitsm", "-d", os.environ.get("SMOKE_DB", "iitsm"), "-tAc", statement],
                         capture_output=True, text=True)
    return out.stdout.strip() or out.stderr.strip()


def login(email, password=PW):
    s, b = call("POST", "/auth/login", {"email": email, "password": password})
    return b["accessToken"] if s == 200 else None


def mail(tag):
    return f"{tag}.{RUN}@iitsm.demo"


def rows(inc_id):
    return int(sql(f"select count(*) from audit_records where incident_id={inc_id}"))


def history(inc_id, token):
    s, b = call("GET", f"/incidents/{inc_id}/history", token=token)
    return b if s == 200 else []


def audit(params):
    s, b = call("GET", "/audit?" + params, token=A)
    return b["items"] if s == 200 else []


# ---------------------------------------------------------------- setup
call("POST", "/auth/register", {"name": "Root Admin", "email": mail("root"), "password": PW})
root_id = int(sql(f"select id from users where email='{mail('root')}'"))
sql(f"insert into user_roles(user_id, role_type, granted_at) values ({root_id}, 'ADMINISTRATOR', now())")
sql(f"insert into administrator_profiles(user_id, scope) values ({root_id}, 'SYSTEM_ADMIN')")
A = login(mail("root"))
s, _ = call("PUT", "/admin/config", [{"key": "sla.monitor.interval.seconds", "value": "5"}], token=A)
check("config change accepted", s == 200, s)
cfg = audit(f"action=CONFIG_CHANGED&actorId={root_id}")
check("CONFIG_CHANGED audited with old and new value",
      len(cfg) >= 1 and "sla.monitor.interval.seconds" in cfg[0]["description"] and "→ 5" in cfg[0]["description"],
      cfg[:1])

skill = call("POST", "/admin/skills", {"name": f"Aud-{RUN}"}, token=A)[1]["id"]
svc = call("POST", "/admin/services", {"name": f"AudSvc-{RUN}", "criticality": 2, "alwaysP1": False}, token=A)[1]["id"]
cat = call("POST", "/admin/categories", {"name": f"AudCat-{RUN}", "requiredSkillIds": [skill]}, token=A)[1]["id"]
for prio in ("P1", "P2", "P3", "P4"):
    call("POST", "/admin/sla-policies", {"serviceId": svc, "priority": prio, "responseMinutes": 60,
                                         "resolutionMinutes": 240}, token=A)


def user(tag, roles, technician=None):
    body = {"name": tag.title() + " " + RUN, "email": mail(tag), "password": PW, "roles": roles}
    if technician:
        body["technician"] = technician
    s, b = call("POST", "/admin/users", body, token=A)
    return b["id"] if s == 201 else None


tech_id = user("tech", ["EMPLOYEE", "TECHNICIAN"], {"experienceLevel": 3, "escalationLevel": 0, "maxLoad": 50,
                                                     "availability": "AVAILABLE",
                                                     "skills": [{"skillId": skill, "proficiency": 5}]})
emp_id, other_id = user("emp", ["EMPLOYEE"]), user("other", ["EMPLOYEE"])
T, E, O = login(mail("tech")), login(mail("emp")), login(mail("other"))

# ---------------------------------------------------------------- creation pipeline in the trail
s, inc = call("POST", "/incidents", {"confirmNotDuplicate": True, "title": f"VPN drops {RUN}", "description": "VPN disconnects every few minutes " + RUN,
                                     "serviceId": svc, "categoryId": cat, "impact": 2, "urgency": 2,
                                     "affectedUsers": 3}, token=E)
iid, code = inc["id"], inc["code"]
h = history(iid, E)
check("creation: CREATED, CLASSIFIED, PRIORITY_CALCULATED, ASSIGNED in order",
      [e["action"] for e in h] == ["INCIDENT_CREATED", "CLASSIFIED", "PRIORITY_CALCULATED", "ASSIGNED"],
      [e["action"] for e in h])
check("creation: states null→NEW, NEW→CLASSIFIED, CLASSIFIED→ASSIGNED",
      [(e["previousState"], e["newState"]) for e in h] ==
      [(None, "NEW"), ("NEW", "CLASSIFIED"), ("CLASSIFIED", "CLASSIFIED"), ("CLASSIFIED", "ASSIGNED")], h)
check("creation: reporter is the actor of CREATED, the system of ASSIGNED",
      h[0]["actor"]["id"] == emp_id and h[3]["actor"] is None and h[0]["incidentCode"] == code, h)
check("PRIORITY_CALCULATED explains the score and deadlines", "score" in h[2]["description"]
      and "resolution due" in h[2]["description"], h[2])

# ---------------------------------------------------------------- done-when: one transition, one row; a failure, none
before = rows(iid)
s, _ = call("POST", f"/incidents/{iid}/acknowledge", token=T)
new = history(iid, A)[-1]
check("M8 done-when: one transition gives exactly one row with the right states and actor",
      s == 200 and rows(iid) == before + 1 and new["action"] == "ACKNOWLEDGED"
      and (new["previousState"], new["newState"]) == ("ASSIGNED", "ACKNOWLEDGED") and new["actor"]["id"] == tech_id,
      (s, new))
before = rows(iid)
s, b = call("POST", f"/incidents/{iid}/verify", token=E)
check("M8 done-when: a refused transition (409) leaves no row", s == 409 and rows(iid) == before, (s, b))
s, b = call("POST", f"/incidents/{iid}/resolve", {"rootCause": "x" * 12, "notes": "y" * 12, "timeSpentMinutes": 5}, token=T)
check("refused resolve from ACKNOWLEDGED (409): no row", s == 409 and rows(iid) == before, (s, b))

# ---------------------------------------------------------------- ACCESS_DENIED
s, _ = call("POST", f"/incidents/{iid}/start", token=O)
denied = audit(f"action=ACCESS_DENIED&actorId={other_id}")
check("403 on an incident action is audited as ACCESS_DENIED (survives the rollback)",
      s == 403 and len(denied) == 1 and f"/incidents/{iid}/start" in denied[0]["description"], (s, denied))
s, _ = call("GET", "/audit", token=E)
denied = audit(f"action=ACCESS_DENIED&actorId={emp_id}")
check("403 from a permission check (@PreAuthorize) is audited too", s == 403 and len(denied) == 1, (s, denied))
check("the refused start left no incident row", rows(iid) == before, rows(iid))

# ---------------------------------------------------------------- comments and internal notes
call("POST", f"/incidents/{iid}/start", token=T)
call("POST", f"/incidents/{iid}/comments", {"body": "Checking the VPN concentrator logs.", "visibility": "INTERNAL"},
     token=T)
call("POST", f"/incidents/{iid}/comments", {"body": "We are looking into it."}, token=T)
staff = [e["description"] for e in history(iid, T) if e["action"] == "COMMENT_ADDED"]
mine = [e["description"] for e in history(iid, E) if e["action"] == "COMMENT_ADDED"]
check("staff see the internal note entry", any(d.startswith("Internal note") for d in staff) and len(staff) == 2, staff)
check("the reporter sees only the public comment entry", len(mine) == 1 and mine[0].startswith("Comment added"), mine)
s, b = call("GET", f"/incidents/{iid}/history", token=O)
check("a stranger gets 404 on the history", s == 404 and b.get("code") == "INCIDENT_NOT_FOUND", (s, b))

# ---------------------------------------------------------------- the rest of the lifecycle
call("POST", f"/incidents/{iid}/request-info", {"message": "Which VPN client version do you use?"}, token=T)
call("POST", f"/incidents/{iid}/provide-info", {"message": "Version 5.2"}, token=E)
call("POST", f"/incidents/{iid}/resolve", {"rootCause": "Idle timeout too short", "notes": "Raised the idle timeout.", "timeSpentMinutes": 20},
     token=T)
call("POST", f"/incidents/{iid}/verify", token=E)
call("POST", f"/incidents/{iid}/close", token=A)
call("POST", f"/incidents/{iid}/reopen", {"reason": "It dropped again this morning."}, token=E)
acts = [e["action"] for e in history(iid, A)][5:]
check("every lifecycle move audited once, in order", acts == [
    "WORK_STARTED", "COMMENT_ADDED", "COMMENT_ADDED", "INFO_REQUESTED", "INFO_PROVIDED", "RESOLVED", "VERIFIED",
    "CLOSED", "REOPENED"], acts)
s, _ = call("POST", f"/incidents/{iid}/override-priority", {"priority": "P1", "reason": "VIP user is affected"},
            token=A)
last = history(iid, E)[-1]
check("PRIORITY_CHANGED visible to the reporter without the internal reason",
      s == 200 and last["action"] == "PRIORITY_CHANGED" and "VIP" not in last["description"], last)

# ---------------------------------------------------------------- security events
call("POST", "/auth/login", {"email": mail("emp"), "password": "Wrong-password-1"})
failed = audit(f"action=LOGIN_FAILED&actorId={emp_id}")
check("wrong password: LOGIN_FAILED with the account as actor",
      len(failed) == 1 and "wrong password" in failed[0]["description"], failed)
ghost = f"ghost.{RUN}@iitsm.demo"
call("POST", "/auth/login", {"email": ghost, "password": "Whatever-1"})
check("unknown email: LOGIN_FAILED naming the email, no actor",
      any(ghost in e["description"] and e["actor"] is None for e in audit("action=LOGIN_FAILED&size=50")), ghost)
s, _ = call("POST", f"/admin/users/{other_id}/roles", {"roleType": "ADMINISTRATOR",
                                                        "administrator": {"scope": "IT_MANAGER"}}, token=A)
roles = audit(f"action=USER_ROLE_CHANGED&actorId={root_id}")
check("role change audited", s == 200 and len(roles) >= 1 and "ADMINISTRATOR granted to" in roles[0]["description"],
      (s, roles[:1]))

# ---------------------------------------------------------------- SLA alerts reach the trail
sql(f"update incidents set resolution_due = now() + interval '1800 seconds' where id={iid}")  # 87 % of 240 min
end = time.time() + 75
while time.time() < end and not any(e["action"] == "SLA_WARNING" for e in history(iid, A)):
    time.sleep(2)
sla = [e for e in history(iid, A) if e["action"] == "SLA_WARNING"]
check("SLA warning from the monitor is audited with the system as actor",
      len(sla) == 1 and sla[0]["actor"] is None and "Resolution clock" in sla[0]["description"], sla)

# ---------------------------------------------------------------- GET /audit
s, b = call("GET", f"/audit?incidentId={iid}&size=100", token=A)
check("GET /audit by incident: paged, newest first, all of this incident",
      s == 200 and b["totalItems"] == rows(iid) and all(e["incidentCode"] == code for e in b["items"])
      and b["items"][0]["timestamp"] >= b["items"][-1]["timestamp"], (s, b and b.get("totalItems"), rows(iid)))
s, b = call("GET", "/audit?from=2030-01-01T00:00:00Z&to=2020-01-01T00:00:00Z", token=A)
check("from after to: 400 on 'to'", s == 400 and [f["field"] for f in b["fieldErrors"]] == ["to"], (s, b))
s, b = call("GET", "/audit?action=NOT_AN_ACTION", token=A)
check("unknown action: 400", s == 400, (s, b))

call("PUT", "/admin/config", [{"key": "sla.monitor.interval.seconds", "value": "60"}], token=A)
