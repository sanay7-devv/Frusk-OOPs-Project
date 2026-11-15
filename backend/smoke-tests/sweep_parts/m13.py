# M13 part of endpoint_sweep: dashboard, service graph, impact, status board.
# Runs with the sweep's globals: call, ok, A (admin), E (employee), db, app.
s, b = call("GET", "/dashboard/live", token=A)
ok("GET /dashboard/live", s == 200 and isinstance(b, dict)
   and set(b) == {"counters", "byPriority", "recentEvents", "atRisk"}, (s, b))

# the core sweep cleared App's dependencies (PUT /admin/services/{id}/dependencies []); put App -> Database back
call("PUT", f"/admin/services/{app['id']}/dependencies", {"dependencyIds": [db["id"]]}, token=A)
s, b = call("GET", "/services/graph", token=E)
ok("GET /services/graph", s == 200 and isinstance(b, dict) and set(b) == {"nodes", "edges"}
   and any(e["from"] == app["id"] and e["to"] == db["id"] for e in b["edges"]), (s, b))

s, b = call("GET", f"/services/{db['id']}/impact", token=E)
ok("GET /services/{id}/impact", s == 200 and b.get("serviceId") == db["id"]
   and any(a["id"] == app["id"] and a["distance"] == 1 for a in b.get("affected", [])), (s, b))

s, b = call("GET", "/services/status", token=E)
ok("GET /services/status", s == 200 and b.get("label") == "Based on reported incidents"
   and any(r["id"] == db["id"] for r in b.get("services", [])), (s, b))
