"""Smoke test of the outage drill (D2), demo profile only. Start a backend with SPRING_PROFILES_ACTIVE=dev,schema-auto,demo:
    SMOKE_PORT=8085 SMOKE_DB=iitsm_m12b_demo python -I -X utf8 m12b_drill.py
(the dev-profile 404 of the same path is checked at the end of m12b_smoke.py)"""
import atexit
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from m12_common import RUN, call, setup_world  # noqa: E402

results = []


@atexit.register
def report_results():
    for status, name, detail in results:
        print(f"{status}  {name}" + (f"   -> {detail}" if status == "FAIL" else ""))
    print(f"\n{sum(r[0] == 'PASS' for r in results)}/{len(results)} passed")


def check(name, ok, detail=""):
    results.append(("PASS" if ok else "FAIL", name, detail))


w = setup_world(service_names=("Drill Core",))
A, E = w["A"], w["E"]
core = w["svc"]


def mk(name, deps):
    sid = call("POST", "/admin/services", {"name": f"{name} {RUN}", "criticality": 2, "alwaysP1": False},
               token=A)[1]["id"]
    for prio in ("P1", "P2", "P3", "P4"):
        call("POST", "/admin/sla-policies", {"serviceId": sid, "priority": prio, "responseMinutes": 60,
                                             "resolutionMinutes": 240}, token=A)
    call("PUT", f"/admin/services/{sid}/dependencies", {"dependencyIds": deps}, token=A)
    return sid


web = mk("Drill Web", [core])
lms = mk("Drill Lms", [core])

s, b = call("POST", "/admin/demo/outage-drill", {"rootServiceId": core}, token=E)
check("drill: an employee may not run it -> 403", s == 403, (s, b))
s, b = call("POST", "/admin/demo/outage-drill", {"rootServiceId": 99999999}, token=A)
check("drill: unknown service -> 404 SERVICE_NOT_FOUND", s == 404 and b["code"] == "SERVICE_NOT_FOUND", (s, b))
s, d = call("POST", "/admin/demo/outage-drill", {"rootServiceId": core}, token=A)
check("drill: files 2 incidents on the failing service and 1 on each of its 2 dependants -> 201",
      s == 201 and len(d["incidentCodes"]) == 4 and len(d["dependents"]) == 2, (s, d))
check("drill: everything is grouped under one problem record", d.get("problemId") is not None, d)
s, p = call("GET", f"/problems/{d['problemId']}", token=A)
check("drill: the record holds all 4 incidents, led by a P1 or P2 on the failing service", s == 200
      and p["incidentCount"] == 4 and p["status"] == "OPEN" and p["lead"]["service"]["id"] == core
      and p["lead"]["priority"] in ("P1", "P2"), (s, p))
s, rc = call("GET", f"/problems/{d['problemId']}/root-cause", token=A)
check("drill: the root cause from the graph is the failing service", s == 200 and rc["probable"]
      and rc["probable"]["service"]["id"] == core, (s, rc))
s, ko = call("GET", f"/problems/known-outages?serviceId={web}", token=E)
check("drill: an employee reporting on a dependant service sees the known outage", s == 200
      and any(x["problemId"] == d["problemId"] for x in ko), (s, ko))
s, d2 = call("POST", "/admin/demo/outage-drill", {"rootServiceId": core}, token=A)
check("drill: running it again works (a second set joins the same open record)", s == 201
      and d2["problemId"] == d["problemId"], (s, d2))
s, none = call("POST", "/admin/demo/outage-drill", {"rootServiceId": lms}, token=A)
check("drill: a service nobody depends on files only its own two incidents", s == 201
      and len(none["incidentCodes"]) == 2 and none["dependents"] == [], (s, none))
