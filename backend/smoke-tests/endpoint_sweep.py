"""Calls every implemented endpoint with a happy-path request and measures coverage against the live OpenAPI spec.
Local dev server only, throwaway data."""
import os
import atexit
import json
import re
import secrets
import subprocess
import urllib.error
import urllib.request

ROOT = "http://localhost:" + os.environ.get("SMOKE_PORT", "8081") 
BASE = ROOT + "/api/v1"
RUN = secrets.token_hex(3)
PW = "Ab9-Zq" + secrets.token_hex(4) + "9"
results = []
hits = set()        # (METHOD, template) answered with 2xx

spec = json.load(urllib.request.urlopen(ROOT + "/v3/api-docs"))
OPS = []
for template, item in spec["paths"].items():
    for method, op in item.items():
        if "Planned" in op.get("tags", []):
            continue
        rx = "^" + re.sub(r"\{[^}]+\}", "[^/?]+", template) + r"(\?.*)?$"
        OPS.append((method.upper(), template, re.compile(rx)))


@atexit.register
def report():
    for status, name, detail in results:
        print(f"{status}  {name}" + (f"   -> {detail}" if status == "FAIL" else ""))
    print(f"\n{sum(r[0] == 'PASS' for r in results)}/{len(results)} checks passed")
    missing = sorted((m, t) for m, t, _ in OPS if (m, t) not in hits)
    print(f"COVERAGE: {len(OPS) - len(missing)}/{len(OPS)} implemented operations answered with a success status")
    for m, t in missing:
        print(f"   NOT HIT: {m} {t}")


def call(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read().decode()
            status, payload = r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            status, payload = e.code, json.loads(raw)
        except json.JSONDecodeError:
            status, payload = e.code, raw
    if 200 <= status < 300:
        full = "/api/v1" + path
        for m, t, rx in OPS:
            if m == method and rx.match(full):
                hits.add((m, t))
                break
    return status, payload


def ok(name, cond, detail=""):
    results.append(("PASS" if cond else "FAIL", name, detail))


def sql(statement):
    out = subprocess.run(["docker", "exec", "iitsm-db", "psql", "-U", "iitsm", "-d", os.environ.get("SMOKE_DB", "iitsm"), "-tAc", statement],
                         capture_output=True, text=True)
    return out.stdout.strip() or out.stderr.strip()


def mail(tag):
    return f"{tag}.{RUN}@iitsm.demo"


def token(email):
    return call("POST", "/auth/login", {"email": email, "password": PW})[1]["accessToken"]


# ---------------------------------------------------------------- auth
s, b = call("POST", "/auth/register", {"name": "Sweep Admin", "email": mail("admin"), "password": PW})
ok("POST /auth/register -> 201", s == 201, (s, b))
admin_id = b["user"]["id"]
sql(f"insert into user_roles(user_id, role_type, granted_at) values ({admin_id}, 'ADMINISTRATOR', now())")
sql(f"insert into administrator_profiles(user_id, scope) values ({admin_id}, 'SYSTEM_ADMIN')")
s, b = call("POST", "/auth/login", {"email": mail("admin"), "password": PW})
ok("POST /auth/login -> 200 with ADMINISTRATOR", s == 200 and "ADMINISTRATOR" in b["user"]["roles"], (s, b))
A, refresh = b["accessToken"], b["refreshToken"]
s, b = call("POST", "/auth/refresh", {"refreshToken": refresh})
ok("POST /auth/refresh -> 200", s == 200, s)
A, refresh = b["accessToken"], b["refreshToken"]
s, b = call("GET", "/auth/me", token=A)
ok("GET /auth/me -> 200", s == 200 and b["email"] == mail("admin"), (s, b))

# ---------------------------------------------------------------- skills
skills = [call("POST", "/admin/skills", {"name": f"{n}-{RUN}"}, token=A)[1]["id"] for n in ("Networking", "Linux", "Spare")]
ok("POST /admin/skills -> 201 (x3)", all(skills), skills)
s, b = call("GET", "/admin/skills", token=A)
ok("GET /admin/skills lists them", s == 200 and {x["id"] for x in b} >= set(skills), s)
s, b = call("PUT", f"/admin/skills/{skills[1]}", {"name": f"Linux-Admin-{RUN}"}, token=A)
ok("PUT /admin/skills/{id} renames", s == 200 and b["name"] == f"Linux-Admin-{RUN}", (s, b))
s, _ = call("DELETE", f"/admin/skills/{skills[2]}", token=A)
ok("DELETE /admin/skills/{id} (unused) -> 204", s == 204, s)

# ---------------------------------------------------------------- services
def service(name, crit, deps=None):
    return call("POST", "/admin/services", {"name": f"{name}-{RUN}", "criticality": crit, "alwaysP1": False,
                                            "dependencyIds": deps or []}, token=A)


s, db = service("Database", 5)
ok("POST /admin/services -> 201", s == 201, (s, db))
app = service("App", 4, [db["id"]])[1]
old = service("Legacy", 1)[1]
s, b = call("GET", "/admin/services", token=A)
ok("GET /admin/services (admin) lists all", s == 200 and {db["id"], app["id"], old["id"]} <= {x["id"] for x in b}, s)
s, b = call("GET", f"/admin/services/{app['id']}", token=A)
ok("GET /admin/services/{id}", s == 200 and b["dependencyIds"] == [db["id"]], (s, b))
s, b = call("PUT", f"/admin/services/{app['id']}", {"name": f"App-{RUN}", "owner": "App team", "criticality": 4,
                                                     "alwaysP1": False, "description": "Customer app"}, token=A)
ok("PUT /admin/services/{id} updates, keeps dependencies when omitted", s == 200 and b["owner"] == "App team"
   and b["dependencyIds"] == [db["id"]], (s, b))
s, b = call("PUT", f"/admin/services/{app['id']}/dependencies", {"dependencyIds": []}, token=A)
ok("PUT /admin/services/{id}/dependencies", s == 200 and b["dependencyIds"] == [], (s, b))
s, _ = call("DELETE", f"/admin/services/{old['id']}", token=A)
ok("DELETE /admin/services/{id} -> 204 (switched off)", s == 204, s)

# ---------------------------------------------------------------- categories
s, cat = call("POST", "/admin/categories", {"name": f"Infra-{RUN}", "requiredSkillIds": [skills[0]]}, token=A)
ok("POST /admin/categories -> 201", s == 201, (s, cat))
tmp = call("POST", "/admin/categories", {"name": f"Temp-{RUN}"}, token=A)[1]
s, b = call("GET", "/admin/categories", token=A)
ok("GET /admin/categories (flat, with parent and skills)", s == 200 and any(c["id"] == cat["id"] for c in b), s)
s, b = call("PUT", f"/admin/categories/{tmp['id']}", {"name": f"Temp-Child-{RUN}", "parentId": cat["id"],
                                                       "requiredSkillIds": []}, token=A)
ok("PUT /admin/categories/{id} moves under a parent", s == 200 and b["parentId"] == cat["id"], (s, b))
s, _ = call("DELETE", f"/admin/categories/{tmp['id']}", token=A)
ok("DELETE /admin/categories/{id} -> 204 (switched off)", s == 204, s)
s, b = call("GET", "/services", token=A)
ok("GET /services", s == 200 and any(x["id"] == app["id"] for x in b), s)
s, b = call("GET", "/categories", token=A)
ok("GET /categories (tree)", s == 200 and any(x["id"] == cat["id"] for x in b), s)

# ---------------------------------------------------------------- SLA and escalation
for prio, resp, res in (("P1", 5, 30), ("P2", 15, 120), ("P3", 60, 480), ("P4", 240, 1440)):
    call("POST", "/admin/sla-policies", {"priority": prio, "responseMinutes": resp, "resolutionMinutes": res}, token=A)
s, pol = call("POST", "/admin/sla-policies", {"serviceId": app["id"], "priority": "P3", "responseMinutes": 30,
                                              "resolutionMinutes": 240}, token=A)
ok("POST /admin/sla-policies (service-specific) -> 201", s == 201, (s, pol))
s, b = call("GET", "/admin/sla-policies", token=A)
ok("GET /admin/sla-policies", s == 200 and any(p["id"] == pol["id"] for p in b), s)
s, b = call("PUT", f"/admin/sla-policies/{pol['id']}", {"serviceId": app["id"], "priority": "P3",
                                                         "responseMinutes": 20, "resolutionMinutes": 200}, token=A)
ok("PUT /admin/sla-policies/{id}", s == 200 and b["responseMinutes"] == 20, (s, b))
s, _ = call("DELETE", f"/admin/sla-policies/{pol['id']}", token=A)
ok("DELETE /admin/sla-policies/{id} -> 204", s == 204, s)
sql("delete from escalation_policies where priority = 'P2'")
s, esc = call("POST", "/admin/escalation-policies", {"priority": "P2", "level": 1, "timeoutMinutes": 30}, token=A)
ok("POST /admin/escalation-policies -> 201", s == 201, (s, esc))
s, b = call("GET", "/admin/escalation-policies", token=A)
ok("GET /admin/escalation-policies", s == 200 and any(e["id"] == esc["id"] for e in b), s)
s, b = call("PUT", f"/admin/escalation-policies/{esc['id']}", {"priority": "P2", "level": 1, "timeoutMinutes": 20}, token=A)
ok("PUT /admin/escalation-policies/{id}", s == 200 and b["timeoutMinutes"] == 20, (s, b))
s, _ = call("DELETE", f"/admin/escalation-policies/{esc['id']}", token=A)
ok("DELETE /admin/escalation-policies/{id} (top level) -> 204", s == 204, s)
call("POST", "/admin/escalation-policies", {"priority": "P2", "level": 1, "timeoutMinutes": 30}, token=A)

# ---------------------------------------------------------------- config
s, b = call("GET", "/admin/config", token=A)
ok("GET /admin/config (76 settings)", s == 200 and len(b) == 76, (s, len(b) if isinstance(b, list) else b))
s, b = call("PUT", "/admin/config", [{"key": "assignment.strategy", "value": "COMPOSITE"}], token=A)
ok("PUT /admin/config", s == 200, s)

# ---------------------------------------------------------------- admin users and technicians
def tech(tag, name, skill_list):
    return call("POST", "/admin/users", {
        "name": name, "email": mail(tag), "password": PW, "roles": ["EMPLOYEE", "TECHNICIAN"],
        "technician": {"experienceLevel": 4, "escalationLevel": 0, "maxLoad": 10,
                       "skills": [{"skillId": k, "proficiency": 4} for k in skill_list]}}, token=A)


s, t1 = tech("t1", "Sweep Tech One", [skills[0], skills[1]])
ok("POST /admin/users (technician) -> 201", s == 201, (s, t1))
t2 = tech("t2", "Sweep Tech Two", [skills[0]])[1]
lead = call("POST", "/admin/users", {"name": "Sweep Lead", "email": mail("lead"), "password": PW,
                                     "roles": ["EMPLOYEE", "TECHNICIAN"],
                                     "technician": {"experienceLevel": 5, "escalationLevel": 1, "availability": "OFF_DUTY",
                                                    "skills": []}}, token=A)[1]
emp = call("POST", "/admin/users", {"name": "Sweep Employee", "email": mail("emp"), "password": PW,
                                    "roles": ["EMPLOYEE"], "department": "Finance"}, token=A)[1]
s, b = call("GET", "/admin/users", token=A)
ok("GET /admin/users (admin)", s == 200 and {t1["id"], emp["id"]} <= {u["id"] for u in b}, s)
s, b = call("GET", f"/admin/users/{t1['id']}", token=A)
ok("GET /admin/users/{id}", s == 200 and b["technician"]["experienceLevel"] == 4, (s, b))
s, b = call("PUT", f"/admin/users/{emp['id']}", {"location": "Hyderabad"}, token=A)
ok("PUT /admin/users/{id}", s == 200 and b["location"] == "Hyderabad" and b["department"] == "Finance", (s, b))
s, b = call("POST", f"/admin/users/{emp['id']}/roles", {"roleType": "ADMINISTRATOR", "administrator": {"scope": "IT_MANAGER"}}, token=A)
ok("POST /admin/users/{id}/roles", s == 200 and "ADMINISTRATOR" in b["roles"], (s, b))
s, b = call("DELETE", f"/admin/users/{emp['id']}/roles/ADMINISTRATOR", token=A)
ok("DELETE /admin/users/{id}/roles/{roleType}", s == 200 and b["roles"] == ["EMPLOYEE"], (s, b))
s, b = call("PUT", f"/admin/technicians/{t2['id']}/skills", [{"skillId": skills[0], "proficiency": 5}], token=A)
ok("PUT /admin/technicians/{id}/skills", s == 200 and b["skills"][0]["proficiency"] == 5, (s, b))
s, b = call("PUT", f"/admin/technicians/{t2['id']}", {"maxLoad": 12}, token=A)
ok("PUT /admin/technicians/{id}", s == 200 and b["maxLoad"] == 12, (s, b))
leaver = call("POST", "/admin/users", {"name": "Sweep Leaver", "email": mail("leaver"), "password": PW, "roles": ["EMPLOYEE"]}, token=A)[1]
s, _ = call("DELETE", f"/admin/users/{leaver['id']}", token=A)
ok("DELETE /admin/users/{id} -> 204 (deactivated)", s == 204, s)
L, T1, T2, E = token(mail("lead")), token(mail("t1")), token(mail("t2")), token(mail("emp"))
s, b = call("GET", "/technicians", token=L)
ok("GET /technicians (team lead)", s == 200 and any(t["id"] == t1["id"] for t in b), s)
s, b = call("PUT", "/technicians/me/availability", {"availability": "BUSY"}, token=T2)
ok("PUT /technicians/me/availability", s == 200 and b["availability"] == "BUSY", (s, b))

# ---------------------------------------------------------------- incidents
DESC = "The customer application returns errors for every login since the morning."


def report(svc, category=None, title="App login errors"):
    return call("POST", "/incidents", {"confirmNotDuplicate": True, "title": title, "description": DESC, "serviceId": svc, "categoryId": category,
                                       "impact": 3, "urgency": 3, "affectedUsers": 20}, token=E)


s, auto = report(app["id"], cat["id"])
ok("POST /incidents -> 201, auto-assigned", s == 201 and auto["status"] == "ASSIGNED", (s, auto))
s, b = call("GET", f"/incidents/{auto['id']}/recommendations", token=L)
ok("GET /incidents/{id}/recommendations", s == 200 and "recommendations" in b and "excluded" in b, (s, b))
s, inc = report(app["id"], title="App login errors, manual path")
iid = inc["id"]
s, b = call("GET", "/incidents?mine=true&sort=createdAt,desc", token=E)
ok("GET /incidents (list)", s == 200 and b["totalItems"] >= 2, s)
s, b = call("GET", f"/incidents/{iid}", token=E)
ok("GET /incidents/{id}", s == 200 and b["status"] == "CLASSIFIED", (s, b))
s, b = call("PUT", f"/incidents/{iid}", {"affectedUsers": 120, "version": b["version"]}, token=E)
ok("PUT /incidents/{id}", s == 200 and b["affectedUsers"] == 120, (s, b))
s, b = call("POST", f"/incidents/{iid}/assign", {"technicianId": t1["id"]}, token=L)
ok("POST /incidents/{id}/assign", s == 200 and b["status"] == "ASSIGNED", (s, b))
s, b = call("POST", f"/incidents/{iid}/reassign", {"technicianId": t2["id"], "reason": "Tech One is in training."}, token=L)
ok("POST /incidents/{id}/reassign", s == 200 and b["assignee"]["id"] == t2["id"], (s, b))
s, b = call("POST", f"/incidents/{iid}/escalate", {"reason": "Customer is waiting on the line."}, token=L)
ok("POST /incidents/{id}/escalate", s == 200 and b["escalationLevel"] == 1, (s, b))
steps = [("acknowledge", None, "ACKNOWLEDGED"), ("start", None, "IN_PROGRESS"),
         ("request-info", {"message": "Which browser and which error text do you see?"}, "PENDING_USER_INFO")]
for action, body, expect in steps:
    s, b = call("POST", f"/incidents/{iid}/{action}", body, token=T2)
    ok(f"POST /incidents/{{id}}/{action} -> {expect}", s == 200 and b["status"] == expect, (s, b))
s, b = call("POST", f"/incidents/{iid}/provide-info", {"message": "Chrome, error 'session expired'."}, token=E)
ok("POST /incidents/{id}/provide-info -> IN_PROGRESS", s == 200 and b["status"] == "IN_PROGRESS", (s, b))
s, b = call("POST", f"/incidents/{iid}/override-priority", {"priority": "P2", "reason": "Customer-facing login."}, token=L)
ok("POST /incidents/{id}/override-priority", s == 200 and b["priority"] == "P2", (s, b))
s, b = call("POST", f"/incidents/{iid}/comments", {"body": "Investigating session store.", "visibility": "INTERNAL"}, token=T2)
ok("POST /incidents/{id}/comments -> 201", s == 201, (s, b))
s, b = call("GET", f"/incidents/{iid}/comments", token=T2)
ok("GET /incidents/{id}/comments", s == 200 and len(b) >= 3, (s, b))
s, b = call("POST", f"/incidents/{iid}/resolve", {"rootCause": "Session store ran out of memory",
                                                   "notes": "Raised the memory limit and restarted the session store.",
                                                   "timeSpentMinutes": 25, "reusableSolution": True}, token=T2)
ok("POST /incidents/{id}/resolve -> RESOLVED", s == 200 and b["status"] == "RESOLVED", (s, b))
s, b = call("POST", f"/incidents/{iid}/verify", token=E)
ok("POST /incidents/{id}/verify -> VERIFIED", s == 200 and b["status"] == "VERIFIED", (s, b))
s, b = call("POST", f"/incidents/{iid}/feedback", {"rating": 5, "comment": "Fixed fast."}, token=E)
ok("POST /incidents/{id}/feedback -> 201", s == 201 and b["rating"] == 5, (s, b))
s, b = call("POST", f"/incidents/{iid}/close", token=A)
ok("POST /incidents/{id}/close -> CLOSED", s == 200 and b["status"] == "CLOSED", (s, b))
s, b = call("POST", f"/incidents/{iid}/reopen", {"reason": "The error came back after lunch."}, token=E)
ok("POST /incidents/{id}/reopen -> REOPENED", s == 200 and b["status"] == "REOPENED", (s, b))

# ---------------------------------------------------------------- technician views, logout
s, b = call("GET", "/technicians/me/workload", token=T2)
ok("GET /technicians/me/workload", s == 200 and b["activeIncidents"] >= 1, (s, b))
s, b = call("GET", "/technicians/me/queue", token=T2)
ok("GET /technicians/me/queue", s == 200 and b["totalItems"] >= 1, (s, b))

# ---------------------------------------------------------------- SLA (M7)
s, b = call("GET", "/sla/violations?size=5", token=A)
ok("GET /sla/violations", s == 200 and "items" in b, (s, b))

# ---------------------------------------------------------------- audit (M8)
s, b = call("GET", f"/incidents/{iid}/history", token=E)
ok("GET /incidents/{id}/history", s == 200 and b[0]["action"] == "INCIDENT_CREATED", (s, b))
s, b = call("GET", f"/audit?incidentId={iid}&size=5", token=A)
ok("GET /audit", s == 200 and b["totalItems"] >= 1, (s, b))

# ---------------------------------------------------------------- search and reports (M10)
s, b = call("GET", "/incidents?slaState=OK&size=5", token=A)
ok("GET /incidents?slaState=OK", s == 200 and "items" in b, (s, b))
for name in ("overview", "services", "trends", "priority-distribution", "category-distribution", "sla-compliance",
             "workload", "coverage-risk"):
    s, b = call("GET", f"/reports/{name}", token=A)
    ok(f"GET /reports/{name}", s == 200, (s, b))
s, b = call("GET", "/reports/overview", token=E)
ok("GET /reports/overview for an employee counts only their own", s == 200 and b["total"] >= 1, (s, b))
req = urllib.request.Request(BASE + "/reports/export?type=incidents", headers={"Authorization": "Bearer " + A})
with urllib.request.urlopen(req) as r:
    csv_body = r.read().decode()
    hits.add(("GET", "/api/v1/reports/export"))
ok("GET /reports/export?type=incidents (CSV)", csv_body.startswith("code,title,status"), csv_body[:60])
s, b = call("GET", f"/incidents/{iid}/post-incident-report", token=E)
ok("GET /incidents/{id}/post-incident-report", s == 200 and b["code"] and b["timeline"], (s, b))
req = urllib.request.Request(BASE + f"/incidents/{iid}/post-incident-report/pdf", headers={"Authorization": "Bearer " + E})
with urllib.request.urlopen(req) as r:
    pdf = r.read()
    hits.add(("GET", "/api/v1/incidents/{id}/post-incident-report/pdf"))
ok("GET /incidents/{id}/post-incident-report/pdf", pdf[:4] == b"%PDF", pdf[:8])
s, b = call("POST", "/saved-filters", {"name": f"Sweep view {RUN}", "filter": {"status": ["ASSIGNED"], "slaState": "OK"}}, token=E)
ok("POST /saved-filters -> 201", s == 201, (s, b))
view_id = b["id"] if s == 201 else 0
s, b = call("GET", "/saved-filters", token=E)
ok("GET /saved-filters", s == 200 and any(v["id"] == view_id for v in b), (s, b))
s, _ = call("DELETE", f"/saved-filters/{view_id}", token=E)
ok("DELETE /saved-filters/{id} -> 204", s == 204, s)
s, b = call("POST", "/priority/what-if", {"incidentId": iid, "impact": 5, "urgency": 5, "affectedUsers": 300}, token=E)
ok("POST /priority/what-if", s == 200 and b["whatIf"]["priority"], (s, b))

# ---------------------------------------------------------------- intelligence (M12)
s, b = call("POST", "/intelligence/suggest-category", {"title": "VPN drops", "description": "VPN disconnects every few minutes"}, token=E)
ok("POST /intelligence/suggest-category", s == 200 and b["source"] in ("LLM", "KEYWORD") and "confidence" in b, (s, b))
s, b = call("POST", "/intelligence/suggest-intake", {"description": "Everyone cannot send email, urgent"}, token=E)
ok("POST /intelligence/suggest-intake", s == 200 and 1 <= b["impact"] <= 5 and 1 <= b["urgency"] <= 5, (s, b))
s, b = call("POST", "/intelligence/similar", {"title": "App login errors again", "description": DESC, "serviceId": app["id"]}, token=E)
ok("POST /intelligence/similar", s == 200 and isinstance(b, list), (s, b))
s, b = call("GET", f"/incidents/{iid}/similar", token=E)
ok("GET /incidents/{id}/similar", s == 200 and isinstance(b, list), (s, b))
s, b = call("GET", f"/incidents/{iid}/suggested-resolutions", token=T2)
ok("GET /incidents/{id}/suggested-resolutions", s == 200 and isinstance(b, list), (s, b))
s, b = call("POST", f"/incidents/{iid}/summary", token=T2)
ok("POST /incidents/{id}/summary", s == 200 and b["summary"] and isinstance(b["handoverNotes"], list), (s, b))
s, b = call("GET", f"/incidents/{iid}/sla-risk", token=T2)
ok("GET /incidents/{id}/sla-risk", s == 200 and 0 <= b["score"] <= 1 and len(b["factors"]) == 4, (s, b))

# ---------------------------------------------------------------- module parts (M12 rest, M13, M14, M2b)
# Each file in sweep_parts/ is run here with this script's globals (call, ok, sql, mail, token, PW, RUN, A, L, T1, T2,
# E, app, db, cat, skills, DESC, report, iid), so a module adds its endpoints without editing this file.
import pathlib  # noqa: E402
for _part in sorted((pathlib.Path(__file__).parent / "sweep_parts").glob("*.py")):
    exec(compile(_part.read_text(encoding="utf-8"), str(_part), "exec"), globals())

s, _ = call("POST", "/auth/logout", {"refreshToken": refresh}, token=A)
ok("POST /auth/logout -> 204", s == 204, s)
