"""Offline check of the Gemini adapter (GeminiLlmClient): a local stub plays the Gemini API.

Start the backend with: LLM_PROVIDER=gemini LLM_API_KEY=stub-key LLM_BASE_URL=http://localhost:18090 (profiles
dev), then run:  SMOKE_PORT=8081 SMOKE_DB=<db> python -I -X utf8 gemini_stub_check.py
The stub checks the URL, the key header and the request body, answers like Gemini (candidates/content/parts with a
JSON text), and can be told to fail. Checks that suggestions come back with source LLM, that a blocked prompt or
HTTP error falls back to KEYWORD, and that the key never appears in the URL.
"""
import atexit
import json
import os
import secrets
import subprocess
import threading
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = os.environ.get("SMOKE_PORT", "8081")
DB = os.environ.get("SMOKE_DB", "iitsm")
BASE = f"http://localhost:{PORT}/api/v1"
RUN = secrets.token_hex(3)
PW = "Ab9-Zq" + secrets.token_hex(4) + "9"
seen = []          # every request the stub received
mode = {"next": "ok"}
results = []


@atexit.register
def report():
    for status, name, detail in results:
        print(f"{status}  {name}" + (f"   -> {detail}" if status == "FAIL" else ""))
    print(f"\n{sum(r[0] == 'PASS' for r in results)}/{len(results)} passed")


def check(name, ok, detail=""):
    results.append(("PASS" if ok else "FAIL", name, detail))


class Stub(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        seen.append({"path": self.path, "key": self.headers.get("x-goog-api-key"), "body": body})
        how = mode["next"]
        if how == "http500":
            self.send_response(500); self.end_headers(); self.wfile.write(b"{}"); return
        if how == "blocked":
            answer = {"promptFeedback": {"blockReason": "SAFETY"}}
        else:
            user = json.loads(body["contents"][0]["parts"][0]["text"])
            system = body["system_instruction"]["parts"][0]["text"]
            text = (user.get("title", "") + " " + user.get("description", "")).lower()
            cat = next((c["id"] for c in user.get("categories", [])
                        if any(w in text for w in c["name"].lower().split() if len(w) >= 4)), None)
            out = {"categoryId": cat, "confidence": 0.9 if cat else 0.0, "reason": "Gemini stub matched the name"}
            if "fill in an IT incident report" in system:
                out.update(impact=4, urgency=4)
            answer = {"candidates": [{"content": {"role": "model", "parts": [
                {"text": "thinking about it", "thought": True}, {"text": json.dumps(out)}]},
                "finishReason": "STOP"}]}
        data = json.dumps(answer).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(data)


server = HTTPServer(("localhost", 18090), Stub)
threading.Thread(target=server.serve_forever, daemon=True).start()


def call(method, path, body=None, token=None):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode() if body is not None else None,
                                 method=method, headers={"Content-Type": "application/json"})
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read().decode()
            return r.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def sql(statement):
    return subprocess.run(["docker", "exec", os.environ.get("SMOKE_CONTAINER", "iitsm-db"), "psql", "-U", "iitsm", "-d", DB, "-tAc", statement],
                          capture_output=True, text=True).stdout.strip()


email = f"gem.{RUN}@iitsm.demo"
call("POST", "/auth/register", {"name": "Gem Admin", "email": email, "password": PW})
uid = sql(f"select id from users where email='{email}'")
sql(f"insert into user_roles(user_id, role_type, granted_at) values ({uid}, 'ADMINISTRATOR', now())")
sql(f"insert into administrator_profiles(user_id, scope) values ({uid}, 'SYSTEM_ADMIN')")
A = call("POST", "/auth/login", {"email": email, "password": PW})[1]["accessToken"]
call("PUT", "/admin/config", [{"key": "ai.primary", "value": "LLM"}, {"key": "ai.cache.ttl.seconds", "value": "0"}],
     token=A)
s, net = call("POST", "/admin/categories", {"name": f"Network {RUN}"}, token=A)
check("setup: a category exists", s == 201, (s, net))

# 1. a normal suggestion goes through the Gemini adapter
s, b = call("POST", "/intelligence/suggest-category", {"title": "Network keeps dropping",
                                                        "description": "The office network drops every few minutes."},
            token=A)
check("suggest-category answered by the LLM (source LLM)", s == 200 and b.get("source") == "LLM", (s, b))
check("the stub's category was used (thought part skipped, JSON text parsed)",
      s == 200 and b.get("categoryId") is not None and str(b.get("categoryName", "")).startswith("Network")
      and b.get("reason") == "Gemini stub matched the name", b)  # the Flyway seed has a "Network" category too, the stub picks the first match
req = seen[-1] if seen else {}
check("request went to /v1beta/models/gemini-3.5-flash-lite:generateContent",
      req.get("path") == "/v1beta/models/gemini-3.5-flash-lite:generateContent", req.get("path"))
check("key sent in the x-goog-api-key header, not in the URL",
      req.get("key") == "stub-key" and "stub-key" not in req.get("path", ""), (req.get("key"), req.get("path")))
gc = req.get("body", {}).get("generationConfig", {})
check("asks for JSON output and caps the answer", gc.get("responseMimeType") == "application/json"
      and gc.get("maxOutputTokens") == 1024, gc)
check("system prompt sent as system_instruction",
      bool(req.get("body", {}).get("system_instruction", {}).get("parts", [{}])[0].get("text")), req.get("body"))

# 2. intake suggestion (impact and urgency) also through Gemini
s, b = call("POST", "/intelligence/suggest-intake", {"description": "The whole network is down for everyone."}, token=A)
check("suggest-intake answered by the LLM", s == 200 and b.get("source") == "LLM" and b.get("impact") == 4, (s, b))

# 3. failures fall back to the keyword engine
mode["next"] = "blocked"
s, b = call("POST", "/intelligence/suggest-category", {"title": "Network blocked case", "description": "Network down."},
            token=A)
check("a blocked prompt falls back to KEYWORD", s == 200 and b.get("source") == "KEYWORD", (s, b))
mode["next"] = "http500"
s, b = call("POST", "/intelligence/suggest-category", {"title": "Network error case", "description": "Network down."},
            token=A)
check("an HTTP 500 from Gemini falls back to KEYWORD", s == 200 and b.get("source") == "KEYWORD", (s, b))
mode["next"] = "ok"
server.shutdown()
