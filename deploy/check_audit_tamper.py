"""Prove the demo-only audit tamper helper against the disposable CI stack."""

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


BASE = "http://localhost:8080/api/v1"
EVIDENCE = Path("/tmp/iitsm-audit-tamper.json")
ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT / "db/tools/tamper-demo-audit.sh"


def api(method, path, token=None, body=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = Request(BASE + path, method=method, headers=headers,
                      data=json.dumps(body).encode() if body is not None else None)
    with urlopen(request, timeout=30) as response:
        return response.status, json.loads(response.read() or b"null")


def verify(token, expected):
    status, result = api("GET", "/audit/verify", token)
    if status != 200 or result["intact"] is not expected:
        raise AssertionError(f"Audit integrity expected {expected}, got {result.get('intact')}")
    if expected and result["recordsChecked"] < 1:
        raise AssertionError("The audit seal did not cover any records")
    if not expected and result["problemCount"] < 1:
        raise AssertionError("Tampering was not identified in the verification details")
    return {"intact": result["intact"], "records_checked": result["recordsChecked"],
            "problem_count": result["problemCount"]}


def main():
    status, login = api("POST", "/auth/login", body={
        "email": "asha.rao@iitsm.demo", "password": "Demo@1234"})
    if status != 200:
        raise AssertionError("Demo administrator login failed")
    token = login["accessToken"]
    seal_status, seal = api("POST", "/audit/seal", token)
    if seal_status != 200 or seal["recordCount"] < 1:
        raise AssertionError("The demo audit seal covered no records")
    before = verify(token, True)

    subprocess.run(["bash", str(HELPER), "tamper"], cwd=ROOT, check=True)
    try:
        altered = verify(token, False)
    finally:
        subprocess.run(["bash", str(HELPER), "restore"], cwd=ROOT, check=True)
    restored = verify(token, True)
    EVIDENCE.write_text(json.dumps({
        "run_at_utc": datetime.now(timezone.utc).isoformat(),
        "scope": "Disposable iitsm-demo Compose database only",
        "seal_record_count": seal["recordCount"],
        "before": before, "altered": altered, "restored": restored,
    }, indent=2) + "\n")
    print("Demo audit seal: intact → tamper detected → restored intact")


if __name__ == "__main__":
    main()
