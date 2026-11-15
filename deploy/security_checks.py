"""Run Task 3 security checks against the disposable demo Compose stack.

No credentials or tokens are written to the evidence file. Run this after the
other demo checks: the final check advances the demo clock to expire a token.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE = os.environ.get("IITSM_API_URL", "http://localhost:8080/api/v1")
EVIDENCE = Path("/tmp/iitsm-security-checks.json")
rows = []


def send(method, path, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = Request(
        BASE + path, method=method, headers=headers,
        data=json.dumps(body).encode() if body is not None else None,
    )
    try:
        with urlopen(request, timeout=30) as response:
            status, raw, response_headers = response.status, response.read(), response.headers
    except HTTPError as error:
        status, raw, response_headers = error.code, error.read(), error.headers
    try:
        payload = json.loads(raw) if raw else None
    except json.JSONDecodeError:
        payload = raw.decode(errors="replace")
    return status, payload, response_headers


def verify(name, method, path, expected, body=None, token=None, code=None, field=None):
    status, payload, headers = send(method, path, body, token)
    actual_code = payload.get("code") if isinstance(payload, dict) else None
    field_errors = payload.get("fieldErrors") if isinstance(payload, dict) else None
    passed = status == expected
    if code is not None:
        passed = passed and actual_code == code
    if field is not None:
        passed = passed and field in json.dumps(field_errors)
    rows.append({
        "check": name, "request": method + " " + path,
        "expected_status": expected, "actual_status": status,
        "expected_code": code, "actual_code": actual_code,
        "field": field, "passed": passed,
    })
    if not passed:
        raise AssertionError(f"{name}: expected {expected} {code or ''} {field or ''}; got {status} {actual_code}")
    return payload, headers


def login(email):
    payload, _ = verify("Sign in " + email.split("@")[0], "POST", "/auth/login", 200,
                        {"email": email, "password": "Demo@1234"})
    return payload


def incident_body(service_id, title):
    return {
        "title": title,
        "description": "Synthetic campus security verification with no personal information.",
        "serviceId": service_id,
        "impact": 2, "urgency": 2, "affectedUsers": 1,
        "confirmNotDuplicate": True,
    }


def main():
    admin = login("asha.rao@iitsm.demo")
    employee = login("employee1@iitsm.demo")
    other = login("employee2@iitsm.demo")
    admin_token = admin["accessToken"]
    employee_token = employee["accessToken"]
    other_token = other["accessToken"]

    # Clear rate-limit windows left by the earlier API and Postman runs.
    verify("Start a fresh demo rate window", "POST", "/admin/demo/clock/advance", 200,
           {"minutes": 2}, admin_token)
    services, _ = verify("Read service catalog", "GET", "/services", 200, token=employee_token)
    network = next(service["id"] for service in services if service["name"] == "Network")

    incident, _ = verify("Create access-control fixture", "POST", "/incidents", 201,
                         incident_body(network, "Synthetic access control fixture"), employee_token)
    incident_id = incident["id"]
    verify("Other employee cannot read incident", "GET", f"/incidents/{incident_id}", 404,
           token=other_token, code="INCIDENT_NOT_FOUND")
    verify("Other employee cannot act on incident", "POST", f"/incidents/{incident_id}/acknowledge", 403,
           token=other_token, code="UNAUTHORIZED_OPERATION")

    verify("Employee cannot list administrators", "GET", "/admin/users", 403,
           token=employee_token, code="UNAUTHORIZED_OPERATION")
    audit, _ = verify("Denied access is audited", "GET",
                      f"/audit?actorId={employee['user']['id']}&action=ACCESS_DENIED&size=100",
                      200, token=admin_token)
    if not audit["items"]:
        raise AssertionError("Employee denial did not create an ACCESS_DENIED audit entry")
    rows.append({"check": "Denied access audit row exists", "request": "GET /audit",
                 "expected_status": 200, "actual_status": 200, "passed": True})
    verify("Garbage token is rejected", "GET", "/auth/me", 401,
           token="invalid-security-check-token", code="TOKEN_INVALID")

    script = "<script>alert(1)</script>"
    script_body = incident_body(network, script + " synthetic report")
    script_body["description"] = script + " is literal text in this fictional incident description."
    text_incident, _ = verify("Create literal script-text fixture", "POST", "/incidents", 201,
                              script_body, employee_token)
    if text_incident["title"] != script_body["title"] or text_incident["description"] != script_body["description"]:
        raise AssertionError("The title or description was changed instead of being stored as text")
    detail, _ = verify("Read literal script text", "GET", f"/incidents/{text_incident['id']}", 200,
                       token=employee_token)
    if detail["title"] != script_body["title"] or detail["description"] != script_body["description"]:
        raise AssertionError("Script text changed in JSON response")
    comment, _ = verify("Post literal script text as comment", "POST",
                         f"/incidents/{text_incident['id']}/comments", 201,
                         {"body": script, "visibility": "PUBLIC"}, employee_token)
    if comment["body"] != script:
        raise AssertionError("Comment text changed in JSON response")
    rows.append({"check": "Script text is returned as data in title, description and comment",
                 "request": "GET /incidents/{id}; POST /incidents/{id}/comments",
                 "expected_status": 200, "actual_status": 200, "passed": True})

    for field, value in (("title", "T" * 201), ("description", "D" * 5001)):
        body = incident_body(network, "Synthetic validation fixture")
        body[field] = value
        verify("Reject oversized incident " + field, "POST", "/incidents", 400, body,
               employee_token, "VALIDATION_FAILED", field)
    verify("Reject oversized comment", "POST", f"/incidents/{incident_id}/comments", 400,
           {"body": "C" * 4001, "visibility": "PUBLIC"}, employee_token,
           "VALIDATION_FAILED", "body")
    verify("Reject password over 72 UTF-8 bytes", "POST", "/auth/register", 400,
           {"name": "Security Fixture", "email": "security-fixture@iitsm.demo",
            "password": "A1" + "é" * 40}, code="VALIDATION_FAILED", field="password")
    verify("Reject a common password", "POST", "/auth/register", 400,
           {"name": "Security Fixture", "email": "security-fixture@iitsm.demo",
            "password": "Password1"}, code="VALIDATION_FAILED", field="password")

    for attempt in range(5):
        verify(f"Wrong password {attempt + 1} of five", "POST", "/auth/login", 401,
               {"email": "employee7@iitsm.demo", "password": "wrong-password"}, code="INVALID_CREDENTIALS")
    verify("Locked account rejects correct password", "POST", "/auth/login", 423,
           {"email": "employee7@iitsm.demo", "password": "Demo@1234"}, code="ACCOUNT_LOCKED")

    rate_limited = False
    for attempt in range(15):
        status, payload, headers = send("POST", "/auth/login",
                                        {"email": "unknown-rate-probe@iitsm.demo", "password": "wrong-password"})
        if status == 429:
            if not isinstance(payload, dict) or payload.get("code") != "RATE_LIMITED":
                raise AssertionError("Rate limit returned an unexpected error")
            if int(headers.get("Retry-After", "0")) < 1:
                raise AssertionError("Rate limit omitted Retry-After")
            rate_limited = True
            break
        if status != 401:
            raise AssertionError(f"Unexpected login status during rate probe: {status}")
    rows.append({"check": "Login rate limit and Retry-After", "request": "POST /auth/login",
                 "expected_status": 429, "actual_status": 429 if rate_limited else status,
                 "expected_code": "RATE_LIMITED", "actual_code": "RATE_LIMITED" if rate_limited else None,
                 "passed": rate_limited})
    if not rate_limited:
        raise AssertionError("The login rate limit did not fire within 15 attempts")

    verify("Expire an existing access token in demo time", "POST",
           "/admin/demo/clock/advance", 200, {"minutes": 16}, admin_token)
    verify("Expired token is rejected", "GET", "/auth/me", 401,
           token=employee_token, code="TOKEN_EXPIRED")


if __name__ == "__main__":
    try:
        main()
    finally:
        EVIDENCE.write_text(json.dumps({
            "run_at_utc": datetime.now(timezone.utc).isoformat(),
            "scope": "Disposable demo Compose stack; no credentials or tokens stored",
            "checks": rows,
        }, indent=2) + "\n")
        print(f"Task 3 security checks: {sum(row['passed'] for row in rows)}/{len(rows)} passed")
