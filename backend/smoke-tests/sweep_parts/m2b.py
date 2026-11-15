# Sweep part for M2b: POST /auth/google with the fake verifier (GOOGLE_VERIFIER=fake,
# GOOGLE_CLIENT_ID=test-client-id.apps.googleusercontent.com). Executed with the sweep's globals.
import base64 as _m2b_b64
import hashlib as _m2b_hashlib
import hmac as _m2b_hmac
import json as _m2b_json
import time as _m2b_time

_M2B_KEY = b"iitsm-fake-google-id-token-key-for-offline-smoke-runs"
_M2B_AUD = "test-client-id.apps.googleusercontent.com"


def _m2b_enc(data):
    return _m2b_b64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _m2b_token(sub, email):
    now = int(_m2b_time.time())
    claims = {"iss": "https://accounts.google.com", "aud": _M2B_AUD, "sub": sub, "email": email,
              "email_verified": True, "name": "Sweep Employee", "iat": now, "exp": now + 3600}
    head = _m2b_enc(_m2b_json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = _m2b_enc(_m2b_json.dumps(claims).encode())
    sig = _m2b_enc(_m2b_hmac.new(_M2B_KEY, f"{head}.{body}".encode(), _m2b_hashlib.sha256).digest())
    return f"{head}.{body}.{sig}"


_m2b_email = mail("emp")
_m2b_status, _m2b_body = call("POST", "/auth/google",
                              {"idToken": _m2b_token("sweep-sub-" + RUN, _m2b_email)})
ok("POST /auth/google", _m2b_status == 200 and isinstance(_m2b_body, dict) and bool(_m2b_body.get("accessToken")),
   (_m2b_status, _m2b_body))
