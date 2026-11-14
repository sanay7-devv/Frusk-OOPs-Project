"""Exercise real seeded logins and role boundaries; never print tokens or passwords."""
import csv
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('IITSM_API_URL', 'http://localhost:8080/api/v1')
evidence = []


def request(path, expected=200, method='GET', body=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = Request(BASE + path, headers=headers, method=method,
                  data=json.dumps(body).encode() if body is not None else None)
    try:
        with urlopen(req, timeout=20) as response:
            status = response.status
            raw = response.read()
    except HTTPError as error:
        status = error.code
        raw = error.read()
    evidence.append({'method':method, 'path':path, 'expected':expected, 'actual':status})
    assert status == expected, f'{method} {path}: expected {expected}, got {status}'
    return json.loads(raw) if raw else None


def main():
    with (ROOT/'docs/content/seed_accounts.csv').open(newline='') as handle:
        accounts = list(csv.DictReader(handle))
    sessions = {}
    for account in accounts:
        handle = account['email'].split('@')[0]
        session = request('/auth/login', method='POST', body={
            'email':account['email'], 'password':'Demo@1234'})
        assert session['accessToken'] and session['refreshToken']
        assert session['user']['email'] == account['email']
        assert set(session['user']['roles']) == set(account['roles'].split(';'))
        sessions[handle] = session
    for handle in ('employee1', 'tech1', 'priya.nair', 'asha.rao', 'karthik', 'neha'):
        token = sessions[handle]['accessToken']
        request('/auth/me', token=token)
        request('/incidents', token=token)
    request('/admin/users', token=sessions['asha.rao']['accessToken'])
    request('/admin/users', token=sessions['employee1']['accessToken'], expected=403)
    request('/admin/users', token=sessions['karthik']['accessToken'], expected=403)
    request('/technicians/me/queue', token=sessions['karthik']['accessToken'])
    request('/auth/me', expected=401)
    request('/auth/me', token='invalid-token', expected=401)
    request('/auth/login', method='POST', body={
        'email':'employee1@iitsm.demo','password':'incorrect-demo-password'}, expected=401)
    rotated = request('/auth/refresh', method='POST', body={
        'refreshToken':sessions['employee1']['refreshToken']})
    assert rotated['refreshToken'] != sessions['employee1']['refreshToken']
    request('/auth/logout', method='POST', token=rotated['accessToken'], expected=204,
            body={'refreshToken':rotated['refreshToken']})
    request('/auth/refresh', method='POST', expected=401,
            body={'refreshToken':rotated['refreshToken']})
    print(f'Passed {len(evidence)} API checks, including login for every seeded role.')


if __name__ == '__main__':
    try:
        main()
    finally:
        Path('/tmp/iitsm-api-smoke.json').write_text(json.dumps(evidence, indent=2))
