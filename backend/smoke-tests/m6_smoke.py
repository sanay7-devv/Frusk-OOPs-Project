"""Smoke test of admin users/roles/skills and M6 assignment (local dev server, throwaway data, local DB only)."""
import os
import atexit
import json
import secrets
import subprocess
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
    out = subprocess.run(["docker", "exec", "iitsm-db", "psql", "-U", "iitsm", "-d", os.environ.get("SMOKE_DB", "iitsm"), "-tAc", statement],
                         capture_output=True, text=True)
    return out.stdout.strip() or out.stderr.strip()


def fe(b):
    return sorted({f["field"] for f in b.get("fieldErrors", [])}) if isinstance(b, dict) else b


def login(email):
    s, b = call("POST", "/auth/login", {"email": email, "password": PW})
    return b["accessToken"] if s == 200 else None


def mail(tag):
    return f"{tag}.{RUN}@iitsm.demo"


# ---------------------------------------------------------------- bootstrap the first admin (no admin exists yet)
call("POST", "/auth/register", {"name": "Root Admin", "email": mail("root"), "password": PW})
root_id = sql(f"select id from users where email='{mail('root')}'")
sql(f"insert into user_roles(user_id, role_type, granted_at) values ({root_id}, 'ADMINISTRATOR', now())")
sql(f"insert into administrator_profiles(user_id, scope) values ({root_id}, 'SYSTEM_ADMIN')")
A = login(mail("root"))
call("PUT", "/admin/config", [{"key": "assignment.strategy", "value": "COMPOSITE"}], token=A)

# catalog
net_skill = call("POST", "/admin/skills", {"name": f"Networking-{RUN}"}, token=A)[1]["id"]
linux_skill = call("POST", "/admin/skills", {"name": f"Linux-{RUN}"}, token=A)[1]["id"]
svc = call("POST", "/admin/services", {"name": f"Network-{RUN}", "criticality": 4, "alwaysP1": False}, token=A)[1]["id"]
quiet = call("POST", "/admin/services", {"name": f"Quiet-{RUN}", "criticality": 1, "alwaysP1": False}, token=A)[1]["id"]
cat = call("POST", "/admin/categories", {"name": f"Network-{RUN}", "requiredSkillIds": [net_skill, linux_skill]}, token=A)[1]["id"]
for prio, resp, res in (("P1", 5, 30), ("P2", 15, 120), ("P3", 60, 480), ("P4", 240, 1440)):
    call("POST", "/admin/sla-policies", {"priority": prio, "responseMinutes": resp, "resolutionMinutes": res}, token=A)

# ---------------------------------------------------------------- admin user management
def tech_user(tag, name, exp, skills, availability="AVAILABLE", max_load=10, escalation=0):
    return call("POST", "/admin/users", {
        "name": name, "email": mail(tag), "password": PW, "department": "IT Support", "location": "Hyderabad",
        "roles": ["EMPLOYEE", "TECHNICIAN"],
        "technician": {"experienceLevel": exp, "escalationLevel": escalation, "maxLoad": max_load,
                       "availability": availability,
                       "skills": [{"skillId": k, "proficiency": v} for k, v in skills.items()]}}, token=A)


s, asha = tech_user("asha", "Asha", 5, {net_skill: 5})
check("admin creates a technician with profile and skills -> 201", s == 201 and asha["roles"] == ["EMPLOYEE", "TECHNICIAN"]
      and asha["technician"]["skills"][0]["proficiency"] == 5 and asha["location"] == "Hyderabad", (s, asha))
ravi = tech_user("ravi", "Ravi", 2, {net_skill: 3, linux_skill: 4})[1]
meera = tech_user("meera", "Meera", 4, {net_skill: 4, linux_skill: 4})[1]
tom = tech_user("tom", "Tom", 4, {net_skill: 5, linux_skill: 5}, availability="AWAY")[1]
neha = tech_user("neha", "Neha", 3, {net_skill: 4}, max_load=1)[1]
karthik = tech_user("karthik", "Karthik", 3, {net_skill: 4})[1]
lead = tech_user("lead", "Priya Lead", 5, {net_skill: 5}, escalation=1, availability="OFF_DUTY")[1]
emp = call("POST", "/auth/register", {"name": "Employee A", "email": mail("emp"), "password": PW})[1]["user"]

s, b = call("POST", "/admin/users", {"name": "No Emp", "email": mail("noemp"), "password": PW, "roles": ["TECHNICIAN"]}, token=A)
check("roles without EMPLOYEE -> 400 on roles", s == 400 and "roles" in fe(b), (s, b))
s, b = call("POST", "/admin/users", {"name": "No Prof", "email": mail("noprof"), "password": PW,
                                      "roles": ["EMPLOYEE", "TECHNICIAN"]}, token=A)
check("TECHNICIAN without profile -> 400 on technician", s == 400 and "technician" in fe(b), (s, b))
s, b = call("POST", "/admin/users", {"name": "Dup", "email": mail("asha").upper(), "password": PW, "roles": ["EMPLOYEE"]}, token=A)
check("duplicate email -> 400 on email", s == 400 and "email" in fe(b), (s, b))
E = login(mail("emp"))
s, b = call("GET", "/admin/users", token=E)
check("employee GET /admin/users -> 403", s == 403, s)
s, b = call("PUT", f"/admin/users/{emp['id']}", {"name": "Employee Alpha", "department": "Finance"}, token=A)
check("update name and department", s == 200 and b["name"] == "Employee Alpha" and b["department"] == "Finance", (s, b))
s, b = call("POST", f"/admin/users/{emp['id']}/roles", {"roleType": "ADMINISTRATOR", "administrator": {"scope": "IT_MANAGER"}}, token=A)
check("add ADMINISTRATOR role with scope", s == 200 and "ADMINISTRATOR" in b["roles"] and b["administrator"]["scope"] == "IT_MANAGER", (s, b))
s, b = call("DELETE", f"/admin/users/{emp['id']}/roles/ADMINISTRATOR", token=A)
check("remove ADMINISTRATOR role", s == 200 and b["roles"] == ["EMPLOYEE"] and b["administrator"] is None, (s, b))
s, b = call("DELETE", f"/admin/users/{emp['id']}/roles/EMPLOYEE", token=A)
check("remove EMPLOYEE -> 400", s == 400, (s, b))
s, b = call("DELETE", f"/admin/users/{root_id}", token=A)
check("admin deactivates own account -> 400", s == 400, (s, b))
gone = call("POST", "/auth/register", {"name": "Leaver", "email": mail("leaver"), "password": PW})[1]["user"]
s, _ = call("DELETE", f"/admin/users/{gone['id']}", token=A)
s2, b2 = call("POST", "/auth/login", {"email": mail("leaver"), "password": PW})
check("deactivate a user -> 204, they can no longer log in", s == 204 and s2 == 401, (s, s2))
s, b = call("PUT", f"/admin/technicians/{karthik['id']}/skills", [{"skillId": net_skill, "proficiency": 4},
                                                                  {"skillId": linux_skill, "proficiency": 2}], token=A)
check("replace technician skills", s == 200 and len(b["skills"]) == 2, (s, b))
L = login(mail("lead"))
s, b = call("GET", f"/technicians?skillId={linux_skill}", token=L)
names = sorted(t["name"] for t in b) if s == 200 else b
check("team lead lists technicians filtered by skill", s == 200 and {"Ravi", "Meera", "Tom", "Karthik"} <= set(names)
      and "Asha" not in names, names)
TOM = login(mail("tom"))
s, b = call("PUT", "/technicians/me/availability", {"availability": "AWAY"}, token=TOM)
check("technician sets own availability", s == 200 and b["availability"] == "AWAY", (s, b))

# ---------------------------------------------------------------- staging: loads and service familiarity (DB)
DESC = "The VPN gateway is down and remote users cannot connect at all."


def create(token, service, impact, urgency, users, category=None, title="VPN gateway down"):
    return call("POST", "/incidents", {"confirmNotDuplicate": True, "title": title, "description": DESC, "serviceId": service, "categoryId": category,
                                       "impact": impact, "urgency": urgency, "affectedUsers": users}, token=token)


def staged(n):
    """n incidents on the quiet service (no category: they stay unassigned), returned as ids."""
    return [create(E, quiet, 1, 1, 1, title=f"Staged {i}")[1]["id"] for i in range(n)]


def give(ids, tech_id, status, priority="P3", resolved_days_ago=None, service=None):
    extra = f", resolved_at = now() - interval '{resolved_days_ago} days'" if resolved_days_ago is not None else ""
    svc_sql = f", service_id = {service}" if service else ""
    sql(f"update incidents set assignee_id = {tech_id}, status = '{status}', priority = '{priority}'{extra}{svc_sql} "
        f"where id in ({','.join(map(str, ids))})")


give(staged(3), asha["id"], "ASSIGNED")                     # Asha load 6 (3 x P3)
give(staged(1), ravi["id"], "ASSIGNED")                     # Ravi load 2
m = staged(4)
give(m[:3], meera["id"], "ASSIGNED")
give(m[3:], meera["id"], "ASSIGNED", priority="P4")         # Meera load 7
give(staged(1), neha["id"], "ASSIGNED", priority="P4")      # Neha load 1 = her max
give(staged(6), asha["id"], "CLOSED", resolved_days_ago=10, service=svc)   # Asha: 6 fixes on this service
give(staged(2), meera["id"], "CLOSED", resolved_days_ago=20, service=svc)  # Meera: 2
give(staged(3), ravi["id"], "CLOSED", resolved_days_ago=200, service=svc)  # Ravi: 3, but outside the 90-day window

# ---------------------------------------------------------------- the decision-card example
K = login(mail("karthik"))
s, inc = create(K, svc, 5, 5, 50, category=cat)   # 5x5x4 = 100 x 1.25 = 125 -> P1, reported by Karthik
check("T01-style: incident is auto-assigned on creation (ASSIGNED)", s == 201 and inc["status"] == "ASSIGNED", (s, inc))
check("composite + familiarity picks Asha (80 vs Meera 66, Ravi 60)", s == 201 and inc["assignee"]["name"] == "Asha",
      inc.get("assignee"))
s, rec = call("GET", f"/incidents/{inc['id']}/recommendations", token=A)
top = [(r["name"], r["score"]) for r in rec["recommendations"]] if s == 200 else rec
check("recommendations now: Meera 66, Ravi 60 (Asha is at max load after taking it)",
      top == [("Meera", 66), ("Ravi", 60)], top)
ex = {e["name"]: e["reason"] for e in rec.get("excluded", [])} if s == 200 else {}
check("excluded list explains: Tom AWAY, Neha at max, Karthik reporter, Asha at max, lead OFF_DUTY",
      ex.get("Tom") == "is AWAY" and ex.get("Neha", "").startswith("at max load") and ex.get("Karthik") == "reported this incident"
      and ex.get("Asha") == "at max load (10/10)" and ex.get("Priya Lead") == "is OFF_DUTY", ex)
mf = rec["recommendations"][0] if s == 200 and rec["recommendations"] else {}
check("factor breakdown and reasons for Meera match the hand calculation",
      mf.get("factors") == {"skill": 0.86, "load": 0.3, "experience": 0.8, "priorityFit": 1.0, "familiarity": 0.4}
      and f"Linux-{RUN} 4/5" in mf.get("reasons", [""])[0]
      and any("Resolved 2 Network" in r for r in mf.get("reasons", [])), mf)
rv = rec["recommendations"][1] if s == 200 and len(rec["recommendations"]) > 1 else {}
check("Ravi's 3 old fixes (200 days ago) are outside the 90-day window: familiarity 0",
      rv.get("factors", {}).get("familiarity") == 0.0, rv.get("factors"))
s, b = call("GET", f"/incidents/{inc['id']}/recommendations", token=E)
check("employee cannot see recommendations -> 403", s == 403, s)

# familiarity changes the order: with the handbook weights Ravi beats Meera
call("PUT", "/admin/config", [{"key": "assignment.weight.skill", "value": "0.40"}, {"key": "assignment.weight.load", "value": "0.30"},
                              {"key": "assignment.weight.experience", "value": "0.20"}, {"key": "assignment.weight.priority", "value": "0.10"},
                              {"key": "assignment.weight.familiarity", "value": "0"}], token=A)
s, rec = call("GET", f"/incidents/{inc['id']}/recommendations", token=A)
top = [(r["name"], r["score"]) for r in rec["recommendations"]] if s == 200 else rec
check("handbook weights (no familiarity): Ravi 70 beats Meera 69", top == [("Ravi", 70), ("Meera", 69)], top)
s, b = call("PUT", "/admin/config", [{"key": "assignment.weight.familiarity", "value": "0.15"}], token=A)
check("weights summing to 1.15 -> 400 on assignment.weight.skill", s == 400 and "assignment.weight.skill" in fe(b), (s, fe(b)))
call("PUT", "/admin/config", [{"key": "assignment.weight.skill", "value": "0.35"}, {"key": "assignment.weight.load", "value": "0.25"},
                              {"key": "assignment.weight.experience", "value": "0.15"}, {"key": "assignment.weight.priority", "value": "0.10"},
                              {"key": "assignment.weight.familiarity", "value": "0.15"}], token=A)

# ---------------------------------------------------------------- T04: switching strategy needs no restart
call("PUT", "/admin/config", [{"key": "assignment.strategy", "value": "LOAD"}], token=A)
got = []
for i in range(2):
    s, b = create(E, svc, 1, 1, 1, category=cat, title=f"Minor VPN glitch {i}")   # P4
    got.append(b.get("assignee", {}).get("name") if s == 201 and b.get("assignee") else (s, b))
check("T04 strategy LOAD: two new incidents both go to the lowest-load technician (Karthik, load 0)",
      got == ["Karthik", "Karthik"], got)
call("PUT", "/admin/config", [{"key": "assignment.strategy", "value": "ROUND_ROBIN"}], token=A)
got = []
for i in range(2):
    s, b = create(E, svc, 1, 1, 1, category=cat, title=f"Round robin check {i}")
    got.append(b.get("assignee", {}).get("name") if s == 201 and b.get("assignee") else (s, b))
check("ROUND_ROBIN: never-assigned first (Ravi, then Meera); Karthik was assigned just now",
      got == ["Ravi", "Meera"], got)
call("PUT", "/admin/config", [{"key": "assignment.strategy", "value": "COMPOSITE"}], token=A)

# ---------------------------------------------------------------- triage
s, b = create(E, svc, 3, 3, 5)
check("no category -> stays CLASSIFIED in triage, no assignee", s == 201 and b["status"] == "CLASSIFIED" and b["assignee"] is None, (s, b))
for t in (ravi, meera, karthik):
    call("PUT", f"/admin/technicians/{t['id']}", {"availability": "OFF_DUTY"}, token=A)
s, b = create(E, svc, 3, 3, 5, category=cat)
check("T13 every skilled technician OFF_DUTY/AWAY/full -> 201, stays CLASSIFIED, no error",
      s == 201 and b["status"] == "CLASSIFIED" and b["assignee"] is None, (s, b))
s, b2 = call("POST", f"/incidents/{b['id']}/assign", {}, token=A)
check("assign without technicianId when nobody is eligible -> 409 TECHNICIAN_UNAVAILABLE", s == 409 and b2["code"] == "TECHNICIAN_UNAVAILABLE", (s, b2))
call("PUT", f"/admin/technicians/{ravi['id']}", {"availability": "AVAILABLE"}, token=A)
s, b2 = call("POST", f"/incidents/{b['id']}/assign", {}, token=A)
check("assign without technicianId uses the active strategy", s == 200 and b2["status"] == "ASSIGNED" and b2["assignee"]["name"] == "Ravi", (s, b2))

# ---------------------------------------------------------------- technician views (and T26)
R = login(mail("ravi"))
s, w = call("GET", "/technicians/me/workload", token=R)
dues = [d["due"] for d in w.get("upcomingDeadlines", [])] if s == 200 else []
check("my workload: load, max, deadlines sorted soonest first", s == 200 and w["maxLoad"] == 10 and w["activeIncidents"] >= 3
      and dues == sorted(dues) and w["upcomingDeadlines"][0]["type"] in ("RESPONSE", "RESOLUTION"), (s, w))
s, q = call("GET", "/technicians/me/queue", token=R)
rd = [i["resolutionDue"] for i in q["items"] if i["resolutionDue"]] if s == 200 else []
check("my queue: only my active incidents, most urgent first", s == 200 and q["totalItems"] >= 3
      and all(i["assignee"]["id"] == ravi["id"] for i in q["items"]) and rd == sorted(rd), (s, q.get("totalItems") if isinstance(q, dict) else q))
s1, _ = call("GET", "/technicians/me/queue", token=K)
s2, _ = create(K, quiet, 1, 1, 1, title="Karthik reports something")
s3, _ = call("GET", "/admin/users", token=K)
check("T26 karthik: queue 200, report 201, admin 403", (s1, s2, s3) == (200, 201, 403), (s1, s2, s3))
s, _ = call("GET", "/technicians/me/workload", token=E)
check("employee workload -> 403", s == 403, s)
