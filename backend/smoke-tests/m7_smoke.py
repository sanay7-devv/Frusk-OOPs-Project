"""Smoke test of M7, the SLA monitor (local dev server on 8081, throwaway data, local DB only).

Moves deadlines in the database instead of waiting for real minutes, then lets the monitor (interval set to 5 s)
pick them up. argv[1] = the backend log file, used to count the warnings the monitor logged.
"""
import os
import atexit
import json
import pathlib
import secrets
import subprocess
import sys
import time
import urllib.error
import urllib.request

BASE = "http://localhost:" + os.environ.get("SMOKE_PORT", "8081") + "/api/v1"
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
    out = subprocess.run(["docker", "exec", "iitsm-db", "psql", "-U", "iitsm", "-d", os.environ.get("SMOKE_DB", "iitsm"), "-tAc", statement],
                         capture_output=True, text=True)
    return out.stdout.strip() or out.stderr.strip()


def login(email):
    s, b = call("POST", "/auth/login", {"email": email, "password": PW})
    return b["accessToken"] if s == 200 else None


def mail(tag):
    return f"{tag}.{RUN}@iitsm.demo"


def flags(inc_id):
    row = sql(f"select resp_warn75_sent, resp_warn90_sent, resp_violated, res_warn75_sent, res_warn90_sent, "
              f"res_violated from incidents where id={inc_id}")
    return dict(zip(("r75", "r90", "rv", "s75", "s90", "sv"), (v == "t" for v in row.split("|"))))


def wait_for(predicate, seconds=15):
    end = time.time() + seconds
    while time.time() < end:
        if predicate():
            return True
        time.sleep(1)
    return predicate()


def runs_pass(count=2, interval=5):
    time.sleep(count * interval + 1)


def violations_of(inc_id):
    return sql(f"select type, overdue_seconds, coalesce(technician_id::text, '-') from sla_violations "
               f"where incident_id={inc_id} order by id").splitlines()


def log_lines(code):
    return [l for l in LOG.read_text(encoding="utf-8", errors="replace").splitlines() if f" {code} " in l]


# ---------------------------------------------------------------- setup
call("POST", "/auth/register", {"name": "Root Admin", "email": mail("root"), "password": PW})
root_id = sql(f"select id from users where email='{mail('root')}'")
sql(f"insert into user_roles(user_id, role_type, granted_at) values ({root_id}, 'ADMINISTRATOR', now())")
sql(f"insert into administrator_profiles(user_id, scope) values ({root_id}, 'SYSTEM_ADMIN')")
A = login(mail("root"))
s, _ = call("PUT", "/admin/config", [{"key": "sla.monitor.interval.seconds", "value": "5"},
                                     {"key": "assignment.strategy", "value": "COMPOSITE"}], token=A)
check("config: monitor interval set to 5 s", s == 200, s)

skill = call("POST", "/admin/skills", {"name": f"Sla-{RUN}"}, token=A)[1]["id"]
svc = call("POST", "/admin/services", {"name": f"SlaSvc-{RUN}", "criticality": 2, "alwaysP1": False}, token=A)[1]["id"]
cat = call("POST", "/admin/categories", {"name": f"SlaCat-{RUN}", "requiredSkillIds": [skill]}, token=A)[1]["id"]
for prio, resp, res in (("P1", 2, 4), ("P2", 2, 4), ("P3", 2, 4), ("P4", 60, 240)):
    s, _ = call("POST", "/admin/sla-policies", {"serviceId": svc, "priority": prio, "responseMinutes": resp,
                                                "resolutionMinutes": res}, token=A)
    check(f"setup: service SLA policy {prio}", s == 201, s)


def user(tag, roles, technician=None):
    body = {"name": tag.title(), "email": mail(tag), "password": PW, "roles": roles}
    if technician:
        body["technician"] = technician
    s, b = call("POST", "/admin/users", body, token=A)
    return b["id"] if s == 201 else None


tech_id = user("tech", ["EMPLOYEE", "TECHNICIAN"], {"experienceLevel": 3, "escalationLevel": 0, "maxLoad": 50,
                                                     "availability": "AVAILABLE",
                                                     "skills": [{"skillId": skill, "proficiency": 5}]})
user("lead", ["EMPLOYEE", "TECHNICIAN"], {"experienceLevel": 5, "escalationLevel": 1, "maxLoad": 10,
                                          "availability": "OFF_DUTY", "skills": []})
user("emp", ["EMPLOYEE"])
T, L, E = login(mail("tech")), login(mail("lead")), login(mail("emp"))


def incident(title):
    s, b = call("POST", "/incidents", {"confirmNotDuplicate": True, "title": title, "description": "SLA monitor smoke test incident " + RUN,
                                       "serviceId": svc, "categoryId": cat, "impact": 1, "urgency": 1,
                                       "affectedUsers": 1}, token=E)
    return b if s == 201 else {"error": b}


# ---------------------------------------------------------------- warnings and violation, each exactly once
inc = incident(f"Printer queue stuck {RUN}")
check("create: P4, assigned to the technician", inc.get("priority") == "P4" and inc.get("status") == "ASSIGNED"
      and (inc.get("assignee") or {}).get("id") == tech_id, inc)
iid, code = inc["id"], inc["code"]

sql(f"update incidents set response_due = now() + interval '600 seconds' where id={iid}")  # 3600 s target: 83 %
check("first warning at 75 % of the response clock",
      wait_for(lambda: flags(iid)["r75"], 75) and not flags(iid)["r90"], flags(iid))  # first run may be 60 s out
s, d = call("GET", f"/incidents/{iid}", token=E)
check("slaState WARNING after the first warning", d.get("slaState") == "WARNING", d.get("slaState"))

sql(f"update incidents set response_due = now() + interval '300 seconds' where id={iid}")  # 92 %
check("second warning at 90 % (response)", wait_for(lambda: flags(iid)["r90"]), flags(iid))

sql(f"update incidents set response_due = now() - interval '30 seconds' where id={iid}")
check("violation once the response deadline passed", wait_for(lambda: flags(iid)["rv"]), flags(iid))
v = violations_of(iid)
check("violation row: RESPONSE, overdue >= 30 s, technician recorded",
      len(v) == 1 and v[0].split("|")[0] == "RESPONSE" and int(v[0].split("|")[1]) >= 30
      and v[0].split("|")[2] == str(tech_id), v)
s, d = call("GET", f"/incidents/{iid}", token=E)
check("slaState VIOLATED", d.get("slaState") == "VIOLATED", d.get("slaState"))
runs_pass()
check("fire once: still exactly one violation after more runs", len(violations_of(iid)) == 1, violations_of(iid))
warn_lines = [l for l in log_lines(code) if "SLA warning" in l]
check("fire once: exactly one first and one second warning logged",
      sum("warning 1" in l for l in warn_lines) == 1 and sum("warning 2" in l for l in warn_lines) == 1, warn_lines)
check("resolution clock untouched (17 % elapsed)", not any(flags(iid)[k] for k in ("s75", "s90", "sv")), flags(iid))

# ---------------------------------------------------------------- T23: resolution clock at 75, 90, 100 %, two runs each
inc4 = incident(f"Shared drive slow {RUN}")
iid4, code4 = inc4["id"], inc4["code"]
call("POST", f"/incidents/{iid4}/acknowledge", token=T)  # stop the response clock, only resolution runs
for label, remaining, flag in (("75", 2400, "s75"), ("90", 1152, "s90"), ("100", -20, "sv")):  # 14400 s target
    sql(f"update incidents set resolution_due = now() + interval '{remaining} seconds' where id={iid4}")
    fired = wait_for(lambda: flags(iid4)[flag])
    runs_pass()  # the monitor runs at least twice more at this point
    lines4 = [l for l in log_lines(code4) if "SlaMonitor" in l]
    check(f"T23: resolution clock at {label} %: fired, and once only after two more runs",
          fired and len(lines4) == {"75": 1, "90": 2, "100": 3}[label], lines4)
check("T23: one RESOLUTION violation row", [r.split("|")[0] for r in violations_of(iid4)] == ["RESOLUTION"],
      violations_of(iid4))

# ---------------------------------------------------------------- the paused clock raises nothing
for action in ("acknowledge", "start"):
    call("POST", f"/incidents/{iid}/{action}", token=T)
s, _ = call("POST", f"/incidents/{iid}/request-info", {"message": "Which printer model is it, please?"}, token=T)
check("request-info pauses the clock", s == 200, s)
sql(f"update incidents set resolution_due = now() - interval '120 seconds' where id={iid}")
runs_pass()
check("paused: no resolution warning or violation while PENDING_USER_INFO",
      not any(flags(iid)[k] for k in ("s75", "s90", "sv")) and len(violations_of(iid)) == 1, flags(iid))
s, _ = call("POST", f"/incidents/{iid}/provide-info", {"message": "HP LaserJet 4000"}, token=E)
check("provide-info resumes", s == 200, s)
check("resumed past the deadline: resolution violation recorded",
      wait_for(lambda: flags(iid)["sv"]) and [r.split("|")[0] for r in violations_of(iid)] == ["RESPONSE", "RESOLUTION"],
      violations_of(iid))

# ---------------------------------------------------------------- a late run raises only the highest alert
inc2 = incident(f"Scanner offline {RUN}")
iid2, code2 = inc2["id"], inc2["code"]
sql(f"update incidents set response_due = now() + interval '120 seconds' where id={iid2}")  # 97 %: both crossed
check("late run: second warning fired", wait_for(lambda: flags(iid2)["r90"]), flags(iid2))
lines2 = [l for l in log_lines(code2) if "SLA warning" in l]
check("late run: only the second warning, the first is marked sent without firing",
      flags(iid2)["r75"] and len(lines2) == 1 and "warning 2" in lines2[0], lines2)

# ---------------------------------------------------------------- a changed deadline gets fresh warnings
inc3 = incident(f"Badge reader slow {RUN}")
iid3 = inc3["id"]
sql(f"update incidents set response_due = now() + interval '600 seconds' where id={iid3}")
check("retarget setup: first warning fired", wait_for(lambda: flags(iid3)["r75"]), flags(iid3))
s, d = call("POST", f"/incidents/{iid3}/override-priority", {"priority": "P3", "reason": "Smoke test retarget"},
            token=A)
check("override P4 -> P3 moves the deadline", s == 200 and d.get("priority") == "P3", (s, d))
check("retarget: warnings reset for the new deadline", not flags(iid3)["r75"] and not flags(iid3)["r90"], flags(iid3))

# ---------------------------------------------------------------- GET /sla/violations
s, b = call("GET", "/sla/violations?size=100", token=A)
mine = [x for x in (b or {}).get("items", []) if x["incidentId"] == iid] if s == 200 else []
check("GET /sla/violations (admin): 200, both violations with code and technician",
      len(mine) == 2 and {x["type"] for x in mine} == {"RESPONSE", "RESOLUTION"}
      and all(x["incidentCode"] == code and x["technician"]["id"] == tech_id for x in mine), (s, mine))
check("paged wrapper", s == 200 and {"items", "page", "size", "totalItems", "totalPages"} <= set(b), b)
s, _ = call("GET", "/sla/violations", token=L)
check("team lead may view violations", s == 200, s)
s, b = call("GET", "/sla/violations", token=T)
check("technician gets 403", s == 403 and b.get("code") == "UNAUTHORIZED_OPERATION", (s, b))
s, _ = call("GET", "/sla/violations", token=E)
check("employee gets 403", s == 403, s)
s, b = call("GET", "/sla/violations?from=2030-01-01T00:00:00Z&to=2020-01-01T00:00:00Z", token=A)
check("from after to: 400 on field 'to'", s == 400 and [f["field"] for f in b.get("fieldErrors", [])] == ["to"],
      (s, b))
s, b = call("GET", "/sla/violations?to=2000-01-01T00:00:00Z", token=A)
check("range filter: nothing before 2000", s == 200 and b["totalItems"] == 0, b)

call("PUT", "/admin/config", [{"key": "sla.monitor.interval.seconds", "value": "60"}], token=A)
