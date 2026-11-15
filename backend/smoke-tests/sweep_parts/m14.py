# M14 (session C): attachments, sealed audit trail. Executed by endpoint_sweep.py with its globals.
import urllib.error as _m14_err
import urllib.request as _m14_req
import uuid as _m14_uuid

_m14_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
_m14_boundary = "----m14sweep" + _m14_uuid.uuid4().hex
_m14_body = (f"--{_m14_boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"sweep.png\"\r\n"
             f"Content-Type: image/png\r\n\r\n").encode() + _m14_png + f"\r\n--{_m14_boundary}--\r\n".encode()
_m14_up = _m14_req.Request(f"{BASE}/incidents/{iid}/attachments", data=_m14_body, method="POST")
_m14_up.add_header("Content-Type", "multipart/form-data; boundary=" + _m14_boundary)
_m14_up.add_header("Authorization", "Bearer " + E)
_m14_att = None
try:
    with _m14_req.urlopen(_m14_up, timeout=30) as _m14_r:
        _m14_status, _m14_att = _m14_r.status, json.loads(_m14_r.read().decode())
except _m14_err.HTTPError as _m14_e:
    _m14_status = _m14_e.code
ok("POST /incidents/{id}/attachments", _m14_status == 201 and _m14_att and _m14_att["filename"] == "sweep.png"
   and _m14_att["sizeBytes"] == len(_m14_png), _m14_status)
if _m14_status == 201:
    hits.add(("POST", "/api/v1/incidents/{id}/attachments"))

_m14_s, _m14_list = call("GET", f"/incidents/{iid}/attachments", token=E)
ok("GET /incidents/{id}/attachments", _m14_s == 200 and isinstance(_m14_list, list) and len(_m14_list) >= 1
   and (_m14_att is None or any(a["id"] == _m14_att["id"] for a in _m14_list)), (_m14_s, _m14_list))
if _m14_s == 200:
    hits.add(("GET", "/api/v1/incidents/{id}/attachments"))

if _m14_att:
    _m14_dl = _m14_req.Request(f"{BASE}/attachments/{_m14_att['id']}/download", method="GET")
    _m14_dl.add_header("Authorization", "Bearer " + E)
    try:
        with _m14_req.urlopen(_m14_dl, timeout=30) as _m14_r:
            _m14_dstatus, _m14_dbytes = _m14_r.status, _m14_r.read()
    except _m14_err.HTTPError as _m14_e:
        _m14_dstatus, _m14_dbytes = _m14_e.code, b""
    ok("GET /attachments/{id}/download", _m14_dstatus == 200 and _m14_dbytes == _m14_png, _m14_dstatus)
    if _m14_dstatus == 200:
        hits.add(("GET", "/api/v1/attachments/{id}/download"))

_m14_s, _m14_seal = call("POST", "/audit/seal", token=A)
ok("POST /audit/seal", _m14_s in (200, 204) and (_m14_s == 204 or len(_m14_seal["hash"]) == 64), (_m14_s, _m14_seal))
if _m14_s in (200, 204):
    hits.add(("POST", "/api/v1/audit/seal"))

_m14_s, _m14_v = call("GET", "/audit/verify", token=A)
ok("GET /audit/verify", _m14_s == 200 and "intact" in _m14_v and "firstProblem" in _m14_v, (_m14_s, _m14_v))
if _m14_s == 200:
    hits.add(("GET", "/api/v1/audit/verify"))
