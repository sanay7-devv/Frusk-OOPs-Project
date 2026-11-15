"""Smoke test of the M2 auth endpoints against the local dev server (throwaway accounts, local DB only)."""
import os
import json
import secrets
import subprocess
import urllib.error
import urllib.request

BASE = "http://localhost:" + os.environ.get("SMOKE_PORT", "8081") + "/api/v1/auth"
RUN = secrets.token_hex(3)
PW = "Ab9-Zq" + secrets.token_hex(4) + "9"   # letter + digit, 8+ chars; generated, never printed
results = []


def call(method, path, body=None, token=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
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


def check(name, ok, detail=""):
    results.append(("PASS" if ok else "FAIL", name, detail))


def sql(statement):
    out = subprocess.run(["docker", "exec", os.environ.get("SMOKE_CONTAINER", "iitsm-db"), "psql", "-U", "iitsm", "-d", os.environ.get("SMOKE_DB", "iitsm"), "-tAc", statement],
                         capture_output=True, text=True)
    return out.stdout.strip() or out.stderr.strip()


email1 = f"smoke.{RUN}@iitsm.demo"
email2 = f"lock.{RUN}@iitsm.demo"

# 1 register
s, b = call("POST", "/register", {"name": "Smoke User", "email": email1.upper(), "password": PW, "department": "QA"})
check("register -> 201", s == 201, s)
check("register: roles [EMPLOYEE], email lower-cased", s == 201 and b["user"]["roles"] == ["EMPLOYEE"]
      and b["user"]["email"] == email1, b.get("user") if isinstance(b, dict) else b)
check("register: technician/administrator present as null", s == 201 and "technician" in b["user"]
      and b["user"]["technician"] is None and "administrator" in b["user"] and b["user"]["administrator"] is None)
check("register: expiresInSeconds 900", s == 201 and b["expiresInSeconds"] == 900)
check("register: permissions", s == 201 and b["user"]["permissions"] == ["INCIDENT_CREATE", "INCIDENT_VIEW_OWN"],
      b["user"]["permissions"] if s == 201 else "")

# 2 duplicate email (different case)
s, b = call("POST", "/register", {"name": "Dup", "email": email1.capitalize(), "password": PW})
check("duplicate email -> 400 VALIDATION_FAILED on email", s == 400 and b["code"] == "VALIDATION_FAILED"
      and b["fieldErrors"] == [{"field": "email", "message": "is already registered"}], (s, b))

# 3 invalid input
s, b = call("POST", "/register", {"name": "A", "email": "not-an-email", "password": "abcdefgh"})
fields = sorted(f["field"] for f in b.get("fieldErrors", [])) if isinstance(b, dict) else b
check("invalid register -> 400 with name/email/password fieldErrors", s == 400 and fields == ["email", "name", "password"],
      (s, fields))

# 4 me with token, without, tampered
s, b = call("POST", "/login", {"email": email1, "password": PW})
check("login -> 200", s == 200, (s, b if s != 200 else ""))
access, refresh = b["accessToken"], b["refreshToken"]
s, b = call("GET", "/me", token=access)
check("me with token -> 200", s == 200 and b["email"] == email1, (s, b))
s, b = call("GET", "/me")
check("me without token -> 401 TOKEN_INVALID", s == 401 and b["code"] == "TOKEN_INVALID", (s, b))
tampered = access[:-4] + ("AAAA" if not access.endswith("AAAA") else "BBBB")
s, b = call("GET", "/me", token=tampered)
check("me with tampered token -> 401 TOKEN_INVALID", s == 401 and b["code"] == "TOKEN_INVALID", (s, b))

# 5 refresh rotation and re-use detection
s, b = call("POST", "/refresh", {"refreshToken": refresh})
check("refresh -> 200 with a new refresh token", s == 200 and b["refreshToken"] != refresh, s)
new_refresh = b["refreshToken"]
s, b = call("POST", "/refresh", {"refreshToken": refresh})
check("re-used old refresh -> 401 TOKEN_INVALID", s == 401 and b["code"] == "TOKEN_INVALID", (s, b))
s, b = call("POST", "/refresh", {"refreshToken": new_refresh})
check("after re-use, newest refresh also revoked -> 401", s == 401, (s, b))

# 6 logout
s, b = call("POST", "/login", {"email": email1, "password": PW})
access, refresh = b["accessToken"], b["refreshToken"]
s, _ = call("POST", "/logout", {"refreshToken": refresh}, token=access)
check("logout -> 204", s == 204, s)
s, b = call("POST", "/refresh", {"refreshToken": refresh})
check("refresh after logout -> 401", s == 401, (s, b))
s, b = call("POST", "/logout", {"refreshToken": refresh})
check("logout without access token -> 401", s == 401, (s, b))

# 7 lockout (separate account)
call("POST", "/register", {"name": "Lock User", "email": email2, "password": PW})
msgs = set()
fives = []
for _ in range(5):
    s, b = call("POST", "/login", {"email": email2, "password": PW + "x"})
    fives.append(s)
    msgs.add(b["message"])
s, b = call("POST", "/login", {"email": f"nobody.{RUN}@iitsm.demo", "password": PW})
msgs.add(b["message"])
check("5 wrong passwords -> 401 x5", fives == [401] * 5, fives)
check("unknown email gives the identical message", len(msgs) == 1 and s == 401, msgs)
s, b = call("POST", "/login", {"email": email2, "password": PW})
check("6th attempt with RIGHT password -> 423 ACCOUNT_LOCKED", s == 423 and b["code"] == "ACCOUNT_LOCKED", (s, b))
check("DB: locked_until about 15 min ahead",
      sql(f"select round(extract(epoch from locked_until - now())/60) from users where email='{email2}'") in ("14", "15"),
      sql(f"select locked_until - now() from users where email='{email2}'"))

# 8 multi-role: grant TECHNICIAN as team lead in the DB (no admin endpoint yet), then /me
uid = sql(f"select id from users where email='{email1}'")
sql(f"insert into user_roles(user_id, role_type, granted_at) values ({uid}, 'TECHNICIAN', now())")
sql(f"insert into technician_profiles(user_id, experience_level, escalation_level, availability, max_load) "
    f"values ({uid}, 4, 1, 'AVAILABLE', 10)")
s, b = call("POST", "/login", {"email": email1, "password": PW})
check("multi-role login -> roles EMPLOYEE+TECHNICIAN", s == 200 and b["user"]["roles"] == ["EMPLOYEE", "TECHNICIAN"],
      b["user"]["roles"] if s == 200 else (s, b))
check("multi-role: technician {escalationLevel 1, AVAILABLE}",
      s == 200 and b["user"]["technician"] == {"escalationLevel": 1, "availability": "AVAILABLE"},
      b["user"]["technician"] if s == 200 else "")
perms = set(b["user"]["permissions"]) if s == 200 else set()
check("multi-role: union includes employee + technician + team-lead permissions",
      {"INCIDENT_CREATE", "INCIDENT_HANDLE", "INCIDENT_ASSIGN", "TEAM_VIEW"} <= perms
      and "USER_MANAGE" not in perms, sorted(perms))

# 9 DB checks
check("DB: employee profile row with department", sql(f"select department from employee_profiles where user_id={uid}") == "QA")
check("DB: refresh tokens stored as 64-hex hashes only",
      sql(f"select bool_and(token_hash ~ '^[0-9a-f]{{64}}$') from refresh_tokens rt join users u on u.id = rt.user_id "
          f"where u.email='{email1}'") == "t")
check("DB: password stored as BCrypt", sql(f"select password_hash like '$2a$10$%' from users where email='{email1}'") == "t")

for status, name, detail in results:
    print(f"{status}  {name}" + (f"   -> {detail}" if status == "FAIL" else ""))
print(f"\n{sum(r[0] == 'PASS' for r in results)}/{len(results)} passed")
