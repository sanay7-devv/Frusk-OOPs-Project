"""E-034 check: escalation notifications follow the escalation module's own events (DEC-49, DEC-50).

Run right after m11_smoke.py, against the same FRESH database (ITSM_DB, default iitsm_m11): it reads the
notification rows that run produced. Waits a few seconds first, because notifications are sent asynchronously.

Checks:
  A  the assigned P1 that climbed 0 -> 1 -> 2 -> 3: each hop told only the holder of that level
  X  the exhausted alert of that incident reached every administrator, worded as "Escalation exhausted",
     with a simulated SMS each (P1)
  E  the incident that passed over an empty level 1: nobody was told about level 1, only the system admin about 2
  D  manual escalations: the person who escalated is never told about their own hop
"""
import atexit
import os
import subprocess
import time

DB = os.environ.get("SMOKE_DB", os.environ.get("ITSM_DB", "iitsm_m11"))
results = []


@atexit.register
def report():
    for status, name, detail in results:
        print(f"{status}  {name}" + (f"   -> {detail}" if status == "FAIL" else ""))
    print(f"\n{sum(r[0] == 'PASS' for r in results)}/{len(results)} passed")


def check(name, ok, detail=""):
    results.append(("PASS" if ok else "FAIL", name, detail))


def sql(statement):
    out = subprocess.run(["docker", "exec", os.environ.get("SMOKE_CONTAINER", "iitsm-db"), "psql", "-U", "iitsm", "-d", DB, "-tAc", statement],
                         capture_output=True, text=True)
    return out.stdout.strip()


def rows(statement):
    text = sql(statement)
    return [line.split("|") for line in text.splitlines() if line]


def owner_hops(incident_id):
    """Names of the people told 'Escalated to you', in order."""
    return [r[0] for r in rows(
        "select u.name from notifications n join users u on u.id = n.user_id "
        f"where n.incident_id = {incident_id} and n.channel = 'IN_APP' and n.event_type = 'INCIDENT_ESCALATED' "
        "and n.title like 'Escalated to you%' order by n.id")]


def told(incident_id, name):
    return int(sql("select count(*) from notifications n join users u on u.id = n.user_id "
                   f"where n.incident_id = {incident_id} and n.event_type = 'INCIDENT_ESCALATED' "
                   f"and n.channel = 'IN_APP' and u.name = '{name}'") or 0)


time.sleep(5)

# ---------------------------------------------------------------- A and X
a_id = sql("select incident_id from audit_records where description like 'Escalation exhausted at level 3%' "
           "order by id limit 1")
check("setup: m11 produced an exhausted incident", a_id.isdigit(), a_id)
if a_id.isdigit():
    check("A: three hops told the team lead, the system admin and the IT manager, once each",
          owner_hops(a_id) == ["Lead", "Root Admin", "IT Manager"], owner_hops(a_id))
    admins = sorted(r[0] for r in rows(
        "select u.name from users u join user_roles r on r.user_id = u.id "
        "where r.role_type = 'ADMINISTRATOR' and u.active"))
    exhausted = sorted(r[0] for r in rows(
        "select u.name from notifications n join users u on u.id = n.user_id "
        f"where n.incident_id = {a_id} and n.channel = 'IN_APP' and n.title like 'Escalation exhausted%'"))
    check("X: the exhausted alert reached every administrator (not only the IT manager)",
          exhausted == admins and len(admins) >= 2, (exhausted, admins))
    sms = sorted(r[0] for r in rows(
        "select u.name from notifications n join users u on u.id = n.user_id "
        f"where n.incident_id = {a_id} and n.channel = 'SMS_SIM' and n.event_type = 'INCIDENT_ESCALATED' "
        "and n.message like '%exhausted%'"))
    check("X: P1, so every administrator also got a simulated SMS of it", sms == admins, (sms, admins))
    check("X: the exhausted message says what happened",
          "still not acknowledged after the whole escalation chain" in sql(
              f"select message from notifications where incident_id = {a_id} and channel = 'IN_APP' "
              "and title like 'Escalation exhausted%' limit 1"))

# ---------------------------------------------------------------- E: passed-over level
e_id = sql("select id from incidents where title like 'DNS failure %' order by id desc limit 1")
check("setup: m11 produced the passed-over incident", e_id.isdigit(), e_id)
if e_id.isdigit():
    check("E: only the system admin was told (level 2); nobody for the empty level 1, not the IT manager",
          owner_hops(e_id) == ["Root Admin"], owner_hops(e_id))
    check("E: the 'Escalated to you' notice names level 2",
          "level 2" in sql(f"select message from notifications where incident_id = {e_id} "
                           "and title like 'Escalated to you%' limit 1"))

# ---------------------------------------------------------------- D: manual escalations, actor not told
d_id = sql("select incident_id from audit_records where action = 'ESCALATED' "
           "and description like '%level 1 (Team Lead) by Tech%' order by id limit 1")
check("setup: m11 produced the manually escalated incident", d_id.isdigit(), d_id)
if d_id.isdigit():
    # tech escalates 0 -> 1, the lead 1 -> 2, the root admin 2 -> 3
    check("D: each manual hop told the holder of the new level",
          owner_hops(d_id) == ["Lead", "Root Admin", "IT Manager"], owner_hops(d_id))
    check("D: the assignee was not told about the hop they made themselves, only about the two later ones",
          told(d_id, "Tech") == 2, told(d_id, "Tech"))
    check("D: the root admin, who made the last hop, was told only once (as holder of level 2)",
          told(d_id, "Root Admin") == 1, told(d_id, "Root Admin"))
