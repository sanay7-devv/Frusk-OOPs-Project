"""Produce 12 recent non-Payment fixtures; one-time dev/demo loading only."""
import json
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'))
from build_content import priority, sql

fixtures=[
 ('Wi-Fi down on floor 3','Network','Wi-Fi','tech1','IN_PROGRESS',2,2,25,10,True),
 ('Cannot reach file server','Network','Network','tech1','IN_PROGRESS',2,2,25,12,True),
 ('VPN disconnects','Network','VPN','tech1','ACKNOWLEDGED',2,2,25,8,True),
 ('VPN disconnects every few minutes','Network','VPN','tech1','ASSIGNED',2,2,25,1,False),
 ('Reception printer is offline','Printing','Hardware','tech5','IN_PROGRESS',4,2,25,355,False),
 ('Training room queue is stuck','Printing','Software','tech5','ASSIGNED',4,2,25,6,False),
 ('Dispatch printer needs a driver update','Printing','Software','tech5','IN_PROGRESS',4,2,25,7,False),
 ('Print margins need the approved paper profile','Printing','Software','tech5','ACKNOWLEDGED',4,2,25,8,False),
 ('Shared printer cannot scan to a folder','Printing','Hardware','tech5','ASSIGNED',4,2,25,9,False),
 ('Database report blocked beyond its target','Database','Database','tech2','IN_PROGRESS',3,2,25,130,False),
 ('Shared folder access awaiting reporter details','Cloud Storage','Storage','tech3','PENDING_USER_INFO',2,2,25,40,False),
 ('Sign-in loop fixed, awaiting confirmation','Authentication','Authentication','neha','RESOLVED',2,2,1,20,False)
]

def generate():
    out=['-- DEV/DEMO ONLY. Load after reference and history SQL. One shot; not idempotent.','BEGIN;',"INSERT INTO problem_records(title,service_id,status,created_at) VALUES ('Demo: correlated Network reports',(SELECT id FROM services WHERE name='Network'),'OPEN',transaction_timestamp()-interval '15 minutes');"]
    for n,(title,service,category,tech,status,impact,urgency,users,age,cluster) in enumerate(fixtures,1):
        p=priority(impact,urgency,users,service,category)
        response,resolution={'P1':(5,30),'P2':(15,120),'P3':(60,480),'P4':(240,1440)}[p['band']]
        desc='The VPN connection drops about every five minutes on both home Wi-Fi and a mobile hotspot. Reconnecting restores it briefly, but the tunnel disconnects again.' if n==4 else f'{title}. This fictional fixture demonstrates the {status} workflow and requires the next action shown in the incident view.'
        problem="(SELECT id FROM problem_records WHERE title='Demo: correlated Network reports')" if cluster else 'NULL'
        ack='NULL' if status=='ASSIGNED' else "started + interval '1 minute'"
        resolved="started+interval '10 minutes'" if status=='RESOLVED' else 'NULL'
        paused="transaction_timestamp()-interval '20 minutes'" if status=='PENDING_USER_INFO' else 'NULL'
        broken=n==10
        out.append(f"""DO $$
DECLARE k BIGINT; actor_key BIGINT; reporter_key BIGINT; service_key BIGINT; category_key BIGINT;
 started TIMESTAMPTZ := transaction_timestamp()-make_interval(mins => {age});
BEGIN
 SELECT id INTO STRICT actor_key FROM users WHERE email={sql(tech+'@iitsm.demo')};
 SELECT id INTO STRICT reporter_key FROM users WHERE email={sql('employee'+str(1+(n-1)%8)+'@iitsm.demo')};
 SELECT id INTO STRICT service_key FROM services WHERE name={sql(service)};
 SELECT id INTO STRICT category_key FROM categories WHERE name={sql(category)};
 INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,created_at,updated_at,acknowledged_at,response_due,resolution_due,paused_at,resolved_at,problem_id,res_violated,res_warn75_sent,res_warn90_sent)
 VALUES ('INC-'||to_char(started AT TIME ZONE 'UTC','YYYY')||'-'||lpad(nextval('incident_code_seq')::text,5,'0'),{sql(title)},{sql(desc)},reporter_key,actor_key,service_key,category_key,{impact},{urgency},{users},{p['score']},{sql(p['band'])},{sql(json.dumps(p))}::jsonb,{sql(status)},started,transaction_timestamp(),{ack},started+make_interval(mins => {response}),started+make_interval(mins => {resolution}),{paused},{resolved},{problem},{sql(broken)},{sql(broken)},{sql(broken)}) RETURNING id INTO k;
 INSERT INTO audit_records(incident_id,actor_id,action,new_state,description,created_at) VALUES
 (k,reporter_key,'INCIDENT_CREATED','NEW','Fictional live-demo fixture',started),
 (k,NULL,'CLASSIFIED','CLASSIFIED','Classified using the seeded category',started),
 (k,NULL,'PRIORITY_CALCULATED','CLASSIFIED','Locked priority formula applied',started),
 (k,NULL,'ASSIGNED','ASSIGNED','Seeded assignment with matching skill',started);
""")
        if status!='ASSIGNED': out.append("INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',started+interval '1 minute');")
        if status in ['IN_PROGRESS','PENDING_USER_INFO','RESOLVED']: out.append("INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',started+interval '2 minutes');")
        if status=='PENDING_USER_INFO': out.append("INSERT INTO incident_comments(incident_id,author_id,visibility,body,created_at) VALUES (k,actor_key,'PUBLIC','Please confirm which shared folder is affected and the error message. Do not send passwords.',transaction_timestamp()-interval '20 minutes');\nINSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'INFO_REQUESTED','IN_PROGRESS','PENDING_USER_INFO','Reporter details requested; resolution clock paused',transaction_timestamp()-interval '20 minutes');")
        if status=='RESOLVED':
            out.append("UPDATE incidents SET root_cause='Callback cookie path excluded the identity return route',resolution_notes='Corrected the cookie path and confirmed sign-in with a clean demo browser.',resolution_steps='Checked callback routing; corrected cookie path; tested a fresh login.',time_spent_minutes=10,reusable_solution=true WHERE id=k;\nINSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'RESOLVED','IN_PROGRESS','RESOLVED','Callback cookie path corrected and fresh login verified',started+interval '10 minutes');")
        if broken:
            for fraction in [.75,.90]: out.append(f"INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (k,'SLA_WARNING','Seeded resolution deadline warning',started+make_interval(secs => {int(resolution*60*fraction)}));")
            out.append(f"INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (k,'RESOLUTION',{(age-resolution)*60},actor_key,started+make_interval(mins => {resolution}));\nINSERT INTO audit_records(incident_id,action,description,created_at) VALUES (k,'SLA_VIOLATED','Seeded resolution target missed',started+make_interval(mins => {resolution}));")
        out.append('END;\n$$;')
    out.append("UPDATE technician_profiles SET last_assigned_at=(SELECT max(i.created_at) FROM incidents i WHERE i.assignee_id=technician_profiles.user_id);\nCOMMIT;")
    return '\n'.join(out)+'\n'

if __name__=='__main__':
    (ROOT/'db/seed/03_staged_demo.sql').write_text(generate())
    print('Wrote 12 open/recent fixtures; no open Payment; tech5 weighted active load = 10.')
