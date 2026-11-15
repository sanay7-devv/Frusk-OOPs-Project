# M9 part of endpoint_sweep: the six notification operations (missing from the sweep since the M9 merge).
# Runs with the sweep's globals: call, ok, E (employee, who has inbox rows from the incidents they reported).
s, b = call("GET", "/notifications?page=0&size=20", token=E)
ok("GET /notifications", s == 200 and isinstance(b, dict) and "items" in b, (s, b))
_n_first = (b.get("items") or [{}])[0].get("id") if s == 200 else None
s, b = call("GET", "/notifications/unread-count", token=E)
ok("GET /notifications/unread-count", s == 200 and isinstance(b.get("count"), int), (s, b))
if _n_first is not None:
    s, _ = call("POST", f"/notifications/{_n_first}/read", token=E)
    ok("POST /notifications/{id}/read -> 204", s == 204, s)
else:
    ok("POST /notifications/{id}/read -> 204 (needs an inbox row)", False, "the employee has no notification")
s, _ = call("POST", "/notifications/read-all", token=E)
ok("POST /notifications/read-all -> 204", s == 204, s)
s, b = call("GET", "/notifications/preferences", token=E)
ok("GET /notifications/preferences (60 switches)", s == 200 and len(b) == 60, (s, len(b) if isinstance(b, list) else b))
s, _ = call("PUT", "/notifications/preferences",
            [{"eventType": "INCIDENT_ACKNOWLEDGED", "channel": "EMAIL", "enabled": False}], token=E)
ok("PUT /notifications/preferences", s in (200, 204), s)
