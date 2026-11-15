"""Smoke test of M12 core, intelligence (local dev server, throwaway data, local DB only).

Run against a backend started with LLM_PROVIDER=fake (the scripted client, never the real API):
    SMOKE_PORT=8083 SMOKE_DB=iitsm_m12 [M12_LOG=path-to-backend-log] python m12_smoke.py
Run against a backend with NO key and the real provider to prove the no-key path:
    SMOKE_PORT=8083 SMOKE_DB=iitsm_m12 M12_MODE=nokey python m12_smoke.py
"""
import atexit
import os
import time

from m12_common import PORT, RUN, call, login, mail, make_admin, report, setup_world, sql

MODE = os.environ.get("M12_MODE", "fake")
STATE = os.environ.get("M12_STATE", "m12_state.txt")
LOG = os.environ.get("M12_LOG")
results = []


@atexit.register
def report_results():
    for status, name, detail in results:
        print(f"{status}  {name}" + (f"   -> {detail}" if status == "FAIL" else ""))
    print(f"\n{sum(r[0] == 'PASS' for r in results)}/{len(results)} passed")


def check(name, ok, detail=""):
    results.append(("PASS" if ok else "FAIL", name, detail))


def cfg(token, **changes):
    items = [{"key": k.replace("__", "."), "value": str(v)} for k, v in changes.items()]
    return call("PUT", "/admin/config", items, token=token)


if MODE == "scan":
    # phase 2, after a restart of the backend (sla.risk.scan.interval.seconds = 5 is stored in app_config):
    # the scheduled scan must flag the hot incident of phase 1 exactly once, however many scans run
    code = open(STATE).read().strip()
    A = make_admin()
    sql(f"update incidents set resolution_due = now() + interval '5 minutes' where code='{code}'")
    cfg(A, sla__risk__threshold=0.30)
    time.sleep(14)
    cfg(A, sla__risk__threshold=0.70, sla__risk__scan__interval__seconds=300)
    text = open(LOG, encoding="utf-8", errors="replace").read() if LOG and os.path.exists(LOG) else ""
    check("scheduled scan flagged the at-risk incident exactly once (logged once, idempotent)",
          text.count(f"SLA at risk: {code}") == 1, text.count(f"SLA at risk: {code}"))
    raise SystemExit

# earlier runs left categories and incidents in this shared dev database: retire the categories and age the
# incidents out of every window, so this run's category choices and TF-IDF weights depend on its own data only
_admin = make_admin()
for _c in call("GET", "/admin/categories", token=_admin)[1]:
    call("DELETE", f"/admin/categories/{_c['id']}", token=_admin)
sql("update incidents set created_at = created_at - interval '400 days'")
w = setup_world(category_names=("Network", "Authentication", "Email", "Printer"), admin=_admin)
A, E, O, T, L = w["A"], w["E"], w["O"], w["T"], w["L"]
# the dev database is shared by repeated runs: make this run independent of earlier settings
cfg(A, ai__ratelimit__per__minute=1000, ai__cache__ttl__seconds=0, ai__breaker__failures=3,
    ai__breaker__cooloff__seconds=60, autocat__min__confidence=0.60, sla__risk__threshold=0.70,
    sla__risk__scan__interval__seconds=5)
net, auth, mailc, prn = (w["cats"][n] for n in ("Network", "Authentication", "Email", "Printer"))
tech2_id = call("POST", "/admin/users", {"name": "Tech Two", "email": mail("tech2"), "password": "Smoke" + RUN + "99",
                                         "roles": ["EMPLOYEE", "TECHNICIAN"],
                                         "technician": {"experienceLevel": 3, "escalationLevel": 0, "maxLoad": 50,
                                                        "availability": "AVAILABLE",
                                                        "skills": [{"skillId": w["skill"], "proficiency": 5}]}},
                token=A)[1]["id"]
T2 = login(mail("tech2"), "Smoke" + RUN + "99")


def suggest(title, description, token=E):
    return call("POST", "/intelligence/suggest-category", {"title": title, "description": description}, token=token)


def intake(description, token=E):
    return call("POST", "/intelligence/suggest-intake", {"description": description}, token=token)


# ---------------------------------------------------------------- no key: keyword path still works
if MODE == "nokey":
    s, b = suggest("VPN disconnects", "The VPN connection drops every few minutes ")
    check("no key: suggest-category answers from the keyword engine", s == 200 and b["source"] == "KEYWORD"
          and b["categoryId"] == net, (s, b))
    s, b = intake("Everyone in the company cannot send email, urgent ")
    check("no key: suggest-intake answers (KEYWORD, impact 5, urgency 5, Email)",
          s == 200 and b["source"] == "KEYWORD" and b["impact"] == 5 and b["urgency"] == 5
          and b["categoryId"] == mailc, (s, b))
    s, b = call("POST", "/intelligence/similar", {"title": "x" * 6, "description": "y" * 6, "serviceId": w["svc"]},
                token=E)
    check("no key: similar answers", s == 200 and isinstance(b, list), (s, b))
    raise SystemExit

# ---------------------------------------------------------------- keyword path (ai.primary = KEYWORD)
cfg(A, ai__primary="KEYWORD")
s, b = suggest("VPN disconnects every few minutes", "The VPN connection drops every few minutes ")
check("keyword: VPN text -> Network category, source KEYWORD, confidence >= 0.60",
      s == 200 and b["categoryId"] == net and b["source"] == "KEYWORD" and b["confidence"] >= 0.60 and b["reason"], (s, b))
s, b = suggest("Cannot send email from Outlook", "Outlook shows an error when I send email ")
check("keyword: Outlook text -> Email category", s == 200 and b["categoryId"] == mailc, (s, b))
s, b = suggest("Printer shows paper jam", "The printer on floor 3 reports a paper jam ")
check("keyword: printer text -> Printer category", s == 200 and b["categoryId"] == prn, (s, b))
s, b = suggest("Forgot something", "I need help with my password ")
check("threshold: one weak clue (0.50) is below 0.60 -> null category and empty reason, confidence kept",
      s == 200 and b["categoryId"] is None and b["categoryName"] is None and b["reason"] == ""
      and 0 < b["confidence"] < 0.60, (s, b))
cfg(A, autocat__min__confidence=0.40)
s, b = suggest("Forgot something", "I need help with my password ")
check("threshold is live: at autocat.min.confidence 0.40 the same text now suggests Authentication",
      s == 200 and b["categoryId"] == auth, (s, b))
cfg(A, autocat__min__confidence=0.60)
s, b = suggest("Weekend plans", "What time is the office party ")
check("no clue at all -> null category, confidence 0", s == 200 and b["categoryId"] is None and b["confidence"] == 0, (s, b))

s, b = intake("Everyone in the company cannot send email, urgent ")
check("intake: 'everyone' + 'urgent' -> impact 5, urgency 5, Email category, KEYWORD",
      s == 200 and (b["impact"], b["urgency"]) == (5, 5) and b["categoryId"] == mailc and b["source"] == "KEYWORD"
      and "impact 5" in b["reason"], (s, b))
s, b = intake("The printer toner is low, not urgent, only me ")
check("intake: 'not urgent' (longest phrase wins) and 'only me' -> urgency 2, impact 2",
      s == 200 and (b["impact"], b["urgency"]) == (2, 2), (s, b))
s, b = intake("About 150 users cannot reach the VPN ")
check("intake: 150 users named -> impact 5", s == 200 and b["impact"] == 5, (s, b))
s, b = intake("hello there ")
check("intake: no clue -> neutral 3/3, no category", s == 200 and (b["impact"], b["urgency"]) == (3, 3)
      and b["categoryId"] is None, (s, b))

# validation and auth
s, b = call("POST", "/intelligence/suggest-category", {"title": "", "description": ""}, token=E)
check("blank input -> 400 VALIDATION_FAILED", s == 400 and b["code"] == "VALIDATION_FAILED", (s, b))
s, b = call("POST", "/intelligence/suggest-category", {"title": "a", "description": "b"})
check("no token -> 401", s == 401, (s, b))
s, b = call("POST", "/intelligence/suggest-category", {"title": "a", "description": "b", "serviceId": 99999999}, token=E)
check("unknown serviceId -> 404 SERVICE_NOT_FOUND", s == 404 and b["code"] == "SERVICE_NOT_FOUND", (s, b))

# ---------------------------------------------------------------- similarity (TF-IDF, open incidents of the same service)
svc2 = call("POST", "/admin/services", {"name": f"M12 Service B {RUN}", "criticality": 2, "alwaysP1": False}, token=A)[1]["id"]
for prio in ("P1", "P2", "P3", "P4"):
    call("POST", "/admin/sla-policies", {"serviceId": svc2, "priority": prio, "responseMinutes": 60,
                                         "resolutionMinutes": 240}, token=A)
pairs = {
    "printer": ("Printer on floor 3 jammed",
                "The floor 3 printer reports a paper jam and nothing prints for anyone on the floor."),
    "outlook": ("Outlook cannot send emails",
                "Outlook shows error 0x800CCC0E when sending email and the messages stay in the outbox."),
    "toner": ("Excel crashes on large files", "Excel closes unexpectedly when I open spreadsheets above 50 MB."),
}
ids = {}
for key, (t, d) in pairs.items():
    s, b = report(w, t, d + " " + RUN, token=O)
    ids[key] = b["id"]
# same text on another service must not show up for service A
s, other_service = report(w, pairs["printer"][0], pairs["printer"][1] + " " + RUN, svc=svc2, token=O)

s, b = call("POST", "/intelligence/similar", {"title": "Floor 3 printer paper jam",
                                              "description": "Printer on the third floor says paper jam and no documents print.",
                                              "serviceId": w["svc"]}, token=E)
top = b[0] if s == 200 and b else {}
check("staged duplicate: printer paper jam -> the existing incident, similarity >= 0.55, match DUPLICATE",
      s == 200 and top.get("incidentId") == ids["printer"] and top["similarity"] >= 0.55
      and top["match"] == "DUPLICATE" and top["status"] and top["code"], (s, b))
check("similar: only open incidents of the same service (the copy on service B is absent)",
      other_service["id"] not in [m["incidentId"] for m in b], b)
s, b = call("POST", "/intelligence/similar", {"title": "Unable to send mail from Outlook",
                                              "description": "Sending email from Outlook fails with error 0x800CCC0E and the messages stay in the outbox.",
                                              "serviceId": w["svc"]}, token=E)
check("staged duplicate: Outlook send failure -> the existing incident as DUPLICATE",
      s == 200 and b and b[0]["incidentId"] == ids["outlook"] and b[0]["match"] == "DUPLICATE", (s, b))
s, b = call("POST", "/intelligence/similar", {"title": "Floor 3 printer prints blank pages",
                                              "description": "The printer on floor 3 prints blank pages for everyone on the floor.",
                                              "serviceId": w["svc"]}, token=E)
check("related pair: blank pages on the same printer -> the printer incident as RELATED (0.35 to 0.55)",
      s == 200 and b and b[0]["incidentId"] == ids["printer"] and b[0]["match"] == "RELATED", (s, b))
s, b = call("POST", "/intelligence/similar", {"title": "Office party planning",
                                              "description": "Who is organising the office party this Friday afternoon.",
                                              "serviceId": w["svc"]}, token=E)
check("unrelated text -> empty list", s == 200 and b == [], (s, b))
s, b = call("POST", "/intelligence/similar", {"title": "x", "description": "y"}, token=E)
check("similar without serviceId -> 400", s == 400, (s, b))
cfg(A, dup__tfidf__threshold__duplicate=0.95)
s, b = call("POST", "/intelligence/similar", {"title": "Floor 3 printer paper jam",
                                              "description": "Printer on the third floor says paper jam and no documents print.",
                                              "serviceId": w["svc"]}, token=E)
check("thresholds are live: duplicate threshold 0.95 turns the same pair into RELATED",
      s == 200 and b and b[0]["match"] == "RELATED", (s, b))
cfg(A, dup__tfidf__threshold__duplicate=0.55)
s, b = call("PUT", "/admin/config", [{"key": "dup.tfidf.threshold.duplicate", "value": "0.30"}], token=A)
check("threshold rule: duplicate must stay above related -> 400 keyed by config key",
      s == 400 and any(f["field"] == "dup.tfidf.threshold.duplicate" for f in b.get("fieldErrors", [])), (s, b))

s, b = call("GET", f"/incidents/{ids['printer']}/similar", token=O)
check("GET /incidents/{id}/similar for the reporter -> 200 list", s == 200 and isinstance(b, list), (s, b))
s, copy = report(w, "Printer on floor 3 is jammed again", "Paper jam on the floor 3 printer, no documents print. " + RUN, token=E)
s, b = call("GET", f"/incidents/{copy['id']}/similar", token=E)
check("GET /incidents/{id}/similar finds the earlier incident and excludes itself",
      s == 200 and ids["printer"] in [m["incidentId"] for m in b] and copy["id"] not in [m["incidentId"] for m in b], (s, b))
s, b = call("GET", f"/incidents/{ids['printer']}/similar", token=E)
check("a viewer who may not see the incident -> 404 INCIDENT_NOT_FOUND (not 403)",
      s == 404 and b["code"] == "INCIDENT_NOT_FOUND", (s, b))
s, b = call("GET", "/incidents/99999999/similar", token=E)
check("unknown incident -> 404", s == 404, (s, b))

# ---------------------------------------------------------------- LLM path with the scripted client
cfg(A, ai__primary="LLM", ai__breaker__failures=100)
s, b = suggest("VPN disconnects", "The network VPN drops all the time ")
check("LLM path (scripted client): source LLM, category from the active list",
      s == 200 and b["source"] == "LLM" and b["categoryId"] == net and b["confidence"] >= 0.60, (s, b))
secret = "contact john.doe@corp.example from 10.20.30.40 token=abc123SECRETvalue9 network down"
s, b = suggest("Network outage ", secret)
sent = b.get("reason", "")
check("redaction: the model saw [email], [ip] and [redacted], never the raw values",
      s == 200 and b["source"] == "LLM" and "[email]" in sent and "[ip]" in sent and "[redacted]" in sent
      and "john.doe" not in sent and "10.20.30.40" not in sent and "SECRETvalue" not in sent, (s, b))
check("redaction: the text around the secrets is kept", "network down" in sent, sent)
s, b = suggest("Network problem", "[[LLM_FAIL]] network down ")
check("forced LLM failure -> 200 with source KEYWORD (automatic fallback)", s == 200 and b["source"] == "KEYWORD", (s, b))
s, b = suggest("Network problem", "[[LLM_BAD_JSON]] network and vpn ")
check("malformed (non-JSON) answer -> fallback, source KEYWORD", s == 200 and b["source"] == "KEYWORD", (s, b))
s, b = suggest("Network problem", "[[LLM_BAD_CATEGORY]] network and vpn ")
check("category id not in the active list -> rejected, fallback, source KEYWORD",
      s == 200 and b["source"] == "KEYWORD" and b["categoryId"] in (net, None), (s, b))
s, b = intake("Everyone cannot send email, urgent [[LLM_FAIL]] ")
check("intake falls back too (KEYWORD)", s == 200 and b["source"] == "KEYWORD", (s, b))
s, b = intake("Network is down for everyone ")
check("intake via LLM: source LLM, impact/urgency 1-5", s == 200 and b["source"] == "LLM"
      and 1 <= b["impact"] <= 5 and 1 <= b["urgency"] <= 5, (s, b))
cfg(A, autocat__min__confidence=0.99)
s, b = suggest("VPN disconnects", "The network VPN drops all the time again ")
check("confidence threshold applies to the LLM too (0.90 < 0.99 -> null category)",
      s == 200 and b["categoryId"] is None and b["reason"] == "", (s, b))
cfg(A, autocat__min__confidence=0.60)

# ---------------------------------------------------------------- circuit breaker
suggest("Network reset", "The network VPN drops all the time, reset the failure count")
cfg(A, ai__breaker__failures=2, ai__breaker__cooloff__seconds=4)
for i in range(2):
    suggest("Network failure", f"[[LLM_FAIL]] network {i}")
s, b = suggest("Network healthy", "The network VPN drops all the time, probe one ")
check("breaker open: a healthy request is answered by KEYWORD without calling the LLM",
      s == 200 and b["source"] == "KEYWORD", (s, b))
time.sleep(4.5)
s, b = suggest("Network healthy", "The network VPN drops all the time, probe two ")
check("after the cool-off the trial request goes to the LLM and closes the breaker (source LLM)",
      s == 200 and b["source"] == "LLM", (s, b))
s, b = suggest("Network healthy", "The network VPN drops all the time, probe three ")
check("breaker closed again: next request also LLM", s == 200 and b["source"] == "LLM", (s, b))
cfg(A, ai__breaker__failures=3, ai__breaker__cooloff__seconds=60)

# ---------------------------------------------------------------- rate limit
rl_pw = "Smoke" + RUN + "77"
call("POST", "/admin/users", {"name": "Rate Limited", "email": mail("rl"), "password": rl_pw, "roles": ["EMPLOYEE"]}, token=A)
RL = login(mail("rl"), rl_pw)
cfg(A, ai__ratelimit__per__minute=3)
codes = [suggest("Network", f"network vpn {i}", token=RL)[0] for i in range(4)]
s, b = suggest("Network", f"network vpn again", token=RL)
check("rate limit: 3 requests pass, the 4th gets 429 RATE_LIMITED", codes == [200, 200, 200, 429] and s == 429
      and b["code"] == "RATE_LIMITED", (codes, s, b))
call("POST", "/admin/users", {"name": "Rate Free", "email": mail("rl2"), "password": rl_pw, "roles": ["EMPLOYEE"]}, token=A)
s, b = suggest("Network", "network vpn other user", token=login(mail("rl2"), rl_pw))
check("rate limit is per user: another user is unaffected", s == 200, (s, b))
cfg(A, ai__ratelimit__per__minute=1000)

# ---------------------------------------------------------------- per-incident endpoints
s, inc = report(w, "VPN drops for the whole team", "VPN tunnel drops every few minutes for the whole team " + RUN,
                cat=net, token=E)
iid = inc["id"]
tok = {w["tech_id"]: T, w["lead_id"]: L, tech2_id: T2}
assignee_token = tok[call("GET", f"/incidents/{iid}", token=A)[1]["assignee"]["id"]]
s, b = call("GET", f"/incidents/{iid}/sla-risk", token=assignee_token)
names = [f["name"] for f in b.get("factors", [])] if s == 200 else []
check("sla-risk for the assignee: score 0..1, level, four factors that add up to the score",
      s == 200 and 0 <= b["score"] <= 1 and b["level"] in ("LOW", "MEDIUM", "HIGH")
      and names == ["elapsedTime", "technicianLoad", "priority", "similarHistory"]
      and abs(sum(f["contribution"] for f in b["factors"]) - b["score"]) < 0.01, (s, b))
check("fresh incident: elapsed contribution is small and the incident is not at risk", s == 200
      and b["factors"][0]["contribution"] < 0.05 and not b["atRisk"], b)
s, b2 = call("GET", f"/incidents/{iid}/sla-risk", token=A)
check("sla-risk for an admin -> 200", s == 200, (s, b2))
s, b2 = call("GET", f"/incidents/{iid}/sla-risk", token=E)
check("sla-risk for the reporter -> 403 UNAUTHORIZED_OPERATION", s == 403 and b2["code"] == "UNAUTHORIZED_OPERATION", (s, b2))
stranger = next(t for tid, t in tok.items() if tid not in (call("GET", f"/incidents/{iid}", token=A)[1]["assignee"]["id"],
                                                          w["lead_id"]))
s, b2 = call("GET", f"/incidents/{iid}/sla-risk", token=stranger)
check("sla-risk for a technician who may not see the incident -> 404 INCIDENT_NOT_FOUND",
      s == 404 and b2["code"] == "INCIDENT_NOT_FOUND", (s, b2))

# push the deadline close: elapsed share ~ 98% of the 4 h resolution time
sql(f"update incidents set resolution_due = now() + interval '5 minutes' where id={iid}")
s, hot = call("GET", f"/incidents/{iid}/sla-risk", token=assignee_token)
check("deadline in 5 minutes: elapsed factor dominates (>= 0.45 of 0.50) and the explanation says so",
      s == 200 and hot["factors"][0]["contribution"] >= 0.45 and "elapsed" in hot["factors"][0]["detail"], (s, hot))
cfg(A, sla__risk__threshold=0.30)
s, hot = call("GET", f"/incidents/{iid}/sla-risk", token=assignee_token)
check("threshold is live: at 0.30 the same incident is flagged at risk (level HIGH)",
      s == 200 and hot["atRisk"] and hot["level"] == "HIGH", (s, hot))
# B1: the scan's flag makes slaState AT_RISK, in the detail, the list and the slaState filter (scan every 5 s)
def at_risk_ids():
    s_, page = call("GET", "/incidents?slaState=AT_RISK&size=100", token=A)
    return s_, [i["id"] for i in page["items"]] if s_ == 200 else page


deadline = time.time() + 20
while time.time() < deadline and iid not in at_risk_ids()[1]:
    time.sleep(1)
s, d = call("GET", f"/incidents/{iid}", token=A)
check("B1: flagged open incident, deadline not passed -> detail slaState AT_RISK", s == 200 and d["slaState"] == "AT_RISK", (s, d.get("slaState")))
s, ids = at_risk_ids()
check("B1: GET /incidents?slaState=AT_RISK returns the flagged incident", s == 200 and iid in ids, (s, ids))
s, row = call("GET", f"/incidents?q={inc['code']}", token=A)
check("B1: the list row of the same incident shows AT_RISK too (list and search agree)",
      s == 200 and [i["slaState"] for i in row["items"] if i["id"] == iid] == ["AT_RISK"], (s, row))
s, others = call("GET", "/incidents?slaState=WARNING&size=100", token=A)
s2, others2 = call("GET", "/incidents?slaState=OK&size=100", token=A)
check("B1: a flagged incident is not also listed under WARNING or OK",
      s == 200 and s2 == 200 and all(i["id"] != iid for i in others["items"] + others2["items"]), (s, s2))
s, resolved = call("GET", f"/incidents?slaState=AT_RISK&status=RESOLVED&status=VERIFIED&status=CLOSED", token=A)
check("B1: resolved or closed incidents never match AT_RISK", s == 200 and resolved["items"] == [], (s, resolved))
cfg(A, sla__risk__threshold=0.70)
deadline = time.time() + 20
while time.time() < deadline and iid in at_risk_ids()[1]:
    time.sleep(1)
s, d = call("GET", f"/incidents/{iid}", token=A)
check("B1: threshold raised again -> the flag clears and slaState leaves AT_RISK",
      s == 200 and d["slaState"] != "AT_RISK" and iid not in at_risk_ids()[1], (s, d.get("slaState")))
s, cfgs = call("PUT", "/admin/config", [{"key": "sla.risk.weight.elapsed", "value": "0.9"}], token=A)
check("risk weights must add up to 1.0 -> 400 keyed by config key", s == 400
      and any(f["field"] == "sla.risk.weight.elapsed" for f in cfgs.get("fieldErrors", [])), (s, cfgs))
# the scan runs on its own schedule: remember the hot incident for the second phase (M12_MODE=scan, after a restart)
open(STATE, "w").write(inc["code"])

# suggested resolutions: resolve one incident with a reusable fix, then ask from a similar new one
s, done = report(w, "Printer on floor 2 shows paper jam", "Paper jam message on the floor 2 printer. " + RUN,
                 cat=prn, token=E)
did = done["id"]
d_assignee = call("GET", f"/incidents/{did}", token=A)[1]["assignee"]["id"]
d_token = tok[d_assignee]
call("POST", f"/incidents/{did}/acknowledge", token=d_token)
call("POST", f"/incidents/{did}/start", token=d_token)
s, b = call("POST", f"/incidents/{did}/resolve", {"rootCause": "Crumpled paper stuck behind rear roller",
                                                    "notes": "Opened the rear cover and removed the crumpled sheet.",
                                                    "steps": "1. Power off. 2. Open rear cover. 3. Remove paper.",
                                                    "timeSpentMinutes": 15, "reusableSolution": True}, token=d_token)
check("setup: incident resolved with a reusable fix", s == 200, (s, b))
s, fresh = report(w, "Printer on floor 2 jammed again", "The floor 2 printer shows a paper jam message. " + RUN + "n",
                  cat=prn, token=E)
f_assignee = call("GET", f"/incidents/{fresh['id']}", token=A)[1]["assignee"]["id"]
s, b = call("GET", f"/incidents/{fresh['id']}/suggested-resolutions", token=tok[f_assignee])
hit = next((r for r in b if r["fromIncidentId"] == did), None) if s == 200 else None
check("suggested resolutions: the resolved similar incident with notes, steps and reusable=true",
      hit is not None and hit["reusable"] and "rear cover" in hit["notes"] and "Power off" in hit["steps"]
      and hit["rootCause"] and hit["similarity"] >= 0.30 and hit["code"], (s, b))
s, b = call("GET", f"/incidents/{fresh['id']}/suggested-resolutions", token=E)
check("suggested resolutions for the reporter -> 403", s == 403, (s, b))
s, b = call("GET", f"/incidents/{fresh['id']}/suggested-resolutions", token=A)
check("suggested resolutions for an admin -> 200", s == 200 and isinstance(b, list), (s, b))

# summary
call("POST", f"/incidents/{fresh['id']}/comments", {"body": "Checked the rear tray, will visit floor 2 now.",
                                                      "visibility": "INTERNAL"}, token=tok[f_assignee])
s, b = call("POST", f"/incidents/{fresh['id']}/summary", token=tok[f_assignee])
check("summary: text, handover notes list, source", s == 200 and b["summary"] and isinstance(b["handoverNotes"], list)
      and b["handoverNotes"] and b["source"] in ("LLM", "KEYWORD"), (s, b))
cfg(A, ai__primary="KEYWORD")
s, b = call("POST", f"/incidents/{fresh['id']}/summary", token=A)
check("keyword summary names the code, status and the latest note",
      s == 200 and b["source"] == "KEYWORD" and fresh["code"] in b["summary"] and "visit floor 2" in b["summary"]
      and any("Status" in n for n in b["handoverNotes"]), (s, b))
s, b = call("POST", f"/incidents/{fresh['id']}/summary", token=E)
check("summary for the reporter -> 403", s == 403, (s, b))
outsider = next(t for tid, t in tok.items() if tid not in (f_assignee, w["lead_id"]))
s, b = call("POST", f"/incidents/{fresh['id']}/summary", token=outsider)
check("summary for a technician who may not see the incident -> 404 INCIDENT_NOT_FOUND",
      s == 404 and b["code"] == "INCIDENT_NOT_FOUND", (s, b))

# keep the shared dev database tidy for the next run (the scan interval stays 5 s for phase 2: M12_MODE=scan)
cfg(A, ai__primary="LLM", ai__cache__ttl__seconds=60, ai__ratelimit__per__minute=20)
