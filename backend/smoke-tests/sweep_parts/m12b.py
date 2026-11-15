# Endpoint sweep part for M12 rest (session A). Run with the sweep's globals (call, ok, sql, mail, token, PW, RUN, A, L,
# T1, T2, E, db, app, cat, skills, report, iid). Every operation added by this module is called once or twice with a
# request that succeeds. Incidents are created here with their own wording and low impact (P4) wherever they must not
# be pulled into somebody else's problem record.
import time as _b_time


def _b_mk(svc_id, title, text, who=None, impact=1, urgency=1, users=1):
    s, b = call("POST", "/incidents", {"confirmNotDuplicate": True, "title": f"{title} {RUN}",
                                       "description": f"{text} {RUN}", "serviceId": svc_id,
                                       "impact": impact, "urgency": urgency, "affectedUsers": users},
                token=who or E)
    return b if s == 201 else {}


_b_fix = {"rootCause": "Worn parts were replaced after inspection.", "notes": "Replaced the worn parts and tested.",
          "steps": "inspect, replace, test", "timeSpentMinutes": 5}

# ---- withdraw and mark-duplicate
_b_w = _b_mk(app["id"], "Zebra stripe flicker on lab projector", "The lab projector shows zebra stripes whenever "
             "the lid of the cabinet is open.")
s, b = call("POST", f"/incidents/{_b_w.get('id')}/withdraw", {"reason": "It stopped after the cabinet was closed."},
            token=E)
ok("POST /incidents/{id}/withdraw", s == 200 and b.get("closureReason") == "WITHDRAWN", (s, b))

_b_d1 = _b_mk(app["id"], "Cafeteria queue board shows old menu", "The queue board in the cafeteria still shows "
              "last weeks menu items on every screen.")
_b_d2 = _b_mk(app["id"], "Campus bookshop till printer jammed", "The receipt printer at the bookshop till eats "
              "the paper roll and stops.", who=L)
s, b = call("POST", f"/incidents/{_b_d1.get('id')}/mark-duplicate", {"duplicateOfId": _b_d2.get("id")}, token=L)
ok("POST /incidents/{id}/mark-duplicate", s == 200 and b.get("closureReason") == "DUPLICATE", (s, b))

# ---- a record opened by hand (two quiet incidents), read, ungrouped and resolved
_b_r1 = _b_mk(app["id"], "Archive room humidifier leaks water", "The humidifier in the archive room leaks water "
              "onto the shelf below every night.")
_b_r2 = _b_mk(app["id"], "Library gate sensor beeps constantly", "The anti theft gate sensor in the library beeps "
              "constantly even with nobody passing.", who=L)
s, rec = call("POST", "/problems", {"title": f"Sweep record {RUN}", "incidentIds": [_b_r1.get("id"), _b_r2.get("id")]},
              token=L)
ok("POST /problems", s == 201 and rec.get("incidentCount") == 2, (s, rec))
_b_m = rec.get("id")
s, b = call("GET", "/problems", token=A)
ok("GET /problems", s == 200 and any(x["id"] == _b_m for x in b), (s, b))
s, b = call("GET", f"/problems/{_b_m}", token=L)
ok("GET /problems/{id}", s == 200 and b.get("id") == _b_m, (s, b))
s, b = call("GET", f"/problems/{_b_m}/root-cause", token=L)
ok("GET /problems/{id}/root-cause", s == 200 and "candidates" in b, (s, b))
s, b = call("DELETE", f"/problems/{_b_m}/incidents/{_b_r2.get('id')}", token=A)
ok("DELETE /problems/{id}/incidents/{incidentId}", s == 200 and b.get("incidentCount") == 1, (s, b))
s, b = call("POST", f"/problems/{_b_m}/resolve", _b_fix, token=L)
ok("POST /problems/{id}/resolve", s == 200 and b.get("status") == "RESOLVED", (s, b))

# ---- a real outage: P1 on Database, P1 on App (depends on Database) is grouped by the dependency rule
_b_p1 = _b_mk(db["id"], "Cluster storage unreachable everywhere", "The storage cluster behind the database cannot "
              "be reached from any building since lunch.", who=L, impact=5, urgency=5, users=120)
_b_p2 = _b_mk(app["id"], "Application screens time out", "Every screen of the application times out while "
              "loading and shows a gateway error page.", impact=4, urgency=5, users=15)
_b_pid = call("GET", f"/incidents/{_b_p2.get('id')}", token=A)[1].get("problemId")
if _b_pid is None:   # not grouped automatically: open the record by hand so the join below has a target
    _b_pid = call("POST", "/problems", {"incidentIds": [_b_p1.get("id"), _b_p2.get("id")]}, token=L)[1].get("id")
s, b = call("GET", f"/problems/known-outages?serviceId={app['id']}", token=E)
ok("GET /problems/known-outages", s == 200 and isinstance(b, list), (s, b))
s, b = call("POST", f"/problems/{_b_pid}/join", token=T1)  # E already reported the App incident, so E is not a new joiner
ok("POST /problems/{id}/join", s == 201 and b.get("closureReason") == "DUPLICATE", (s, b))

s, b = call("GET", "/problems/recurring", token=L)
ok("GET /problems/recurring", s == 200 and isinstance(b, list), (s, b))

# ---- chatbot
s, b = call("POST", "/intelligence/chat", {"answer": "My laptop cannot connect to the campus wifi since this morning."},
            token=E)
ok("POST /intelligence/chat", s == 200 and b.get("expecting") in ("SERVICE", "AFFECTED_USERS", "CONFIRM",
                                                                   "DESCRIPTION"), (s, b))
