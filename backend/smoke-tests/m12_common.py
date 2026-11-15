"""Shared setup for the M12 scripts (calibration and smoke). Port and database come from the environment so the same
script runs against any worktree: SMOKE_PORT (default 8081), SMOKE_DB (default iitsm)."""
import json
import os
import secrets
import subprocess
import urllib.error
import urllib.request

PORT = os.environ.get("SMOKE_PORT", "8081")
DB = os.environ.get("SMOKE_DB", "iitsm")
BASE = f"http://localhost:{PORT}/api/v1"
RUN = secrets.token_hex(3)
PW = "Ab9-Zq" + secrets.token_hex(4) + "9"


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


def sql(statement):
    out = subprocess.run(["docker", "exec", os.environ.get("SMOKE_CONTAINER", "iitsm-db"), "psql", "-U", "iitsm", "-d", DB, "-tAc", statement],
                         capture_output=True, text=True)
    return out.stdout.strip() or out.stderr.strip()


def mail(tag):
    return f"{tag}.{RUN}@iitsm.demo"


def login(email, password=PW):
    s, b = call("POST", "/auth/login", {"email": email, "password": password})
    return b["accessToken"] if s == 200 else None


def make_admin():
    call("POST", "/auth/register", {"name": "Root Admin", "email": mail("root"), "password": PW})
    root_id = int(sql(f"select id from users where email='{mail('root')}'"))
    sql(f"insert into user_roles(user_id, role_type, granted_at) values ({root_id}, 'ADMINISTRATOR', now())")
    sql(f"insert into administrator_profiles(user_id, scope) values ({root_id}, 'SYSTEM_ADMIN')")
    return login(mail("root"))


def setup_world(category_names=("Network", "Authentication", "Email", "Printer"), service_names=("M12 Service A",),
                admin=None):
    """Admin, skill, services with SLA policies, categories, one technician (also a team lead via another user),
    two employees. Returns a dict with ids and tokens."""
    w = {}
    A = admin or make_admin()
    w["A"] = A
    skill = call("POST", "/admin/skills", {"name": f"M12Skill-{RUN}"}, token=A)[1]["id"]
    w["skill"] = skill
    w["services"] = []
    for name in service_names:
        svc = call("POST", "/admin/services", {"name": f"{name} {RUN}", "criticality": 2, "alwaysP1": False},
                   token=A)[1]["id"]
        for prio in ("P1", "P2", "P3", "P4"):
            call("POST", "/admin/sla-policies", {"serviceId": svc, "priority": prio, "responseMinutes": 60,
                                                 "resolutionMinutes": 240}, token=A)
        w["services"].append(svc)
    w["svc"] = w["services"][0]
    w["cats"] = {}
    for name in category_names:
        w["cats"][name] = call("POST", "/admin/categories", {"name": f"{name} {RUN}", "requiredSkillIds": [skill]},
                               token=A)[1]["id"]

    def user(tag, roles, technician=None):
        body = {"name": tag.title() + " " + RUN, "email": mail(tag), "password": PW, "roles": roles}
        if technician:
            body["technician"] = technician
        s, b = call("POST", "/admin/users", body, token=A)
        return b["id"] if s == 201 else None

    tech = {"experienceLevel": 3, "escalationLevel": 0, "maxLoad": 50, "availability": "AVAILABLE",
            "skills": [{"skillId": skill, "proficiency": 5}]}
    w["tech_id"] = user("tech", ["EMPLOYEE", "TECHNICIAN"], tech)
    lead = dict(tech, escalationLevel=1)
    w["lead_id"] = user("lead", ["EMPLOYEE", "TECHNICIAN"], lead)
    w["emp_id"], w["other_id"] = user("emp", ["EMPLOYEE"]), user("other", ["EMPLOYEE"])
    w["T"], w["L"] = login(mail("tech")), login(mail("lead"))
    w["E"], w["O"] = login(mail("emp")), login(mail("other"))
    return w


def report(w, title, description, svc=None, cat=None, token=None, impact=2, urgency=2, users=3):
    body = {"title": title, "description": description, "serviceId": svc or w["svc"], "impact": impact,
            "urgency": urgency, "affectedUsers": users}
    if cat:
        body["categoryId"] = cat
    return call("POST", "/incidents", {**body, "confirmNotDuplicate": True}, token=token or w["E"])
