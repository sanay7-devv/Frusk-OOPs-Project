"""Convert the supplied history CSV into transactional PostgreSQL seed SQL.

No DB connection; does not edit a backend. Run from any directory.
"""
import argparse
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from build_content import priority, sql, CATEGORY_SKILLS, TECHS

def generate(source):
    with source.open(encoding='utf-8', newline='') as handle:
        rows = list(csv.DictReader(handle))
    output=['-- DEV/DEMO ONLY. Once per fresh database, after 01_reference.sql.', 'BEGIN;']
    for n,r in enumerate(rows,1):
        impact, urgency, users = (int(r[k]) for k in ('impact','urgency','affected_users'))
        if not (1<=impact<=5 and 1<=urgency<=5 and 1<=users<=1000000): raise ValueError(f'Invalid input in row {n}')
        if r['reusable_solution'] not in ('true','false'): raise ValueError(f'Invalid boolean in row {n}')
        days, duration = int(r['days_ago_created']), int(r['minutes_to_resolve'])
        if not 1<=days<=90 or duration<=0 or duration>=days*1440-2: raise ValueError(f'Historical timestamps would not be in the past in row {n}')
        if r['feedback_rating'] and not 1 <= int(r['feedback_rating']) <= 5:
            raise ValueError(f'Invalid feedback in row {n}')
        if r['reporter_email'] == r['assignee_email']:
            raise ValueError(f'Reporter cannot be assignee in row {n}')
        tech = r['assignee_email'].removesuffix('@iitsm.demo')
        if tech not in TECHS or not set(TECHS[tech][3]) & set(CATEGORY_SKILLS.get(r['category'], [])):
            raise ValueError(f'Assignee has no matching skill in row {n}')
        p=priority(impact,urgency,users,r['service'],r['category'])
        response,target=(3,20) if r['service']=='Payment' and p['band']=='P1' else (10,60) if r['service']=='Payment' and p['band']=='P2' else {'P1':(5,30),'P2':(15,120),'P3':(60,480),'P4':(240,1440)}[p['band']]
        ack_seconds=min(response*30,duration*6)
        # STRICT lookups fail the whole transaction if a reference is absent or ambiguous.
        output.append(f"""DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => {days});
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email={sql(r['reporter_email'])};
  SELECT id INTO STRICT assignee_key FROM users WHERE email={sql(r['assignee_email'])};
  SELECT id INTO STRICT service_key FROM services WHERE name={sql(r['service'])};
  SELECT id INTO STRICT category_key FROM categories WHERE name={sql(r['category'])};
  finished := started + make_interval(mins => {duration});
  ack_time := started + make_interval(secs => {ack_seconds});
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    {sql(r['title'])},{sql(r['description'])},reporter_key,assignee_key,service_key,category_key,
    {impact},{urgency},{users},{p['score']},{sql(p['band'])},{sql(json.dumps(p))}::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => {response}),started+make_interval(mins => {target}),
    {sql(r['root_cause'])},{sql(r['resolution_notes'])},{sql(r['resolution_steps'])},{duration},{r['reusable_solution']},
    {sql(duration>=target*.75)},{sql(duration>=target*.9)},{sql(duration>=target)})
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED',{sql(r['resolution_notes'])},finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');""")
        for fraction,description in [(.75,'Resolution deadline 75 percent elapsed'),(.90,'Resolution deadline 90 percent elapsed')]:
            if duration>=target*fraction:
                output.append(f"INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING',{sql(description)},started+make_interval(secs => {int(target*60*fraction)}));")
        if duration>=target:
            output.append(f"INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',{max(0,(duration-target)*60)},assignee_key,started+make_interval(mins => {target}));")
            output.append(f"INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => {target}));")
        if r['feedback_rating']:
            output.append(f"INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,{int(r['feedback_rating'])},'Fictional demonstration feedback',finished+interval '2 minutes');")
        output.append('END;\n$$;')
    output+=['COMMIT;','-- Embeddings intentionally absent; backend backfills them using its configured model.']
    return '\n'.join(output)+'\n'

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--input',type=Path,default=ROOT/'docs/content/historical_incidents.csv');parser.add_argument('--output',type=Path,default=ROOT/'db/seed/02_history.sql')
    args=parser.parse_args();args.output.write_text(generate(args.input));print(f'Wrote {args.output}')
