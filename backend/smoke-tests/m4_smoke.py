"""Smoke test of M4 incidents + M5 priority against the local dev server (throwaway data, local DB only)."""
import os
import json
import secrets
import subprocess
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime

BASE = "http://localhost:" + os.environ.get("SMOKE_PORT", "8081") + "/api/v1"
RUN = secrets.token_hex(3)
PW = "Ab9-Zq" + secrets.token_hex(4) + "9"
results = []


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


def ts(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def fe(b):
    return sorted({f["field"] for f in b.get("fieldErrors", [])}) if isinstance(b, dict) else b


# Settings this suite assumes (restored at exit): confident incidents stay in triage (DEC-70 off), no 429 on bursts
import smoke_setup  # noqa: E402
smoke_setup.tune(os.environ.get("SMOKE_PORT", "8081"), lambda q: sql(q), {**smoke_setup.NO_AUTOCAT, **smoke_setup.NO_RATE_LIMITS})

# ---------------------------------------------------------------- people
def user(tag, name):
    email = f"{tag}.{RUN}@iitsm.demo"
    call("POST", "/auth/register", {"name": name, "email": email, "password": PW})
    return sql(f"select id from users where email='{email}'"), email


def tech(uid, escalation=0, availability="AVAILABLE", max_load=10):
    sql(f"insert into user_roles(user_id, role_type, granted_at) values ({uid}, 'TECHNICIAN', now())")
    sql(f"insert into technician_profiles(user_id, experience_level, escalation_level, availability, max_load) "
        f"values ({uid}, 3, {escalation}, '{availability}', {max_load})")


def login(email):
    return call("POST", "/auth/login", {"email": email, "password": PW})[1]["accessToken"]


admin_id, admin_mail = user("admin", "Asha Admin")
sql(f"insert into user_roles(user_id, role_type, granted_at) values ({admin_id}, 'ADMINISTRATOR', now())")
sql(f"insert into administrator_profiles(user_id, scope) values ({admin_id}, 'SYSTEM_ADMIN')")
lead_id, lead_mail = user("lead", "Priya Lead")
tech(lead_id, escalation=1)
t1_id, t1_mail = user("tech1", "Tech One")
tech(t1_id)
t2_id, t2_mail = user("tech2", "Tech Two")
tech(t2_id)
away_id, away_mail = user("away", "Away Tech")
tech(away_id, availability="AWAY")
k_id, k_mail = user("karthik", "Karthik Multi")
tech(k_id)
emp_id, emp_mail = user("emp", "Employee A")
emp2_id, emp2_mail = user("emp2", "Employee B")
A, L, T1, T2, K, E, E2 = (login(m) for m in (admin_mail, lead_mail, t1_mail, t2_mail, k_mail, emp_mail, emp2_mail))
AW = login(away_mail)

# ---------------------------------------------------------------- catalog
net_skill = call("POST", "/admin/skills", {"name": f"Networking-{RUN}"}, token=A)[1]["id"]
for uid in (t1_id, t2_id, away_id, k_id, lead_id):
    sql(f"insert into technician_skills(technician_id, skill_id, proficiency) values ({uid}, {net_skill}, 4)")
other_skill = call("POST", "/admin/skills", {"name": f"Mainframe-{RUN}"}, token=A)[1]["id"]


def service(name, crit, always=False):
    return call("POST", "/admin/services", {"name": f"{name}-{RUN}", "criticality": crit, "alwaysP1": always}, token=A)[1]["id"]


pay = service("Payment", 5, True)
net = service("Network", 4)
c5, c3, c2, c1 = service("Crit5", 5), service("Crit3", 3), service("Crit2", 2), service("Crit1", 1)
for prio, resp, res in (("P1", 5, 30), ("P2", 15, 120), ("P3", 60, 480), ("P4", 240, 1440)):
    call("POST", "/admin/sla-policies", {"priority": prio, "responseMinutes": resp, "resolutionMinutes": res}, token=A)
call("POST", "/admin/sla-policies", {"serviceId": pay, "priority": "P1", "responseMinutes": 3, "resolutionMinutes": 20}, token=A)
netcat = call("POST", "/admin/categories", {"name": f"Network-{RUN}", "requiredSkillIds": [net_skill]}, token=A)[1]["id"]
seccat = call("POST", "/admin/categories", {"name": "Security"}, token=A)[1]["id"]
phish = call("POST", "/admin/categories", {"name": f"Phishing-{RUN}", "parentId": seccat}, token=A)[1]["id"]
mfcat = call("POST", "/admin/categories", {"name": f"Mainframe-{RUN}", "requiredSkillIds": [other_skill]}, token=A)[1]["id"]

DESC = "The service is unavailable and users cannot complete their work at all."


def report(token, svc, impact, urgency, users, category=None, title="Something is broken"):
    return call("POST", "/incidents", {"confirmNotDuplicate": True, "title": title, "description": DESC, "serviceId": svc, "categoryId": category,
                                       "impact": impact, "urgency": urgency, "affectedUsers": users}, token=token)


import atexit


@atexit.register
def report_results():
    for status, name, detail in results:
        print(f"{status}  {name}" + (f"   -> {detail}" if status == "FAIL" else ""))
    print(f"\n{sum(r[0] == 'PASS' for r in results)}/{len(results)} passed")


# ---------------------------------------------------------------- T01: creation pipeline
s, inc = report(E, pay, 5, 5, 150, title="Payment application unavailable")
b = inc.get("priorityBreakdown", {}) if isinstance(inc, dict) else {}
check("T01 create -> 201, CLASSIFIED, code INC-YYYY-NNNNN", s == 201 and inc["status"] == "CLASSIFIED"
      and inc["code"].startswith(f"INC-{datetime.utcnow().year}-") and len(inc["code"]) == 14, (s, inc))
check("T01 score 187 (5x5x5x1.5) -> P1, major", s == 201 and inc["priorityScore"] == 187 and inc["priority"] == "P1"
      and inc["major"] is True and b.get("baseScore") == 125 and float(b.get("usersMultiplier", 0)) == 1.5, b)
check("T01 breakdown names the always-P1 rule", b.get("overrideRule") == f"Payment-{RUN} service is always P1", b)
if s == 201:
    created = ts(inc["createdAt"])
    resp_min = (ts(inc["responseDue"]) - created).total_seconds() / 60
    res_min = (ts(inc["resolutionDue"]) - created).total_seconds() / 60
    check("T01 Payment SLA: due 3 and 20 minutes from creation", resp_min == 3 and res_min == 20, (resp_min, res_min))
check("reporter's allowedActions = [EDIT, COMMENT, WITHDRAW], slaState OK", s == 201 and inc["allowedActions"] == ["EDIT", "COMMENT", "WITHDRAW"]
      and inc["slaState"] == "OK", inc.get("allowedActions"))
pay_inc = inc

# ---------------------------------------------------------------- T05 / T06: priority boundaries
cases = [((4, 3, c5, 1), 60, "P1"), ((5, 3, c3, 20), 56, "P2"), ((3, 5, c2, 1), 30, "P2"),
         ((3, 3, c3, 1), 27, "P3"), ((2, 5, c1, 1), 10, "P3"), ((3, 3, c1, 1), 9, "P4")]
got = []
for (i, u, svc, n), score, band in cases:
    s, b = report(E, svc, i, u, n)
    got.append((b.get("priorityScore"), b.get("priority")) if s == 201 else (s, b))
check("T05 band edges 60/56/30/27/10/9 -> P1 P2 P2 P3 P3 P4", got == [(c[1], c[2]) for c in cases], got)
got = []
for n in (9, 10, 100, 101):
    s, b = report(E, c3, 4, 4, n)
    got.append((b.get("priorityScore"), b.get("priority")) if s == 201 else (s, b))
check("T06 multiplier edges users 9/10/100/101 -> 48 P2, 60 P1, 60 P1, 72 P1",
      got == [(48, "P2"), (60, "P1"), (60, "P1"), (72, "P1")], got)
s, b = report(E, net, 1, 1, 1, category=phish)
check("Rule 1: Phishing (under Security) on criticality-4 service, score 4 -> at least P2",
      s == 201 and b["priorityScore"] == 4 and b["priority"] == "P2"
      and b["priorityBreakdown"]["overrideRule"] == "Security incident on a critical service is at least P2", (s, b))

# ---------------------------------------------------------------- T09 / T14 / T15: invalid input and exceptions
s, b = call("POST", "/incidents", {"confirmNotDuplicate": True, "title": "Broken thing", "description": "", "serviceId": net, "impact": 6,
                                   "urgency": 3, "affectedUsers": 0}, token=E)
check("T09 empty description, impact 6, users 0 -> 400 with one fieldError each",
      s == 400 and {"description", "impact", "affectedUsers"} <= set(fe(b)), (s, fe(b)))
s, b = report(E, 99999, 3, 3, 1)
check("T14 serviceId 99999 -> 404 SERVICE_NOT_FOUND", s == 404 and b["code"] == "SERVICE_NOT_FOUND", (s, b))
p4 = sql("select id || ',' || response_minutes || ',' || resolution_minutes from sla_policies where service_id is null and priority='P4'")
sql("delete from sla_policies where service_id is null and priority='P4'")
s, b = report(E, c1, 1, 1, 1)
check("T15 no P4 policy -> 422 SLA_NOT_CONFIGURED naming service and priority",
      s == 422 and b["code"] == "SLA_NOT_CONFIGURED" and f"Crit1-{RUN}" in b["message"] and "P4" in b["message"], (s, b))
_, r, rr = p4.split(",")
call("POST", "/admin/sla-policies", {"priority": "P4", "responseMinutes": int(r), "resolutionMinutes": int(rr)}, token=A)

# ---------------------------------------------------------------- T11: illegal transition
s, b = call("POST", f"/incidents/{pay_inc['id']}/close", token=A)
check("T11 close a CLASSIFIED incident -> 409 INVALID_STATE_TRANSITION",
      s == 409 and b["code"] == "INVALID_STATE_TRANSITION", (s, b))

# ---------------------------------------------------------------- assignment rules
# no category: M6 would auto-assign it; these checks exercise manual assignment
s, ninc = report(E, net, 3, 3, 5, title="Network down on floor 3")
nid = ninc["id"]
s, b = call("POST", f"/incidents/{nid}/assign", {"technicianId": t2_id}, token=E)
check("employee assign -> 403 UNAUTHORIZED_OPERATION", s == 403 and b["code"] == "UNAUTHORIZED_OPERATION", (s, b))
s, b = call("POST", f"/incidents/{nid}/assign", {"technicianId": away_id}, token=L)
check("assign to AWAY technician -> 409 TECHNICIAN_UNAVAILABLE", s == 409 and b["code"] == "TECHNICIAN_UNAVAILABLE", (s, b))
s, mf = report(E, net, 3, 3, 5, category=mfcat, title="Mainframe batch failed")
s, b = call("POST", f"/incidents/{mf['id']}/assign", {"technicianId": t2_id}, token=L)
check("assign to technician without the required skill -> 409 TECHNICIAN_UNAVAILABLE",
      s == 409 and b["code"] == "TECHNICIAN_UNAVAILABLE" and "skills" in b["message"], (s, b))
s, b = call("POST", f"/incidents/{nid}/assign", {"technicianId": t2_id}, token=L)
check("team lead assigns -> ASSIGNED to Tech Two", s == 200 and b["status"] == "ASSIGNED"
      and b["assignee"]["id"] == int(t2_id), (s, b))
s, b = call("GET", f"/incidents/{nid}", token=T2)
check("assignee's allowedActions include ACKNOWLEDGE", s == 200 and "ACKNOWLEDGE" in b["allowedActions"], b.get("allowedActions"))

# T25: karthik reports, admin tries to assign it to him
s, kinc = report(K, net, 3, 3, 5, category=netcat, title="VPN keeps dropping")
s, b = call("POST", f"/incidents/{kinc['id']}/assign", {"technicianId": k_id}, token=A)
check("T25 assign to the reporter -> 403 CONFLICT_OF_INTEREST", s == 403 and b["code"] == "CONFLICT_OF_INTEREST", (s, b))
s, b = call("GET", f"/incidents/{kinc['id']}", token=K)
check("T25 karthik still sees his incident as reporter", s == 200, s)

# workload: tech1 max_load 1, already holding one P3 (weight 2)
s, w1 = report(E, net, 3, 3, 5, title="Switch in rack 4 failing")
call("POST", f"/incidents/{w1['id']}/assign", {"technicianId": t1_id}, token=L)
sql(f"update technician_profiles set max_load = 2 where user_id = {t1_id}")
s, w2 = report(E, net, 3, 3, 5, title="Router in rack 5 failing")
s, b = call("POST", f"/incidents/{w2['id']}/assign", {"technicianId": t1_id}, token=L)
check("technician at max load -> 409 WORKLOAD_EXCEEDED", s == 409 and b["code"] == "WORKLOAD_EXCEEDED", (s, b))
sql(f"update technician_profiles set max_load = 10 where user_id = {t1_id}")

# ---------------------------------------------------------------- T18
s, b = call("POST", f"/incidents/{nid}/acknowledge", token=T1)
check("T18 another technician acknowledges -> 403, state unchanged",
      s == 403 and call("GET", f"/incidents/{nid}", token=A)[1]["status"] == "ASSIGNED", (s, b))

# ---------------------------------------------------------------- T03 full path + T21 pause
s, b = call("POST", f"/incidents/{nid}/acknowledge", token=T2)
check("T03 acknowledge -> ACKNOWLEDGED, acknowledgedAt set", s == 200 and b["status"] == "ACKNOWLEDGED"
      and b["acknowledgedAt"], (s, b))
s, b = call("POST", f"/incidents/{nid}/start", token=T2)
check("T03 start -> IN_PROGRESS", s == 200 and b["status"] == "IN_PROGRESS", (s, b))
due_before = ts(b["resolutionDue"])
s, b = call("POST", f"/incidents/{nid}/request-info", {"message": "Which floor and which switch port exactly?"}, token=T2)
check("request-info -> PENDING_USER_INFO, slaState PAUSED", s == 200 and b["status"] == "PENDING_USER_INFO"
      and b["slaState"] == "PAUSED" and b["pausedAt"], (s, b))
s, b = call("GET", f"/incidents/{nid}", token=E)
check("reporter's allowedActions include PROVIDE_INFO", "PROVIDE_INFO" in b.get("allowedActions", []), b.get("allowedActions"))
time.sleep(3)
s, b = call("POST", f"/incidents/{nid}/provide-info", {"message": "Floor 3, port 12."}, token=E)
paused = int(sql(f"select paused_seconds from incidents where id = {nid}"))
moved = (ts(b["resolutionDue"]) - due_before).total_seconds() if s == 200 else None
check("T21 provide-info -> IN_PROGRESS, deadline moved later by exactly the paused time",
      s == 200 and b["status"] == "IN_PROGRESS" and paused >= 3 and moved == paused, (s, paused, moved))
s, b = call("POST", f"/incidents/{nid}/resolve", {"rootCause": "Faulty switch port", "notes": "", "timeSpentMinutes": 20,
                                                   "reusableSolution": False}, token=T2)
check("T12 resolve without notes -> 400, status unchanged",
      s == 400 and "notes" in fe(b) and call("GET", f"/incidents/{nid}", token=A)[1]["status"] == "IN_PROGRESS", (s, b))
s, b = call("POST", f"/incidents/{nid}/resolve", {"rootCause": "Faulty switch port on floor 3",
                                                   "notes": "Moved the uplink to a healthy port and replaced the cable.",
                                                   "steps": "1. Checked logs 2. Moved uplink", "timeSpentMinutes": 20,
                                                   "reusableSolution": True}, token=T2)
check("T03 resolve -> RESOLVED with resolution", s == 200 and b["status"] == "RESOLVED"
      and b["resolution"]["resolvedBy"]["id"] == int(t2_id) and b["slaState"] == "MET", (s, b))
s, b = call("POST", f"/incidents/{nid}/verify", token=T2)
check("verify by the technician -> 403 (reporter only)", s == 403, (s, b))
s, b = call("POST", f"/incidents/{nid}/verify", token=E)
check("T03 verify by reporter -> VERIFIED", s == 200 and b["status"] == "VERIFIED", (s, b))
s, b = call("POST", f"/incidents/{nid}/close", token=A)
check("T03 close by admin -> CLOSED, reason VERIFIED", s == 200 and b["status"] == "CLOSED"
      and b["closureReason"] == "VERIFIED", (s, b))
s, b = call("PUT", f"/incidents/{nid}", {"impact": 2}, token=E)
check("edit after resolution -> 409 INVALID_STATE_TRANSITION", s == 409 and b["code"] == "INVALID_STATE_TRANSITION", (s, b))
s, b = call("POST", f"/incidents/{nid}/override-priority", {"priority": "P1", "reason": "Raising after closure."}, token=L)
check("override priority of a closed incident -> 409", s == 409 and b["code"] == "INVALID_STATE_TRANSITION", (s, b))
s, b = call("GET", f"/incidents/{nid}", token=E)
check("closed incident: reporter's allowedActions are [COMMENT, REOPEN, GIVE_FEEDBACK] (no EDIT; feedback since M10)",
      b.get("allowedActions") == ["COMMENT", "REOPEN", "GIVE_FEEDBACK"], b.get("allowedActions"))

# ---------------------------------------------------------------- T08 reopen window
sql(f"update incidents set closed_at = now() - interval '7 days 1 minute' where id = {nid}")
s, b = call("POST", f"/incidents/{nid}/reopen", {"reason": "The network dropped again this morning."}, token=E)
check("T08 reopen 7 days 1 minute after closing -> 409 INVALID_STATE_TRANSITION",
      s == 409 and b["code"] == "INVALID_STATE_TRANSITION", (s, b))
sql(f"update incidents set closed_at = now() - interval '6 days 23 hours 59 minutes' where id = {nid}")
s, b = call("POST", f"/incidents/{nid}/reopen", {"reason": "The network dropped again this morning."}, token=E)
check("T08 reopen 6 days 23 hours 59 minutes after closing -> REOPENED, reopenCount 1",
      s == 200 and b["status"] == "REOPENED" and b["reopenCount"] == 1 and b["closedAt"] is None, (s, b))
s, b = call("POST", f"/incidents/{nid}/start", token=T2)
check("reopened -> start work by assignee -> IN_PROGRESS", s == 200 and b["status"] == "IN_PROGRESS", (s, b))

# ---------------------------------------------------------------- visibility, lists, filters
s, b = call("GET", f"/incidents/{pay_inc['id']}", token=E2)
check("another employee cannot see the incident -> 404", s == 404 and b["code"] == "INCIDENT_NOT_FOUND", (s, b))
s, b = call("GET", "/incidents?size=100", token=E2)
check("employee B list is empty (sees only own)", s == 200 and b["totalItems"] == 0, (s, b.get("totalItems") if isinstance(b, dict) else b))
s, b = call("GET", "/incidents?size=2&sort=priority,asc", token=E)
check("employee A list: paged (size 2), only own, sorted by priority",
      s == 200 and len(b["items"]) == 2 and b["totalPages"] >= 7 and b["items"][0]["priority"] == "P1"
      and all(i["reporter"]["id"] == int(emp_id) for i in b["items"]), (s, b))
s, b = call("GET", f"/incidents?serviceId={net}&status=CLASSIFIED&size=100", token=A)
check("admin filter serviceId + status", s == 200 and b["totalItems"] >= 2
      and all(i["status"] == "CLASSIFIED" and i["service"]["id"] == net for i in b["items"]), (s, b.get("totalItems")))
s, b = call("GET", "/incidents?assignedToMe=true&size=100", token=T2)
check("technician assignedToMe", s == 200 and b["totalItems"] >= 1
      and all(i["assignee"]["id"] == int(t2_id) for i in b["items"]), (s, b.get("totalItems")))
s, b = call("GET", f"/incidents?q=payment%20application&size=100", token=A)
check("text search q", s == 200 and any(i["id"] == pay_inc["id"] for i in b["items"]), (s, b.get("totalItems")))
s, b = call("GET", "/incidents?sort=bogus", token=A)
check("unknown sort field -> 400", s == 400, s)
s, b = call("GET", "/incidents?size=500", token=A)
check("size above 100 -> 400", s == 400, s)

# ---------------------------------------------------------------- edit, override, optimistic lock
s, b = call("PUT", f"/incidents/{w2['id']}", {"impact": 5, "urgency": 5}, token=E)
check("PUT recalculates priority (5x5x4=100 -> P1)", s == 200 and b["priorityScore"] == 100 and b["priority"] == "P1", (s, b))
v = b["version"]
s, b = call("PUT", f"/incidents/{w2['id']}", {"affectedUsers": 3, "version": v - 1}, token=E)
check("PUT with a stale version -> 409 OPTIMISTIC_LOCK_CONFLICT", s == 409 and b["code"] == "OPTIMISTIC_LOCK_CONFLICT", (s, b))
s, b = call("POST", f"/incidents/{w2['id']}/override-priority", {"priority": "P4", "reason": "Only a test rack, no users."}, token=L)
check("lead overrides to P4 with reason (recorded in breakdown)", s == 200 and b["priority"] == "P4"
      and b["priorityBreakdown"]["overrideRule"].startswith("Manually set to P4 by Priya Lead"), (s, b))
s, b = call("POST", f"/incidents/{w2['id']}/override-priority", {"priority": "P1", "reason": "I think it matters."}, token=E)
check("employee override -> 403", s == 403, (s, b))

# T24: two simultaneous updates
codes = []
barrier = threading.Barrier(2)


def worker(impact):
    barrier.wait()
    codes.append(call("PUT", f"/incidents/{w1['id']}", {"description": DESC + " Update " + str(impact) + "."}, token=E)[0])  # G4: the reporter may only edit the description once assigned


threads = [threading.Thread(target=worker, args=(i,)) for i in (2, 4)]
[t.start() for t in threads]
[t.join() for t in threads]
check("T24 two simultaneous PUTs -> one 200, one 409 (or serialized: both 200)", sorted(codes) in ([200, 409], [200, 200]),
      codes)
results[-1] = (results[-1][0], results[-1][1] + f"  [observed {sorted(codes)}]", results[-1][2])

# ---------------------------------------------------------------- comments and reassign
s, b = call("POST", f"/incidents/{nid}/comments", {"body": "Internal: switch firmware is old.", "visibility": "INTERNAL"}, token=T2)
check("technician adds INTERNAL note -> 201", s == 201, (s, b))
s, b = call("POST", f"/incidents/{nid}/comments", {"body": "Secret", "visibility": "INTERNAL"}, token=E)
check("employee INTERNAL note -> 400", s == 400, (s, b))
s, rep = call("GET", f"/incidents/{nid}/comments", token=E)
s2, tec = call("GET", f"/incidents/{nid}/comments", token=T2)
check("reporter does not see INTERNAL notes; technician does",
      all(c["visibility"] == "PUBLIC" for c in rep) and any(c["visibility"] == "INTERNAL" for c in tec)
      and len(rep) >= 3, (len(rep), len(tec)))
s, b = call("POST", f"/incidents/{nid}/reassign", {"technicianId": t1_id, "reason": "Tech Two is off tomorrow."}, token=L)
check("lead reassigns IN_PROGRESS incident -> same status, new assignee", s == 200 and b["status"] == "IN_PROGRESS"
      and b["assignee"]["id"] == int(t1_id), (s, b))
