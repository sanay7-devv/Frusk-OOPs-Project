"""Smoke test of M2b Google sign-in (POST /auth/google) with the FAKE verifier, offline.

Run against a fresh backend of the M2b worktree started with GOOGLE_VERIFIER=fake and
GOOGLE_CLIENT_ID=test-client-id.apps.googleusercontent.com (profiles dev,schema-auto):
  SMOKE_PORT=8085 SMOKE_DB=iitsm_m2b python -I -X utf8 m2b_smoke.py
Tokens are HS256-signed with the fake verifier's fixed key (infrastructure/google/FakeGoogleIdTokenVerifier).
"""
import atexit
import base64
import hashlib
import hmac
import json
import os
import secrets
import subprocess
import time
import urllib.error
import urllib.request

PORT = os.environ.get("SMOKE_PORT", "8085")
DB = os.environ.get("SMOKE_DB", "iitsm_m2b")
CONTAINER = os.environ.get("SMOKE_DB_CONTAINER", "iitsm-db")
CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
FAKE_KEY = b"iitsm-fake-google-id-token-key-for-offline-smoke-runs"
BASE = f"http://localhost:{PORT}/api/v1"
RUN = secrets.token_hex(3)
PW = "Ab9-Zq" + secrets.token_hex(4) + "9"  # M14 policy: no name words in passwords
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
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw


def sql(statement):
    out = subprocess.run(["docker", "exec", CONTAINER, "psql", "-U", "iitsm", "-d", DB, "-tAc", statement],
                         capture_output=True, text=True)
    return out.stdout.strip() or out.stderr.strip()


def b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def google_token(sub, email, verified=True, name="Gina Google", aud=CLIENT_ID, iss="https://accounts.google.com",
                 exp_in=3600, key=FAKE_KEY):
    now = int(time.time())
    claims = {"iss": iss, "aud": aud, "sub": sub, "email": email, "email_verified": verified, "name": name,
              "iat": now, "exp": now + exp_in}
    head = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = b64(json.dumps(claims).encode())
    sig = b64(hmac.new(key, f"{head}.{body}".encode(), hashlib.sha256).digest())
    return f"{head}.{body}.{sig}"


def google(token):
    return call("POST", "/auth/google", {"idToken": token})


def audit_count(fragment):
    return int(sql("select count(*) from audit_records where action='LOGIN_FAILED' "
                   f"and description like '%{fragment}%'") or 0)


def register(email):
    s, b = call("POST", "/auth/register", {"name": "Smoke User", "email": email, "password": PW})
    assert s == 201, (s, b)
    return b["user"]["id"]


# --- 1 link an existing account by verified email
e1 = f"link.{RUN}@iitsm.demo"
uid1 = register(e1)
sub1 = "g-sub-" + secrets.token_hex(6)
s, b = google(google_token(sub1, e1.upper()))
check("existing account links by verified email -> 200 AuthResponse", s == 200 and b["user"]["id"] == uid1
      and b["user"]["roles"] == ["EMPLOYEE"] and b["expiresInSeconds"] == 900 and b["refreshToken"], (s, b))
check("google_sub stored on the account", sql(f"select google_sub from users where id={uid1}") == sub1)
s2, me = call("GET", "/auth/me", token=b["accessToken"] if s == 200 else "x")
check("the returned access token works on /auth/me", s2 == 200 and me["email"] == e1, (s2, me))
s3, r = call("POST", "/auth/refresh", {"refreshToken": b["refreshToken"]}) if s == 200 else (0, None)
check("the returned refresh token rotates", s3 == 200 and r["refreshToken"] != b["refreshToken"], (s3, r))
s, b = google(google_token(sub1, f"renamed.{RUN}@iitsm.demo"))
check("second sign-in is found by google_sub even if Google's email changed -> 200", s == 200
      and b["user"]["id"] == uid1, (s, b))
s, b = call("POST", "/auth/login", {"email": e1, "password": PW})
check("password login of the linked account still works", s == 200, (s, b))

# --- 2 unverified email on an existing account
e2 = f"unver.{RUN}@iitsm.demo"
uid2 = register(e2)
s, b = google(google_token("g-sub-" + secrets.token_hex(6), e2, verified=False))
check("unverified email -> 401 INVALID_CREDENTIALS", s == 401 and b["code"] == "INVALID_CREDENTIALS", (s, b))
check("unverified email: account NOT linked", sql(f"select coalesce(google_sub,'none') from users where id={uid2}") == "none")
check("unverified email audited as LOGIN_FAILED", audit_count("Google email not verified " + e2) == 1)

# --- 3 unknown email, auto-registration off (default)
e3 = f"new.{RUN}@iitsm.demo"
sub3 = "g-sub-" + secrets.token_hex(6)
s, b = google(google_token(sub3, e3))
check("unknown email, auto-registration off -> 401 INVALID_CREDENTIALS", s == 401 and b["code"] == "INVALID_CREDENTIALS", (s, b))
check("no user was created", sql(f"select count(*) from users where email='{e3}'") == "0")
check("refusal audited", audit_count("no account for " + e3) == 1)

# --- 4 auto-registration on (admin setting)
admin_email = f"admin.{RUN}@iitsm.demo"
admin_id = register(admin_email)
sql(f"insert into user_roles(user_id, role_type, granted_at) values ({admin_id}, 'ADMINISTRATOR', now())")
sql(f"insert into administrator_profiles(user_id, scope) values ({admin_id}, 'SYSTEM_ADMIN')")
s, b = call("POST", "/auth/login", {"email": admin_email, "password": PW})
A = b["accessToken"]
s, b = call("PUT", "/admin/config", [{"key": "auth.google.autoregister", "value": "true"}], token=A)
check("admin switches auth.google.autoregister on -> 200", s == 200, (s, b))
s, b = google(google_token(sub3, e3, name="Nina New"))
check("auto-registration on: new EMPLOYEE account created -> 200", s == 200 and b["user"]["email"] == e3
      and b["user"]["roles"] == ["EMPLOYEE"] and b["user"]["name"] == "Nina New", (s, b))
row = sql(f"select google_sub, coalesce(password_hash,'NULL') from users where email='{e3}'")
check("the new account has google_sub and no password", row == f"{sub3}|NULL", row)

# --- 5 Google-only user cannot use password login
s, b = call("POST", "/auth/login", {"email": e3, "password": PW})
check("Google-only user password login -> 401 INVALID_CREDENTIALS", s == 401 and b["code"] == "INVALID_CREDENTIALS", (s, b))
s, b = call("POST", "/auth/login", {"email": e3, "password": ""})
check("empty password -> 400 validation, not a crash", s == 400, (s, b))

# --- 6 bad tokens -> 401 TOKEN_INVALID
base_email = f"bad.{RUN}@iitsm.demo"
for label, tok in [
    ("wrong audience", google_token("g-x", base_email, aud="someone-elses-client.apps.googleusercontent.com")),
    ("expired token", google_token("g-x", base_email, exp_in=-3600)),
    ("wrong issuer", google_token("g-x", base_email, iss="https://evil.example.com")),
    ("forged signature", google_token("g-x", base_email, key=b"not-the-real-key-not-the-real-key-1234")),
    ("garbage", "not.a.jwt"),
]:
    s, b = google(tok)
    check(f"{label} -> 401 TOKEN_INVALID", s == 401 and b["code"] == "TOKEN_INVALID", (s, b))
check("rejected tokens audited with the reason", audit_count("invalid token: wrong audience") >= 1
      and audit_count("invalid token: token expired") >= 1 and audit_count("invalid token: wrong issuer") >= 1)
s, b = call("POST", "/auth/google", {})
check("missing idToken -> 400 VALIDATION_FAILED", s == 400 and b["code"] == "VALIDATION_FAILED", (s, b))

# --- 7 deactivated account
e7 = f"off.{RUN}@iitsm.demo"
uid7 = register(e7)
sql(f"update users set active=false where id={uid7}")
s, b = google(google_token("g-sub-" + secrets.token_hex(6), e7))
check("deactivated account -> 401 INVALID_CREDENTIALS", s == 401 and b["code"] == "INVALID_CREDENTIALS", (s, b))
check("deactivated attempt audited", audit_count("account deactivated") >= 1)

# --- 8 email already linked to a different Google account
s, b = google(google_token("g-other-" + secrets.token_hex(4), e1))
check("email linked to a different Google account -> 401 INVALID_CREDENTIALS", s == 401
      and b["code"] == "INVALID_CREDENTIALS", (s, b))
check("sub of the account unchanged", sql(f"select google_sub from users where id={uid1}") == sub1)

# --- 9 lockout: locked account refused (423), failures do not add to the counter, success resets it
e9 = f"lock.{RUN}@iitsm.demo"
uid9 = register(e9)
sub9 = "g-sub-" + secrets.token_hex(6)
google(google_token(sub9, e9))
sql(f"update users set failed_logins=3 where id={uid9}")
google(google_token(sub9, e9, aud="wrong"))
google(google_token(sub9, e9, verified=False))
check("failed Google attempts do not increase failed_logins", sql(f"select failed_logins from users where id={uid9}") == "3")
s, b = google(google_token(sub9, e9))
check("successful Google sign-in resets failed_logins", s == 200 and sql(f"select failed_logins from users where id={uid9}") == "0", (s, b))
sql(f"update users set locked_until=now() + interval '10 minutes', failed_logins=5 where id={uid9}")
s, b = google(google_token(sub9, e9))
check("locked account -> 423 ACCOUNT_LOCKED even with a valid token", s == 423 and b["code"] == "ACCOUNT_LOCKED", (s, b))

# --- 10 contract
s, spec = call("GET", "/../v3/api-docs") if False else (0, None)
req = urllib.request.Request(f"http://localhost:{PORT}/v3/api-docs")
with urllib.request.urlopen(req, timeout=30) as r:
    spec = json.loads(r.read().decode())
op = spec["paths"].get("/api/v1/auth/google", {}).get("post", {})
check("OpenAPI lists POST /auth/google as implemented (not Planned)", op and "Planned" not in op.get("tags", [])
      and op.get("security") == [], op.get("tags"))
