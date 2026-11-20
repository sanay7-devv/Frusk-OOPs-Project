"""Smoke test of M13: live dashboard over STOMP, WebSocket permissions and token expiry, service graph, impact and the
E1 status board (local dev server, throwaway data).

Settings by environment variable: SMOKE_PORT (8083), SMOKE_DB (iitsm_m13).
The backend must run with a 1-minute access token (APP_JWT_ACCESS_TOKEN_MINUTES=1) for the expiry check; with another
value that one check is skipped (reported as PASS with 'skipped').
Run:  python -I -X utf8 m13_smoke.py
"""
import atexit
import base64
import json
import os
import secrets
import socket
import struct
import subprocess
import threading
import time
import urllib.error
import urllib.request

PORT = os.environ.get("SMOKE_PORT", "8083")
DB = os.environ.get("SMOKE_DB", "iitsm_m13")
BASE = f"http://localhost:{PORT}/api/v1"
RUN = secrets.token_hex(3)
PW = "Ab9-Zq" + secrets.token_hex(4) + "9"
results = []


@atexit.register
def report_results():
    for status, name, detail in results:
        print(f"{status}  {name}" + (f"   -> {detail}" if status == "FAIL" else ""))
    print(f"\n{sum(r[0] == 'PASS' for r in results)}/{len(results)} passed")


def check(name, ok, detail=""):
    results.append(("PASS" if ok else "FAIL", name, detail))


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


def login(email):
    s, b = call("POST", "/auth/login", {"email": email, "password": PW})
    return b["accessToken"] if s == 200 else None


def wait_for(predicate, seconds):
    end = time.time() + seconds
    while time.time() < end:
        if predicate():
            return True
        time.sleep(0.05)
    return predicate()


# ---------------------------------------------------------------- a minimal STOMP over WebSocket client (stdlib only)
class Stomp:
    def __init__(self, token, destination=None):
        self.frames = []
        self.closed = False
        self.close_code = None
        self.sock = socket.create_connection(("localhost", int(PORT)), timeout=10)
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall((f"GET /ws HTTP/1.1\r\nHost: localhost:{PORT}\r\nUpgrade: websocket\r\n"
                           f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n"
                           f"Sec-WebSocket-Protocol: v12.stomp\r\n\r\n").encode())
        head = b""
        while b"\r\n\r\n" not in head:
            head += self.sock.recv(1)
        self.upgraded = head.startswith(b"HTTP/1.1 101")
        if not self.upgraded:
            return
        auth = f"Authorization:Bearer {token}\n" if token else ""
        self._send(f"CONNECT\naccept-version:1.2\nheart-beat:0,0\n{auth}\n\0")
        threading.Thread(target=self._reader, daemon=True).start()
        self.connected = wait_for(lambda: any(f.startswith("CONNECTED") for f in self.frames) or self.closed, 5) \
            and any(f.startswith("CONNECTED") for f in self.frames)
        if destination and self.connected:
            self.subscribe(destination)

    def subscribe(self, destination, sub_id="sub-0"):
        self._send(f"SUBSCRIBE\nid:{sub_id}\ndestination:{destination}\n\n\0")

    def _send(self, text):
        payload = text.encode()
        mask = os.urandom(4)
        header = bytes([0x81])
        n = len(payload)
        header += bytes([0x80 | n]) if n < 126 else bytes([0x80 | 126]) + struct.pack(">H", n)
        self.sock.sendall(header + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(payload)))

    def _read_exact(self, n):
        data = b""
        while len(data) < n:
            chunk = self.sock.recv(n - len(data))
            if not chunk:
                raise EOFError
            data += chunk
        return data

    def _reader(self):
        self.sock.settimeout(None)
        try:
            while True:
                b0, b1 = self._read_exact(2)
                n = b1 & 0x7F
                if n == 126:
                    n = struct.unpack(">H", self._read_exact(2))[0]
                elif n == 127:
                    n = struct.unpack(">Q", self._read_exact(8))[0]
                payload = self._read_exact(n)
                if b0 & 0x0F == 1:
                    self.frames.append(payload.decode())
                elif b0 & 0x0F == 8:
                    self.close_code = struct.unpack(">H", payload[:2])[0] if len(payload) >= 2 else None
                    self.closed = True
                    return
        except Exception:
            self.closed = True

    def messages(self):
        out = []
        for f in self.frames:
            if f.startswith("MESSAGE"):
                out.append(json.loads(f.split("\n\n", 1)[1].rstrip("\0")))
        return out

    def errors(self):
        return [f for f in self.frames if f.startswith("ERROR")]

    def close(self):
        try:
            self.sock.close()
        except OSError:
            pass


# ================================================================ setup
call("POST", "/auth/register", {"name": "Root Admin", "email": mail("root"), "password": PW})
root_id = sql(f"select id from users where email='{mail('root')}'")
sql(f"insert into user_roles(user_id, role_type, granted_at) values ({root_id}, 'ADMINISTRATOR', now())")
sql(f"insert into administrator_profiles(user_id, scope) values ({root_id}, 'SYSTEM_ADMIN')")
A = login(mail("root"))
check("setup: administrator can log in", bool(A))

skill = call("POST", "/admin/skills", {"name": f"M13Skill-{RUN}"}, token=A)[1]["id"]


def service(name, criticality=3):
    svc = call("POST", "/admin/services", {"name": f"{name}-{RUN}", "criticality": criticality, "alwaysP1": False},
               token=A)[1]["id"]
    for prio in ("P1", "P2", "P3", "P4"):
        call("POST", "/admin/sla-policies", {"serviceId": svc, "priority": prio, "responseMinutes": 60,
                                             "resolutionMinutes": 480}, token=A)
    return svc


# Payment -> Auth -> Database <- Mail ; Portal -> Auth ; Lonely (no edges)
db_svc = service("Database", 5)
auth_svc = service("Auth", 4)
pay_svc = service("Payment", 5)
portal_svc = service("Portal", 3)
mail_svc = service("MailSvc", 2)
lonely_svc = service("Lonely", 1)
for sid, deps in ((auth_svc, [db_svc]), (pay_svc, [auth_svc]), (portal_svc, [auth_svc]), (mail_svc, [db_svc])):
    s, _ = call("PUT", f"/admin/services/{sid}/dependencies", {"dependencyIds": deps}, token=A)
    check(f"setup: dependencies of service {sid}", s in (200, 204), s)

cat = call("POST", "/admin/categories", {"name": f"M13Cat-{RUN}", "requiredSkillIds": [skill]}, token=A)[1]["id"]


def user(tag, roles, technician=None):
    body = {"name": tag.title(), "email": mail(tag), "password": PW, "roles": roles}
    if technician:
        body["technician"] = technician
    s, b = call("POST", "/admin/users", body, token=A)
    return b["id"] if s == 201 else None


tech = user("tech", ["EMPLOYEE", "TECHNICIAN"], {"experienceLevel": 4, "escalationLevel": 0, "maxLoad": 50,
                                                  "availability": "AVAILABLE",
                                                  "skills": [{"skillId": skill, "proficiency": 5}]})
emp = user("emp", ["EMPLOYEE"])
T, E = login(mail("tech")), login(mail("emp"))
check("setup: technician and employee exist", all([tech, emp, T, E]))


def incident(title, svc, impact, urgency, users=1, token=None):
    body = {"title": f"{title} {RUN}", "description": "M13 smoke test incident " + RUN, "serviceId": svc,
            "categoryId": cat, "impact": impact, "urgency": urgency, "affectedUsers": users}
    s, b = call("POST", "/incidents", {**body, "confirmNotDuplicate": True}, token=token or E)
    return b if s == 201 else {"error": b, "status": s}


# ================================================================ dashboard: first load on an empty system
s, b = call("GET", "/dashboard/live", token=A)
check("GET /dashboard/live: admin 200 with the C.8 shape",
      s == 200 and set(b) == {"counters", "byPriority", "recentEvents", "atRisk"}
      and set(b["counters"]) == {"total", "open", "critical", "resolved", "slaViolations"}, (s, b))
check("byPriority lists P1..P4", s == 200 and [r["label"] for r in b["byPriority"]][:4] == ["P1", "P2", "P3", "P4"])
base_total, base_open = b["counters"]["total"], b["counters"]["open"]
check("GET /dashboard/live: employee 403", call("GET", "/dashboard/live", token=E)[0] == 403)
check("GET /dashboard/live: technician 403", call("GET", "/dashboard/live", token=T)[0] == 403)
check("GET /dashboard/live: no token 401", call("GET", "/dashboard/live")[0] == 401)

# ================================================================ WebSocket permissions
ws_admin = Stomp(A, "/topic/dashboard")
check("STOMP: admin connects", ws_admin.upgraded and ws_admin.connected)
time.sleep(0.5)
check("STOMP: admin may subscribe to /topic/dashboard (no ERROR frame)", not ws_admin.errors(), ws_admin.errors())

ws_emp = Stomp(E)
check("STOMP: employee connects", ws_emp.upgraded and ws_emp.connected)
ws_emp.subscribe("/topic/dashboard")
check("STOMP: employee refused on /topic/dashboard", wait_for(lambda: bool(ws_emp.errors()), 3), ws_emp.frames)

ws_tech = Stomp(T)
ws_tech.subscribe("/topic/dashboard")
check("STOMP: technician refused on /topic/dashboard", wait_for(lambda: bool(ws_tech.errors()), 3), ws_tech.frames)

ws_emp2 = Stomp(E, "/user/queue/notifications")
time.sleep(0.4)
check("STOMP: employee may subscribe to /user/queue/notifications", not ws_emp2.errors(), ws_emp2.errors())
ws_other = Stomp(E)
ws_other.subscribe("/topic/anything")
check("STOMP: unknown destination refused", wait_for(lambda: bool(ws_other.errors()), 3), ws_other.frames)
ws_noauth = Stomp(None)
check("STOMP: connect without a token refused", not ws_noauth.connected, ws_noauth.frames)
ws_bad = Stomp("not.a.token")
check("STOMP: connect with a bad token refused", not ws_bad.connected, ws_bad.frames)
ws_send = Stomp(A)
ws_send._send("SEND\ndestination:/topic/dashboard\n\nhello\0")
check("STOMP: a client SEND is refused", wait_for(lambda: bool(ws_send.errors()), 3), ws_send.frames)

# ================================================================ done-when: create an incident, admin dashboard updates
t0 = time.time()
inc = incident("Payment cannot take cards", pay_svc, 5, 5, 150)
check("incident created (P1 on Payment)", "id" in inc and inc.get("priority") == "P1", inc)
got = wait_for(lambda: any(m.get("type") == "INCIDENT_CREATED" and m.get("incidentId") == inc.get("id")
                           for m in ws_admin.messages()), 5)
latency = time.time() - t0
check(f"dashboard: INCIDENT_CREATED arrives on the open admin subscription ({latency:.2f}s)", got and latency < 2.0,
      latency)
ev = next((m for m in ws_admin.messages() if m.get("type") == "INCIDENT_CREATED" and m.get("incidentId") == inc["id"]),
          {})
check("dashboard event has the C.8 shape {type, incidentId, code, priority, status, at}",
      set(ev) == {"type", "incidentId", "code", "priority", "status", "at"} and ev.get("code") == inc["code"]
      and ev.get("priority") == "P1" and ev.get("status") in ("ASSIGNED", "CLASSIFIED"), ev)
counters_seen = wait_for(lambda: any(m.get("type") == "COUNTERS" and m["counters"]["total"] == base_total + 1
                                     for m in ws_admin.messages()), 5)
check("dashboard: a COUNTERS message follows within seconds with total +1", counters_seen)
cm = next((m for m in reversed(ws_admin.messages()) if m.get("type") == "COUNTERS"), {})
check("COUNTERS shape {type, counters{total,open,critical,resolved,slaViolations}, byPriority, at}",
      set(cm) == {"type", "counters", "byPriority", "at"} and cm["counters"]["critical"] >= 1, cm)
check("employee and technician sockets received no dashboard message",
      not ws_emp.messages() and not ws_tech.messages())
check("employee's own socket got its notification (M9 push still works)",
      wait_for(lambda: any(m.get("eventType") == "INCIDENT_CREATED" for m in ws_emp2.messages()), 5),
      ws_emp2.messages())

# an action later in the lifecycle
a_status, _ = call("POST", f"/incidents/{inc['id']}/acknowledge", token=T)
if a_status != 200:  # not assigned to this technician: let the admin do it
    call("POST", f"/incidents/{inc['id']}/assign", {"technicianId": tech}, token=A)
    a_status, _ = call("POST", f"/incidents/{inc['id']}/acknowledge", token=T)
check("incident acknowledged", a_status == 200, a_status)
check("dashboard: INCIDENT_ACKNOWLEDGED event pushed",
      wait_for(lambda: any(m.get("type") == "INCIDENT_ACKNOWLEDGED" and m.get("incidentId") == inc["id"]
                           for m in ws_admin.messages()), 5))
check("dashboard: no event for the pipeline steps (no CLASSIFIED / PRIORITY_CALCULATED / COMMENT_ADDED types)",
      all(m.get("type") in ("COUNTERS", "INCIDENT_CREATED", "INCIDENT_ASSIGNED", "INCIDENT_ACKNOWLEDGED",
                            "TRIAGE_NEEDED", "PRIORITY_CHANGED") for m in ws_admin.messages()),
      sorted({m.get("type") for m in ws_admin.messages()}))

# ================================================================ GET /dashboard/live after activity
s, b = call("GET", "/dashboard/live", token=A)
c = b["counters"]
check("live: total and open grew by one", c["total"] == base_total + 1 and c["open"] == base_open + 1, c)
direct = call("GET", "/reports/overview", token=A)[1]
check("live counters equal /reports/overview",
      all(c[k] == direct[k] for k in ("total", "open", "critical", "resolved", "slaViolations")), (c, direct))
check("live: byPriority P1 count >= 1", next(r["count"] for r in b["byPriority"] if r["label"] == "P1") >= 1)
check("live: recentEvents newest first, at most 20, contains the acknowledgement",
      0 < len(b["recentEvents"]) <= 20 and b["recentEvents"][0]["type"] == "INCIDENT_ACKNOWLEDGED"
      and b["recentEvents"][0]["incidentId"] == inc["id"], b["recentEvents"][:2])
check("live: recent event shape", set(b["recentEvents"][0]) == {"type", "incidentId", "code", "priority", "status", "at"})
check("live: atRisk is a list of at most 10", isinstance(b["atRisk"], list) and len(b["atRisk"]) <= 10)

# at risk: a warning flag makes an open incident appear
sql(f"update incidents set res_warn75_sent = true where id = {inc['id']}")
b = call("GET", "/dashboard/live", token=A)[1]
check("live: an incident with an SLA warning appears in atRisk (IncidentSummary shape)",
      any(i["id"] == inc["id"] and "slaState" in i and "code" in i for i in b["atRisk"]), b["atRisk"])
sql(f"update incidents set res_violated = true where id = {inc['id']}")
b = call("GET", "/dashboard/live", token=A)[1]
check("live: a violated open incident is listed in atRisk as VIOLATED (DEC-122)",
      any(i["id"] == inc["id"] and i["slaState"] == "VIOLATED" for i in b["atRisk"]), b["atRisk"])
sql(f"update incidents set res_violated = false where id = {inc['id']}")

# ================================================================ graph
s, g = call("GET", "/services/graph", token=E)
check("GET /services/graph: any logged-in user, 200", s == 200 and set(g) == {"nodes", "edges"}, (s, g))
mine = {n["id"]: n for n in g["nodes"] if n["id"] in (db_svc, auth_svc, pay_svc, portal_svc, mail_svc, lonely_svc)}
check("graph: six nodes with the C.8 fields",
      len(mine) == 6 and all(set(n) == {"id", "name", "criticality", "openIncidents", "hasOpenP1"} for n in mine.values()),
      mine)
check("graph: Payment has 1 open incident and an open P1; others none",
      mine[pay_svc]["openIncidents"] == 1 and mine[pay_svc]["hasOpenP1"] is True
      and all(mine[i]["openIncidents"] == 0 and not mine[i]["hasOpenP1"] for i in (db_svc, auth_svc, portal_svc)),
      mine)
edges = {(e["from"], e["to"]) for e in g["edges"]}
want = {(auth_svc, db_svc), (pay_svc, auth_svc), (portal_svc, auth_svc), (mail_svc, db_svc)}
check("graph: edges mean 'from depends on to'", want <= edges and all(e["from"] != e["to"] for e in g["edges"]),
      edges)
check("graph: no token 401", call("GET", "/services/graph")[0] == 401)

# ================================================================ impact
s, i = call("GET", f"/services/{db_svc}/impact", token=E)
aff = {a["id"]: a for a in i["affected"]} if s == 200 else {}
check("impact of Database: Auth and Mail at 1, Payment and Portal at 2, nothing else",
      s == 200 and i["serviceId"] == db_svc and set(aff) == {auth_svc, mail_svc, pay_svc, portal_svc}
      and aff[auth_svc]["distance"] == 1 and aff[mail_svc]["distance"] == 1
      and aff[pay_svc]["distance"] == 2 and aff[portal_svc]["distance"] == 2, (s, i))
check("impact entries carry id, name, distance", all(set(a) == {"id", "name", "distance"} for a in aff.values()))
check("impact of Auth: Payment and Portal at 1",
      {a["id"]: a["distance"] for a in call("GET", f"/services/{auth_svc}/impact", token=E)[1]["affected"]}
      == {pay_svc: 1, portal_svc: 1})
check("impact of Payment (nothing depends on it): empty",
      call("GET", f"/services/{pay_svc}/impact", token=E)[1]["affected"] == [])
check("impact of Lonely: empty", call("GET", f"/services/{lonely_svc}/impact", token=E)[1]["affected"] == [])
s, b = call("GET", "/services/999999/impact", token=E)
check("impact of an unknown service: 404 SERVICE_NOT_FOUND", s == 404 and b.get("code") == "SERVICE_NOT_FOUND", (s, b))

# ================================================================ E1 status board
def board():
    s, b = call("GET", "/services/status", token=E)
    return s, b, {r["id"]: r for r in b["services"]} if s == 200 else {}


s, b, rows = board()
check("GET /services/status: employee 200 with the label 'Based on reported incidents'",
      s == 200 and b["label"] == "Based on reported incidents" and b["basis"] == "REPORTED_INCIDENTS"
      and b["windowDays"] == 30, (s, b if s != 200 else {k: b[k] for k in ('label', 'basis', 'windowDays')}))
check("status: Payment is OUTAGE (open P1)", rows[pay_svc]["status"] == "OUTAGE", rows.get(pay_svc))
check("status: Database, Auth, Portal, Mail, Lonely are HEALTHY (the outage is downstream of them)",
      all(rows[i]["status"] == "HEALTHY" for i in (db_svc, auth_svc, portal_svc, mail_svc, lonely_svc)),
      {k: v["status"] for k, v in rows.items()})
check("status: open counts on Payment {total 1, P1 1}",
      rows[pay_svc]["open"] == {"total": 1, "P1": 1, "P2": 0, "P3": 0, "P4": 0}, rows[pay_svc]["open"])
check("status: the board lists the outage first", b["services"][0]["id"] == pay_svc or
      b["services"][0]["status"] == "OUTAGE")

# P1 on Database: Auth, Payment, Portal, Mail become DEGRADED (Payment already OUTAGE); Lonely stays HEALTHY
db_inc = incident("Database server down", db_svc, 5, 5, 200)
check("P1 incident on Database created", db_inc.get("priority") == "P1", db_inc)
s, b, rows = board()
check("status: Database OUTAGE", rows[db_svc]["status"] == "OUTAGE", rows[db_svc])
check("status: Auth DEGRADED via Database at distance 1",
      rows[auth_svc]["status"] == "DEGRADED"
      and rows[auth_svc]["causedBy"] == [{"id": db_svc, "name": rows[db_svc]["name"], "distance": 1}], rows[auth_svc])
check("status: Portal and Mail DEGRADED; Lonely HEALTHY",
      rows[portal_svc]["status"] == "DEGRADED" and rows[mail_svc]["status"] == "DEGRADED"
      and rows[lonely_svc]["status"] == "HEALTHY", {k: v["status"] for k, v in rows.items()})
check("status: Portal's cause is Database at distance 2",
      rows[portal_svc]["causedBy"][0]["id"] == db_svc and rows[portal_svc]["causedBy"][0]["distance"] == 2)
check("status: Payment stays OUTAGE (its own P1) and lists Database as an upstream outage",
      rows[pay_svc]["status"] == "OUTAGE" and any(c["id"] == db_svc for c in rows[pay_svc]["causedBy"]))
order = [r["status"] for r in b["services"]]
check("status: sorted OUTAGE, DEGRADED, HEALTHY", order == sorted(order, key=["OUTAGE", "DEGRADED", "HEALTHY"].index), order)

# a P2 makes the service itself DEGRADED; a P4 changes nothing
p2 = incident("Lonely is slow", lonely_svc, 3, 4, 20)
p4 = incident("Lonely cosmetic", lonely_svc, 1, 1, 1)
s, b, rows = board()
check(f"status: Lonely with a {p2.get('priority')} and a {p4.get('priority')} incident",
      (rows[lonely_svc]["status"] == "DEGRADED") == (p2.get("priority") == "P2"), (p2.get("priority"), rows[lonely_svc]))
check("status: counts include P3/P4 (open total 2 on Lonely)", rows[lonely_svc]["open"]["total"] == 2,
      rows[lonely_svc]["open"])

# SLA compliance: none judged yet -> null; mark one finished within SLA
check("status: slaCompliancePercent is null while nothing was judged",
      rows[mail_svc]["slaCompliancePercent"] is None and rows[mail_svc]["slaJudged"] == 0, rows[mail_svc])
sql(f"update incidents set status = 'CLOSED', resolved_at = now(), closed_at = now(), closure_reason = 'VERIFIED' "
    f"where id = {p4['id']}") if "id" in p4 else None
s, b, rows = board()
check("status: a closed incident within its deadline gives 100.0 over 1 judged",
      rows[lonely_svc]["slaCompliancePercent"] == 100.0 and rows[lonely_svc]["slaJudged"] == 1, rows[lonely_svc])
sql(f"update incidents set resolved_at = resolution_due + interval '1 hour' where id = {p4['id']}")
s, b, rows = board()
check("status: resolved after the deadline gives 0.0",
      rows[lonely_svc]["slaCompliancePercent"] == 0.0, rows[lonely_svc])
check("status: no token 401", call("GET", "/services/status")[0] == 401)

# switched-off services are left out
call("DELETE", f"/admin/services/{lonely_svc}", token=A)
s, b, rows = board()
check("status and graph leave out a switched-off service", lonely_svc not in rows and
      all(n["id"] != lonely_svc for n in call("GET", "/services/graph", token=E)[1]["nodes"]))

# ================================================================ cleanup of the live dashboard sockets, then expiry
for ws in (ws_emp, ws_tech, ws_other, ws_noauth, ws_bad, ws_send, ws_emp2):
    ws.close()

fresh_admin = login(mail("root"))      # a token issued now, valid for APP_JWT_ACCESS_TOKEN_MINUTES
ws_exp = Stomp(fresh_admin, "/topic/dashboard")
check("expiry: a fresh admin socket is open", ws_exp.connected and not ws_exp.closed)
token_minutes = None
try:
    payload = fresh_admin.split(".")[1]
    claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    token_minutes = (claims["exp"] - claims["iat"]) / 60
except Exception:
    pass
if token_minutes == 1:
    print("waiting for the 1-minute token to expire ...")
    closed = wait_for(lambda: ws_exp.closed, 75)
    check("expiry: the socket is closed by the server at token expiry (close code 4001)",
          closed and ws_exp.close_code == 4001, (ws_exp.closed, ws_exp.close_code))
    elapsed_ok = True
    ws_late = Stomp(fresh_admin)
    check("expiry: connecting with the expired token is refused", not ws_late.connected, ws_late.frames)
    ws_late.close()
else:
    check(f"expiry: skipped (token lifetime is {token_minutes} minutes, start the backend with "
          "APP_JWT_ACCESS_TOKEN_MINUTES=1)", True)

ws_admin.close()
ws_exp.close()
