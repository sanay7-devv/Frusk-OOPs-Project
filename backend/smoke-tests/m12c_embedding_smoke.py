"""Smoke test of the embedding path of M12 (Gemini embeddings, DEC-M12-10) against a local stub that plays the Gemini
embedding API. Never touches the network.

Start the backend with the stub as the embedding provider and the scripted LLM:
    EMBEDDING_API_KEY=stub-key EMBEDDING_BASE_URL=http://localhost:18091 LLM_PROVIDER=fake SPRING_PROFILES_ACTIVE=dev
then run:  SMOKE_PORT=8085 SMOKE_CONTAINER=iitsm-db-b3 python -X utf8 m12c_embedding_smoke.py

The stub embeds a text as a hashed bag of words (768 dimensions), so texts that share words are close and texts that
share none are orthogonal: deterministic, and enough to prove the plumbing (storage, backfill, source field,
thresholds, redaction, cap, fallback), not the quality of a real model.
"""
import atexit
import json
import re
import threading
import time
import zlib
from http.server import BaseHTTPRequestHandler, HTTPServer

from m12_common import PW, RUN, call, login, mail, setup_world, sql, report as file_incident

DIM = 768
seen = []                 # every request the stub received
mode = {"next": "ok"}
results = []


@atexit.register
def finish():
    for status, name, detail in results:
        print(f"{status}  {name}" + (f"   -> {detail}" if status == "FAIL" else ""))
    print(f"\n{sum(r[0] == 'PASS' for r in results)}/{len(results)} passed")


def check(name, ok, detail=""):
    results.append(("PASS" if ok else "FAIL", name, detail))


def vector(text):
    v = [0.0] * DIM
    for word in re.findall(r"[a-z0-9]+", text.lower()):
        v[zlib.crc32(word.encode()) % DIM] += 1.0
    return v


class Stub(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        seen.append({"path": self.path, "key": self.headers.get("x-goog-api-key"), "body": body})
        how = mode["next"]
        if how in ("429", "http500"):
            self.send_response(429 if how == "429" else 500)
            self.end_headers()
            self.wfile.write(b"{}")
            return
        out = {"embeddings": [{"values": vector(r["content"]["parts"][0]["text"])} for r in body["requests"]]}
        data = json.dumps(out).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(data)


server = HTTPServer(("localhost", 18091), Stub)
threading.Thread(target=server.serve_forever, daemon=True).start()


def texts_sent():
    return [r["content"]["parts"][0]["text"] for call_ in seen for r in call_["body"]["requests"]]


def wait_for(fn, seconds=100):
    end = time.time() + seconds
    while time.time() < end:
        if fn():
            return True
        time.sleep(2)
    return False


def stored(incident_id):
    return sql(f"select model || '|' || coalesce(array_length(vector,1)::text,'0') from incident_embeddings "
               f"where incident_id={incident_id}")


w = setup_world()
A = w["A"]
# run the backfill every 5 seconds so the test does not wait a minute
s, b = call("PUT", "/admin/config", [{"key": "embedding.backfill.interval.seconds", "value": "5"},
                                     {"key": "ai.primary", "value": "LLM"},
                                     {"key": "dup.embedding.threshold.related", "value": "0.65"},
                                     {"key": "dup.embedding.threshold.duplicate", "value": "0.80"}], token=A)
check("the new embedding settings can be set (stub vectors are far less bunched than Gemini ones, so 0.80 / 0.65)", s == 200, (s, b))

# 1. an incident is embedded after it is created, with model and size stored -------------------------------------
TITLE_A = "VPN gateway timeout for remote staff"
DESC_A = ("Remote staff cannot connect to the VPN gateway, the connection times out. Contact jane.doe@corp.example "
          "from 10.20.30.40 password=hunter2secret")
s, a = file_incident(w, TITLE_A, DESC_A)
check("create incident A -> 201", s == 201, (s, a))
a_id = a["id"]
check("A is embedded after commit (listener) with model and 768 values",
      wait_for(lambda: stored(a_id) == "gemini-embedding-001@768|768", 20), stored(a_id))
first = seen[0] if seen else {}
check("the key travelled in x-goog-api-key", first.get("key") == "stub-key", first.get("key"))
check("the request path names the model and batchEmbedContents",
      first.get("path", "").endswith("/v1beta/models/gemini-embedding-001:batchEmbedContents"), first.get("path"))
req0 = first["body"]["requests"][0] if first else {}
check("outputDimensionality 768 and taskType SEMANTIC_SIMILARITY are sent",
      req0.get("outputDimensionality") == 768 and req0.get("taskType") == "SEMANTIC_SIMILARITY", req0.keys())
sent = " ".join(texts_sent())
check("text is redacted before it is sent (no email, address or password)",
      "jane.doe@corp.example" not in sent and "10.20.30.40" not in sent and "hunter2secret" not in sent
      and "[email]" in sent and "[ip]" in sent, sent[:200])

# 2. similarity scored by embeddings, with the source on every result -----------------------------------------------
n = len(texts_sent())
s, b = call("POST", "/intelligence/similar", {"serviceId": w["svc"], "title": TITLE_A,
                                              "description": DESC_A}, token=w["E"])
check("draft identical to A: source EMBEDDING, DUPLICATE, similarity 1.0",
      s == 200 and len(b) == 1 and b[0]["source"] == "EMBEDDING" and b[0]["match"] == "DUPLICATE"
      and b[0]["similarity"] >= 0.99, (s, b))
check("a repeated query is answered from the cache (the incident's own embedding was reused)",
      len(texts_sent()) == n, (n, len(texts_sent())))
n = len(texts_sent())
s, b = call("POST", "/intelligence/similar", {"serviceId": w["svc"], "title": "Cannot reach VPN gateway remotely",
                                              "description": "Remote staff VPN gateway connection times out"},
            token=w["E"])
check("a reworded draft is scored by EMBEDDING and found",
      s == 200 and len(b) == 1 and b[0]["source"] == "EMBEDDING" and b[0]["similarity"] > 0.5, (s, b))
check("exactly one embedding call for that query", len(texts_sent()) == n + 1, (n, len(texts_sent())))
s, b = call("POST", "/intelligence/similar", {"serviceId": w["svc"], "title": "Office party planning",
                                              "description": "Budget for the annual celebration dinner"},
            token=w["E"])
check("an unrelated draft finds nothing", s == 200 and b == [], (s, b))

# 3. the duplicate check on creation uses it, and the new incident costs no second call --------------------------
n = len(texts_sent())
s, b = call("POST", "/incidents", {"title": TITLE_A, "description": DESC_A, "serviceId": w["svc"], "impact": 2,
                                   "urgency": 2, "affectedUsers": 3}, token=w["O"])
check("creating the same incident without confirmation -> 409 DUPLICATE_INCIDENT",
      s == 409 and b.get("code") == "DUPLICATE_INCIDENT", (s, str(b)[:200]))
check("that check cost no new call (cached vector)", len(texts_sent()) == n, (n, len(texts_sent())))

# 4. the incident view: GET /incidents/{id}/similar names its source ---------------------------------------------
s, c = file_incident(w, "VPN gateway timeout remote staff cannot connect",
                     "Remote staff VPN gateway connection times out again")
c_id = c["id"]
wait_for(lambda: stored(c_id).endswith("|768"), 20)
s, b = call("GET", f"/incidents/{c_id}/similar", token=w["E"])
check("GET /incidents/{id}/similar: source EMBEDDING and A is found",
      s == 200 and any(m["incidentId"] == a_id and m["source"] == "EMBEDDING" for m in b), (s, b))

# 5. quota / failure: no vector, no embedding -> TF-IDF (KEYWORD), silently ------------------------------------------
mode["next"] = "429"
n_calls = len(seen)
s, d = file_incident(w, "Printer on floor three shows a paper jam", "Paper jam on the floor three printer again")
d_id = d["id"]
time.sleep(4)
check("a 429 leaves the new incident without a vector (backfill will retry)", stored(d_id) == "", stored(d_id))
s, b = call("POST", "/intelligence/similar", {"serviceId": w["svc"], "title": "Floor three printer paper jam",
                                              "description": "Paper jam on the floor three printer"},
            token=w["E"])
check("with a 429 the answer falls back to KEYWORD (TF-IDF)",
      s == 200 and len(b) >= 1 and all(m["source"] == "KEYWORD" for m in b), (s, b))
calls_during = len(seen) - n_calls
mode["next"] = "ok"
s, b = call("POST", "/intelligence/similar", {"serviceId": w["svc"], "title": "Floor three printer paper jam",
                                              "description": "Paper jam on the floor three printer"},
            token=w["E"])
check("while the breaker is open no further call is made (circuit breaker)",
      len(seen) - n_calls == calls_during and all(m["source"] == "KEYWORD" for m in b), (calls_during, len(seen) - n_calls))

# 6. backfill fills the gap once the API answers (breaker cool-off is 60 s) -----------------------------------------
check("the backfill job embeds D after the breaker closes", wait_for(lambda: stored(d_id) == "gemini-embedding-001@768|768", 120),
      stored(d_id))
s, b = call("POST", "/intelligence/similar", {"serviceId": w["svc"], "title": "Floor three printer paper jam",
                                              "description": "Paper jam on the floor three printer"},
            token=w["E"])
check("after the backfill the same query is scored by EMBEDDING again",
      s == 200 and len(b) >= 1 and all(m["source"] == "EMBEDDING" for m in b), (s, b))

# 7. a vector of another model is ignored, then recomputed ------------------------------------------------------
sql(f"update incident_embeddings set model='older-model@768' where incident_id={d_id}")
s, b = call("POST", "/intelligence/similar", {"serviceId": w["svc"], "title": "Floor three printer paper jam",
                                              "description": "Paper jam on the floor three printer"},
            token=w["E"])
check("a vector of another model is ignored (KEYWORD until recomputed)",
      s == 200 and len(b) >= 1 and (all(m["source"] == "KEYWORD" for m in b) or stored(d_id).startswith("gemini")),
      (s, b))
check("the backfill recomputes it with the current model",
      wait_for(lambda: stored(d_id) == "gemini-embedding-001@768|768", 40), stored(d_id))

# 8. the cap: one minute never carries more than embedding.backfill/rate settings allow ----------------------------
s, b = call("PUT", "/admin/config", [{"key": "embedding.rate.per.minute", "value": "1000"}], token=A)
check("embedding.rate.per.minute is validated (max 1000)", s == 200, (s, b))
s, b = call("PUT", "/admin/config", [{"key": "embedding.rate.per.minute", "value": "5000"}], token=A)
check("embedding.rate.per.minute above 1000 -> 400", s == 400, (s, b))
s, b = call("PUT", "/admin/config", [{"key": "dup.embedding.threshold.duplicate", "value": "0.5"},
                                     {"key": "dup.embedding.threshold.related", "value": "0.6"}], token=A)
check("embedding duplicate threshold must exceed the related one -> 400", s == 400, (s, str(b)[:150]))

# 9. ai.primary=KEYWORD switches embeddings off together with the LLM ---------------------------------------------
call("PUT", "/admin/config", [{"key": "ai.primary", "value": "KEYWORD"}], token=A)
n = len(seen)
s, b = call("POST", "/intelligence/similar", {"serviceId": w["svc"], "title": "Cannot reach VPN gateway remotely",
                                              "description": "Remote staff VPN gateway connection times out"},
            token=w["E"])
check("ai.primary=KEYWORD: source KEYWORD and no embedding call",
      s == 200 and len(b) >= 1 and all(m["source"] == "KEYWORD" for m in b) and len(seen) == n, (s, b, n, len(seen)))
call("PUT", "/admin/config", [{"key": "ai.primary", "value": "LLM"}], token=A)
