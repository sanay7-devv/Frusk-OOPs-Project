"""Handbook 2.12 checklist item: "Demo profile timings verified (SLA 30 s, escalation 1 minute, auto-verify 2 minutes)".
Needs the backend on profile dev,demo and a fresh database (it relies on the seeded escalation policies that the
db/demo migration sets to 1 minute). Real time, no clock tricks, takes about 3 minutes:
    SMOKE_PORT=8081 SMOKE_DB=iitsm SMOKE_CONTAINER=iitsm-db python -X utf8 demo_timings_check.py
Part A reads the effective settings and policies; part B measures the behaviour: a new unacknowledged P1 climbs one
level per minute, a RESOLVED incident is closed as AUTO_VERIFIED after about 2 minutes, and an overdue response
deadline is flagged within one SLA monitor interval (30 s).
"""
import sys
import time

from m12_common import RUN, call, setup_world, sql

results = []


def check(name, ok, detail=""):
    results.append(("PASS" if ok else "FAIL", name, detail))
    print(("PASS  " if ok else "FAIL  ") + name + ("" if ok else f"   -> {detail}"), flush=True)


w = setup_world(service_names=("Demo Timing Svc",))
A, T, E = w["A"], w["T"], w["E"]
s, cfg = call("GET", "/admin/config", token=A)
cfg = {c["key"]: c["value"] for c in cfg}

# ---------------------------------------------------------------- A: effective settings
check("A: SLA monitor interval 30 s", cfg["sla.monitor.interval.seconds"] == "30", cfg["sla.monitor.interval.seconds"])
check("A: escalation monitor interval 15 s", cfg["escalation.monitor.interval.seconds"] == "15")
check("A: escalation exhausted wait 1 minute", cfg["escalation.exhausted.minutes"] == "1")
check("A: auto-verify after 0.033 h (about 2 minutes), job every 30 s",
      cfg["verify.auto.hours"] == "0.033" and cfg["verify.monitor.interval.seconds"] == "30",
      (cfg["verify.auto.hours"], cfg["verify.monitor.interval.seconds"]))
check("A: auto-verify delay is 2 minutes (0.033 h = %.1f s)" % (float(cfg["verify.auto.hours"]) * 3600),
      110 <= float(cfg["verify.auto.hours"]) * 3600 <= 125)
pol = sql("select priority || ':' || level || ':' || timeout_minutes from escalation_policies "
          "where priority in ('P1','P2') order by 1").splitlines()
check("A: every P1 and P2 escalation level has a 1 minute timeout", pol and all(p.endswith(":1") for p in pol), pol)
pol34 = sql("select count(*) from escalation_policies where priority in ('P3','P4')")
check("A: P3 and P4 are not escalated automatically (no policy rows)", pol34 == "0", pol34)

# ---------------------------------------------------------------- B: behaviour in real time
admin = A
svc_p1 = call("POST", "/admin/services", {"name": f"Demo P1 {RUN}", "criticality": 5, "alwaysP1": False}, token=admin)[1]["id"]
svc_low = call("POST", "/admin/services", {"name": f"Demo Low {RUN}", "criticality": 1, "alwaysP1": False}, token=admin)[1]["id"]
for svc in (svc_p1, svc_low):
    for prio in ("P1", "P2", "P3", "P4"):
        call("POST", "/admin/sla-policies", {"serviceId": svc, "priority": prio, "responseMinutes": 600,
                                             "resolutionMinutes": 1200}, token=admin)
cat = next(iter(w["cats"].values()))


def incident(title, svc, impact, urgency, users, token=E):
    s, b = call("POST", "/incidents", {"title": title, "description": "Demo timing check " + RUN, "serviceId": svc,
                                       "categoryId": cat, "impact": impact, "urgency": urgency,
                                       "affectedUsers": users, "confirmNotDuplicate": True}, token=token)
    return b if s == 201 else {"error": b}


p1 = incident(f"Demo timing P1 {RUN}", svc_p1, 5, 5, 150)
check("B: the incident is P1 and assigned to the technician (level 0)",
      p1.get("priority") == "P1" and p1.get("status") == "ASSIGNED" and p1.get("escalationLevel") == 0, p1)
low = incident(f"Demo timing resolved {RUN}", svc_low, 1, 1, 1)
# the assignment strategy may pick the team lead or the technician: act as whoever got it
_who = w["L"] if (low.get("assignee") or {}).get("id") == w["lead_id"] else T
_steps = [call("POST", f"/incidents/{low['id']}/acknowledge", token=_who)[0],
          call("POST", f"/incidents/{low['id']}/start", token=_who)[0],
          call("POST", f"/incidents/{low['id']}/resolve", {"rootCause": "Toner empty", "notes": "Changed the toner",
                                                         "steps": "Swapped cartridge", "timeSpentMinutes": 5}, token=_who)[0]]
check("B: the low-priority incident was acknowledged, started and resolved (200 each)", _steps == [200, 200, 200],
      (_steps, low.get("status"), low.get("assignee")))
late = incident(f"Demo timing overdue {RUN}", svc_low, 1, 1, 1)
sql(f"update incidents set response_due = now() - interval '5 seconds' where id={late['id']}")
t_overdue = time.time()

seen = {}
deadline = time.time() + 240
while time.time() < deadline and not {"l1", "l2", "closed", "violated"} <= seen.keys():
    now = time.time()
    lvl = int(sql(f"select escalation_level from incidents where id={p1['id']}") or 0)
    if lvl >= 1 and "l1" not in seen:
        seen["l1"] = float(sql(f"select extract(epoch from now() - created_at) from incidents where id={p1['id']}"))
    if lvl >= 2 and "l2" not in seen:
        seen["l2"] = float(sql(f"select extract(epoch from now() - created_at) from incidents where id={p1['id']}"))
    if "closed" not in seen and sql(f"select status from incidents where id={low['id']}") in ("VERIFIED", "CLOSED"):
        seen["closed"] = float(sql(f"select extract(epoch from now() - resolved_at) from incidents where id={low['id']}"))
    if "violated" not in seen and sql(f"select resp_violated from incidents where id={late['id']}") == "t":
        seen["violated"] = now - t_overdue
    time.sleep(1)

print("measured (seconds):", {k: round(v, 1) for k, v in seen.items()})
check("B: SLA monitor flags the overdue response within one 30 s interval (+ slack)",
      "violated" in seen and seen["violated"] <= 40, seen.get("violated"))
check("B: P1 climbed to level 1 after about 1 minute (60 s timeout + 15 s monitor)",
      "l1" in seen and 55 <= seen["l1"] <= 95, seen.get("l1"))
check("B: and to level 2 one more minute later",
      "l2" in seen and "l1" in seen and 50 <= seen["l2"] - seen["l1"] <= 85, (seen.get("l1"), seen.get("l2")))
check("B: the RESOLVED incident is closed automatically about 2 minutes after resolution (30 s job)",
      "closed" in seen and 110 <= seen["closed"] <= 170, seen.get("closed"))
check("B: closure reason AUTO_VERIFIED",
      sql(f"select closure_reason from incidents where id={low['id']}") == "AUTO_VERIFIED")

failed = [r for r in results if r[0] == "FAIL"]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
