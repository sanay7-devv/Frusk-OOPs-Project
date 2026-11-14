"""Reproduce fictional content and reference seeds; standard-library Python only."""
import csv
import json
from collections import Counter
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'docs/content'
SERVICES = {'Payment': 5, 'Database': 5, 'Authentication': 5, 'Network': 4,
            'Cloud Storage': 3, 'Email': 3, 'Intranet Portal': 2, 'Printing': 1}
CATEGORIES = ['Hardware', 'Software', 'Network', 'VPN', 'Wi-Fi', 'Database', 'Cloud',
              'Application', 'Security', 'Phishing', 'Authentication', 'Storage']
SKILLS = ['Networking', 'SQL', 'Cloud', 'Security', 'Linux', 'Hardware',
          'Application Support', 'Payments', 'Authentication']
CATEGORY_SKILLS = {'Hardware':['Hardware'], 'Software':['Application Support'],
 'Network':['Networking'], 'VPN':['Networking'], 'Wi-Fi':['Networking'],
 'Database':['SQL'], 'Cloud':['Cloud'], 'Application':['Application Support','Payments'],
 'Security':['Security'], 'Phishing':['Security'], 'Authentication':['Authentication','Security'],
 'Storage':['Cloud','Linux']}
TECHS = {
 'priya.nair':(5,1,'AVAILABLE',{'Networking':5,'Security':4,'Cloud':3}),
 'tech1':(3,0,'AVAILABLE',{'Networking':4,'Linux':3}),
 'tech2':(5,0,'AVAILABLE',{'SQL':5,'Linux':4}),
 'tech3':(2,0,'AVAILABLE',{'Cloud':4,'Linux':3}),
 'tech4':(4,0,'AWAY',{'Security':5,'Authentication':4}),
 'tech5':(1,0,'BUSY',{'Hardware':4,'Application Support':3,'Payments':2}),
 'karthik':(3,0,'AVAILABLE',{'Networking':4,'SQL':3}),
 'neha':(4,0,'AVAILABLE',{'Application Support':4,'Payments':3,'Authentication':3,'Security':3})}

# Each issue has five distinct reports, preserving recurring-problem analytics.
# service, category, symptom, diagnosed cause, repair, verification
ISSUES = [
 ('Network','VPN','VPN disconnects every few minutes','gateway idle timeout reset to 60 seconds after a patch','restored the approved 30-minute idle timeout and reloaded the gateway','confirmed the session remained connected beyond the previous five-minute failure interval'),
 ('Network','Wi-Fi','Wi-Fi loses signal near meeting rooms','two access points selected overlapping channels','assigned separate channels and reduced excessive transmit power','walked the meeting-room corridor while monitoring packet loss'),
 ('Network','Network','internal hostnames fail to resolve','a stale DNS forwarder remained in the resolver pool','removed the retired forwarder and refreshed the resolver configuration','resolved ten internal hosts through both DNS servers'),
 ('Network','Network','file server cannot be reached','an access-switch uplink negotiated at the wrong speed','replaced the damaged patch cable and restored automatic negotiation','copied a test file and checked uplink error counters'),
 ('Network','VPN','VPN login stalls after entering the code','the gateway clock drifted outside the token validation window','restored NTP synchronization on the gateway','completed a new VPN login with a fresh token'),
 ('Network','Network','desk connection briefly drops during calls','a switch port had repeated spanning-tree topology changes','removed an accidental cable loop and enabled the approved edge-port setting','observed stable topology and completed a ten-minute call'),
 ('Network','Wi-Fi','guest wireless opens no sign-in page','the captive portal certificate chain was incomplete','installed the missing intermediate certificate and reloaded the portal','opened the portal from a clean browser and joined the guest network'),
 ('Network','Network','remote desktop feels unusually laggy','a backup job saturated the branch uplink','moved the backup to its scheduled window and applied the approved traffic policy','measured round-trip latency during a remote desktop session'),
 ('Database','Database','dashboard queries take too long','the incident search query stopped using its composite index after statistics became stale','refreshed table statistics and verified the query execution plan','ran the representative query set and checked its response times'),
 ('Database','Database','application cannot acquire a database connection','an error branch left pooled connections open','patched the connection cleanup path and recycled the affected pool','ran repeated requests and confirmed connection counts returned to baseline'),
 ('Database','Database','read replica shows old records','replication replay paused after the replica disk filled','removed expired local log files and resumed replay','compared the replica replay position with the primary'),
 ('Database','Database','database writes fail with no space left','temporary export files exhausted the data volume','deleted the approved expired exports and increased the temporary-file alert threshold','inserted and read back a test record while checking free space'),
 ('Database','Database','scheduled import waits without finishing','a forgotten maintenance transaction held a table lock','confirmed the session owner and ended the abandoned transaction','reran the import and checked that no blocking lock remained'),
 ('Database','Database','nightly backup reports a permission error','the backup service account lost write access after a directory move','restored the approved directory ownership and reran the backup','restored a sample table into an isolated verification database'),
 ('Authentication','Authentication','sign-in returns to the login page repeatedly','the application callback address differed from the identity-provider registration','corrected the callback registration and cleared the stale login session','signed in from a fresh browser without a redirect loop'),
 ('Authentication','Authentication','account remains locked after a password reset','a saved desktop credential kept submitting the previous password','removed the obsolete saved credential and unlocked the account','confirmed a successful login and no new failed attempts'),
 ('Authentication','Authentication','sign-in certificate is shown as expired','the identity proxy still served the old certificate after renewal','installed the renewed certificate on every proxy node and reloaded TLS','checked the certificate expiry and completed sign-in through each node'),
 ('Authentication','Authentication','password reset link is rejected immediately','reset tokens were checked against a node with a clock offset','synchronized the affected node and issued a fresh reset token','used the new link once and confirmed that reuse was rejected'),
 ('Authentication','Authentication','verification code never arrives','the identity notification queue stopped after a worker restart','restarted the worker with the correct queue credentials','requested a new code and confirmed delivery before expiry'),
 ('Cloud Storage','Storage','shared folder refuses uploads','the team storage quota had been reached by obsolete exports','archived approved exports and released the occupied quota','uploaded a small test file and checked the remaining quota'),
 ('Cloud Storage','Cloud','desktop files stay stuck on syncing','the synchronization client cached an obsolete endpoint','updated the endpoint configuration and restarted synchronization','created a file on one client and read it from a second client'),
 ('Cloud Storage','Storage','shared documents show access denied','a group mapping was removed during a folder permission change','restored the approved group mapping without granting public access','checked access as both an authorized and an unauthorized test user'),
 ('Cloud Storage','Cloud','cloud files open the previous version','a local synchronization conflict kept an older file pinned','preserved both revisions and cleared the obsolete local conflict marker','compared file hashes and opened the chosen version on two clients'),
 ('Payment','Application','payment application times out at checkout','the gateway connection pool was exhausted by unclosed response streams','closed leaked response streams and recycled the gateway client pool','ran a synthetic checkout in the isolated test environment'),
 ('Payment','Application','payment callback leaves transactions pending','the callback worker used an outdated signing certificate','updated the trusted certificate and replayed the approved test callbacks','confirmed that test transactions moved out of pending exactly once'),
 ('Payment','Application','reconciliation report omits recent transactions','the scheduled reconciliation job used the previous cutoff timezone','corrected the UTC cutoff and regenerated the test report','matched the regenerated totals against the test transaction ledger'),
 ('Payment','Application','payment page returns a server error','a deployment omitted the gateway endpoint configuration','restored the approved endpoint configuration and restarted the affected instance','completed synthetic checkout requests and checked the error log'),
 ('Email','Software','messages wait in the outbox for a long time','a mail relay retained a stale upstream route','updated the relay route and released the deferred test messages','sent a message between two demo mailboxes and checked delivery headers'),
 ('Email','Storage','mailbox stops receiving new messages','the mailbox quota was full because of retained attachments','archived approved old attachments and released mailbox space','delivered a fresh test message and checked the quota counter'),
 ('Email','Security','legitimate meeting notices go to spam','an overbroad filtering rule matched a normal calendar header','narrowed the rule and reprocessed the affected demo messages','confirmed delivery of a calendar notice and continued blocking of a test spam message'),
 ('Email','Software','calendar invite appears twice','a retry job lacked a stable message identifier','restored idempotent message identifiers and cleared the duplicate retry entries','sent a test invitation and confirmed a single calendar entry'),
 ('Email','Software','webmail search cannot find recent messages','the mailbox search indexer stopped after its service account rotated','updated the indexer credential and rebuilt the affected index','searched for a newly received test subject and an older known subject'),
 ('Intranet Portal','Application','staff directory page returns an error','the directory service address changed but the portal cache kept the old address','refreshed the directory endpoint and invalidated the affected portal cache','opened the directory and searched for a fictional test employee'),
 ('Intranet Portal','Software','policy document link opens a missing page','a publishing update moved the document without retaining its redirect','restored the approved redirect and corrected the navigation link','followed the navigation link and an older bookmarked address'),
 ('Intranet Portal','Application','portal home page loads very slowly','a homepage widget waited synchronously for an unavailable statistics feed','disabled the failed widget using its feature setting and limited its request timeout','loaded the homepage repeatedly and checked that other widgets remained available'),
 ('Intranet Portal','Authentication','portal signs out when opening the leave page','the leave module used a cookie path that excluded its callback route','corrected the cookie path and renewed the test session','opened the leave page and returned to the portal without another login'),
 ('Printing','Hardware','printer is offline although power is on','the printer retained an old static gateway after a subnet change','applied the approved network settings and renewed the print-server port','printed a network test page and checked connectivity from the print server'),
 ('Printing','Software','print jobs remain stuck in the queue','a malformed spool file blocked the queue worker','removed only the damaged job and restarted the spooler','printed two test documents in order'),
 ('Printing','Hardware','printer produces repeated paper jams','worn pickup rollers failed to separate sheets','replaced the pickup rollers and cleaned the paper path','printed a ten-page test without a jam'),
 ('Printing','Software','document margins are cut off when printed','a generic driver selected the wrong paper size','installed the approved model driver and selected the correct paper profile','printed a page containing marked margins on all four sides')
]

def priority(impact, urgency, users, service, category):
    multiplier = Decimal('1.5') if users >= 101 else Decimal('1.25') if users >= 10 else Decimal('1')
    base = impact * urgency * SERVICES[service]
    score = int(base * multiplier)
    band = 'P1' if score >= 60 else 'P2' if score >= 30 else 'P3' if score >= 10 else 'P4'
    rule = None
    if category == 'Security' and SERVICES[service] >= 4:
        band = 'P2' if band in ('P3', 'P4') else band
        rule = 'Security incident on a critical service is at least P2'
    if service == 'Payment' and impact >= 4:
        band, rule = 'P1', 'Payment service is always P1'
    return dict(impact=impact, urgency=urgency, criticality=SERVICES[service],
        usersMultiplier=float(multiplier), baseScore=base, score=score, band=band, overrideRule=rule)

def write_csv(path, fields, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fields, lineterminator='\n'); w.writeheader(); w.writerows(rows)

def sentence_case(text):
    return text[:1].upper()+text[1:]

def sql(value):
    if value is None: return 'NULL'
    if isinstance(value, bool): return 'true' if value else 'false'
    if isinstance(value, (int, float)): return str(value)
    return "'" + str(value).replace("'", "''") + "'"

def build_history():
    quotas={'Network':[3,10,20,7], 'Database':[2,7,15,6], 'Authentication':[1,5,11,8],
            'Cloud Storage':[1,4,9,6], 'Payment':[3,6,9,2], 'Email':[0,5,12,8],
            'Intranet Portal':[0,3,10,7], 'Printing':[0,0,4,16]}
    remaining={s:Counter(dict(zip(['P1','P2','P3','P4'],q))) for s,q in quotas.items()}
    rows=[]
    impact_text={1:'One person is affected by this minor inconvenience',2:'A few people are affected, with a workaround available',3:'Our team is affected and work is slowed',4:'An entire department has important work blocked',5:'Core business activity is stopped'}
    urgency_text={1:'A fix can wait a week',2:'A fix is needed within a few days',3:'A fix is needed within a day',4:'A fix is needed within hours',5:'Immediate action is needed'}
    contexts=['Since the morning update','During the afternoon shift','When starting work today','While checking the shared workspace','After reconnecting this morning']
    assignees={s:next(t for t,v in TECHS.items() if set(v[3]) & set(CATEGORY_SKILLS[s])) for s in CATEGORIES}
    for n,issue in enumerate(ISSUES):
        service, category, symptom, cause, repair, verify=issue
        for variant in range(5):
            i=len(rows)
            # Consume high-priority quotas first where feasible, including low-criticality services.
            desired=next(p for p in ['P1','P2','P3','P4'] if remaining[service][p] and any(priority(a,b,u,service,category)['band']==p for a in range(1,6) for b in range(1,6) for u in [1,8,25,150]))
            combos=[(a,b,u) for a in range(1,6) for b in range(1,6) for u in [1,8,25,150]
                    if priority(a,b,u,service,category)['band']==desired
                    and u in {1:[1],2:[8],3:[25],4:[25,150],5:[150]}[a]]
            impact,urgency,users=combos[(i*7+variant)%len(combos)]
            remaining[service][desired]-=1
            title=[sentence_case(symptom),f'{sentence_case(symptom)} in the shared workspace',
                   f'Need help: {symptom}',f'{sentence_case(symptom)} again today',
                   f'Still seeing this: {symptom}'][variant]
            description=f'{contexts[variant]}, {symptom}. {impact_text[impact]}; {users} user'+(' is' if users==1 else 's are')+f' affected. {urgency_text[urgency]}.'
            if variant==4: description=description.replace('this morning','this moring')
            response,resolution=(3,20) if service=='Payment' and desired=='P1' else (10,60) if service=='Payment' and desired=='P2' else {'P1':(5,30),'P2':(15,120),'P3':(60,480),'P4':(240,1440)}[desired]
            minutes=max(8,int(resolution*[.45,.65,.85,1.05,.55][variant]))
            rows.append(dict(title=title,description=description,service=service,category=category,
                impact=impact,urgency=urgency,affected_users=users,
                reporter_email=f'employee{1+i%8}@iitsm.demo', assignee_email=assignees[category]+'@iitsm.demo',
                days_ago_created=2+(i*13)%89,minutes_to_resolve=minutes,
                root_cause=cause[0].upper()+cause[1:]+'.',
                resolution_notes=f'Inspection confirmed that {cause}. The technician {repair} and {verify}; '+['added a configuration check to the maintenance checklist.','reviewed the change history and documented the regression trigger.','compared the repaired configuration with the approved baseline.','added a targeted operational alert for recurrence.','reviewed the repeated failure with the service owner and documented prevention steps.'][variant],
                resolution_steps=f'1. Reproduced report {i+1} in the demo environment. 2. Inspected the relevant logs and configuration. 3. {sentence_case(repair)}. 4. {sentence_case(verify)}. 5. Asked the reporter to confirm recovery.',
                reusable_solution='true' if variant==0 else 'false',
                feedback_rating='' if i%10==0 else [5,4,4,5,3,4,5,2,4,5][i%10]))
    assert len(rows)==200 and not any(v for counts in remaining.values() for v in counts.values()),remaining
    fields=list(rows[0]); write_csv(CONTENT/'historical_incidents.csv',fields,rows)
    for n in range(8): write_csv(CONTENT/f'batches/history_{n+1:02d}.csv',fields,rows[n*25:(n+1)*25])
    return rows

def build_reference():
    # Cost-10 BCrypt generated with bcryptjs; verified separately by tools/check_content.py workflow.
    password_hash='$2a$10$W9XULnML.jFD3o1Sy9TkDu0iIyr7RJzqEZSguLKTICoQSOGKgJxWu'
    names={'asha.rao':'Asha Rao','rahul.mehta':'Rahul Mehta','priya.nair':'Priya Nair','karthik':'Karthik Demo','neha':'Neha Demo'}
    handles=['asha.rao','rahul.mehta','priya.nair']+[f'tech{i}' for i in range(1,6)]+[f'employee{i}' for i in range(1,9)]+['karthik','neha']
    seed=['-- DEV/DEMO ONLY. Run once on a fresh migrated database, inside a transaction.','BEGIN;']
    for i,h in enumerate(handles):
        name=names.get(h, h.replace('employee','Employee ').replace('tech','Technician '))
        seed.append(f'INSERT INTO users(name,email,password_hash) VALUES ({sql(name)},{sql(h+"@iitsm.demo")},{sql(password_hash)});')
        user=f"(SELECT id FROM users WHERE email={sql(h+'@iitsm.demo')})"
        roles=['EMPLOYEE']+(['TECHNICIAN'] if h in TECHS else [])+(['ADMINISTRATOR'] if h in ['asha.rao','rahul.mehta','neha'] else [])
        for role in roles: seed.append(f'INSERT INTO user_roles(user_id,role_type) VALUES ({user},{sql(role)});')
        seed.append(f'INSERT INTO employee_profiles(user_id,department,location) VALUES ({user},{sql(["Finance","HR","Sales","Engineering","Operations","Support"][i%6])},\'Demo office\');')
        if h in TECHS:
            exp,level,avail,_=TECHS[h]
            seed.append(f'INSERT INTO technician_profiles(user_id,experience_level,escalation_level,availability,max_load) VALUES ({user},{exp},{level},{sql(avail)},10);')
        if 'ADMINISTRATOR' in roles:
            scope='IT_MANAGER' if h=='rahul.mehta' else 'SYSTEM_ADMIN'
            seed.append(f'INSERT INTO administrator_profiles(user_id,scope) VALUES ({user},{sql(scope)});')
    for s in SKILLS: seed.append(f'INSERT INTO skills(name) VALUES ({sql(s)});')
    for h,(_,_,_,skills) in TECHS.items():
        for skill,proficiency in skills.items():
            seed.append(f'INSERT INTO technician_skills VALUES ((SELECT id FROM users WHERE email={sql(h+"@iitsm.demo")}),(SELECT id FROM skills WHERE name={sql(skill)}),{proficiency});')
    parents={'VPN':'Network','Wi-Fi':'Network','Phishing':'Security'}
    # Parents inserted before children, without relying on numeric IDs.
    for c in [c for c in CATEGORIES if c not in parents]+list(parents):
        parent=f'(SELECT id FROM categories WHERE name={sql(parents[c])})' if c in parents else 'NULL'
        seed.append(f'INSERT INTO categories(name,parent_id) VALUES ({sql(c)},{parent});')
        for skill in CATEGORY_SKILLS[c]: seed.append(f'INSERT INTO category_skills VALUES ((SELECT id FROM categories WHERE name={sql(c)}),(SELECT id FROM skills WHERE name={sql(skill)}));')
    for s,criticality in SERVICES.items(): seed.append(f'INSERT INTO services(name,owner,criticality,always_p1,description) VALUES ({sql(s)},\'Demo IT Operations\',{criticality},{sql(s=="Payment")},{sql("Fictional "+s+" IT service")});')
    dependencies={'Payment':['Database','Authentication','Network'],'Authentication':['Database'],'Cloud Storage':['Network'],'Email':['Network'],'Intranet Portal':['Authentication','Database']}
    for s,targets in dependencies.items():
        for target in targets: seed.append(f'INSERT INTO service_dependencies VALUES ((SELECT id FROM services WHERE name={sql(s)}),(SELECT id FROM services WHERE name={sql(target)}));')
    for p,(response,resolution) in {'P1':(5,30),'P2':(15,120),'P3':(60,480),'P4':(240,1440)}.items(): seed.append(f'INSERT INTO sla_policies(service_id,priority,response_minutes,resolution_minutes) VALUES (NULL,{sql(p)},{response},{resolution});')
    for p,response,resolution in [('P1',3,20),('P2',10,60)]: seed.append(f'INSERT INTO sla_policies(service_id,priority,response_minutes,resolution_minutes) VALUES ((SELECT id FROM services WHERE name=\'Payment\'),{sql(p)},{response},{resolution});')
    for p,timeout in [('P1',10),('P2',30)]:
        for level in range(1,4): seed.append(f'INSERT INTO escalation_policies(priority,level,timeout_minutes) VALUES ({sql(p)},{level},{timeout});')
    config=json.loads((CONTENT/'config_defaults.json').read_text())
    for item in config:
        seed.append(f"INSERT INTO app_config(key,value,description) VALUES ({sql(item['key'])},{sql(item['value'])},{sql(item['description'])});")
    seed.append('COMMIT;')
    (ROOT/'db/seed/01_reference.sql').write_text('\n'.join(seed)+'\n')
    (ROOT/'db/demo/01_timer_overrides.sql').write_text("-- DEMO ONLY; not production settings.\nBEGIN;\nUPDATE escalation_policies SET timeout_minutes=1;\nUPDATE app_config SET value='30' WHERE key='sla.monitor.interval.seconds';\nUPDATE app_config SET value='15' WHERE key='escalation.monitor.interval.seconds';\nUPDATE app_config SET value='0.033' WHERE key='verify.auto.hours';\nCOMMIT;\n-- Backend must also schedule AutoVerifyJob every 30 seconds in demo profile.\n")
    write_csv(CONTENT/'seed_accounts.csv',['email','name','roles'],[dict(email=h+'@iitsm.demo',name=names.get(h,h),roles=';'.join(['EMPLOYEE']+(['TECHNICIAN'] if h in TECHS else [])+(['ADMINISTRATOR'] if h in ['asha.rao','rahul.mehta','neha'] else []))) for h in handles])
    (CONTENT/'catalog.json').write_text(json.dumps(dict(services=SERVICES,categories=CATEGORIES,categorySkills=CATEGORY_SKILLS,technicians=TECHS),indent=2)+'\n')


if __name__ == '__main__':
    build_reference(); build_history()
    print('Generated reference data and 200 fictional historical incidents.')
