"""Smoke test of M9, notifications (local dev server, throwaway data, local DB and local mail catcher only).

Needs: the backend running, Mailpit on 1025 (SMTP) and 8025 (API), the Docker Postgres container.
Settings by environment variable (defaults are the main checkout): SMOKE_PORT (8081), SMOKE_DB (iitsm),
SMOKE_LOG (path of the backend log, optional: adds the log checks), SMOKE_MAIL_CONTAINER (iitsm-mail).

It changes live settings (monitor interval, digest threshold, mail retries, chat webhook) and puts them back.
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
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = os.environ.get("SMOKE_PORT", "8081")
DB = os.environ.get("SMOKE_DB", "iitsm")
LOG = os.environ.get("SMOKE_LOG")
MAIL_CONTAINER = os.environ.get("SMOKE_MAIL_CONTAINER", "iitsm-mail")
BASE = f"http://localhost:{PORT}/api/v1"
MAILPIT = "http://localhost:8025/api/v1"
HOOK_PORT = 18089
RUN = secrets.token_hex(3)
PW = "Ab9-Zq" + secrets.token_hex(4) + "9"
results = []


@atexit.register
def report_results():
    for status, name, detail in results:
        print(f"{status}  {name}" + (f"   -> {detail}" if status == "FAIL" else ""))
    print(f"\n{sum(r[0] == 'PASS' for r in results)}/{len(results)} passed")


def call(method, path, body=None, token=None, base=BASE):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read().decode()
            try:
                return r.status, (json.loads(raw) if raw else None)
            except json.JSONDecodeError:  # Mailpit answers some calls with plain text
                return r.status, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw


def check(name, ok, detail=""):
    results.append(("PASS" if ok else "FAIL", name, detail))


def sql(statement):
    out = subprocess.run(["docker", "exec", os.environ.get("SMOKE_CONTAINER", "iitsm-db"), "psql", "-U", "iitsm", "-d", DB, "-tAc", statement],
                         capture_output=True, text=True)
    return out.stdout.strip() or out.stderr.strip()


def fe(b):
    return sorted({f["field"] for f in b.get("fieldErrors", [])}) if isinstance(b, dict) else b


def login(email):
    s, b = call("POST", "/auth/login", {"email": email, "password": PW})
    return b["accessToken"] if s == 200 else None


def mail(tag):
    return f"{tag}.{RUN}@iitsm.demo"


def wait_for(predicate, seconds=15):
    end = time.time() + seconds
    while time.time() < end:
        result = predicate()
        if result:
            return result
        time.sleep(0.5)
    return predicate()


def count(user_id, channel=None, event=None, incident=None, null_incident=False):
    where = [f"user_id={user_id}"]
    if channel:
        where.append(f"channel='{channel}'")
    if event:
        where.append(f"event_type='{event}'")
    if incident:
        where.append(f"incident_id={incident}")
    if null_incident:
        where.append("incident_id is null")
    out = sql("select count(*) from notifications where " + " and ".join(where))
    return int(out) if out.isdigit() else -1


def inbox(token, query=""):
    s, b = call("GET", "/notifications" + query, token=token)
    return b["items"] if s == 200 else []


def unread(token):
    s, b = call("GET", "/notifications/unread-count", token=token)
    return b["count"] if s == 200 else -1


# ---------------------------------------------------------------- mail catcher helpers (Mailpit API)
def mails():
    try:
        with urllib.request.urlopen(MAILPIT + "/messages?limit=500") as r:
            return json.loads(r.read().decode())["messages"]
    except Exception as ex:  # catcher not running
        return []


def mails_to(address, containing=""):
    return [m for m in mails() if any(t["Address"].lower() == address.lower() for t in m["To"])
            and containing in m["Subject"]]


def mail_html(message_id):
    with urllib.request.urlopen(f"{MAILPIT}/message/{message_id}") as r:
        return json.loads(r.read().decode()).get("HTML", "")


# ---------------------------------------------------------------- a chat webhook that records what it receives
hooked = []


class Hook(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        hooked.append(json.loads(self.rfile.read(length).decode() or "{}"))
        self.send_response(200)
        self.end_headers()

    def log_message(self, *args):
        pass


hook_server = HTTPServer(("127.0.0.1", HOOK_PORT), Hook)
threading.Thread(target=hook_server.serve_forever, daemon=True).start()


# ---------------------------------------------------------------- a minimal STOMP over WebSocket client (stdlib only)
class Stomp:
    def __init__(self, token, destination="/user/queue/notifications", subscribe=True):
        self.frames = []
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
        if subscribe and wait_for(lambda: any(f.startswith("CONNECTED") for f in self.frames), 5):
            self._send(f"SUBSCRIBE\nid:sub-0\ndestination:{destination}\n\n\0")

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
                    return
        except Exception:
            return

    def messages(self):
        out = []
        for f in self.frames:
            if f.startswith("MESSAGE"):
                out.append(json.loads(f.split("\n\n", 1)[1].rstrip("\0")))
        return out

    def close(self):
        try:
            self.sock.close()
        except OSError:
            pass


def log_has(text):
    if not LOG:
        return None
    with open(LOG, encoding="utf-8", errors="replace") as f:
        return text in f.read()


# ================================================================ setup
call("POST", "/auth/register", {"name": "Root Admin", "email": mail("root"), "password": PW})
root_id = sql(f"select id from users where email='{mail('root')}'")
sql(f"insert into user_roles(user_id, role_type, granted_at) values ({root_id}, 'ADMINISTRATOR', now())")
sql(f"insert into administrator_profiles(user_id, scope) values ({root_id}, 'SYSTEM_ADMIN')")
A = login(mail("root"))
s, _ = call("PUT", "/admin/config", [
    {"key": "sla.monitor.interval.seconds", "value": "5"}, {"key": "assignment.strategy", "value": "COMPOSITE"},
    {"key": "notification.email.retries", "value": "3"}, {"key": "notification.email.backoff.seconds", "value": "4"},
    {"key": "notification.digest.threshold", "value": "5"},
    {"key": "notification.chat.webhook.url", "value": f"http://localhost:{HOOK_PORT}/hook"}], token=A)
check("config: M9 settings accepted (webhook URL, retries, backoff, threshold)", s == 200, s)
# Settings this suite assumes (restored at exit): untitled incidents stay in triage, no 429 on bursts
import smoke_setup  # noqa: E402
smoke_setup.tune_with(PORT, A, {**smoke_setup.NO_AUTOCAT, **smoke_setup.NO_RATE_LIMITS})
s, b = call("PUT", "/admin/config", [{"key": "notification.chat.webhook.url", "value": "ftp://x"}], token=A)
check("config: a webhook that is not http(s) -> 400 on the key", s == 400 and "notification.chat.webhook.url" in fe(b), (s, b))
s, b = call("PUT", "/admin/config", [{"key": "notification.email.from", "value": "nope"}], token=A)
check("config: a sender that is not an address -> 400", s == 400 and "notification.email.from" in fe(b), (s, b))

skill = call("POST", "/admin/skills", {"name": f"Notify-{RUN}"}, token=A)[1]["id"]
svc = call("POST", "/admin/services", {"name": f"NotifySvc-{RUN}", "criticality": 4, "alwaysP1": False}, token=A)[1]["id"]
quiet = call("POST", "/admin/services", {"name": f"NotifyQuiet-{RUN}", "criticality": 2, "alwaysP1": False}, token=A)[1]["id"]
cat = call("POST", "/admin/categories", {"name": f"NotifyCat-{RUN}", "requiredSkillIds": [skill]}, token=A)[1]["id"]
for prio in ("P1", "P2", "P3", "P4"):
    for service in (svc, quiet):
        call("POST", "/admin/sla-policies", {"serviceId": service, "priority": prio, "responseMinutes": 60,
                                             "resolutionMinutes": 480}, token=A)


def user(tag, roles, technician=None):
    body = {"name": tag.title(), "email": mail(tag), "password": PW, "roles": roles}
    if technician:
        body["technician"] = technician
    s, b = call("POST", "/admin/users", body, token=A)
    return b["id"] if s == 201 else None


asha = user("asha", ["EMPLOYEE", "TECHNICIAN"], {"experienceLevel": 4, "escalationLevel": 0, "maxLoad": 50,
                                                  "availability": "AVAILABLE",
                                                  "skills": [{"skillId": skill, "proficiency": 5}]})
lead = user("lead", ["EMPLOYEE", "TECHNICIAN"], {"experienceLevel": 5, "escalationLevel": 1, "maxLoad": 10,
                                                  "availability": "OFF_DUTY", "skills": []})
emp = user("emp", ["EMPLOYEE"])
T, L, E = login(mail("asha")), login(mail("lead")), login(mail("emp"))
check("setup: technician, team lead, employee and admin exist", all([asha, lead, emp, A, T, L, E]),
      (asha, lead, emp))
mails_cleared = call("DELETE", "/messages", base=MAILPIT)
check("mail catcher reachable and emptied", mails_cleared[0] in (200, 204) or mails() == [], mails_cleared)


def incident(title, token=None, p1=False, category=True, service=None):
    body = {"title": f"{title} {RUN}", "description": "Notification smoke test incident " + RUN,
            "serviceId": service or (svc if p1 else quiet), "categoryId": cat if category else None,
            "impact": 5 if p1 else 1, "urgency": 5 if p1 else 1, "affectedUsers": 50 if p1 else 1}
    s, b = call("POST", "/incidents", {**body, "confirmNotDuplicate": True}, token=token or E)
    return b if s == 201 else {"error": b}


# ================================================================ endpoints are guarded
s, b = call("GET", "/notifications")
check("GET /notifications without a token -> 401", s == 401, s)
s, b = call("GET", "/notifications", token=E)
check("a new user has an empty inbox", s == 200 and b["items"] == [] and b["totalItems"] == 0, (s, b))

# ================================================================ one assignment, the right people, the right channels
ws_asha = Stomp(T)
ws_nobody = Stomp(None, subscribe=False)
check("WebSocket: CONNECT without a token is refused with an ERROR frame",
      ws_nobody.upgraded and wait_for(lambda: any(f.startswith("ERROR") for f in ws_nobody.frames), 5), ws_nobody.frames)
ws_nobody.close()
check("WebSocket: CONNECT with Asha's access token is accepted",
      wait_for(lambda: any(f.startswith("CONNECTED") for f in ws_asha.frames), 5), ws_asha.frames)
ws_bad = Stomp(E, destination="/topic/dashboard")
check("WebSocket: subscribing to any other destination is refused",
      wait_for(lambda: any(f.startswith("ERROR") for f in ws_bad.frames), 5), ws_bad.frames)
ws_bad.close()

inc = incident("VPN gateway down", p1=True)
check("P1 incident is created and assigned to Asha on creation",
      inc.get("priority") == "P1" and inc.get("status") == "ASSIGNED" and (inc.get("assignee") or {}).get("name") == "Asha", inc)
iid, code = inc["id"], inc["code"]

check("reporter: INCIDENT_CREATED and INCIDENT_ASSIGNED in the inbox",
      wait_for(lambda: count(emp, "IN_APP", incident=iid) == 2) and count(emp, "IN_APP", "INCIDENT_CREATED", iid) == 1
      and count(emp, "IN_APP", "INCIDENT_ASSIGNED", iid) == 1, count(emp, incident=iid))
check("technician: one INCIDENT_ASSIGNED in the inbox, written for the technician",
      wait_for(lambda: count(asha, "IN_APP", "INCIDENT_ASSIGNED", iid) == 1)
      and any(i["title"].startswith("New incident") for i in inbox(T)), inbox(T))
check("P1: simulated SMS for the technician only (row with channel SMS_SIM)",
      wait_for(lambda: count(asha, "SMS_SIM", "INCIDENT_ASSIGNED", iid) == 1) and count(emp, "SMS_SIM") == 0,
      (count(asha, "SMS_SIM"), count(emp, "SMS_SIM")))
sms = inbox(T, "?channel=SMS_SIM")
check("GET /notifications?channel=SMS_SIM lists it, text under 160 characters",
      len(sms) == 1 and len(sms[0]["message"]) <= 160 and sms[0]["channel"] == "SMS_SIM", sms)
check("nobody else is notified: the admin and the team lead get nothing for an assigned incident",
      count(root_id) == 0 and count(lead) == 0, (count(root_id), count(lead)))
check("email: the reporter gets 2 mails (received, assigned), the technician 1",
      wait_for(lambda: len(mails_to(mail("emp"), code)) == 2 and len(mails_to(mail("asha"), code)) == 1, 15),
      (len(mails_to(mail("emp"), code)), len(mails_to(mail("asha"), code))))
tm = mails_to(mail("asha"), code)
html = mail_html(tm[0]["ID"]) if tm else ""
check("email: HTML shell with the incident code, title and a link to the incident",
      code in html and "Open the incident" in html and f"/incidents/{iid}" in html and "<table" in html, html[:200])
check("WebSocket: Asha receives the push on /user/queue/notifications, with the id of her inbox row",
      wait_for(lambda: len(ws_asha.messages()) >= 1, 8)
      and ws_asha.messages()[0]["id"] == int(sql(f"select id from notifications where user_id={asha} "
                                                 f"and channel='IN_APP' and incident_id={iid}"))
      and ws_asha.messages()[0]["eventType"] == "INCIDENT_ASSIGNED" and ws_asha.messages()[0]["read"] is False,
      ws_asha.messages())
check("chat webhook: P1 assignment posted once to the room",
      wait_for(lambda: any(code in h.get("text", "") for h in hooked), 8)
      and sum(code in h.get("text", "") for h in hooked) == 1, hooked)

# ---------------------------------------------------------------- reading
n = unread(E)
first = inbox(E, "?unread=true")
check("unread count equals the unread list (2)", n == 2 and len(first) == 2, (n, len(first)))
s, _ = call("POST", f"/notifications/{first[0]['id']}/read", token=E)
check("mark one read -> 204, unread count drops to 1", s == 204 and unread(E) == 1, (s, unread(E)))
s, b = call("POST", f"/notifications/{first[0]['id']}/read", token=T)
check("someone else's notification -> 404 (as if it did not exist)", s == 404, (s, b))
check("unread filter: 1 left", len(inbox(E, "?unread=true")) == 1, inbox(E, "?unread=true"))
s, _ = call("POST", "/notifications/read-all", token=E)
check("read-all -> 204 and the count is 0", s == 204 and unread(E) == 0, (s, unread(E)))
check("read-all did not touch Asha's inbox", unread(T) == 1, unread(T))
s, b = call("GET", "/notifications?channel=WEBSOCKET", token=E)
check("channel=WEBSOCKET is delivered, not stored -> 400", s == 400, (s, b))
s, b = call("GET", "/notifications?size=1&page=0", token=E)
check("paging: size 1 of 2", s == 200 and len(b["items"]) == 1 and b["totalItems"] == 2 and b["totalPages"] == 2, b)

# ================================================================ lifecycle events reach the right person
s, _ = call("POST", f"/incidents/{iid}/acknowledge", token=T)
check("acknowledge -> the reporter hears (INCIDENT_ACKNOWLEDGED), the actor does not",
      s == 200 and wait_for(lambda: count(emp, "IN_APP", "INCIDENT_ACKNOWLEDGED", iid) == 1)
      and count(asha, "IN_APP", "INCIDENT_ACKNOWLEDGED") == 0, s)
call("POST", f"/incidents/{iid}/start", token=T)
check("work started has no notification type: nothing sent",
      count(emp, event="INCIDENT_ACKNOWLEDGED") == 1 and sql(
          f"select count(*) from notifications where incident_id={iid} and event_type not in "
          f"('INCIDENT_CREATED','INCIDENT_ASSIGNED','INCIDENT_ACKNOWLEDGED')") == "0", "")
call("POST", f"/incidents/{iid}/resolve", {"rootCause": "Gateway licence expired", "notes": "Renewed the licence.",
                                           "timeSpentMinutes": 20}, token=T)
check("resolve -> the reporter gets INCIDENT_RESOLVED",
      wait_for(lambda: count(emp, "IN_APP", "INCIDENT_RESOLVED", iid) == 1), count(emp, event="INCIDENT_RESOLVED"))
call("POST", f"/incidents/{iid}/verify", token=E)
check("verify -> the technician gets INCIDENT_VERIFIED, the reporter (actor) does not",
      wait_for(lambda: count(asha, "IN_APP", "INCIDENT_VERIFIED", iid) == 1)
      and count(emp, "IN_APP", "INCIDENT_VERIFIED") == 0, "")
call("POST", f"/incidents/{iid}/close", token=A)
check("close -> the reporter gets INCIDENT_CLOSED",
      wait_for(lambda: count(emp, "IN_APP", "INCIDENT_CLOSED", iid) == 1), count(emp, event="INCIDENT_CLOSED"))
check("event type values are all among the 15 of Appendix A.4",
      sql("select count(*) from notifications where event_type not in ('INCIDENT_CREATED','INCIDENT_ASSIGNED',"
          "'INCIDENT_ACKNOWLEDGED','PRIORITY_CHANGED','INFO_REQUESTED','INFO_PROVIDED','SLA_WARNING','SLA_VIOLATED',"
          "'INCIDENT_ESCALATED','INCIDENT_RESOLVED','INCIDENT_VERIFIED','INCIDENT_CLOSED','INCIDENT_REOPENED',"
          "'DUPLICATE_SUSPECTED','TRIAGE_NEEDED')") == "0", "")

# ---------------------------------------------------------------- triage goes to the team lead
before_hooks = len(hooked)
tri = incident("Badge reader dead", p1=True, category=False)
check("incident without a category stays in triage", tri.get("status") == "CLASSIFIED", tri)
check("team lead: TRIAGE_NEEDED in the inbox, SMS because it is P1",
      wait_for(lambda: count(lead, "IN_APP", "TRIAGE_NEEDED", tri["id"]) == 1)
      and wait_for(lambda: count(lead, "SMS_SIM", "TRIAGE_NEEDED", tri["id"]) == 1), count(lead))
check("triage P1 is posted to the chat room too", wait_for(lambda: len(hooked) > before_hooks, 8), hooked[before_hooks:])
check("the technician is not told about triage", count(asha, event="TRIAGE_NEEDED") == 0, "")
tri4 = incident("Desk lamp flickers", category=False)
check("P4 triage: inbox row for the team lead, no SMS (P1 only), no chat post",
      wait_for(lambda: count(lead, "IN_APP", "TRIAGE_NEEDED", tri4["id"]) == 1)
      and count(lead, "SMS_SIM", "TRIAGE_NEEDED", tri4["id"]) == 0, count(lead))

# ================================================================ preferences
s, prefs = call("GET", "/notifications/preferences", token=E)
check("preferences: 15 event types x 4 personal channels = 60 switches, all on",
      s == 200 and len(prefs) == 60 and all(p["enabled"] for p in prefs)
      and {p["channel"] for p in prefs} == {"IN_APP", "EMAIL", "WEBSOCKET", "SMS_SIM"}, (s, len(prefs)))
check("preferences: for an employee only the inbox is locked (15 switches)",
      sum(p["locked"] for p in prefs) == 15 and all(p["locked"] for p in prefs if p["channel"] == "IN_APP"), "")
s, aprefs = call("GET", "/notifications/preferences", token=A)
locked_admin = {(p["eventType"], p["channel"]) for p in aprefs if p["locked"] and p["channel"] != "IN_APP"}
check("preferences: an administrator cannot switch off SLA_VIOLATED or INCIDENT_ESCALATED (6 switches)",
      locked_admin == {(e, c) for e in ("SLA_VIOLATED", "INCIDENT_ESCALATED") for c in ("EMAIL", "WEBSOCKET", "SMS_SIM")},
      sorted(locked_admin))
s, lprefs = call("GET", "/notifications/preferences", token=L)
check("preferences: a team lead cannot switch off INCIDENT_ESCALATED, but may switch off SLA_VIOLATED",
      {(p["eventType"]) for p in lprefs if p["locked"] and p["channel"] == "EMAIL"} == {"INCIDENT_ESCALATED"}, "")

s, b = call("PUT", "/notifications/preferences", [{"eventType": "INCIDENT_ASSIGNED", "channel": "IN_APP", "enabled": False}], token=E)
check("switching the inbox off -> 400", s == 400 and any("[0]" in f for f in fe(b)), (s, b))
s, b = call("PUT", "/notifications/preferences", [{"eventType": "SLA_VIOLATED", "channel": "EMAIL", "enabled": False}], token=A)
check("administrator switching SLA_VIOLATED email off -> 400 (critical alert)", s == 400, (s, b))
s, b = call("PUT", "/notifications/preferences", [{"eventType": "SLA_VIOLATED", "channel": "CHAT", "enabled": True}], token=E)
check("CHAT is not a personal channel -> 400", s == 400, (s, b))
s, b = call("PUT", "/notifications/preferences", [{"eventType": "NOPE", "channel": "EMAIL", "enabled": True}], token=E)
check("unknown event type -> 400", s == 400, (s, b))
s, b = call("PUT", "/notifications/preferences", [{"eventType": "INCIDENT_ASSIGNED", "channel": "EMAIL", "enabled": False}], token=E)
off = [p for p in b if not p["enabled"]] if s == 200 else b
check("employee switches INCIDENT_ASSIGNED email off -> 200, exactly that switch is off",
      s == 200 and [(p["eventType"], p["channel"]) for p in off] == [("INCIDENT_ASSIGNED", "EMAIL")], (s, off))
before_emp = len(mails_to(mail("emp")))
pref_inc = incident("Meeting room display blank")
check("preference respected: the reporter still gets the inbox rows and the CREATED mail, but no ASSIGNED mail",
      wait_for(lambda: count(emp, "IN_APP", incident=pref_inc["id"]) == 2)
      and wait_for(lambda: len(mails_to(mail("emp"), pref_inc["code"])) == 1)
      and not any("assigned" in m["Subject"].lower() for m in mails_to(mail("emp"), pref_inc["code"])),
      [m["Subject"] for m in mails_to(mail("emp"), pref_inc["code"])])
check("preference respected: the technician (no preference set) still gets her mail",
      wait_for(lambda: len(mails_to(mail("asha"), pref_inc["code"])) == 1), "")
s, b = call("PUT", "/notifications/preferences", [], token=E)
check("PUT replaces: an empty list puts everything back on", s == 200 and all(p["enabled"] for p in b), (s, len(b) if s == 200 else b))

# ================================================================ a failing channel does not stop the others
subprocess.run(["docker", "stop", MAIL_CONTAINER], capture_output=True)
t0 = time.time()
fail_inc = incident("Printer room offline")
code_f = fail_inc["code"]
check("mail server down: the incident is still created (mail never rolls back an incident)",
      fail_inc.get("status") == "ASSIGNED", fail_inc)
check("mail server down: inbox rows and WebSocket push still arrive for the other channels",
      wait_for(lambda: count(emp, "IN_APP", incident=fail_inc["id"]) == 2
               and count(asha, "IN_APP", "INCIDENT_ASSIGNED", fail_inc["id"]) == 1, 10)
      and wait_for(lambda: any(m.get("incidentId") == fail_inc["id"] for m in ws_asha.messages()), 8),
      (count(emp, incident=fail_inc["id"]), time.time() - t0))
subprocess.run(["docker", "start", MAIL_CONTAINER], capture_output=True)
check("mail server back within the retry window: the retried mails arrive (backoff 4 s, doubling)",
      wait_for(lambda: len(mails_to(mail("asha"), code_f)) == 1 and len(mails_to(mail("emp"), code_f)) == 2, 40),
      (len(mails_to(mail("asha"), code_f)), len(mails_to(mail("emp"), code_f))))
if LOG:
    check("log: the failed mail attempt was logged with its retry", log_has("failed (attempt 1 of 4), retrying in 4 s"), "")

# a dead chat webhook is one more failing channel
call("PUT", "/admin/config", [{"key": "notification.chat.webhook.url", "value": "http://localhost:9/hook"}], token=A)
dead = incident("Door lock offline", p1=True)
check("chat webhook unreachable: inbox, SMS and mail for the technician still work",
      wait_for(lambda: count(asha, "IN_APP", "INCIDENT_ASSIGNED", dead["id"]) == 1)
      and wait_for(lambda: count(asha, "SMS_SIM", "INCIDENT_ASSIGNED", dead["id"]) == 1)
      and wait_for(lambda: len(mails_to(mail("asha"), dead["code"])) == 1, 15), "")
if LOG:
    check("log: the chat failure is logged and says the others carry on",
          wait_for(lambda: log_has("Channel CHAT failed"), 5), "")
call("PUT", "/admin/config", [{"key": "notification.chat.webhook.url", "value": ""}], token=A)
dark = len(hooked)
quiet_p1 = incident("Fire door sensor offline", p1=True)
check("empty webhook URL: nothing is posted, the chat message is only logged",
      wait_for(lambda: count(asha, "IN_APP", "INCIDENT_ASSIGNED", quiet_p1["id"]) == 1) and len(hooked) == dark, "")
if LOG:
    check("log: 'no webhook set, only logged'", wait_for(lambda: log_has("no webhook set, only logged"), 5), "")


# ================================================================ alert storm control (SLA monitor run)
def warn_in_one_run(ids, seconds=600):
    sql(f"update incidents set response_due = now() + interval '{seconds} seconds' where id in ({','.join(map(str, ids))})")


def warnings(user_id, incident=None, null_incident=False):
    return count(user_id, "IN_APP", "SLA_WARNING", incident, null_incident)


s, _ = call("PUT", "/admin/config", [{"key": "notification.digest.threshold", "value": "1"}], token=A)
base_digests = warnings(asha, null_incident=True)
p4a, p4b = incident("Storm P4 a"), incident("Storm P4 b")
p1a, p1b = incident("Storm P1 a", p1=True), incident("Storm P1 b", p1=True)
storm = [p4a["id"], p4b["id"], p1a["id"], p1b["id"]]
check("storm: 2 x P4 and 2 x P1 created for the same technician",
      [p4a["priority"], p4b["priority"], p1a["priority"], p1b["priority"]] == ["P4", "P4", "P1", "P1"], (p4a, p1a))
time.sleep(2)  # let the creation notifications settle first
warn_in_one_run(storm)
check("storm: threshold 1, one run, two P4 warnings -> ONE digest for the technician (incident null)",
      wait_for(lambda: warnings(asha, null_incident=True) == base_digests + 1, 75), warnings(asha, null_incident=True))
digest = [i for i in inbox(T, "?size=50") if i["eventType"] == "SLA_WARNING" and i["incidentId"] is None]
check("storm: the digest says how many and which incidents",
      len(digest) == base_digests + 1 and digest[0]["title"] == "2 incidents near their SLA deadline"
      and p4a["code"] in digest[0]["message"] and p4b["code"] in digest[0]["message"], digest[:1])
check("storm: the two P4 warnings were NOT sent one by one",
      warnings(asha, p4a["id"]) == 0 and warnings(asha, p4b["id"]) == 0, "")
check("storm: P1 warnings are never batched: one individual notification each",
      warnings(asha, p1a["id"]) == 1 and warnings(asha, p1b["id"]) == 1, (warnings(asha, p1a["id"]), warnings(asha, p1b["id"])))
check("storm: P1 warnings also went by SMS (one row each); the digest has none",
      count(asha, "SMS_SIM", "SLA_WARNING", p1a["id"]) == 1 and count(asha, "SMS_SIM", "SLA_WARNING", p1b["id"]) == 1
      and count(asha, "SMS_SIM", "SLA_WARNING", null_incident=True) == 0, "")
check("storm: the digest was one mail, the P1 warnings one mail each (3 SLA mails in total)",
      wait_for(lambda: len([m for m in mails_to(mail("asha")) if "SLA" in m["Subject"]]) >= 3, 15),
      [m["Subject"] for m in mails_to(mail("asha")) if "SLA" in m["Subject"]])
check("storm: the reporter is not told about SLA warnings", count(emp, event="SLA_WARNING") == 0, "")

call("PUT", "/admin/config", [{"key": "notification.digest.threshold", "value": "5"}], token=A)
q1, q2 = incident("Quiet P4 a"), incident("Quiet P4 b")
time.sleep(2)
warn_in_one_run([q1["id"], q2["id"]])
check("below the threshold (2 <= 5): the warnings arrive one by one, no digest",
      wait_for(lambda: warnings(asha, q1["id"]) == 1 and warnings(asha, q2["id"]) == 1, 75)
      and warnings(asha, null_incident=True) == base_digests + 1, "")

# ---------------------------------------------------------------- violations: admins, critical, never batched
call("PUT", "/admin/config", [{"key": "notification.digest.threshold", "value": "1"},
                              {"key": "notification.chat.webhook.url", "value": f"http://localhost:{HOOK_PORT}/hook"}], token=A)
v1, v2 = incident("Violation P4 a"), incident("Violation P4 b")
time.sleep(2)
sql(f"update incidents set response_due = now() - interval '30 seconds' where id in ({v1['id']},{v2['id']})")
check("violation: the administrator gets one SLA_VIOLATED each even with threshold 1 (never batched)",
      wait_for(lambda: count(root_id, "IN_APP", "SLA_VIOLATED", v1["id"]) == 1
               and count(root_id, "IN_APP", "SLA_VIOLATED", v2["id"]) == 1, 75)
      and count(root_id, "IN_APP", "SLA_VIOLATED", null_incident=True) == 0, count(root_id))
check("violation: the technician hears too (SLA_VIOLATED), the reporter and the team lead do not",
      count(asha, "IN_APP", "SLA_VIOLATED", v1["id"]) == 1 and count(emp, event="SLA_VIOLATED") == 0
      and count(lead, event="SLA_VIOLATED") == 0, "")
check("violation: the administrator also gets one mail per violation",
      wait_for(lambda: len([m for m in mails_to(mail("root"))
                            if "SLA violated" in m["Subject"] and (v1["code"] in m["Subject"] or v2["code"] in m["Subject"])]) == 2, 15),
      [m["Subject"] for m in mails_to(mail("root"))])
check("violation: the chat room hears of both (always, whatever the priority)",
      wait_for(lambda: sum(v1["code"] in h.get("text", "") or v2["code"] in h.get("text", "") for h in hooked) >= 2, 10),
      hooked[-3:])
call("PUT", "/admin/config", [{"key": "notification.digest.threshold", "value": "5"},
                              {"key": "sla.monitor.interval.seconds", "value": "60"},
                              {"key": "notification.chat.webhook.url", "value": ""}], token=A)

ws_asha.close()
