"""Run T10/T16 against the disposable seeded stack; report unmet contracts explicitly."""
import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from api_smoke import BASE, request


def send(path, token, data, content_type):
    req = Request(BASE + path, data=data, method='POST', headers={
        'Authorization': 'Bearer ' + token, 'Content-Type': content_type})
    try:
        with urlopen(req, timeout=30) as response:
            return response.status, response.read().decode()
    except HTTPError as error:
        return error.code, error.read().decode()


def flatten(rows):
    return [item for row in rows for item in [row, *flatten(row.get('children', []))]]


def main():
    token = request('/auth/login', method='POST', body={
        'email': 'employee1@iitsm.demo', 'password': 'Demo@1234'})['accessToken']
    services = request('/services', token=token)
    categories = flatten(request('/categories', token=token))
    service = next(row['id'] for row in services if row['name'] == 'Network')
    category = next(row['id'] for row in categories if row['name'] == 'VPN')
    body = {'title': 'VPN keeps dropping',
            'description': 'The VPN connection drops about every five minutes on both home Wi-Fi and a mobile hotspot. Reconnecting restores it briefly, but the tunnel disconnects again.',
            'serviceId': service, 'categoryId': category,
            'impact': 2, 'urgency': 2, 'affectedUsers': 25,
            'confirmNotDuplicate': False}
    results = []
    status, raw = send('/incidents', token, json.dumps(body).encode(), 'application/json')
    payload = json.loads(raw)
    results.append({'case': 'T16', 'check': 'duplicate warning', 'expected': '409 DUPLICATE_INCIDENT',
                    'status': status, 'response': payload,
                    'passed': status == 409 and payload.get('code') == 'DUPLICATE_INCIDENT'})
    body['confirmNotDuplicate'] = True
    confirmed = request('/incidents', expected=201, method='POST', token=token, body=body)
    incident_id = confirmed['id']
    results.append({'case': 'T16', 'check': 'confirmed submission', 'expected': 201, 'status': 201, 'passed': True})
    for filename, content_type, content in [('blocked.exe', 'application/octet-stream', b'fictional executable fixture'),
                                          ('large.txt', 'text/plain', b'x' * (6 * 1024 * 1024))]:
        boundary = 'iitsm-contract-boundary'
        data = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\n'
                f'Content-Type: {content_type}\r\n\r\n').encode() + content + f'\r\n--{boundary}--\r\n'.encode()
        status, raw = send(f'/incidents/{incident_id}/attachments', token, data,
                           'multipart/form-data; boundary=' + boundary)
        # A missing route (404) does not demonstrate validation; require a useful validation response.
        results.append({'case': 'T10', 'check': filename, 'expected': '400/413/415 validation rejection',
                        'status': status, 'response': raw[:1000], 'passed': status in (400, 413, 415)})
    attachments = request(f'/incidents/{incident_id}/attachments', token=token)
    results.append({'case': 'T10', 'check': 'nothing stored', 'expected': [],
                    'actual': attachments, 'status': 200, 'passed': attachments == []})
    boundary = 'iitsm-valid-control'
    data = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="evidence.txt"\r\n'
            'Content-Type: text/plain\r\n\r\nFictional attachment for the test workflow.\r\n'
            f'--{boundary}--\r\n').encode()
    status, raw = send(f'/incidents/{incident_id}/attachments', token, data,
                       'multipart/form-data; boundary=' + boundary)
    results.append({'case': 'T10', 'check': 'valid upload control', 'expected': 201,
                    'status': status, 'response': raw[:1000], 'passed': status == 201})
    Path('/tmp/iitsm-handbook-contracts.json').write_text(json.dumps(results, indent=2))
    for result in results:
        print(f"{result['case']} {result['check']}: {'PASS' if result['passed'] else 'FAIL'} (HTTP {result['status']})")
    return 0 if all(row['passed'] for row in results) else 1


if __name__ == '__main__':
    raise SystemExit(main())
