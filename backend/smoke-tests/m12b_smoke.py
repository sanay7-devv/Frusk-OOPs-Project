"""Smoke test of the rest of M12 (session A): withdraw (G3), mark-duplicate, reporter edit lock (G4), security
category setting and internal audit entries (C3), duplicate check on create, problem records and correlation,
Major Incident Mode (S2), recurring-problem detector (E2), chatbot intake (A1) and the outage drill (D2).

Local dev server, throwaway data, local DB only:
    SMOKE_PORT=8082 SMOKE_DB=iitsm_m12b python -I -X utf8 m12b_smoke.py
"""
import atexit
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from m12_common import RUN, call, login, mail, make_admin, report, setup_world, sql  # noqa: E402

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


def history(inc_id, token):
    return call("GET", f"/incidents/{inc_id}/history", token=token)[1]


def file(w, title, description, **kw):
    """Creates an incident and confirms past any duplicate warning (used where the check is not under test)."""
    s, b = report(w, title, description + " " + RUN, **kw)
    if s == 409 and b.get("code") == "DUPLICATE_INCIDENT":
        body = {"title": title, "description": description + " " + RUN, "serviceId": kw.get("svc") or w["svc"],
                "impact": kw.get("impact", 2), "urgency": kw.get("urgency", 2), "affectedUsers": kw.get("users", 3),
                "confirmNotDuplicate": True}
        if kw.get("cat"):
            body["categoryId"] = kw["cat"]
        s, b = call("POST", "/incidents", body, token=kw.get("token") or w["E"])
    return s, b


# earlier runs left open incidents in this database: age them out of every window so this run only sees its own
sql("update incidents set created_at = created_at - interval '400 days' where created_at > now() - interval '400 days'")

w = setup_world(service_names=("M12B Main", "M12B Second"))
A, T, L, E, O = w["A"], w["T"], w["L"], w["E"], w["O"]
# The scripted LLM (LLM_PROVIDER=fake) picks the first category whose name shares a 4+ letter word with the text; every
# category name and every text here carries the run tag, so it would match always. This suite tests the keyword path.
cfg(A, ai__primary="KEYWORD")
svc, svc2 = w["services"]
cats = w["cats"]

# ================================================================ G3 withdraw
s, triage = file(w, "Monitor flickers on and off", "My monitor flickers on and off when I move the cable.")
check("setup: an incident without category waits in triage (CLASSIFIED)", s == 201 and triage["status"] == "CLASSIFIED",
      (s, triage))
check("G3: reporter sees WITHDRAW in allowedActions while CLASSIFIED", "WITHDRAW" in triage["allowedActions"],
      triage.get("allowedActions"))
s, b = call("POST", f"/incidents/{triage['id']}/withdraw", {"reason": "short"}, token=E)
check("G3: reason under 10 characters -> 400", s == 400 and b["code"] == "VALIDATION_FAILED", (s, b))
s, b = call("POST", f"/incidents/{triage['id']}/withdraw", {"reason": "It fixed itself after a restart."}, token=O)
check("G3: another employee -> 404 or 403 (not the reporter)", s in (403, 404), (s, b))
s, b = call("POST", f"/incidents/{triage['id']}/withdraw", {"reason": "It fixed itself after a restart."}, token=A)
check("G3: an admin cannot withdraw for the reporter -> 403", s == 403 and b["code"] == "UNAUTHORIZED_OPERATION", (s, b))
s, b = call("POST", f"/incidents/{triage['id']}/withdraw", {"reason": "It fixed itself after a restart."}, token=E)
check("G3: reporter withdraws -> CLOSED, closureReason WITHDRAWN", s == 200 and b["status"] == "CLOSED"
      and b["closureReason"] == "WITHDRAWN", (s, b))
check("G3: a withdrawn incident offers no REOPEN", "REOPEN" not in b.get("allowedActions", []), b.get("allowedActions"))
s, b = call("POST", f"/incidents/{triage['id']}/reopen", {"reason": "Actually it is back again."}, token=E)
check("G3: reopen of a withdrawn incident -> 409", s == 409 and b["code"] == "INVALID_STATE_TRANSITION", (s, b))
h = history(triage["id"], E)
check("G3: audit CLOSED 'Withdrawn by ...' and public note with the reason",
      any(e["action"] == "CLOSED" and e["description"].startswith("Withdrawn by") for e in h)
      and any(c["body"].startswith("Withdrawn: It fixed itself")
              for c in call("GET", f"/incidents/{triage['id']}/comments", token=E)[1]), h[-1:])

# assigned incident: withdraw frees the technician's load
s, assigned = file(w, "Shared drive is read only", "The shared drive became read only for me this morning.",
                   cat=cats["Network"])
check("setup: an incident with a category is assigned on creation", s == 201 and assigned["status"] == "ASSIGNED",
      (s, assigned.get("status")))
tech_id = assigned["assignee"]["id"] if assigned.get("assignee") else None
tech_tok = T if tech_id == w["tech_id"] else L


def load_of(tok):
    return call("GET", "/technicians/me/workload", token=tok)[1]


before = load_of(tech_tok)
s, b = call("POST", f"/incidents/{assigned['id']}/withdraw", {"reason": "Permissions were restored by my lead."},
            token=E)
after = load_of(tech_tok)
check("G3: withdraw from ASSIGNED -> CLOSED WITHDRAWN", s == 200 and b["closureReason"] == "WITHDRAWN", (s, b))
check("G3: the technician's load drops after the withdraw", str(before) != str(after), (before, after))

# in progress: too late to withdraw (409, the reporter is the right person)
s, inprog = file(w, "Laptop fan is very loud", "The laptop fan is very loud and the laptop gets hot.",
                 cat=cats["Printer"])
assignee = inprog["assignee"]["id"]
atok = T if assignee == w["tech_id"] else L
call("POST", f"/incidents/{inprog['id']}/acknowledge", token=atok)
s, b = call("POST", f"/incidents/{inprog['id']}/withdraw", {"reason": "I will live with the noise for now."}, token=E)
check("G3: withdraw from ACKNOWLEDGED works too", s == 200 and b["closureReason"] == "WITHDRAWN", (s, b))
s, inprog = file(w, "Keyboard keys stick", "Several keyboard keys stick and repeat letters.", cat=cats["Printer"])
atok = T if inprog["assignee"]["id"] == w["tech_id"] else L
call("POST", f"/incidents/{inprog['id']}/acknowledge", token=atok)
call("POST", f"/incidents/{inprog['id']}/start", token=atok)
s, b = call("POST", f"/incidents/{inprog['id']}/withdraw", {"reason": "Bought my own keyboard instead."}, token=E)
check("G3: withdraw once IN_PROGRESS -> 409 INVALID_STATE_TRANSITION", s == 409
      and b["code"] == "INVALID_STATE_TRANSITION", (s, b))

# ================================================================ mark-duplicate
s, orig = file(w, "Projector in room 4 shows no signal", "The projector in room 4 shows no signal from any laptop.")
s, dup = file(w, "Room 4 beamer: no input", "Beamer in meeting room four says no input.", token=O)
s, b = call("POST", f"/incidents/{dup['id']}/mark-duplicate", {"duplicateOfId": orig["id"]}, token=E)
check("mark-duplicate by an employee -> 403 or 404", s in (403, 404), (s, b))
s, b = call("POST", f"/incidents/{dup['id']}/mark-duplicate", {"duplicateOfId": dup["id"]}, token=L)
check("mark-duplicate onto itself -> 400", s == 400 and b["code"] == "VALIDATION_FAILED", (s, b))
s, b = call("POST", f"/incidents/{dup['id']}/mark-duplicate", {"duplicateOfId": 99999999}, token=L)
check("mark-duplicate onto an unknown incident -> 400", s == 400, (s, b))
s, b = call("POST", f"/incidents/{dup['id']}/mark-duplicate", {}, token=L)
check("mark-duplicate without duplicateOfId -> 400", s == 400, (s, b))
s, b = call("POST", f"/incidents/{dup['id']}/mark-duplicate", {"duplicateOfId": orig["id"]}, token=L)
check("team lead marks duplicate -> CLOSED, closureReason DUPLICATE, duplicateOfId set", s == 200
      and b["status"] == "CLOSED" and b["closureReason"] == "DUPLICATE"
      and (b.get("duplicateOfId") == orig["id"] or str(orig["id"]) in str(b.get("duplicateOf"))), (s, b))
h = history(dup["id"], A)
check("mark-duplicate audited as DUPLICATE_LINKED naming the original",
      any(e["action"] == "DUPLICATE_LINKED" and orig["code"] in e["description"] for e in h), h[-1:])
s, b = call("POST", f"/incidents/{dup['id']}/mark-duplicate", {"duplicateOfId": orig["id"]}, token=L)
check("marking a closed incident again -> 409", s == 409 and b["code"] == "INVALID_STATE_TRANSITION", (s, b))
s, b3 = file(w, "Projector room 4 dead", "Projector room 4 dead again for the third time.")
s, b = call("POST", f"/incidents/{b3['id']}/mark-duplicate", {"duplicateOfId": dup["id"]}, token=A)
check("linking to an incident that is itself a duplicate -> 400 naming the original", s == 400
      and orig["code"] in str(b), (s, b))
check("reporter of the duplicate sees a public note naming the original",
      any(orig["code"] in c["body"] for c in call("GET", f"/incidents/{dup['id']}/comments", token=O)[1]))
s, b = call("GET", f"/incidents/{orig['id']}", token=L)
check("MARK_DUPLICATE is in a team lead's allowedActions on an open incident", "MARK_DUPLICATE" in b["allowedActions"],
      b.get("allowedActions"))

# ================================================================ G4 reporter edit lock
s, g4 = file(w, "Wifi slow in library", "Wifi is slow in the library reading room.", cat=cats["Network"])
check("setup: G4 incident assigned", g4["status"] == "ASSIGNED", g4.get("status"))
s, b = call("PUT", f"/incidents/{g4['id']}", {"impact": 5, "urgency": 5}, token=E)
check("G4: reporter raises impact after assignment -> 403", s == 403 and b["code"] == "UNAUTHORIZED_OPERATION", (s, b))
s, b = call("PUT", f"/incidents/{g4['id']}", {"description": "Wifi is slow in the library reading room and lab."},
            token=E)
check("G4: reporter may still edit the description", s == 200, (s, b))
s, b = call("PUT", f"/incidents/{g4['id']}", {"impact": g4["impact"], "description": "Same impact sent back again."},
            token=E)
check("G4: sending the unchanged impact back is not a change -> 200", s == 200, (s, b))
s, b = call("PUT", f"/incidents/{g4['id']}", {"impact": 4}, token=L)
check("G4: a team lead may change impact -> 200, impact 4", s == 200 and b["impact"] == 4, (s, b))
s, b = call("PUT", f"/incidents/{g4['id']}", {"urgency": 4}, token=A)
check("G4: an admin may change urgency -> 200", s == 200 and b["urgency"] == 4, (s, b))
s, g4b = file(w, "Odd thing again", "Something odd keeps happening again and again today.")
check("setup: the vague incident waits in triage (CLASSIFIED)", g4b["status"] == "CLASSIFIED", g4b["status"])
s, b = call("PUT", f"/incidents/{g4b['id']}", {"impact": 3}, token=E)
check("G4: before assignment (CLASSIFIED) the reporter may still correct impact", s == 200 and b["impact"] == 3, (s, b))

# ================================================================ C3 security category setting, internal audit factory
crit = call("POST", "/admin/services", {"name": f"M12B Critical {RUN}", "criticality": 5, "alwaysP1": False},
            token=A)[1]["id"]
for prio in ("P1", "P2", "P3", "P4"):
    call("POST", "/admin/sla-policies", {"serviceId": crit, "priority": prio, "responseMinutes": 60,
                                         "resolutionMinutes": 240}, token=A)
sec = call("POST", "/admin/categories", {"name": f"Infosec {RUN}", "requiredSkillIds": [w["skill"]]}, token=A)[1]["id"]
s, b = file(w, "Suspicious login alert", "I got an alert about a suspicious login on my account.", cat=sec, impact=2,
            urgency=1, svc=crit)
check("C3: before the setting, a category not named Security does not trigger rule 1",
      s == 201 and not (b["priorityBreakdown"].get("overrideRule") or "").lower().startswith("security"), (s, b))
s, _ = cfg(A, priority__security__category=f"Infosec {RUN}")
check("C3: priority.security.category is a live setting", s == 200, s)
s, b = file(w, "Phishing mail with a link", "Phishing mail with a link asking for my password.", cat=sec, impact=2,
            urgency=1, svc=crit)
check("C3: with the setting, the named category triggers override rule 1 (at least P2)",
      s == 201 and b["priority"] in ("P1", "P2") and b["priorityBreakdown"].get("overrideRule"), (s, b))
s, wi = call("POST", "/priority/what-if", {"serviceId": crit, "categoryId": sec, "impact": 2, "urgency": 1,
                                          "affectedUsers": 1}, token=L)
check("C3: priority what-if uses the same setting", s == 200 and wi["whatIf"]["priority"] in ("P1", "P2"), (s, wi))
s, _ = cfg(A, priority__security__category="Security")
s, b = cfg(A, priority__security__category="x" * 101)
check("C3: a value over 100 characters -> 400", s == 400, (s, b))
# internal audit entries only through the factory: an internal note is hidden from the reporter, public is not
s, c = call("POST", f"/incidents/{g4['id']}/comments", {"body": "Checked the access point logs.",
                                                       "visibility": "INTERNAL"}, token=L)
s, c2 = call("POST", f"/incidents/{g4['id']}/comments", {"body": "We are looking at it."}, token=L)
staff = history(g4["id"], L)
mine = history(g4["id"], E)
check("C3: internal note audited as 'Internal note added by ...' and visible to staff",
      any(e["description"].startswith("Internal note added by") for e in staff), staff[-2:])
check("C3: the reporter's history hides the internal entry but shows the public one",
      not any(e["description"].startswith("Internal note") for e in mine)
      and any(e["description"].startswith("Comment added by") for e in mine), mine[-2:])


# ================================================================ helpers for the second half
def mk_service(name, crit=2, deps=()):
    sid = call("POST", "/admin/services", {"name": f"{name} {RUN}", "criticality": crit, "alwaysP1": False},
               token=A)[1]["id"]
    for prio in ("P1", "P2", "P3", "P4"):
        call("POST", "/admin/sla-policies", {"serviceId": sid, "priority": prio, "responseMinutes": 60,
                                             "resolutionMinutes": 240}, token=A)
    if deps:
        call("PUT", f"/admin/services/{sid}/dependencies", {"dependencyIds": list(deps)}, token=A)
    return sid


def inc(sid, title, desc, token=None, **kw):
    s, b = file(w, title, desc, svc=sid, token=token, **kw)
    return b


def get(i, token=L):
    return call("GET", f"/incidents/{i}", token=token)[1]


def action(i, name, token, body=None):
    return call("POST", f"/incidents/{i}/{name}", body, token=token)


def tok_of(detail):
    return T if detail["assignee"]["id"] == w["tech_id"] else L


RESOLVE = {"rootCause": "The upstream database crashed after a bad deploy.", "notes": "Restarted the database and "
           "checked the dependent services.", "steps": "restart", "timeSpentMinutes": 20}

# ================================================================ duplicate check on create (DEC-71)
dupsvc = mk_service("M12B Dup")
first = inc(dupsvc, "VPN tunnel drops every few minutes", "The VPN tunnel drops every few minutes for the whole team.")
body = {"title": "VPN drops every few minutes", "description": "VPN tunnel drops every few minutes for the team " + RUN,
        "serviceId": dupsvc, "impact": 2, "urgency": 2, "affectedUsers": 3}
s, b = call("POST", "/incidents", body, token=O)
check("duplicate: similar open incident on the same service -> 409 DUPLICATE_INCIDENT", s == 409
      and b["code"] == "DUPLICATE_INCIDENT", (s, b))
sim = (b.get("similar") or [{}])[0] if isinstance(b, dict) else {}
check("duplicate: 'similar' lists the existing incident with its similarity (>= 0.55)", sim.get("id") == first["id"]
      and sim.get("similarity", 0) >= 0.55 and sim.get("code") == first["code"] and sim.get("status"), b)
s, dup2 = call("POST", "/incidents", dict(body, confirmNotDuplicate=True), token=O)
check("duplicate: confirmNotDuplicate=true creates it -> 201", s == 201, (s, dup2))
check("duplicate: the confirmed incident is grouped with the similar one under a problem record",
      dup2.get("problemId") is not None and get(first["id"]).get("problemId") == dup2.get("problemId"),
      (dup2.get("problemId"), get(first["id"]).get("problemId")))
h = history(dup2["id"], A)
check("duplicate: grouping audited as DUPLICATE_LINKED naming the record",
      any(e["action"] == "DUPLICATE_LINKED" and "problem record" in e["description"] for e in h), h[-2:])
other_svc = mk_service("M12B Other")
s, b = call("POST", "/incidents", dict(body, serviceId=other_svc), token=O)
check("duplicate: the same text on another service is not a duplicate (same service only)", s == 201, (s, b))
s, b = call("POST", "/incidents", dict(body, title="Cafeteria card reader beeps", description="The card reader in "
            "the cafeteria beeps twice and rejects my card " + RUN), token=O)
check("duplicate: an unrelated text on the same service is created without a problem record",
      s == 201 and b.get("problemId") is None, (s, b))
prob_id = dup2["problemId"]
s, p = call("GET", f"/problems/{prob_id}", token=L)
check("problems: team lead reads the record: 2 incidents, a lead, status OPEN", s == 200 and p["status"] == "OPEN"
      and p["incidentCount"] == 2 and p["lead"]["id"] == first["id"], (s, p))
s, b = call("GET", f"/problems/{prob_id}", token=E)
check("problems: an employee may not read the record -> 403", s == 403, (s, b))
s, lst = call("GET", "/problems?status=OPEN", token=A)
check("problems: list filtered by status contains the record", s == 200 and any(x["id"] == prob_id for x in lst), s)

# ================================================================ auto category (DEC-70)
autosvc = mk_service("M12B Auto")
s, auto = file(w, "VPN drops every few minutes", "The VPN drops every few minutes and I have to reconnect.",
               svc=autosvc)
check("auto category: no category given, a confident suggestion is applied (Network)",
      s == 201 and auto["category"] and auto["category"]["name"].startswith("Network"), (s, auto.get("category")))
h = history(auto["id"], A)
check("auto category: audit says the AI suggestion chose it", any("AI suggestion" in e["description"] for e in h),
      [e["description"] for e in h][:3])
s, vague = file(w, "Something odd happened today", "Something odd happened today and I cannot say what it was.",
                svc=autosvc)
check("auto category: a vague text gets no category and waits in triage", s == 201 and vague["category"] is None
      and vague["status"] == "CLASSIFIED", (s, vague.get("category"), vague.get("status")))

# ================================================================ correlation through the dependency graph (DEC-71)
core = mk_service("M12B Core")
portal = mk_service("M12B Portal", deps=[core])
lonely = mk_service("M12B Lonely")
root_inc = inc(core, "Core platform is down", "The core platform is completely down for everyone right now.",
               cat=cats["Network"], impact=5, urgency=5, users=120)
check("setup: the Core incident is P1", root_inc["priority"] == "P1", root_inc.get("priority"))
dep_inc = inc(portal, "Portal pages fail", "Every page of the portal fails with connection errors since minutes.",
              impact=4, urgency=5, users=15, token=O)
check("correlation: an incident on a dependant service joins the open P1 on the service it depends on",
      dep_inc.get("problemId") is not None and get(root_inc["id"]).get("problemId") == dep_inc["problemId"],
      (dep_inc.get("problemId"), get(root_inc["id"]).get("problemId")))
lone_inc = inc(lonely, "Lonely service broken", "The lonely service is broken in a way nobody has seen before.",
               impact=5, urgency=5, users=50)
check("correlation: an incident on an unrelated service is not grouped", lone_inc.get("problemId") is None,
      lone_inc.get("problemId"))
low_inc = inc(portal, "Portal logo is blurry", "The logo in the portal header looks blurry on my screen.",
              impact=1, urgency=1, users=1)
check("correlation: a P4 on a neighbouring service is not pulled into the outage", low_inc["priority"] == "P4"
      and low_inc.get("problemId") is None, (low_inc["priority"], low_inc.get("problemId")))
maj = get(root_inc["id"]).get("problemId")

# ================================================================ Major Incident Mode: known outage, join, climb, cascade
s, ko = call("GET", f"/problems/known-outages?serviceId={portal}", token=O)
mine = ko if s == 200 else []
check("known outage: an employee on the dependant service sees the outage of Core", s == 200
      and any(x["problemId"] == maj and x["leadCode"] == root_inc["code"] and x["affectedUsers"] >= 120 for x in mine),
      (s, ko))
check("known outage: the view hides reporters and descriptions", all(set(x) <= {
    "problemId", "title", "service", "leadCode", "leadPriority", "affectedUsers", "since", "alreadyJoined"}
    for x in mine), mine[:1])
s, ko2 = call("GET", f"/problems/known-outages?serviceId={lonely}", token=O)
check("known outage: a service without an outage shows none", s == 200 and ko2 == [], (s, ko2))
third_pw = "Ab9-Zq7Kp2x9"  # M14 policy: no name words (the run id is part of the name)
call("POST", "/admin/users", {"name": "Third " + RUN, "email": mail("third"), "password": third_pw,
                              "roles": ["EMPLOYEE"]}, token=A)
P3tok = login(mail("third"), third_pw)
before_users = get(root_inc["id"])["affectedUsers"]
s, joined = call("POST", f"/problems/{maj}/join", token=P3tok)
check("join: one click creates the employee's own incident, closed as DUPLICATE of the lead", s == 201
      and joined["status"] == "CLOSED" and joined["closureReason"] == "DUPLICATE"
      and joined["duplicateOfId"] == root_inc["id"] and joined["problemId"] == maj, (s, joined))
lead_after = get(root_inc["id"])
check("join: the lead's affected users went up by one", lead_after["affectedUsers"] == before_users + 1,
      (before_users, lead_after["affectedUsers"]))
s, again = call("POST", f"/problems/{maj}/join", token=P3tok)
check("join: joining twice returns the same incident and changes nothing", s in (200, 201)
      and again["id"] == joined["id"] and get(root_inc["id"])["affectedUsers"] == before_users + 1, (s, again.get("id")))
s, ko3 = call("GET", f"/problems/known-outages?serviceId={portal}", token=P3tok)
check("join: alreadyJoined is true afterwards", s == 200 and any(x["problemId"] == maj and x["alreadyJoined"]
                                                                 for x in ko3), ko3)
s, b = call("POST", "/problems/999999/join", token=P3tok)
check("join: unknown record -> 404", s == 404, (s, b))

# crowd-driven priority: lead with 9 users is P3, the tenth person lifts it to P2 (x1.25)
climb_lead = inc(lonely, "Badge reader refuses cards", "The badge reader at the lab door refuses every card.",
                 impact=4, urgency=3, users=9, cat=cats["Printer"])
climb_other = inc(lonely, "Lab door sensor flickers", "Unrelated: a sensor near the lab door flickers its led.",
                  impact=1, urgency=1, users=1)
s, grp = call("POST", "/problems", {"title": "Lab door problems", "incidentIds": [climb_lead["id"],
                                                                                climb_other["id"]]}, token=L)
check("problems: a team lead opens a record from chosen incidents -> 201, lead is the higher priority",
      s == 201 and grp["lead"]["id"] == climb_lead["id"] and grp["incidentCount"] == 2, (s, grp))
s, b = call("POST", "/problems", {"incidentIds": [climb_lead["id"]]}, token=L)
check("problems: an incident already in a record cannot be grouped again -> 400", s == 400, (s, b))
s, b = call("POST", "/problems", {"incidentIds": [lone_inc["id"]]}, token=E)
check("problems: an employee cannot open a record -> 403", s == 403, s)
check("climb: lead starts at P3 with 9 users", get(climb_lead["id"])["priority"] == "P3",
      get(climb_lead["id"])["priority"])
call("POST", f"/problems/{grp['id']}/join", token=P3tok)
climbed = get(climb_lead["id"])
check("climb: the tenth person joining raises the priority by itself to P2", climbed["priority"] == "P2"
      and climbed["affectedUsers"] == 10, (climbed["priority"], climbed["affectedUsers"]))
h = history(climb_lead["id"], A)
check("climb: audit shows the join and the priority change", any("Known outage joined" in e["description"]
                                                                  for e in h)
      and any(e["action"] == "PRIORITY_CHANGED" for e in h), [e["description"] for e in h][-3:])

# "Resolve whole problem": a team lead or an administrator closes the record with one fix (DEC-72)
s, b = call("POST", f"/problems/{grp['id']}/resolve", RESOLVE, token=E)
check("resolve record: an employee may not -> 403", s == 403, s)
s, b = call("POST", f"/problems/{grp['id']}/resolve", RESOLVE, token=L)
check("resolve record: a team lead resolves every open incident, record RESOLVED", s == 200
      and b["status"] == "RESOLVED" and get(climb_lead["id"])["status"] == "RESOLVED"
      and get(climb_other["id"])["status"] == "RESOLVED", (s, b.get("status")))
s, b = call("POST", f"/problems/{grp['id']}/resolve", RESOLVE, token=A)
check("resolve record: a second resolve -> 409", s == 409, (s, b))
s, b = call("POST", f"/problems/{grp['id']}/join", token=O)
check("join: a resolved outage cannot be joined -> 409", s == 409, (s, b))

# ungroup
s, b = call("DELETE", f"/problems/{maj}/incidents/{low_inc['id']}", token=A)
check("ungroup: an incident that is not in the record -> 404", s == 404, (s, b))
s, b = call("DELETE", f"/problems/{maj}/incidents/{dep_inc['id']}", token=L)
check("ungroup: a team lead may not -> 403", s == 403, s)
s, b = call("DELETE", f"/problems/{maj}/incidents/{dep_inc['id']}", token=A)
check("ungroup: administrator takes the Portal incident out; it has no problem id and the change is audited",
      s == 200 and get(dep_inc["id"])["problemId"] is None
      and any(e["action"] == "DUPLICATE_LINKED" and "Taken out of problem record" in e["description"]
              for e in history(dep_inc["id"], A)), (s, b))
fresh_dep = inc(portal, "Student login shows white screen", "Opening the login page gives a blank white screen on every browser we tried.",
                impact=4, urgency=5, users=15, token=O)
check("setup: a new Portal incident is grouped again", fresh_dep.get("problemId") == maj, fresh_dep.get("problemId"))

# the lead incident is resolved by its technician: NOTHING else is resolved, staff get a note (DEC-72)
lead_tok = tok_of(root_inc)
action(root_inc["id"], "acknowledge", lead_tok)
action(root_inc["id"], "start", lead_tok)
s, r = action(root_inc["id"], "resolve", lead_tok, RESOLVE)
check("lead resolved: the technician resolves the lead incident", s == 200 and r["status"] == "RESOLVED", (s, r))
dep_now = get(fresh_dep["id"])
check("lead resolved: the related Portal incident is NOT resolved (merely related, DEC-72)",
      dep_now["status"] not in ("RESOLVED", "VERIFIED", "CLOSED"), dep_now["status"])
notes_l = call("GET", f"/incidents/{fresh_dep['id']}/comments", token=L)[1]
check("lead resolved: staff see one internal note naming the lead and the root cause", any(
    root_inc["code"] in c["body"] and RESOLVE["rootCause"] in c["body"] and c["visibility"] == "INTERNAL"
    and "Resolve problem" in c["body"] for c in notes_l), notes_l[-1:])
notes_r = call("GET", f"/incidents/{fresh_dep['id']}/comments", token=O)[1]
check("lead resolved: the reporter does not see the internal note", not any(root_inc["code"] in c["body"]
                                                                          for c in notes_r), notes_r[-1:])
check("lead resolved: the history hides the internal entry from the reporter", not any(
    e["description"].startswith("Internal note") for e in history(fresh_dep["id"], O)),
      history(fresh_dep["id"], O)[-1:])
s, p = call("GET", f"/problems/{maj}", token=A)
check("lead resolved: the record stays OPEN", s == 200 and p["status"] == "OPEN", (s, p.get("status")))


def inbox_resolved(token):
    s, nb = call("GET", "/notifications?size=50", token=token)
    return [n for n in (nb.get("items", []) if isinstance(nb, dict) else []) if n["eventType"] == "INCIDENT_RESOLVED"]


got = []
for _ in range(15):
    got = inbox_resolved(P3tok)
    if len(got) >= 2:   # the record of the climb test (resolved by the team lead) and this outage
        break
    time.sleep(1)
check("lead resolved: the person who joined gets one in-app notice that the outage is resolved", len(got) == 2, got)
s, b = call("POST", f"/problems/{maj}/resolve", RESOLVE, token=O)
check("resolve record: the reporter of a grouped incident may not -> 403", s == 403, s)
s, b = call("POST", f"/problems/{maj}/resolve", RESOLVE, token=L)
check("resolve whole problem: the team lead resolves the Portal incident with the same fix, record RESOLVED",
      s == 200 and b["status"] == "RESOLVED" and get(fresh_dep["id"])["status"] == "RESOLVED"
      and get(fresh_dep["id"])["resolution"]["rootCause"] == RESOLVE["rootCause"]
      and "Resolved together with" in get(fresh_dep["id"])["resolution"]["notes"], (s, b.get("status")))
check("resolve whole problem: audited as RESOLVED naming the lead", any(
    e["action"] == "RESOLVED" and root_inc["code"] in e["description"] for e in history(fresh_dep["id"], A)),
      history(fresh_dep["id"], A)[-2:])
time.sleep(4)
check("resolve whole problem: the joiner is not notified a second time", len(inbox_resolved(P3tok)) == 2,
      inbox_resolved(P3tok))
s, p = call("GET", f"/problems/{maj}", token=A)
check("resolve whole problem: the record counts the joiner", s == 200 and p["status"] == "RESOLVED"
      and p["joined"] >= 1, (s, p.get("status"), p.get("joined")))
s, only = call("GET", f"/problems/known-outages?serviceId={portal}", token=O)
check("known outage: a resolved outage no longer shows", s == 200 and not any(x["problemId"] == maj for x in only),
      only)

# ================================================================ root cause from the graph (DEC-73)
dbx = mk_service("M12B Db")
authx = mk_service("M12B Auth", deps=[dbx])
payx = mk_service("M12B Pay", deps=[authx])
portx = mk_service("M12B Web", deps=[authx])
pi = inc(payx, "Pay checkout fails", "Checkout in pay fails for every customer at the final step.", impact=2, urgency=2)
wi = inc(portx, "Web sign in fails", "Nobody can sign in to the web application since this morning.", impact=2,
         urgency=2, token=O)
s, rc_p = call("POST", "/problems", {"incidentIds": [pi["id"], wi["id"]]}, token=L)
s, rc = call("GET", f"/problems/{rc_p['id']}/root-cause", token=L)
check("root cause: the closest common upstream service of Pay and Web is Auth", s == 200
      and rc["probable"] and rc["probable"]["service"]["name"].startswith("M12B Auth"), (s, rc))
check("root cause: candidates are Auth then Db, with a path from each affected service as evidence",
      [c["service"]["name"].split()[1] for c in rc["candidates"]] == ["Auth", "Db"]
      and len(rc["probable"]["paths"]) == 2
      and all(path[-1]["name"].startswith("M12B Auth") for path in rc["probable"]["paths"]), rc["candidates"])
s, b = call("GET", f"/problems/{rc_p['id']}/root-cause", token=E)
check("root cause: employees may not read it -> 403", s == 403, s)

# ================================================================ E2 recurring-problem detector (DEC-74)
recsvc = mk_service("M12B Recurring")
texts = [("Printer tray three jams constantly", "The paper tray three of the big printer jams constantly."),
         ("Scanner software crashes on start", "The scanner software crashes right when it starts on my laptop."),
         ("Badge door lock stays open", "The badge door lock on the east wing stays open after hours.")]
rec_ids = [inc(recsvc, title, desc, cat=cats["Printer"])["id"] for title, desc in texts]
ids_sql = ",".join(str(i) for i in rec_ids)
sql(f"update incidents set status='RESOLVED', resolved_at=now(), root_cause='Worn rollers replaced.', "
    f"resolution_notes='Replaced the worn parts.' where id in ({ids_sql})")
s, rec = call("GET", "/problems/recurring", token=L)
fix = [x for x in rec if x["kind"] == "REPEATED_FIX" and x["service"]["name"].startswith("M12B Recurring")] \
    if s == 200 else []
check("recurring: three fixes of the same service and category in the window are proposed", len(fix) == 1
      and fix[0]["count"] == 3 and {i["id"] for i in fix[0]["incidents"]} == set(rec_ids), (s, rec))
s, b = call("GET", "/problems/recurring", token=E)
check("recurring: employees may not read the proposals -> 403", s == 403, s)
s, made = call("POST", "/problems", {"title": "Recurring printer trouble", "incidentIds": rec_ids}, token=L)
s, rec2 = call("GET", "/problems/recurring", token=L)
check("recurring: after a team lead opens the record the proposal disappears", s == 200 and not any(
    x["kind"] == "REPEATED_FIX" and x["service"]["name"].startswith("M12B Recurring") for x in rec2), rec2)
reo = inc(lonely, "Intercom crackles loudly", "The intercom in the hall crackles loudly whenever someone talks.")
sql(f"update incidents set reopen_count=2, updated_at=now() where id={reo['id']}")
s, rec3 = call("GET", "/problems/recurring", token=L)
check("recurring: an incident reopened twice is proposed as REPEATED_REOPEN", s == 200 and any(
    x["kind"] == "REPEATED_REOPEN" and x["incidents"][0]["id"] == reo["id"] and x["count"] == 2 for x in rec3), rec3)

# ================================================================ A1 chatbot (DEC-75)
chat_svc = mk_service("M12B Chatty")
s, c0 = call("POST", "/intelligence/chat", {}, token=E)
check("chat: the first turn greets and asks for the description", s == 200 and c0["expecting"] == "DESCRIPTION"
      and not c0["readyToFile"], (s, c0))
s, c1 = call("POST", "/intelligence/chat", {"draft": c0["draft"], "expecting": "DESCRIPTION", "answer": "it broke"},
             token=E)
check("chat: a too-short description is asked again", s == 200 and c1["expecting"] == "DESCRIPTION", (s, c1))
s, c2 = call("POST", "/intelligence/chat", {"draft": c1["draft"], "expecting": "DESCRIPTION",
                                           "answer": "My VPN drops every few minutes and I cannot work at all."},
             token=E)
check("chat: a good description fills title and impact, and the bot asks for the service with options",
      s == 200 and c2["expecting"] == "SERVICE" and c2["draft"]["title"] and c2["draft"]["impact"]
      and any(o["id"] == chat_svc for o in c2["options"]) and c2["source"] in ("LLM", "KEYWORD"), (s, c2))
s, c3 = call("POST", "/intelligence/chat", {"draft": c2["draft"], "expecting": "SERVICE", "answer": "no idea"},
             token=E)
check("chat: an unknown service name is asked again", s == 200 and c3["expecting"] == "SERVICE", (s, c3))
s, c3 = call("POST", "/intelligence/chat", {"draft": c2["draft"], "expecting": "SERVICE",
                                           "answer": f"M12B Chatty {RUN}"}, token=E)
check("chat: a service typed by name is matched and the bot asks how many are affected", s == 200
      and c3["expecting"] == "AFFECTED_USERS" and c3["draft"]["serviceId"] == chat_svc, (s, c3))
s, c4 = call("POST", "/intelligence/chat", {"draft": c3["draft"], "expecting": "AFFECTED_USERS",
                                           "answer": "about 12 people"}, token=E)
check("chat: the number is read, the draft is complete and readyToFile", s == 200 and c4["readyToFile"]
      and c4["draft"]["affectedUsers"] == 12 and c4["expecting"] == "CONFIRM", (s, c4))
d = c4["draft"]
s, filed = call("POST", "/incidents", {"title": d["title"], "description": d["description"] + " " + RUN,
                                       "serviceId": d["serviceId"], "categoryId": d["categoryId"],
                                       "impact": d["impact"], "urgency": d["urgency"],
                                       "affectedUsers": d["affectedUsers"]}, token=E)
check("chat: the finished draft is filed through the normal POST /incidents", s == 201 and filed["affectedUsers"] == 12,
      (s, filed))
s, b = call("POST", "/intelligence/chat", {}, token=None)
check("chat: needs a login -> 401", s == 401, s)

# ================================================================ D2 outage drill exists only in the demo profile
s, b = call("POST", "/admin/demo/outage-drill", {"rootServiceId": core}, token=A)
if s == 404:
    check("drill: in the dev profile the outage drill path is a plain 404", True)
else:
    check("drill: files a related set of incidents grouped under one record", s == 201 and b["problemId"]
          and len(b["incidentCodes"]) >= 2, (s, b))
