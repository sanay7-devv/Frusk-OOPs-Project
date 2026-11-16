"""Shared set-up for the smoke suites: put runtime settings (app_config) into the state a suite assumes, and put them
back when the suite ends.

Why: three settings changed behaviour that older suites relied on.
  autocat.apply.confidence (DEC-70, default 0.60): confident incidents are categorised and assigned on creation, so an
      incident no longer waits in triage. A value of 1 switches that off (the old behaviour).
  ratelimit.incident.create.per.minute (default 20) and ratelimit.login.per.minute (default 10): a suite that files
      or logs in more than that in a minute gets 429.
A suite calls  smoke_setup.tune(PORT, sql, {...})  once, before its first request; the previous values are restored
at exit, even if the suite fails. Uses the admin API only (no direct app_config writes, which the cache would miss).
"""
import atexit
import json
import secrets
import urllib.error
import urllib.request

NO_AUTOCAT = {"autocat.apply.confidence": "1"}
NO_RATE_LIMITS = {"ratelimit.incident.create.per.minute": "1000", "ratelimit.login.per.minute": "1000"}


def _call(port, method, path, body=None, token=None):
    req = urllib.request.Request(f"http://localhost:{port}/api/v1{path}",
                                 data=json.dumps(body).encode() if body is not None else None, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode()
            return r.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw


def admin_token(port, sql):
    """A fresh throwaway administrator (registered, then promoted in the database) and its access token."""
    email = f"cfg.{secrets.token_hex(4)}@iitsm.demo"
    pw = "Ab9-Zq" + secrets.token_hex(4) + "9"
    _call(port, "POST", "/auth/register", {"name": "Smoke Config", "email": email, "password": pw})
    uid = int(sql(f"select id from users where email='{email}'"))
    sql(f"insert into user_roles(user_id, role_type, granted_at) values ({uid}, 'ADMINISTRATOR', now())")
    sql(f"insert into administrator_profiles(user_id, scope) values ({uid}, 'SYSTEM_ADMIN')")
    _CREDS[:] = [email, pw]
    return _login(port, email, pw)


_CREDS = []


def _login(port, email, pw):
    return _call(port, "POST", "/auth/login", {"email": email, "password": pw})[1]["accessToken"]


def tune(port, sql, changes):
    """Sets the given settings and registers a restore of their previous values at exit. Returns the restore function
    (also callable early). A suite that already holds an admin token may pass it as `token` through tune_with()."""
    return tune_with(port, admin_token(port, sql), changes)


def tune_with(port, token, changes):
    s, current = _call(port, "GET", "/admin/config", token=token)
    if s != 200:
        raise SystemExit(f"smoke_setup: cannot read /admin/config ({s})")
    before = {c["key"]: c["value"] for c in current}
    unknown = [k for k in changes if k not in before]
    if unknown:
        raise SystemExit(f"smoke_setup: unknown settings {unknown}")
    s, body = _call(port, "PUT", "/admin/config", [{"key": k, "value": v} for k, v in changes.items()], token=token)
    if s != 200:
        raise SystemExit(f"smoke_setup: cannot set {changes} ({s} {body})")
    done = []

    def restore():
        if done:
            return
        done.append(1)
        body = [{"key": k, "value": before[k]} for k in changes]
        if _call(port, "PUT", "/admin/config", body, token=token)[0] == 401 and _CREDS:  # the token has expired
            _call(port, "PUT", "/admin/config", body, token=_login(port, *_CREDS))

    atexit.register(restore)
    return restore


def setting_count(port, token):
    """Number of settings the running backend lists (GET /admin/config), so a suite does not hard-code it."""
    s, body = _call(port, "GET", "/admin/config", token=token)
    return len(body) if s == 200 else -1


def settle_monitors(sql, db, seconds=75):
    """The scheduled monitors read their interval after each run: the first run is 10 s after start and the next one
    comes a whole default interval (60 s) later, whatever a suite sets in between. So a suite that sets 5 s intervals
    must let the backend reach `seconds` of uptime before it relies on them. Uptime is taken from the age of the
    oldest connection of the backend's pool to database `db`."""
    import time
    while True:
        up = sql(f"select coalesce(extract(epoch from now() - min(backend_start)), 0)::int from pg_stat_activity "
                 f"where datname='{db}' and pid <> pg_backend_pid()")
        try:
            up = int(up)
        except ValueError:
            return
        if up >= seconds:
            return
        time.sleep(min(5, seconds - up))
