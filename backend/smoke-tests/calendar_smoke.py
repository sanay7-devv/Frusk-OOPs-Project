"""Smoke test of the business-hours SLA calendar (M7 extra, DEC-39). Local dev server on 8081, throwaway data."""
import os
import atexit
import datetime as dt
import json
import secrets
import subprocess
import urllib.error
import urllib.request

BASE = "http://localhost:" + os.environ.get("SMOKE_PORT", "8081") + "/api/v1"
RUN = secrets.token_hex(3)
PW = "Ab9-Zq" + secrets.token_hex(4) + "9"
results = []
UTC = dt.timezone.utc


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
    out = subprocess.run(["docker", "exec", os.environ.get("SMOKE_CONTAINER", "iitsm-db"), "psql", "-U", "iitsm", "-d", os.environ.get("SMOKE_DB", "iitsm"), "-tAc", statement],
                         capture_output=True, text=True)
    return out.stdout.strip() or out.stderr.strip()


def ts(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def add_working(start, minutes, holidays, open_h=9, close_h=18):
    """Independent reference: Mon-Fri open_h..close_h UTC, minus holidays."""
    remaining = dt.timedelta(minutes=minutes)
    at = start
    for _ in range(400):
        d = at.date()
        if d.weekday() < 5 and d not in holidays:
            opens = dt.datetime(d.year, d.month, d.day, open_h, tzinfo=UTC)
            closes = dt.datetime(d.year, d.month, d.day, close_h, tzinfo=UTC)
            at = max(at, opens)
            if at < closes:
                if remaining <= closes - at:
                    return at + remaining
                remaining -= closes - at
        at = dt.datetime(d.year, d.month, d.day, tzinfo=UTC) + dt.timedelta(days=1)


def close_enough(a, b):
    return abs((a - b).total_seconds()) <= 2


# ---------------------------------------------------------------- setup
call("POST", "/auth/register", {"name": "Root Admin", "email": f"root.{RUN}@iitsm.demo", "password": PW})
rid = sql(f"select id from users where email='root.{RUN}@iitsm.demo'")
sql(f"insert into user_roles(user_id, role_type, granted_at) values ({rid}, 'ADMINISTRATOR', now())")
sql(f"insert into administrator_profiles(user_id, scope) values ({rid}, 'SYSTEM_ADMIN')")
A = call("POST", "/auth/login", {"email": f"root.{RUN}@iitsm.demo", "password": PW})[1]["accessToken"]


def config(pairs):
    return call("PUT", "/admin/config", [{"key": k, "value": v} for k, v in pairs.items()], token=A)


def fields(b):
    return [f["field"] for f in b.get("fieldErrors", [])] if isinstance(b, dict) else b


# ---------------------------------------------------------------- validation of the calendar settings
s, b = config({"sla.business.open": "18:00", "sla.business.close": "09:00"})
check("close before open: 400 on sla.business.close", s == 400 and "sla.business.close" in fields(b), (s, b))
s, b = config({"sla.business.zone": "Mars/Base"})
check("unknown time zone: 400", s == 400 and fields(b) == ["sla.business.zone"], (s, b))
s, b = config({"sla.business.days": "MON,MON"})
check("duplicate days: 400", s == 400 and fields(b) == ["sla.business.days"], (s, b))
s, b = config({"sla.business.holidays": "2026-13-40"})
check("bad holiday date: 400", s == 400 and fields(b) == ["sla.business.holidays"], (s, b))
s, b = config({"sla.business.zone": "UTC", "sla.business.open": "09:00", "sla.business.close": "18:00",
               "sla.business.days": "MON,TUE,WED,THU,FRI", "sla.business.holidays": ""})
check("valid calendar (UTC, Mon-Fri 09-18, no holidays) accepted, empty holidays allowed", s == 200, (s, b))

# ---------------------------------------------------------------- deadlines in business hours
svc = call("POST", "/admin/services", {"name": f"Cal-{RUN}", "criticality": 1}, token=A)[1]["id"]
s, b = call("POST", "/admin/sla-policies", {"serviceId": svc, "priority": "P4", "responseMinutes": 60,
                                            "resolutionMinutes": 600, "calendarType": "BUSINESS_HOURS"}, token=A)
check("SLA policy with calendarType BUSINESS_HOURS accepted", s == 201 and b["calendarType"] == "BUSINESS_HOURS", (s, b))
for prio in ("P1", "P2", "P3"):
    call("POST", "/admin/sla-policies", {"serviceId": svc, "priority": prio, "responseMinutes": 5,
                                         "resolutionMinutes": 30}, token=A)
s, b = call("POST", "/admin/sla-policies", {"serviceId": svc, "priority": "P3", "responseMinutes": 5,
                                            "resolutionMinutes": 30}, token=A)


def report(title):
    s, b = call("POST", "/incidents", {"confirmNotDuplicate": True, "title": title, "description": "Calendar smoke test incident " + RUN,
                                       "serviceId": svc, "impact": 1, "urgency": 1, "affectedUsers": 1}, token=A)
    return b


inc = report(f"Printer jam {RUN}")
created = ts(inc["createdAt"])
check("P4 incident uses the business-hours policy", inc["priority"] == "P4", inc.get("priority"))
check("response due = created + 60 working minutes",
      close_enough(ts(inc["responseDue"]), add_working(created, 60, set())), (inc["createdAt"], inc["responseDue"]))
check("resolution due = created + 600 working minutes (spans at least one night)",
      close_enough(ts(inc["resolutionDue"]), add_working(created, 600, set())), inc["resolutionDue"])
check("a 10-hour target cannot finish within 10 wall hours", ts(inc["resolutionDue"]) - created > dt.timedelta(hours=10),
      inc["resolutionDue"])

# holidays push the deadline further
today = dt.datetime.now(UTC).date()
holidays = {today + dt.timedelta(days=i) for i in range(0, 3)}
s, _ = config({"sla.business.holidays": ",".join(d.isoformat() for d in sorted(holidays))})
inc2 = report(f"Scanner offline {RUN}")
expected = add_working(ts(inc2["createdAt"]), 600, holidays)
check("holidays (today and the next two days) are skipped", s == 200 and close_enough(ts(inc2["resolutionDue"]), expected),
      (inc2["resolutionDue"], expected.isoformat()))

config({"sla.business.holidays": "", "sla.business.zone": "Asia/Kolkata"})
