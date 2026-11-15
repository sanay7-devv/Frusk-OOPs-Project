"""Smoke test of M11 escalation, auto-verify (G2), the escalation preview (A11) and the demo clock (D1).

Local dev server (default port 8081, database iitsm; override with ITSM_PORT and ITSM_DB), throwaway data. Run it
against the dev profile (the demo-clock endpoint must then answer 404) or the demo profile (the endpoint must work,
administrators only). Timers are moved in the database ("age" an incident by N minutes) instead of waiting, then the
monitors (intervals set to 5 s) pick them up. argv[1] = the backend log file, used to count what the monitor logged.
"""
import atexit
import json
import os
import pathlib
import secrets
import subprocess
import sys
import time
import urllib.error
import urllib.request

PORT = os.environ.get("ITSM_PORT", "8081")
DB = os.environ.get("ITSM_DB", "iitsm")
BASE = f"http://localhost:{PORT}/api/v1"
RUN = secrets.token_hex(3)
PW = "Ab9-Zq" + secrets.token_hex(4) + "9"
LOG = pathlib.Path(sys.argv[1])
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
    out = subprocess.run(["docker", "exec", "iitsm-db", "psql", "-U", "iitsm", "-d", DB, "-tAc", statement],
                         capture_output=True, text=True)
    return out.stdout.strip() or out.stderr.strip()


def login(email):
    s, b = call("POST", "/auth/login", {"email": email, "password": PW})
    return b["accessToken"] if s == 200 else None


def mail(tag):
    return f"{tag}.{RUN}@iitsm.demo"


def wait_for(predicate, seconds=20):
    end = time.time() + seconds
    while time.time() < end:
        if predicate():
            return True
        time.sleep(1)
    return predicate()


def runs_pass(count=2, interval=5):
    time.sleep(count * interval + 1)


def level(inc_id):
    return int(sql(f"select escalation_level from incidents where id={inc_id}"))


def status(inc_id):
    return sql(f"select status from incidents where id={inc_id}")


def escalated_entries(inc_id):
    return sql(f"select description from audit_records where incident_id={inc_id} and action='ESCALATED' "
               f"order by id").splitlines()


def age(inc_id, minutes):
    """Pretends the incident (and everything in its audit trail) is `minutes` older."""
    sql(f"update incidents set created_at = created_at - interval '{minutes} minutes' where id={inc_id}")
    sql(f"update audit_records set created_at = created_at - interval '{minutes} minutes' where incident_id={inc_id}")


def age_resolution(inc_id, minutes):
    sql(f"update incidents set resolved_at = resolved_at - interval '{minutes} minutes' where id={inc_id}")


def log_lines(code, text):
    return [l for l in LOG.read_text(encoding="utf-8", errors="replace").splitlines() if code in l and text in l and "EscalationMonitor" in l]


def error_code(body):
    return body.get("code") if isinstance(body, dict) else None


# ---------------------------------------------------------------- setup
call("POST", "/auth/register", {"name": "Root Admin", "email": mail("root"), "password": PW})
root_id = sql(f"select id from users where email='{mail('root')}'")
sql(f"insert into user_roles(user_id, role_type, granted_at) values ({root_id}, 'ADMINISTRATOR', now())")
sql(f"insert into administrator_profiles(user_id, scope) values ({root_id}, 'SYSTEM_ADMIN')")
call("POST", "/auth/register", {"name": "IT Manager", "email": mail("mgr"), "password": PW})
mgr_id = sql(f"select id from users where email='{mail('mgr')}'")
sql(f"insert into user_roles(user_id, role_type, granted_at) values ({mgr_id}, 'ADMINISTRATOR', now())")
sql(f"insert into administrator_profiles(user_id, scope) values ({mgr_id}, 'IT_MANAGER')")
A = login(mail("root"))
M = login(mail("mgr"))
s, _ = call("PUT", "/admin/config", [{"key": "autocat.apply.confidence", "value": "1"},  # keep untitled P1s in triage (M12 Q1A)
                                     {"key": "escalation.monitor.interval.seconds", "value": "5"},
                                     {"key": "verify.monitor.interval.seconds", "value": "5"},
                                     {"key": "escalation.exhausted.minutes", "value": "10"},
                                     {"key": "assignment.strategy", "value": "COMPOSITE"}], token=A)
check("config: monitor intervals 5 s, exhausted wait 10 min", s == 200, s)
s, cfg = call("GET", "/admin/config", token=A)
keys = {c["key"]: c for c in cfg}
check("new settings listed with defaults (escalation.exhausted.minutes 15, verify.monitor.interval.seconds 300)",
      keys.get("escalation.exhausted.minutes", {}).get("defaultValue") == "15"
      and keys.get("verify.monitor.interval.seconds", {}).get("defaultValue") == "300", s)

sql("delete from escalation_policies")
for lvl in (1, 2, 3):
    s, _ = call("POST", "/admin/escalation-policies", {"priority": "P1", "level": lvl, "timeoutMinutes": 10}, token=A)
    check(f"setup: P1 escalation policy level {lvl}", s == 201, s)

skill = call("POST", "/admin/skills", {"name": f"Esc-{RUN}"}, token=A)[1]["id"]
svc = call("POST", "/admin/services", {"name": f"EscSvc-{RUN}", "criticality": 5, "alwaysP1": False}, token=A)[1]["id"]
svc_low = call("POST", "/admin/services", {"name": f"EscLow-{RUN}", "criticality": 1, "alwaysP1": False},
               token=A)[1]["id"]
cat = call("POST", "/admin/categories", {"name": f"EscCat-{RUN}", "requiredSkillIds": [skill]}, token=A)[1]["id"]
for service in (svc, svc_low):
    for prio, resp, res in (("P1", 600, 1200), ("P2", 600, 1200), ("P3", 600, 1200), ("P4", 600, 1200)):
        call("POST", "/admin/sla-policies", {"serviceId": service, "priority": prio, "responseMinutes": resp,
                                             "resolutionMinutes": res}, token=A)


def user(tag, roles, technician=None):
    body = {"name": tag.title(), "email": mail(tag), "password": PW, "roles": roles}
    if technician:
        body["technician"] = technician
    s, b = call("POST", "/admin/users", body, token=A)
    return b["id"] if s == 201 else None


tech_id = user("tech", ["EMPLOYEE", "TECHNICIAN"], {"experienceLevel": 3, "escalationLevel": 0, "maxLoad": 50,
                                                     "availability": "AVAILABLE",
                                                     "skills": [{"skillId": skill, "proficiency": 5}]})
lead_id = user("lead", ["EMPLOYEE", "TECHNICIAN"], {"experienceLevel": 5, "escalationLevel": 1, "maxLoad": 10,
                                                    "availability": "OFF_DUTY", "skills": []})
user("emp", ["EMPLOYEE"])
user("other", ["EMPLOYEE", "TECHNICIAN"], {"experienceLevel": 2, "escalationLevel": 0, "maxLoad": 10,
                                           "availability": "OFF_DUTY", "skills": []})
T, L, E, O = login(mail("tech")), login(mail("lead")), login(mail("emp")), login(mail("other"))
check("setup: five users can log in", all((T, L, E, O, A, M)))


def incident(title, service=None, category=True, impact=5, urgency=5, users=150):
    body = {"title": title, "description": "Escalation smoke test incident " + RUN, "serviceId": service or svc,
            "impact": impact, "urgency": urgency, "affectedUsers": users}
    if category:
        body["categoryId"] = cat
    s, b = call("POST", "/incidents", {**body, "confirmNotDuplicate": True}, token=E)
    return b if s == 201 else {"error": b}


# ---------------------------------------------------------------- A: an assigned, unacknowledged P1 climbs, then one final alert
inc = incident(f"Payments down {RUN}")
iid, code = inc["id"], inc["code"]
check("create: P1, assigned to the technician, level 0",
      inc.get("priority") == "P1" and inc.get("status") == "ASSIGNED" and inc.get("escalationLevel") == 0
      and (inc.get("assignee") or {}).get("id") == tech_id, inc)

s, d = call("GET", f"/incidents/{iid}", token=L)
prev = d.get("escalationPreview") or {}
check("A11 preview for the team lead: next RAISE to level 1, Team Lead, the lead is a recipient, due in the future",
      s == 200 and prev.get("kind") == "RAISE" and prev.get("toLevel") == 1 and prev.get("targetRole") == "Team Lead"
      and lead_id in [r["id"] for r in prev.get("recipients", [])] and prev.get("secondsRemaining", 0) > 0, d)
s, d = call("GET", f"/incidents/{iid}", token=T)
check("A11 preview also visible to the assignee", (d.get("escalationPreview") or {}).get("toLevel") == 1, d)
s, d = call("GET", f"/incidents/{iid}", token=E)
check("A11 preview hidden from the reporter", s == 200 and d.get("escalationPreview") is None, d)

age(iid, 11)
check("level 0 -> 1 after the first timeout (10 min), status unchanged",
      wait_for(lambda: level(iid) == 1, 75) and status(iid) == "ASSIGNED", (level(iid), status(iid)))
entries = escalated_entries(iid)
check("audit: one ESCALATED entry naming the level, the role and the technician who did not acknowledge",
      len(entries) == 1 and "level 1 (Team Lead)" in entries[0] and "Tech" in entries[0], entries)
check("event: one escalation logged with the team lead as recipient",
      len(log_lines(code, "to level 1 (Team Lead), 1 recipient")) == 1, log_lines(code, "Escalated"))
runs_pass()
check("idempotent: the timer restarted, so still level 1 and one entry after two more runs",
      level(iid) == 1 and len(escalated_entries(iid)) == 1, (level(iid), escalated_entries(iid)))
s, d = call("GET", f"/incidents/{iid}", token=L)
check("preview now points at level 2, System Administrator",
      (d.get("escalationPreview") or {}).get("toLevel") == 2
      and (d["escalationPreview"] or {}).get("targetRole") == "System Administrator", d.get("escalationPreview"))

age(iid, 11)
check("level 1 -> 2", wait_for(lambda: level(iid) == 2), level(iid))
age(iid, 11)
check("level 2 -> 3", wait_for(lambda: level(iid) == 3), level(iid))
entries = escalated_entries(iid)
check("audit: three hops so far, each its own entry", len(entries) == 3 and "level 3 (IT Manager)" in entries[2],
      entries)
check("events: one per hop, one recipient each",
      len(log_lines(code, "Escalated")) == 3 and len(log_lines(code, "1 recipient")) == 3, log_lines(code, "Escalated"))
s, d = call("GET", f"/incidents/{iid}", token=A)
prev = d.get("escalationPreview") or {}
check("preview at level 3: the exhausted alert, to all administrators",
      prev.get("kind") == "EXHAUSTED" and prev.get("targetRole") == "All administrators"
      and len(prev.get("recipients", [])) == 2, prev)

age(iid, 11)
check("level 3: one final 'escalation exhausted' audit entry",
      wait_for(lambda: len(escalated_entries(iid)) == 4), escalated_entries(iid))
entries = escalated_entries(iid)
check("exhausted entry worded as such, level stays 3",
      len(entries) == 4 and entries[3].startswith("Escalation exhausted at level 3") and level(iid) == 3, entries)
check("exhausted event logged once, alerting both administrators",
      len(log_lines(code, "Escalation exhausted")) == 1 and len(entries) == 4 and "alerted 2" in entries[3],
      log_lines(code, "exhausted"))
age(iid, 60)
runs_pass(3)
check("nothing more after the exhausted alert (once per incident)",
      len(escalated_entries(iid)) == 4 and level(iid) == 3 and len(log_lines(code, "Escalation exhausted")) == 1,
      escalated_entries(iid))
s, d = call("GET", f"/incidents/{iid}", token=A)
check("no preview once exhausted", d.get("escalationPreview") is None, d.get("escalationPreview"))
s, h = call("GET", f"/incidents/{iid}/history", token=A)
check("history lists the four ESCALATED entries", s == 200 and sum(e["action"] == "ESCALATED" for e in h) == 4, s)

# ---------------------------------------------------------------- B: acknowledging stops the climb
inc = incident(f"Checkout error {RUN}")
iid2 = inc["id"]
age(iid2, 11)
check("B: reaches level 1", wait_for(lambda: level(iid2) == 1), level(iid2))
s, _ = call("POST", f"/incidents/{iid2}/acknowledge", token=T)
check("B: the technician acknowledges", s == 200, s)
age(iid2, 60)
runs_pass(3)
check("B: acknowledged -> no more escalation (level 1, one entry)",
      level(iid2) == 1 and len(escalated_entries(iid2)) == 1, (level(iid2), escalated_entries(iid2)))
s, d = call("GET", f"/incidents/{iid2}", token=L)
check("B: no preview once acknowledged", d.get("escalationPreview") is None, d.get("escalationPreview"))

# ---------------------------------------------------------------- C: an unassigned P1 in triage escalates from level 0 (DEC-48)
inc = incident(f"Unknown outage {RUN}", category=False)
iid3, code3 = inc["id"], inc["code"]
check("C: P1 in triage: CLASSIFIED, nobody assigned, level 0",
      inc.get("priority") == "P1" and inc.get("status") == "CLASSIFIED" and inc.get("assignee") is None
      and inc.get("escalationLevel") == 0, inc)
age(iid3, 11)
check("C: level 0 -> 1 with nobody assigned", wait_for(lambda: level(iid3) == 1, 30), level(iid3))
entries = escalated_entries(iid3)
check("C: the first ESCALATED entry says no technician was assigned",
      len(entries) == 1 and "no technician was assigned" in entries[0] and "level 1 (Team Lead)" in entries[0], entries)
age(iid3, 11)
check("C: it climbs on like any other (level 2)", wait_for(lambda: level(iid3) == 2), level(iid3))
s, d = call("POST", f"/incidents/{iid3}/assign", {"technicianId": tech_id}, token=L)
check("C: the team lead assigns it; level kept, status ASSIGNED",
      s == 200 and d.get("status") == "ASSIGNED" and d.get("escalationLevel") == 2, (s, d.get("status")))
age_by_5 = 5
age(iid3, age_by_5)
runs_pass()
check("C: the triage climb stopped: the assignment restarted the timer, so no hop after 5 minutes",
      level(iid3) == 2 and len(escalated_entries(iid3)) == 2, (level(iid3), escalated_entries(iid3)))
call("POST", f"/incidents/{iid3}/acknowledge", token=T)
age(iid3, 60)
runs_pass(3)
check("C: acknowledged -> stays at level 2", level(iid3) == 2 and len(escalated_entries(iid3)) == 2, level(iid3))

inc = incident(f"Another unknown {RUN}", category=False)
iid3b = inc["id"]
age(iid3b, 11)
check("C: second triage incident hops to level 1", wait_for(lambda: level(iid3b) == 1, 30), level(iid3b))
call("POST", f"/incidents/{iid3b}/assign", {"technicianId": tech_id}, token=L)
call("POST", f"/incidents/{iid3b}/acknowledge", token=T)
age(iid3b, 60)
runs_pass(3)
check("C: assigned and acknowledged -> the climb stops", level(iid3b) == 1, level(iid3b))

# ---------------------------------------------------------------- D: manual escalate
inc = incident(f"VPN gateway down {RUN}")
iid4, code4 = inc["id"], inc["code"]
s, b = call("POST", f"/incidents/{iid4}/escalate", {"reason": "Customer is waiting on the line"}, token=E)
check("D: the reporter may not escalate -> 403 UNAUTHORIZED_OPERATION", s == 403 and error_code(b) ==
      "UNAUTHORIZED_OPERATION", (s, b))
s, b = call("POST", f"/incidents/{iid4}/escalate", {"reason": "Customer is waiting on the line"}, token=O)
check("D: another technician may not escalate -> 403", s == 403 and error_code(b) == "UNAUTHORIZED_OPERATION", (s, b))
s, b = call("POST", f"/incidents/{iid4}/escalate", {"reason": "short"}, token=T)
check("D: reason under 10 characters -> 400 VALIDATION_FAILED", s == 400 and error_code(b) == "VALIDATION_FAILED",
      (s, b))
s, d = call("GET", f"/incidents/{iid4}", token=T)
check("D: ESCALATE is in the assignee's allowedActions", "ESCALATE" in d.get("allowedActions", []), d)
s, d = call("GET", f"/incidents/{iid4}", token=E)
check("D: ...and not in the reporter's", "ESCALATE" not in d.get("allowedActions", []), d)
s, d = call("POST", f"/incidents/{iid4}/escalate", {"reason": "Customer is waiting on the line"}, token=T)
check("D: the assignee escalates -> level 1, status unchanged",
      s == 200 and d.get("escalationLevel") == 1 and d.get("status") == "ASSIGNED", (s, d.get("escalationLevel")))
entries = escalated_entries(iid4)
check("D: audit entry written with the actor", len(entries) == 1 and "level 1 (Team Lead) by Tech" in entries[0],
      entries)
s, c = call("GET", f"/incidents/{iid4}/comments", token=T)
check("D: reason kept as an internal note for staff",
      s == 200 and any("Escalated to level 1" in x["body"] and x["visibility"] == "INTERNAL" for x in c), c)
s, c = call("GET", f"/incidents/{iid4}/comments", token=E)
check("D: ...and hidden from the reporter", s == 200 and not any("Escalated to level" in x["body"] for x in c), c)
s, d = call("POST", f"/incidents/{iid4}/escalate", {"reason": "Still nothing, raising it again"}, token=L)
check("D: the team lead escalates -> level 2", s == 200 and d.get("escalationLevel") == 2, (s, d))
s, d = call("POST", f"/incidents/{iid4}/escalate", {"reason": "Still nothing, raising it again"}, token=A)
check("D: an administrator escalates -> level 3", s == 200 and d.get("escalationLevel") == 3, (s, d))
s, b = call("POST", f"/incidents/{iid4}/escalate", {"reason": "Still nothing, raising it again"}, token=A)
check("D: at level 3 the chain has ended -> 409 INVALID_STATE_TRANSITION",
      s == 409 and error_code(b) == "INVALID_STATE_TRANSITION", (s, b))
s, d = call("GET", f"/incidents/{iid4}", token=A)
check("D: ESCALATE no longer allowed at level 3", "ESCALATE" not in d.get("allowedActions", []), d)
check("D: three manual hops, three audit entries", len(escalated_entries(iid4)) == 3, escalated_entries(iid4))

inc = incident(f"Mail relay slow {RUN}")
iid5 = inc["id"]
call("POST", f"/incidents/{iid5}/acknowledge", token=T)
s, d = call("POST", f"/incidents/{iid5}/escalate", {"reason": "Needs the lead before it spreads"}, token=T)
check("D: allowed from ACKNOWLEDGED, status stays ACKNOWLEDGED",
      s == 200 and d.get("status") == "ACKNOWLEDGED" and d.get("escalationLevel") == 1, (s, d.get("status")))
call("POST", f"/incidents/{iid5}/start", token=T)
s, d = call("POST", f"/incidents/{iid5}/escalate", {"reason": "Needs the manager now please"}, token=T)
check("D: allowed from IN_PROGRESS", s == 200 and d.get("status") == "IN_PROGRESS" and d.get("escalationLevel") == 2,
      (s, d.get("status")))
s, _ = call("POST", f"/incidents/{iid5}/resolve", {"rootCause": "Queue backlog cleared", "notes": "Flushed the queue",
                                                  "steps": "Restarted relay", "timeSpentMinutes": 5}, token=T)
check("D: incident resolved (for the next checks)", s == 200, s)
s, b = call("POST", f"/incidents/{iid5}/escalate", {"reason": "Raising it after resolution"}, token=T)
check("D: from RESOLVED -> 409 INVALID_STATE_TRANSITION", s == 409 and error_code(b) == "INVALID_STATE_TRANSITION",
      (s, b))
s, b = call("POST", f"/incidents/{iid5}/escalate", {"reason": "Raising it after resolution"}, token=E)
check("D: the reporter on a resolved incident -> 403 (wrong person), never 409", s == 403, (s, b))
s, b = call("POST", f"/incidents/{iid3b + 1000}/escalate", {"reason": "Incident does not exist at all"}, token=A)
check("D: unknown incident -> 404 INCIDENT_NOT_FOUND", s == 404 and error_code(b) == "INCIDENT_NOT_FOUND", (s, b))
inc = incident(f"Triage only {RUN}", category=False)
s, b = call("POST", f"/incidents/{inc['id']}/escalate", {"reason": "Nobody has it, escalating it"}, token=A)
check("D: from CLASSIFIED (triage) -> 409, the monitor handles triage", s == 409, (s, b))
s, b = call("POST", f"/incidents/{iid4}/escalate", {"reason": "No token at all here"}, token=None)
check("D: no token -> 401", s == 401, s)

# ---------------------------------------------------------------- F: only P1 and P2 are watched
inc = incident(f"Printer jam {RUN}", service=svc_low, impact=1, urgency=1)
iid6 = inc["id"]
check("F: a P4 incident is assigned", inc.get("priority") in ("P3", "P4") and inc.get("status") == "ASSIGNED", inc)
age(iid6, 500)
runs_pass(3)
check("F: P3/P4 never escalate automatically", level(iid6) == 0 and not escalated_entries(iid6), level(iid6))

# ---------------------------------------------------------------- E: a level nobody holds is passed over (DEC-42)
sql(f"update technician_profiles set escalation_level = 0 where user_id={lead_id}")
inc = incident(f"DNS failure {RUN}")
iid7, code7 = inc["id"], inc["code"]
age(iid7, 11)
check("E: with no team lead the incident goes straight to level 2 in one run",
      wait_for(lambda: level(iid7) == 2, 30), level(iid7))
entries = escalated_entries(iid7)
check("E: two audit entries, the first says nobody holds level 1",
      len(entries) == 2 and "nobody holds this level" in entries[0] and "level 2 (System Administrator)" in entries[1],
      entries)
check("E: the passed-over hop had no recipients, the next had one",
      len(log_lines(code7, "to level 1 (Team Lead), 0 recipient")) == 1
      and len(log_lines(code7, "to level 2 (System Administrator), 1 recipient")) == 1, log_lines(code7, "Escalated"))
sql(f"update technician_profiles set escalation_level = 1 where user_id={lead_id}")

# ---------------------------------------------------------------- G: auto-verify (G2)
s, _ = call("PUT", "/admin/config", [{"key": "verify.auto.hours", "value": "0.05"}], token=A)  # 3 minutes
check("G: verify.auto.hours set to 0.05", s == 200, s)


def resolved_incident(title):
    inc = incident(title, service=svc_low, impact=1, urgency=1)
    i = inc["id"]
    call("POST", f"/incidents/{i}/acknowledge", token=T)
    call("POST", f"/incidents/{i}/start", token=T)
    call("POST", f"/incidents/{i}/resolve", {"rootCause": "Toner empty", "notes": "Changed the toner",
                                             "steps": "Swapped cartridge", "timeSpentMinutes": 5}, token=T)
    return i


g1, g2, g3 = (resolved_incident(f"Auto verify {n} {RUN}") for n in "123")
check("G: three incidents RESOLVED", all(status(i) == "RESOLVED" for i in (g1, g2, g3)), [status(i) for i in (g1, g2, g3)])
age_resolution(g1, 4)
age_resolution(g3, 4)
s, _ = call("POST", f"/incidents/{g3}/verify", token=E)
check("G: the reporter verifies one of them by hand", s == 200, s)
check("G: the old unconfirmed one is closed as AUTO_VERIFIED",
      wait_for(lambda: status(g1) == "CLOSED", 330), status(g1))
check("G: closure reason AUTO_VERIFIED and closed_at set",
      sql(f"select closure_reason from incidents where id={g1}") == "AUTO_VERIFIED"
      and sql(f"select closed_at is not null from incidents where id={g1}") == "t")
check("G: audit has one VERIFIED and one CLOSED entry written by the system",
      sql(f"select count(*) from audit_records where incident_id={g1} and action='VERIFIED' and actor_id is null") == "1"
      and sql(f"select count(*) from audit_records where incident_id={g1} and action='CLOSED' and actor_id is null")
      == "1", sql(f"select action from audit_records where incident_id={g1} order by id"))
check("G: a young resolved incident is left alone", status(g2) == "RESOLVED", status(g2))
check("G: the manually verified one stays VERIFIED (not auto-closed)", status(g3) == "VERIFIED", status(g3))
runs_pass(3)
check("G: idempotent: still exactly one CLOSED entry",
      sql(f"select count(*) from audit_records where incident_id={g1} and action='CLOSED'") == "1")
s, h = call("GET", f"/incidents/{g1}/history", token=A)
check("G: history shows the automatic steps", s == 200 and any("Closed automatically" in e["description"] for e in h), s)

# ---------------------------------------------------------------- H: the demo clock exists only in the demo profile, for administrators
s, b = call("GET", "/admin/demo/clock", token=A)
if s == 404:
    check("H: dev profile: the demo clock endpoint does not exist (404)", True)
    s, b = call("POST", "/admin/demo/clock/advance", {"minutes": 10}, token=A)
    check("H: dev profile: advance does not exist either (404/405, not 200)", s in (404, 405), s)
else:
    check("H: demo profile: the admin reads the clock", s == 200 and "now" in b and b["offsetMinutes"] == 0, (s, b))
    s, b2 = call("GET", "/admin/demo/clock", token=T)
    check("H: a technician is refused (403)", s == 403, (s, b2))
    s, b2 = call("POST", "/admin/demo/clock/advance", {"minutes": 5}, token=E)
    check("H: an employee may not advance it (403)", s == 403, (s, b2))
    s, _ = call("POST", "/admin/demo/clock/advance", {"minutes": 5})
    check("H: no token -> 401", s == 401, s)
    s, b2 = call("POST", "/admin/demo/clock/advance", {"minutes": 0}, token=A)
    check("H: zero minutes -> 400", s == 400, (s, b2))
    s, b2 = call("POST", "/admin/demo/clock/advance", {"minutes": -5}, token=A)
    check("H: negative minutes (time never goes backwards) -> 400", s == 400, (s, b2))
    s, b2 = call("POST", "/admin/demo/clock/advance", {"minutes": 5000}, token=A)
    check("H: more than 1440 minutes at once -> 400", s == 400, (s, b2))
    inc = incident(f"Clock demo outage {RUN}")
    iid8 = inc["id"]
    before = level(iid8)
    s, b2 = call("POST", "/admin/demo/clock/advance", {"minutes": 11}, token=A)
    check("H: advance by 11 minutes -> offset 11", s == 200 and b2["offsetMinutes"] == 11, (s, b2))
    check("H: the escalation monitor sees the moved clock: level 0 -> 1 with no waiting",
          before == 0 and wait_for(lambda: level(iid8) == 1, 30), (before, level(iid8)))
    A = login(mail("root"))  # the access token is judged against the same clock
    s, _ = call("POST", "/admin/demo/clock/advance", {"minutes": 11}, token=A)
    check("H: a second advance climbs again: level 2", wait_for(lambda: level(iid8) == 2, 30), level(iid8))
    s, b2 = call("GET", "/admin/demo/clock", token=login(mail("root")))
    check("H: the offset only ever grew (22 minutes)", b2["offsetMinutes"] == 22, b2)
    check("H: the advances are in the audit trail (CONFIG_CHANGED)",
          int(sql("select count(*) from audit_records where action='CONFIG_CHANGED' and description like "
                  "'Demo clock advanced%'")) >= 2)
