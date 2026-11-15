"""Smoke test of the M3 catalog and configuration endpoints (local dev server, throwaway data)."""
import os
import json
import secrets
import subprocess
import urllib.error
import urllib.request

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
    out = subprocess.run(["docker", "exec", "iitsm-db", "psql", "-U", "iitsm", "-d", os.environ.get("SMOKE_DB", "iitsm"), "-tAc", statement],
                         capture_output=True, text=True)
    return out.stdout.strip() or out.stderr.strip()


def field_error(b, field):
    return isinstance(b, dict) and any(f["field"] == field for f in b.get("fieldErrors", []))


# ---------------------------------------------------------------- accounts
admin_email, emp_email = f"admin.{RUN}@iitsm.demo", f"emp.{RUN}@iitsm.demo"
call("POST", "/auth/register", {"name": "Smoke Admin", "email": admin_email, "password": PW})
call("POST", "/auth/register", {"name": "Smoke Employee", "email": emp_email, "password": PW})
admin_id = sql(f"select id from users where email='{admin_email}'")
sql(f"insert into user_roles(user_id, role_type, granted_at) values ({admin_id}, 'ADMINISTRATOR', now())")
sql(f"insert into administrator_profiles(user_id, scope) values ({admin_id}, 'SYSTEM_ADMIN')")
A = call("POST", "/auth/login", {"email": admin_email, "password": PW})[1]["accessToken"]
E = call("POST", "/auth/login", {"email": emp_email, "password": PW})[1]["accessToken"]

# ---------------------------------------------------------------- authorization (also closes the M2 done-when)
s, b = call("GET", "/admin/services", token=E)
check("employee GET /admin/services -> 403 UNAUTHORIZED_OPERATION", s == 403 and b["code"] == "UNAUTHORIZED_OPERATION", (s, b))
s, b = call("PUT", "/admin/config", [{"key": "assignment.strategy", "value": "LOAD"}], token=E)
check("employee PUT /admin/config -> 403", s == 403, (s, b))
s, b = call("GET", "/admin/sla-policies", token=E)
check("employee GET /admin/sla-policies -> 403", s == 403, (s, b))
s, b = call("GET", "/services")
check("GET /services without token -> 401", s == 401, (s, b))

# ---------------------------------------------------------------- skills
s, net = call("POST", "/admin/skills", {"name": f"Networking-{RUN}"}, token=A)
check("create skill -> 201", s == 201, (s, net))
s, sq = call("POST", "/admin/skills", {"name": f"SQL-{RUN}"}, token=A)
s, b = call("POST", "/admin/skills", {"name": f"networking-{RUN}"}, token=A)
check("duplicate skill name (case-insensitive) -> 400 on name", s == 400 and field_error(b, "name"), (s, b))
s, spare = call("POST", "/admin/skills", {"name": f"Spare-{RUN}"}, token=A)

# ---------------------------------------------------------------- services and dependencies
s, db = call("POST", "/admin/services", {"name": f"Database-{RUN}", "owner": "DBA team", "criticality": 5,
                                          "alwaysP1": False, "description": "Core database"}, token=A)
check("create service -> 201", s == 201 and db["active"] is True and db["dependencyIds"] == [], (s, db))
s, auth = call("POST", "/admin/services", {"name": f"Auth-{RUN}", "criticality": 5, "alwaysP1": False,
                                            "dependencyIds": [db["id"]]}, token=A)
s, pay = call("POST", "/admin/services", {"name": f"Payment-{RUN}", "criticality": 5, "alwaysP1": True,
                                           "dependencyIds": [db["id"], auth["id"]]}, token=A)
check("create service with dependencies", s == 201 and pay["dependencyIds"] == sorted([db["id"], auth["id"]]), (s, pay))
s, b = call("PUT", f"/admin/services/{db['id']}/dependencies", {"dependencyIds": [pay["id"]]}, token=A)
check("Database -> Payment would be a cycle (Payment -> Auth -> Database) -> 400", s == 400 and field_error(b, "dependencyIds"), (s, b))
s, b = call("PUT", f"/admin/services/{db['id']}/dependencies", {"dependencyIds": [db["id"]]}, token=A)
check("self-dependency -> 400", s == 400 and field_error(b, "dependencyIds"), (s, b))
s, b = call("POST", "/admin/services", {"name": f"Bad-{RUN}", "criticality": 6, "alwaysP1": False}, token=A)
check("criticality 6 -> 400 on criticality", s == 400 and field_error(b, "criticality"), (s, b))
s, b = call("POST", "/admin/services", {"name": f"database-{RUN}", "criticality": 3, "alwaysP1": False}, token=A)
check("duplicate service name -> 400 on name", s == 400 and field_error(b, "name"), (s, b))
s, b = call("POST", "/admin/services", {"name": f"Ghost-{RUN}", "criticality": 3, "alwaysP1": False,
                                         "dependencyIds": [999999]}, token=A)
check("unknown dependency id -> 400 on dependencyIds", s == 400 and field_error(b, "dependencyIds"), (s, b))
s, b = call("GET", "/admin/services/999999", token=A)
check("unknown service -> 404 SERVICE_NOT_FOUND", s == 404 and b["code"] == "SERVICE_NOT_FOUND", (s, b))
s, _ = call("DELETE", f"/admin/services/{auth['id']}", token=A)
s2, listed = call("GET", "/services", token=E)
names = [x["name"] for x in listed] if s2 == 200 else []
check("deactivate -> 204; GET /services (employee) lists active only",
      s == 204 and f"Payment-{RUN}" in names and f"Auth-{RUN}" not in names
      and set(listed[0].keys()) == {"id", "name", "criticality"}, (s, s2, names))
s, b = call("GET", f"/admin/services/{auth['id']}", token=A)
check("admin still sees the deactivated service", s == 200 and b["active"] is False, (s, b))

# ---------------------------------------------------------------- categories
s, netcat = call("POST", "/admin/categories", {"name": f"Network-{RUN}", "requiredSkillIds": [net["id"]]}, token=A)
check("create category with required skill -> 201", s == 201 and netcat["requiredSkillIds"] == [net["id"]], (s, netcat))
s, vpn = call("POST", "/admin/categories", {"name": f"VPN-{RUN}", "parentId": netcat["id"]}, token=A)
check("create child category", s == 201 and vpn["parentId"] == netcat["id"], (s, vpn))
s, b = call("PUT", f"/admin/categories/{netcat['id']}", {"name": f"Network-{RUN}", "parentId": vpn["id"],
                                                          "requiredSkillIds": [net["id"]]}, token=A)
check("moving a category under its own child -> 400 on parentId", s == 400 and field_error(b, "parentId"), (s, b))
s, tree = call("GET", "/categories", token=E)
node = next((n for n in tree if n["name"] == f"Network-{RUN}"), None) if s == 200 else None
check("GET /categories returns a tree (Network -> VPN)",
      node is not None and [c["name"] for c in node["children"]] == [f"VPN-{RUN}"], node)

# ---------------------------------------------------------------- skill deletion
s, b = call("DELETE", f"/admin/skills/{net['id']}", token=A)
check("delete a skill still required by a category -> 400", s == 400, (s, b))
s, _ = call("DELETE", f"/admin/skills/{spare['id']}", token=A)
check("delete an unused skill -> 204", s == 204, s)

# ---------------------------------------------------------------- SLA policies
for prio, resp, res in (("P1", 5, 30), ("P2", 15, 120), ("P3", 60, 480), ("P4", 240, 1440)):
    call("POST", "/admin/sla-policies", {"priority": prio, "responseMinutes": resp, "resolutionMinutes": res}, token=A)
s, b = call("POST", "/admin/sla-policies", {"priority": "P1", "responseMinutes": 5, "resolutionMinutes": 30}, token=A)
check("second global default for P1 -> 400 (DB alone would allow it: NULLs differ)", s == 400 and field_error(b, "priority"), (s, b))
s, payp1 = call("POST", "/admin/sla-policies", {"serviceId": pay["id"], "priority": "P1", "responseMinutes": 3,
                                                 "resolutionMinutes": 20}, token=A)
check("Payment-specific P1 policy 3/20 -> 201", s == 201 and payp1["serviceName"] == f"Payment-{RUN}", (s, payp1))
s, b = call("POST", "/admin/sla-policies", {"serviceId": pay["id"], "priority": "P1", "responseMinutes": 4,
                                             "resolutionMinutes": 25}, token=A)
check("duplicate service+priority -> 400", s == 400, (s, b))
s, b = call("POST", "/admin/sla-policies", {"serviceId": pay["id"], "priority": "P2", "responseMinutes": 30,
                                             "resolutionMinutes": 30}, token=A)
check("resolution not greater than response -> 400 on resolutionMinutes", s == 400 and field_error(b, "resolutionMinutes"), (s, b))
s, b = call("PUT", f"/admin/sla-policies/{payp1['id']}", {"serviceId": pay["id"], "priority": "P2",
                                                          "responseMinutes": 3, "resolutionMinutes": 20}, token=A)
check("update trying to change priority -> 400", s == 400 and field_error(b, "priority"), (s, b))
s, b = call("PUT", f"/admin/sla-policies/{payp1['id']}", {"serviceId": pay["id"], "priority": "P1",
                                                          "responseMinutes": 2, "resolutionMinutes": 15}, token=A)
check("update targets -> 200", s == 200 and b["responseMinutes"] == 2 and b["resolutionMinutes"] == 15, (s, b))
s, lst = call("GET", "/admin/sla-policies", token=A)
check("list: global defaults first", s == 200 and lst[0]["serviceId"] is None, lst[:2] if s == 200 else (s, lst))

# ---------------------------------------------------------------- escalation policies
sql("delete from escalation_policies")
s, b = call("POST", "/admin/escalation-policies", {"priority": "P1", "level": 2, "timeoutMinutes": 10}, token=A)
check("level 2 before level 1 -> 400 (no gaps)", s == 400 and field_error(b, "level"), (s, b))
ids = []
for lvl in (1, 2, 3):
    s, b = call("POST", "/admin/escalation-policies", {"priority": "P1", "level": lvl, "timeoutMinutes": 10}, token=A)
    ids.append(b.get("id") if isinstance(b, dict) else None)
check("P1 levels 1, 2, 3 created", all(ids), ids)
s, b = call("DELETE", f"/admin/escalation-policies/{ids[0]}", token=A)
check("delete level 1 while 2 exists -> 400", s == 400, (s, b))
s, b = call("POST", "/admin/escalation-policies", {"priority": "P3", "level": 1, "timeoutMinutes": 10}, token=A)
check("escalation for P3 -> 400 (P1 and P2 only)", s == 400 and field_error(b, "priority"), (s, b))
s, b = call("PUT", f"/admin/escalation-policies/{ids[2]}", {"priority": "P1", "level": 3, "timeoutMinutes": 1}, token=A)
check("update timeout -> 200", s == 200 and b["timeoutMinutes"] == 1, (s, b))

# ---------------------------------------------------------------- configuration
s, cfg = call("GET", "/admin/config", token=A)
check("GET /admin/config lists all 76 settings with defaults", s == 200 and len(cfg) == 76
      and {"key", "value", "defaultValue", "description"} == set(cfg[0].keys()), (s, len(cfg) if s == 200 else cfg))
s, b = call("PUT", "/admin/config", [{"key": "assignment.weight.skill", "value": "0.9"}], token=A)
check("weights not summing to 1.0 -> 400 keyed by config key", s == 400 and field_error(b, "assignment.weight.skill"), (s, b))
s, b = call("PUT", "/admin/config", [{"key": "no.such.key", "value": "1"}], token=A)
check("unknown key -> 400", s == 400 and field_error(b, "no.such.key"), (s, b))
s, b = call("PUT", "/admin/config", [{"key": "sla.warn.first.percent", "value": "95"}], token=A)
check("first warning above second -> 400 on sla.warn.second.percent", s == 400 and field_error(b, "sla.warn.second.percent"), (s, b))
s, b = call("PUT", "/admin/config", [{"key": "assignment.strategy", "value": "LOAD"},
                                     {"key": "security.lockout.attempts", "value": "2"}], token=A)
check("valid change of two keys -> 200", s == 200, (s, b))

# done-when: a config change alters behavior with no restart (lockout now after 2 failures)
victim = f"victim.{RUN}@iitsm.demo"
call("POST", "/auth/register", {"name": "Victim", "email": victim, "password": PW})
codes = [call("POST", "/auth/login", {"email": victim, "password": PW + "x"})[0] for _ in range(2)]
s, b = call("POST", "/auth/login", {"email": victim, "password": PW})
check("DONE-WHEN: lockout.attempts=2 applies at once: 401, 401, then 423 with the right password",
      codes == [401, 401] and s == 423, (codes, s, b))
check("DB: changed keys stored in app_config",
      sql("select string_agg(key || '=' || value, ',' order by key) from app_config where key in ('assignment.strategy', 'security.lockout.attempts')") ==
      "assignment.strategy=LOAD,security.lockout.attempts=2", sql("select key, value from app_config"))
call("PUT", "/admin/config", [{"key": "assignment.strategy", "value": "COMPOSITE"},
                              {"key": "security.lockout.attempts", "value": "5"}], token=A)
s, cfg = call("GET", "/admin/config", token=A)
restored = {c["key"]: c["value"] for c in cfg}
check("settings restored to defaults", restored["assignment.strategy"] == "COMPOSITE"
      and restored["security.lockout.attempts"] == "5")

for status, name, detail in results:
    print(f"{status}  {name}" + (f"   -> {detail}" if status == "FAIL" else ""))
print(f"\n{sum(r[0] == 'PASS' for r in results)}/{len(results)} passed")
