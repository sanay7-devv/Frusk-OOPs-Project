"""Smoke test of S1, the Service Desk Simulator (local dev server, Flyway seed data, local DB only).

Needs the dev profile with the Flyway seed (profile dev): 212 incidents and 18 users from
db/seed, password Demo@1234. Port and database come from SMOKE_PORT (default 8081) and SMOKE_DB (default iitsm).
Run it on a database no other suite has changed; it restores the strategy it switches.
"""
import atexit
import json
import os
import subprocess
import urllib.error
import urllib.request

PORT = os.environ.get("SMOKE_PORT", "8081")
DB = os.environ.get("SMOKE_DB", "iitsm")
BASE = f"http://localhost:{PORT}/api/v1"
PW = "Demo@1234"
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
            text = r.read().decode("utf-8", "replace")
            return r.status, (json.loads(text) if text else None)
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(text)
        except json.JSONDecodeError:
            return e.code, text


def check(name, ok, detail=""):
    results.append(("PASS" if ok else "FAIL", name, detail))


def sql(statement):
    out = subprocess.run(["docker", "exec", os.environ.get("SMOKE_CONTAINER", "iitsm-db"), "psql", "-U", "iitsm", "-d", DB, "-tAc", statement],
                         capture_output=True, text=True)
    return out.stdout.strip() or out.stderr.strip()


def login(email):
    status, body = call("POST", "/auth/login", {"email": email, "password": PW})
    assert status == 200, f"login {email}: {status} {body}"
    return body["accessToken"]


def simulate(token, body):
    return call("POST", "/admin/simulations", body, token)


admin = login("asha.rao@iitsm.demo")
employee = login("employee1@iitsm.demo")

# ---- access -------------------------------------------------------------------------------------------------
check("no token is 401", call("POST", "/admin/simulations", {})[0] == 401)
check("an employee is 403", simulate(employee, {})[0] == 403)

# ---- the default run: current settings, last 100 incidents ----------------------------------------------------
before = {
    "audit": sql("select count(*) from audit_records"),
    "incidents": sql("select count(*) from incidents"),
    "config": sql("select string_agg(key||'='||value, ',' order by key) from app_config"),
    "rr": sql("select string_agg(user_id||'='||coalesce(last_assigned_at::text,'-'), ',' order by user_id) "
              "from technician_profiles"),
    "notifications": sql("select count(*) from notifications"),
}
status, run = simulate(admin, {})
check("default run is 200", status == 200, str(run)[:200])
w = run["workload"]
check("replays up to 100 real incidents", 0 < w["incidents"] <= 100, f"{w['incidents']}")
check("one result for the current settings", len(run["results"]) == 1 and run["results"][0]["name"] == "Current settings")
r0 = run["results"][0]
check("result carries every measurement",
      all(k in r0 for k in ("slaViolations", "slaViolationPercent", "unassigned", "meanResolveMinutes",
                            "p90ResolveMinutes", "meanWaitMinutes", "fairness", "matchesRealAssigneePercent",
                            "perTechnician", "weights", "strategy")))
check("violations and unassigned are within the incident count",
      0 <= r0["slaViolations"] <= r0["incidents"] and 0 <= r0["unassigned"] <= r0["incidents"])
check("fairness is between 0 and 1", 0 <= r0["fairness"] <= 1, f"{r0['fairness']}")
check("p90 resolve time is not below the mean's floor of 0", r0["p90ResolveMinutes"] >= 0 and r0["meanResolveMinutes"] > 0)
check("assigned counts add up to the incidents that got a technician",
      sum(t["assigned"] for t in r0["perTechnician"]) == r0["incidents"] - r0["unassigned"],
      f"{sum(t['assigned'] for t in r0['perTechnician'])} vs {r0['incidents'] - r0['unassigned']}")
check("assumptions are listed beside the numbers", len(run["assumptions"]) >= 5)
check("best names the only configuration", run["best"] == "Current settings")

# ---- the replay is deterministic ---------------------------------------------------------------------------
status, again = simulate(admin, {})
check("the same request gives the same result", again["results"] == run["results"])

# ---- three configurations side by side ---------------------------------------------------------------------
three = {"lastIncidents": 150, "configurations": [
    {"name": "Composite", "strategy": "COMPOSITE"},
    {"name": "Load only", "strategy": "LOAD"},
    {"name": "Round robin", "strategy": "ROUND_ROBIN"}]}
status, cmp = simulate(admin, three)
check("three configurations are compared", status == 200 and len(cmp["results"]) == 3, str(cmp)[:200])
names = [r["name"] for r in cmp["results"]]
check("results come back in request order", names == ["Composite", "Load only", "Round robin"])
check("each result uses its own strategy",
      [r["strategy"] for r in cmp["results"]] == ["COMPOSITE", "LOAD", "ROUND_ROBIN"])
check("strategies do not all give identical results",
      len({(r["slaViolations"], r["meanResolveMinutes"], r["fairness"]) for r in cmp["results"]}) > 1,
      str([(r["slaViolations"], r["meanResolveMinutes"], r["fairness"]) for r in cmp["results"]]))
winner = min(cmp["results"], key=lambda r: (r["slaViolations"], r["meanResolveMinutes"]))
check("best is the fewest violations then lowest mean resolve time", cmp["best"] == winner["name"], cmp["best"])
rr = next(r for r in cmp["results"] if r["name"] == "Round robin")
check("round robin spreads work at least as evenly as composite",
      rr["fairness"] >= cmp["results"][0]["fairness"] - 0.001, f"{rr['fairness']} vs {cmp['results'][0]['fairness']}")

# ---- the replay does not depend on the real round-robin memory (found when real assignments had set it) ----------
rr_body = {"lastIncidents": 150, "configurations": [{"name": "Round robin", "strategy": "ROUND_ROBIN"}]}
rr_before = simulate(admin, rr_body)[1]["results"][0]
touched = "select id from users where email in ('tech1@iitsm.demo', 'tech2@iitsm.demo', 'neha@iitsm.demo')"
saved = sql(f"select user_id || '=' || coalesce(last_assigned_at::text, '') from technician_profiles where user_id in ({touched})").splitlines()
sql(f"update technician_profiles set last_assigned_at = now() where user_id in ({touched})")
rr_after = simulate(admin, rr_body)[1]["results"][0]
for line in saved:  # put the real values back exactly as they were
    uid, ts = line.split("=", 1)
    sql(f"update technician_profiles set last_assigned_at = {repr(ts) if ts else 'null'} where user_id = {uid}")
check("round robin gives the same result whatever the real rotation memory is", rr_before == rr_after,
      f"{rr_before['fairness']} vs {rr_after['fairness']}")

# ---- what changes with fewer people and with a storm ---------------------------------------------------------
status, few = simulate(admin, {"lastIncidents": 150, "configurations": [
    {"name": "All", "strategy": "COMPOSITE"}, {"name": "Two people", "strategy": "COMPOSITE", "technicians": 2}]})
all_, two = few["results"]
check("fewer technicians never make the wait shorter", two["meanWaitMinutes"] >= all_["meanWaitMinutes"],
      f"{two['meanWaitMinutes']} vs {all_['meanWaitMinutes']}")
check("only the chosen number of technicians is used", two["technicians"] == 2 and len(two["perTechnician"]) == 2)
status, storm = simulate(admin, {"lastIncidents": 150, "speedUp": 10})
status, calm = simulate(admin, {"lastIncidents": 150})
check("a ten times faster arrival storm never shortens the wait",
      storm["results"][0]["meanWaitMinutes"] >= calm["results"][0]["meanWaitMinutes"],
      f"{storm['results'][0]['meanWaitMinutes']} vs {calm['results'][0]['meanWaitMinutes']}")
check("the storm is stated in the assumptions", any("compressed" in a for a in storm["assumptions"]))

# ---- custom weights --------------------------------------------------------------------------------------------
status, weighted = simulate(admin, {"configurations": [{"name": "Experience first", "strategy": "COMPOSITE",
    "weights": {"skill": 0.10, "load": 0.10, "experience": 0.60, "priorityFit": 0.10, "familiarity": 0.10}}]})
check("custom weights are accepted and echoed",
      status == 200 and weighted["results"][0]["weights"]["experience"] == "0.6", str(weighted)[:200])

# ---- validation ------------------------------------------------------------------------------------------------
check("four configurations are refused", simulate(admin, {"configurations": [{}, {}, {}, {}]})[0] == 400)
status, bad = simulate(admin, {"configurations": [{"strategy": "COMPOSITE",
    "weights": {"skill": 0.9, "load": 0.9}}]})
check("weights that do not add up to 1 are 400 with a field error",
      status == 400 and bad.get("fieldErrors"), str(bad)[:200])
check("an unknown strategy is 400", simulate(admin, {"configurations": [{"strategy": "MAGIC"}]})[0] == 400)
check("too few incidents is 400", simulate(admin, {"lastIncidents": 5})[0] == 400)
check("a negative speed-up is 400", simulate(admin, {"speedUp": 0.5})[0] == 400)

# ---- the simulation writes nothing ---------------------------------------------------------------------------
after = {
    "audit": sql("select count(*) from audit_records"),
    "incidents": sql("select count(*) from incidents"),
    "config": sql("select string_agg(key||'='||value, ',' order by key) from app_config"),
    "rr": sql("select string_agg(user_id||'='||coalesce(last_assigned_at::text,'-'), ',' order by user_id) "
              "from technician_profiles"),
    "notifications": sql("select count(*) from notifications"),
}
for key in before:
    check(f"simulating leaves {key} unchanged", before[key] == after[key], f"{before[key]!r} vs {after[key]!r}")

# ---- apply ----------------------------------------------------------------------------------------------------
status, cfg = call("GET", "/admin/config", None, admin)
old_strategy = next(c["value"] for c in cfg if c["key"] == "assignment.strategy")
new_strategy = "ROUND_ROBIN" if old_strategy != "ROUND_ROBIN" else "LOAD"
audits = int(sql("select count(*) from audit_records where action = 'CONFIG_CHANGED'"))
check("an employee cannot apply", call("POST", "/admin/simulations/apply", {"strategy": new_strategy}, employee)[0] == 403)
check("applying nothing is 400", call("POST", "/admin/simulations/apply", {}, admin)[0] == 400)
check("apply answers 204", call("POST", "/admin/simulations/apply", {"strategy": new_strategy}, admin)[0] == 204)
status, cfg = call("GET", "/admin/config", None, admin)
check("the live strategy changed", next(c["value"] for c in cfg if c["key"] == "assignment.strategy") == new_strategy)
check("applying is audited as CONFIG_CHANGED",
      int(sql("select count(*) from audit_records where action = 'CONFIG_CHANGED'")) == audits + 1)
status, now_run = simulate(admin, {})
check("the next simulation uses the applied strategy", now_run["results"][0]["strategy"] == new_strategy)
check("restore the original strategy", call("POST", "/admin/simulations/apply", {"strategy": old_strategy}, admin)[0] == 204)

# ---- GET /incidents?minEscalationLevel= (the escalations screen of the frontend) ----------------------------------
total = int(sql("select count(*) from incidents"))
status, page = call("GET", "/incidents?minEscalationLevel=0&size=100", None, admin)
check("minEscalationLevel=0 is the same as no filter", status == 200 and page["totalItems"] == total,
      f"{page.get('totalItems') if isinstance(page, dict) else page} vs {total}")
sql("update incidents set escalation_level = 2 where id = (select min(id) from incidents)")
sql("update incidents set escalation_level = 1 where id = (select min(id) + 1 from incidents)")
status, lvl1 = call("GET", "/incidents?minEscalationLevel=1&size=100", None, admin)
check("minEscalationLevel=1 returns level 1 and above",
      status == 200 and lvl1["totalItems"] == int(sql("select count(*) from incidents where escalation_level >= 1")) == 2,
      f"{lvl1.get('totalItems') if isinstance(lvl1, dict) else lvl1}")
status, lvl2 = call("GET", "/incidents?minEscalationLevel=2&size=100", None, admin)
check("minEscalationLevel=2 returns only level 2 and above", status == 200 and lvl2["totalItems"] == 1,
      f"{lvl2.get('totalItems') if isinstance(lvl2, dict) else lvl2}")
check("every row shown has the level it was asked for", all(i["escalationLevel"] >= 2 for i in lvl2["items"]))
status, lvl3 = call("GET", "/incidents?minEscalationLevel=3&size=100", None, admin)
check("minEscalationLevel=3 is empty here", status == 200 and lvl3["totalItems"] == 0)
check("a level above 3 is 400", call("GET", "/incidents?minEscalationLevel=4", None, admin)[0] == 400)
check("a negative level is 400", call("GET", "/incidents?minEscalationLevel=-1", None, admin)[0] == 400)
# make employee1 the reporter of one escalated incident so the visibility rule has something to hide and show
emp_id = sql("select id from users where email = 'employee1@iitsm.demo'")
sql(f"update incidents set reporter_id = {emp_id} where id = (select min(id) from incidents)")
status, mine = call("GET", "/incidents?minEscalationLevel=1&size=100", None, employee)
expected = int(sql(f"select count(*) from incidents where escalation_level >= 1 and (reporter_id = {emp_id} or assignee_id = {emp_id})"))
check("an employee sees only their own escalated incidents", status == 200 and mine["totalItems"] == expected == 1,
      f"{mine.get('totalItems') if isinstance(mine, dict) else mine} vs {expected}")
check("and fewer than the administrator does", mine["totalItems"] < lvl1["totalItems"])
sql("update incidents set escalation_level = 0 where id in (select min(id) from incidents union select min(id) + 1 from incidents)")
