# A12 (password reset, two-step verification), A4 (simulated push devices), S1 (service desk simulator).
# Executed by endpoint_sweep.py with its globals (call, ok, mail, token, A, RUN, PW). The password reset confirm
# step needs the mail catcher (Mailpit API on 8025) to read the link; without it that one operation is not hit.
import base64 as _b64
import hashlib as _hl
import hmac as _hm
import re as _re
import struct as _st
import time as _tm
import urllib.request as _ur


def _a12_totp(b32, step):
    key = _b64.b32decode(b32 + "=" * (-len(b32) % 8))
    digest = _hm.new(key, _st.pack(">Q", step), _hl.sha1).digest()
    offset = digest[-1] & 0x0F
    return f"{(_st.unpack('>I', digest[offset:offset + 4])[0] & 0x7FFFFFFF) % 1_000_000:06d}"


def _a12_user(tag):
    s, b = call("POST", "/auth/register", {"name": f"Sweep {tag}", "email": mail(tag), "password": PW})
    return b["user"]["id"], token(mail(tag))


# ---------------------------------------------------------------- two-step verification
_u_id, _u = _a12_user("mfa1")
s, b = call("GET", "/auth/mfa", token=_u)
ok("GET /auth/mfa -> enabled false", s == 200 and b == {"enabled": False}, (s, b))
s, b = call("POST", "/auth/mfa/setup", token=_u)
ok("POST /auth/mfa/setup -> secret and otpauth address", s == 200 and b["otpauthUri"].startswith("otpauth://"), (s, b))
_secret = b["secret"]
s, _ = call("POST", "/auth/mfa/enable", {"code": _a12_totp(_secret, int(_tm.time()) // 30)}, token=_u)
ok("POST /auth/mfa/enable -> 204", s == 204, s)
s, _ = call("POST", "/auth/mfa/disable", {"code": _a12_totp(_secret, int(_tm.time()) // 30 + 1)}, token=_u)
ok("POST /auth/mfa/disable (next code) -> 204", s == 204, s)

_v_id, _v = _a12_user("mfa2")
_secret2 = call("POST", "/auth/mfa/setup", token=_v)[1]["secret"]
call("POST", "/auth/mfa/enable", {"code": _a12_totp(_secret2, int(_tm.time()) // 30)}, token=_v)
s, _ = call("POST", f"/admin/users/{_v_id}/mfa/reset", token=A)
ok("POST /admin/users/{id}/mfa/reset -> 204", s == 204, s)

# ---------------------------------------------------------------- simulated push devices
s, d = call("POST", "/notifications/devices", {"token": f"sweep-device-token-{RUN}-aaaa", "platform": "ANDROID"}, token=_u)
ok("POST /notifications/devices -> 200/201", s in (200, 201), (s, d))
s, b = call("GET", "/notifications/devices", token=_u)
ok("GET /notifications/devices lists it", s == 200 and any(x["id"] == d["id"] for x in b), (s, b))
s, _ = call("DELETE", f"/notifications/devices/{d['id']}", token=_u)
ok("DELETE /notifications/devices/{id} -> 204", s == 204, s)

# ---------------------------------------------------------------- service desk simulator
s, b = call("POST", "/admin/simulations", {}, token=A)
ok("POST /admin/simulations -> 200 with results", s == 200 and "results" in b, (s, str(b)[:200]))
_strategy = next(c["value"] for c in call("GET", "/admin/config", token=A)[1] if c["key"] == "assignment.strategy")
s, _ = call("POST", "/admin/simulations/apply", {"strategy": _strategy}, token=A)
ok("POST /admin/simulations/apply (same strategy) -> 204", s == 204, s)

# ---------------------------------------------------------------- password reset (confirm reads the link from Mailpit)
_w_id, _w = _a12_user("reset1")
try:
    _ur.urlopen(_ur.Request("http://localhost:8025/api/v1/messages", method="DELETE"), timeout=3).read()
    _mail_up = True
except Exception:
    _mail_up = False
s, _ = call("POST", "/auth/password-reset/request", {"email": mail("reset1")})
ok("POST /auth/password-reset/request -> 202", s == 202, s)
if _mail_up:
    _found = None
    _end = _tm.time() + 10
    while _tm.time() < _end and not _found:
        for _m in json.loads(_ur.urlopen("http://localhost:8025/api/v1/messages", timeout=5).read())["messages"]:
            if any(t["Address"].lower() == mail("reset1").lower() for t in _m["To"]):
                _text = json.loads(_ur.urlopen("http://localhost:8025/api/v1/message/" + _m["ID"], timeout=5).read())["Text"]
                _hit = _re.search(r"reset-password\?token=([A-Za-z0-9_-]+)", _text)
                _found = _hit.group(1) if _hit else None
        _tm.sleep(0.5)
    # the password policy refuses words of the user's name (here "Sweep"), so the new password has none
    s, _ = call("POST", "/auth/password-reset/confirm", {"token": _found or "x" * 43, "newPassword": "Ab9-Zq" + RUN + "7Kd"})
    ok("POST /auth/password-reset/confirm -> 204", s == 204, (s, _found is not None))
else:
    ok("POST /auth/password-reset/confirm skipped (no Mailpit on 8025)", True)
