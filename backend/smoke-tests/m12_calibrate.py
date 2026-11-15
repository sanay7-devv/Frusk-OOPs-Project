"""Calibration of the TF-IDF thresholds (M12, DEC-M12). Creates a small labelled set against a running backend and
prints the similarity of every labelled pair, then the best thresholds. The same set is the accuracy evaluation
quoted in the docs. Run: SMOKE_PORT=8083 SMOKE_DB=iitsm_m12 python m12_calibrate.py"""
import json
import sys

from m12_common import call, setup_world, report

BACKGROUND = [
    ("Monitor flickers", "My second monitor flickers whenever the screen saver starts on my desk computer."),
    ("Teams meeting audio echo", "People hear an echo of their own voice during Teams meetings from my laptop."),
    ("Request access to shared drive", "Please give me access to the finance shared drive folder for quarterly reports."),
    ("Badge reader at gate not working", "The badge reader at the north gate does not open the door for anyone."),
    ("Software license expired", "The design software license expired this morning and the application refuses to start."),
    ("New laptop setup", "Please set up my new laptop with the standard software image and encryption."),
    ("Website certificate warning", "The intranet site shows a certificate warning in the browser since yesterday."),
    ("Phone extension has no dial tone", "Extension 4412 has no dial tone since the office move."),
]

# (existing incident title, description) and the labelled queries made against it
EXISTING = {
    "vpn": ("VPN disconnects every few minutes",
            "Since this morning the VPN connection drops every few minutes and I have to reconnect each time."),
    "outlook": ("Outlook cannot send emails",
                "Outlook shows error 0x800CCC0E when sending email and the messages stay in the outbox."),
    "printer": ("Printer on floor 3 jammed",
                "The floor 3 printer reports a paper jam and nothing prints for anyone on the floor."),
    "login": ("Cannot log in to the employee portal",
              "Login to the employee portal fails with invalid credentials after the password reset."),
    "wifi": ("Wi-Fi very slow in building B",
             "The wireless network in building B is extremely slow and web pages take a minute to load."),
    "db": ("Sales database report queries time out",
           "Report queries against the sales database time out after thirty seconds since the upgrade."),
}

QUERIES = [
    # label, existing key, title, description
    ("DUP", "vpn", "VPN keeps dropping", "My VPN connection keeps dropping every couple of minutes and I must reconnect."),
    ("DUP", "outlook", "Unable to send mail from Outlook",
     "Sending email from Outlook fails with error 0x800CCC0E and the messages stay in the outbox."),
    ("DUP", "printer", "Floor 3 printer paper jam", "Printer on the third floor says paper jam and no documents print."),
    ("DUP", "login", "Portal login failing after password reset",
     "I reset my password but the employee portal login says invalid credentials."),
    ("DUP", "wifi", "Building B wifi slow", "The wifi in building B is very slow and web pages take a minute to load."),
    ("DUP", "db", "Sales database reports timing out", "Report queries on the sales database time out after thirty seconds."),
    ("DUP", "vpn", "VPN disconnecting", "The VPN connection disconnects every few minutes this morning."),
    ("DUP", "outlook", "Outlook outbox stuck", "Emails stay in the Outlook outbox, error 0x800CCC0E when sending."),
    ("REL", "vpn", "VPN client will not install", "Installing the VPN client on my new laptop fails with a certificate error."),
    ("REL", "outlook", "Outlook calendar not syncing", "Calendar invites do not sync in Outlook on my phone."),
    ("REL", "printer", "Printer out of toner on floor 3", "The floor 3 printer displays a toner low warning and prints faint pages."),
    ("REL", "login", "Employee portal very slow", "The employee portal takes a long time to load after login."),
    ("REL", "wifi", "Wi-Fi password change", "How do I change the wifi password for building B guest network."),
    ("REL", "db", "Sales database backup failed", "Last night's backup of the sales database failed with a disk error."),
    ("NON", "vpn", "Laptop battery drains quickly", "My laptop battery lasts only one hour after the update."),
    ("NON", "outlook", "Request for a second monitor", "Please provide a second monitor for my desk in room 12."),
    ("NON", "printer", "Excel crashes on large files", "Excel closes unexpectedly when I open spreadsheets above 50 MB."),
    ("NON", "login", "Meeting room projector blurry", "The projector in meeting room 5 shows a blurry picture."),
    ("NON", "wifi", "Keyboard keys sticking", "Several keys on my keyboard stick and repeat letters."),
    ("NON", "db", "Office chair broken", "The adjustment lever of my office chair is broken."),
]


def main():
    w = setup_world()
    # expose raw scores: lowest related threshold, so every non-zero score is returned
    call("PUT", "/admin/config", [{"key": "dup.tfidf.threshold.duplicate", "value": "0.9"},
                                  {"key": "dup.tfidf.threshold.related", "value": "0.01"},
                                  {"key": "ai.ratelimit.per.minute", "value": "1000"}], token=w["A"])
    ids = {}
    for title, desc in BACKGROUND:
        report(w, title, desc, token=w["E"])
    for key, (title, desc) in EXISTING.items():
        s, b = report(w, title, desc, token=w["O"])
        ids[key] = b["id"]
    rows = []
    for label, key, title, desc in QUERIES:
        s, b = call("POST", "/intelligence/similar", {"title": title, "description": desc, "serviceId": w["svc"]},
                    token=w["E"])
        if s != 200:
            print("similar failed", s, b)
            sys.exit(1)
        scores = {m["incidentId"]: m["similarity"] for m in b}
        # the lowest threshold in the contract is 0, so the endpoint filters; ask the engine for the raw score
        rows.append((label, key, title, scores.get(ids[key], 0.0), max(scores.values(), default=0.0)))
    call("PUT", "/admin/config", [{"key": "dup.tfidf.threshold.related", "value": "0.35"},
                                  {"key": "dup.tfidf.threshold.duplicate", "value": "0.55"},
                                  {"key": "ai.ratelimit.per.minute", "value": "20"}], token=w["A"])
    for r in rows:
        print(f"{r[0]}  {r[1]:8s} target={r[3]:.2f} best={r[4]:.2f}  {r[2]}")
    print(json.dumps({"dup": [r[3] for r in rows if r[0] == 'DUP'], "rel": [r[3] for r in rows if r[0] == 'REL'],
                      "non": [r[3] for r in rows if r[0] == 'NON']}))


if __name__ == "__main__":
    main()
