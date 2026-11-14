-- DEV/DEMO ONLY. Once per fresh database, after 01_reference.sql.
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 2);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='VPN';
  finished := started + make_interval(mins => 13);
  ack_time := started + make_interval(secs => 78);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'VPN disconnects every few minutes','Since the morning update, VPN disconnects every few minutes. Our team is affected and work is slowed; 25 users are affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    3,4,25,60,'P1','{"impact": 3, "urgency": 4, "criticality": 4, "usersMultiplier": 1.25, "baseScore": 48, "score": 60, "band": "P1", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 5),started+make_interval(mins => 30),
    'Gateway idle timeout reset to 60 seconds after a patch.','Inspection confirmed that gateway idle timeout reset to 60 seconds after a patch. The technician restored the approved 30-minute idle timeout and reloaded the gateway and confirmed the session remained connected beyond the previous five-minute failure interval; added a configuration check to the maintenance checklist.','1. Reproduced report 1 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved 30-minute idle timeout and reloaded the gateway. 4. Confirmed the session remained connected beyond the previous five-minute failure interval. 5. Asked the reporter to confirm recovery.',13,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that gateway idle timeout reset to 60 seconds after a patch. The technician restored the approved 30-minute idle timeout and reloaded the gateway and confirmed the session remained connected beyond the previous five-minute failure interval; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 15);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='VPN';
  finished := started + make_interval(mins => 19);
  ack_time := started + make_interval(secs => 114);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'VPN disconnects every few minutes in the shared workspace','During the afternoon shift, VPN disconnects every few minutes. Core business activity is stopped; 150 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    5,2,150,60,'P1','{"impact": 5, "urgency": 2, "criticality": 4, "usersMultiplier": 1.5, "baseScore": 40, "score": 60, "band": "P1", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 5),started+make_interval(mins => 30),
    'Gateway idle timeout reset to 60 seconds after a patch.','Inspection confirmed that gateway idle timeout reset to 60 seconds after a patch. The technician restored the approved 30-minute idle timeout and reloaded the gateway and confirmed the session remained connected beyond the previous five-minute failure interval; reviewed the change history and documented the regression trigger.','1. Reproduced report 2 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved 30-minute idle timeout and reloaded the gateway. 4. Confirmed the session remained connected beyond the previous five-minute failure interval. 5. Asked the reporter to confirm recovery.',19,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that gateway idle timeout reset to 60 seconds after a patch. The technician restored the approved 30-minute idle timeout and reloaded the gateway and confirmed the session remained connected beyond the previous five-minute failure interval; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 28);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='VPN';
  finished := started + make_interval(mins => 25);
  ack_time := started + make_interval(secs => 150);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: VPN disconnects every few minutes','When starting work today, VPN disconnects every few minutes. An entire department has important work blocked; 25 users are affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    4,4,25,80,'P1','{"impact": 4, "urgency": 4, "criticality": 4, "usersMultiplier": 1.25, "baseScore": 64, "score": 80, "band": "P1", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 5),started+make_interval(mins => 30),
    'Gateway idle timeout reset to 60 seconds after a patch.','Inspection confirmed that gateway idle timeout reset to 60 seconds after a patch. The technician restored the approved 30-minute idle timeout and reloaded the gateway and confirmed the session remained connected beyond the previous five-minute failure interval; compared the repaired configuration with the approved baseline.','1. Reproduced report 3 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved 30-minute idle timeout and reloaded the gateway. 4. Confirmed the session remained connected beyond the previous five-minute failure interval. 5. Asked the reporter to confirm recovery.',25,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that gateway idle timeout reset to 60 seconds after a patch. The technician restored the approved 30-minute idle timeout and reloaded the gateway and confirmed the session remained connected beyond the previous five-minute failure interval; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 1350));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 41);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='VPN';
  finished := started + make_interval(mins => 126);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'VPN disconnects every few minutes again today','While checking the shared workspace, VPN disconnects every few minutes. Our team is affected and work is slowed; 25 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    3,3,25,45,'P2','{"impact": 3, "urgency": 3, "criticality": 4, "usersMultiplier": 1.25, "baseScore": 36, "score": 45, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'Gateway idle timeout reset to 60 seconds after a patch.','Inspection confirmed that gateway idle timeout reset to 60 seconds after a patch. The technician restored the approved 30-minute idle timeout and reloaded the gateway and confirmed the session remained connected beyond the previous five-minute failure interval; added a targeted operational alert for recurrence.','1. Reproduced report 4 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved 30-minute idle timeout and reloaded the gateway. 4. Confirmed the session remained connected beyond the previous five-minute failure interval. 5. Asked the reporter to confirm recovery.',126,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that gateway idle timeout reset to 60 seconds after a patch. The technician restored the approved 30-minute idle timeout and reloaded the gateway and confirmed the session remained connected beyond the previous five-minute failure interval; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 5400));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 6480));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',360,assignee_key,started+make_interval(mins => 120));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 120));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 54);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='VPN';
  finished := started + make_interval(mins => 66);
  ack_time := started + make_interval(secs => 396);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: VPN disconnects every few minutes','After reconnecting this moring, VPN disconnects every few minutes. An entire department has important work blocked; 25 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    4,2,25,40,'P2','{"impact": 4, "urgency": 2, "criticality": 4, "usersMultiplier": 1.25, "baseScore": 32, "score": 40, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'Gateway idle timeout reset to 60 seconds after a patch.','Inspection confirmed that gateway idle timeout reset to 60 seconds after a patch. The technician restored the approved 30-minute idle timeout and reloaded the gateway and confirmed the session remained connected beyond the previous five-minute failure interval; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 5 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved 30-minute idle timeout and reloaded the gateway. 4. Confirmed the session remained connected beyond the previous five-minute failure interval. 5. Asked the reporter to confirm recovery.',66,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that gateway idle timeout reset to 60 seconds after a patch. The technician restored the approved 30-minute idle timeout and reloaded the gateway and confirmed the session remained connected beyond the previous five-minute failure interval; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 67);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Wi-Fi';
  finished := started + make_interval(mins => 54);
  ack_time := started + make_interval(secs => 324);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Wi-Fi loses signal near meeting rooms','Since the morning update, Wi-Fi loses signal near meeting rooms. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    2,4,8,32,'P2','{"impact": 2, "urgency": 4, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 32, "score": 32, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'Two access points selected overlapping channels.','Inspection confirmed that two access points selected overlapping channels. The technician assigned separate channels and reduced excessive transmit power and walked the meeting-room corridor while monitoring packet loss; added a configuration check to the maintenance checklist.','1. Reproduced report 6 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Assigned separate channels and reduced excessive transmit power. 4. Walked the meeting-room corridor while monitoring packet loss. 5. Asked the reporter to confirm recovery.',54,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that two access points selected overlapping channels. The technician assigned separate channels and reduced excessive transmit power and walked the meeting-room corridor while monitoring packet loss; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 80);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Wi-Fi';
  finished := started + make_interval(mins => 78);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Wi-Fi loses signal near meeting rooms in the shared workspace','During the afternoon shift, Wi-Fi loses signal near meeting rooms. A few people are affected, with a workaround available; 8 users are affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    2,5,8,40,'P2','{"impact": 2, "urgency": 5, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 40, "score": 40, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'Two access points selected overlapping channels.','Inspection confirmed that two access points selected overlapping channels. The technician assigned separate channels and reduced excessive transmit power and walked the meeting-room corridor while monitoring packet loss; reviewed the change history and documented the regression trigger.','1. Reproduced report 7 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Assigned separate channels and reduced excessive transmit power. 4. Walked the meeting-room corridor while monitoring packet loss. 5. Asked the reporter to confirm recovery.',78,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that two access points selected overlapping channels. The technician assigned separate channels and reduced excessive transmit power and walked the meeting-room corridor while monitoring packet loss; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 4);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Wi-Fi';
  finished := started + make_interval(mins => 102);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: Wi-Fi loses signal near meeting rooms','When starting work today, Wi-Fi loses signal near meeting rooms. Our team is affected and work is slowed; 25 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    3,2,25,30,'P2','{"impact": 3, "urgency": 2, "criticality": 4, "usersMultiplier": 1.25, "baseScore": 24, "score": 30, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'Two access points selected overlapping channels.','Inspection confirmed that two access points selected overlapping channels. The technician assigned separate channels and reduced excessive transmit power and walked the meeting-room corridor while monitoring packet loss; compared the repaired configuration with the approved baseline.','1. Reproduced report 8 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Assigned separate channels and reduced excessive transmit power. 4. Walked the meeting-room corridor while monitoring packet loss. 5. Asked the reporter to confirm recovery.',102,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that two access points selected overlapping channels. The technician assigned separate channels and reduced excessive transmit power and walked the meeting-room corridor while monitoring packet loss; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 5400));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 17);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Wi-Fi';
  finished := started + make_interval(mins => 126);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Wi-Fi loses signal near meeting rooms again today','While checking the shared workspace, Wi-Fi loses signal near meeting rooms. Our team is affected and work is slowed; 25 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    3,3,25,45,'P2','{"impact": 3, "urgency": 3, "criticality": 4, "usersMultiplier": 1.25, "baseScore": 36, "score": 45, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'Two access points selected overlapping channels.','Inspection confirmed that two access points selected overlapping channels. The technician assigned separate channels and reduced excessive transmit power and walked the meeting-room corridor while monitoring packet loss; added a targeted operational alert for recurrence.','1. Reproduced report 9 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Assigned separate channels and reduced excessive transmit power. 4. Walked the meeting-room corridor while monitoring packet loss. 5. Asked the reporter to confirm recovery.',126,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that two access points selected overlapping channels. The technician assigned separate channels and reduced excessive transmit power and walked the meeting-room corridor while monitoring packet loss; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 5400));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 6480));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',360,assignee_key,started+make_interval(mins => 120));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 120));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 30);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Wi-Fi';
  finished := started + make_interval(mins => 66);
  ack_time := started + make_interval(secs => 396);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: Wi-Fi loses signal near meeting rooms','After reconnecting this moring, Wi-Fi loses signal near meeting rooms. An entire department has important work blocked; 25 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    4,2,25,40,'P2','{"impact": 4, "urgency": 2, "criticality": 4, "usersMultiplier": 1.25, "baseScore": 32, "score": 40, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'Two access points selected overlapping channels.','Inspection confirmed that two access points selected overlapping channels. The technician assigned separate channels and reduced excessive transmit power and walked the meeting-room corridor while monitoring packet loss; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 10 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Assigned separate channels and reduced excessive transmit power. 4. Walked the meeting-room corridor while monitoring packet loss. 5. Asked the reporter to confirm recovery.',66,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that two access points selected overlapping channels. The technician assigned separate channels and reduced excessive transmit power and walked the meeting-room corridor while monitoring packet loss; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 43);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 54);
  ack_time := started + make_interval(secs => 324);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Internal hostnames fail to resolve','Since the morning update, internal hostnames fail to resolve. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    2,4,8,32,'P2','{"impact": 2, "urgency": 4, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 32, "score": 32, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'A stale DNS forwarder remained in the resolver pool.','Inspection confirmed that a stale DNS forwarder remained in the resolver pool. The technician removed the retired forwarder and refreshed the resolver configuration and resolved ten internal hosts through both DNS servers; added a configuration check to the maintenance checklist.','1. Reproduced report 11 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed the retired forwarder and refreshed the resolver configuration. 4. Resolved ten internal hosts through both DNS servers. 5. Asked the reporter to confirm recovery.',54,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a stale DNS forwarder remained in the resolver pool. The technician removed the retired forwarder and refreshed the resolver configuration and resolved ten internal hosts through both DNS servers; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 56);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 78);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Internal hostnames fail to resolve in the shared workspace','During the afternoon shift, internal hostnames fail to resolve. A few people are affected, with a workaround available; 8 users are affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    2,5,8,40,'P2','{"impact": 2, "urgency": 5, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 40, "score": 40, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'A stale DNS forwarder remained in the resolver pool.','Inspection confirmed that a stale DNS forwarder remained in the resolver pool. The technician removed the retired forwarder and refreshed the resolver configuration and resolved ten internal hosts through both DNS servers; reviewed the change history and documented the regression trigger.','1. Reproduced report 12 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed the retired forwarder and refreshed the resolver configuration. 4. Resolved ten internal hosts through both DNS servers. 5. Asked the reporter to confirm recovery.',78,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a stale DNS forwarder remained in the resolver pool. The technician removed the retired forwarder and refreshed the resolver configuration and resolved ten internal hosts through both DNS servers; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 69);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 102);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: internal hostnames fail to resolve','When starting work today, internal hostnames fail to resolve. Our team is affected and work is slowed; 25 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    3,2,25,30,'P2','{"impact": 3, "urgency": 2, "criticality": 4, "usersMultiplier": 1.25, "baseScore": 24, "score": 30, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'A stale DNS forwarder remained in the resolver pool.','Inspection confirmed that a stale DNS forwarder remained in the resolver pool. The technician removed the retired forwarder and refreshed the resolver configuration and resolved ten internal hosts through both DNS servers; compared the repaired configuration with the approved baseline.','1. Reproduced report 13 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed the retired forwarder and refreshed the resolver configuration. 4. Resolved ten internal hosts through both DNS servers. 5. Asked the reporter to confirm recovery.',102,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a stale DNS forwarder remained in the resolver pool. The technician removed the retired forwarder and refreshed the resolver configuration and resolved ten internal hosts through both DNS servers; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 5400));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 82);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Internal hostnames fail to resolve again today','While checking the shared workspace, internal hostnames fail to resolve. An entire department has important work blocked; 25 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    4,1,25,20,'P3','{"impact": 4, "urgency": 1, "criticality": 4, "usersMultiplier": 1.25, "baseScore": 16, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A stale DNS forwarder remained in the resolver pool.','Inspection confirmed that a stale DNS forwarder remained in the resolver pool. The technician removed the retired forwarder and refreshed the resolver configuration and resolved ten internal hosts through both DNS servers; added a targeted operational alert for recurrence.','1. Reproduced report 14 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed the retired forwarder and refreshed the resolver configuration. 4. Resolved ten internal hosts through both DNS servers. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a stale DNS forwarder remained in the resolver pool. The technician removed the retired forwarder and refreshed the resolver configuration and resolved ten internal hosts through both DNS servers; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 6);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 264);
  ack_time := started + make_interval(secs => 1584);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: internal hostnames fail to resolve','After reconnecting this moring, internal hostnames fail to resolve. An entire department has important work blocked; 25 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    4,1,25,20,'P3','{"impact": 4, "urgency": 1, "criticality": 4, "usersMultiplier": 1.25, "baseScore": 16, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A stale DNS forwarder remained in the resolver pool.','Inspection confirmed that a stale DNS forwarder remained in the resolver pool. The technician removed the retired forwarder and refreshed the resolver configuration and resolved ten internal hosts through both DNS servers; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 15 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed the retired forwarder and refreshed the resolver configuration. 4. Resolved ten internal hosts through both DNS servers. 5. Asked the reporter to confirm recovery.',264,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a stale DNS forwarder remained in the resolver pool. The technician removed the retired forwarder and refreshed the resolver configuration and resolved ten internal hosts through both DNS servers; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 19);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'File server cannot be reached','Since the morning update, file server cannot be reached. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    1,4,1,16,'P3','{"impact": 1, "urgency": 4, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 16, "score": 16, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'An access-switch uplink negotiated at the wrong speed.','Inspection confirmed that an access-switch uplink negotiated at the wrong speed. The technician replaced the damaged patch cable and restored automatic negotiation and copied a test file and checked uplink error counters; added a configuration check to the maintenance checklist.','1. Reproduced report 16 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Replaced the damaged patch cable and restored automatic negotiation. 4. Copied a test file and checked uplink error counters. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that an access-switch uplink negotiated at the wrong speed. The technician replaced the damaged patch cable and restored automatic negotiation and copied a test file and checked uplink error counters; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 32);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'File server cannot be reached in the shared workspace','During the afternoon shift, file server cannot be reached. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    1,4,1,16,'P3','{"impact": 1, "urgency": 4, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 16, "score": 16, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'An access-switch uplink negotiated at the wrong speed.','Inspection confirmed that an access-switch uplink negotiated at the wrong speed. The technician replaced the damaged patch cable and restored automatic negotiation and copied a test file and checked uplink error counters; reviewed the change history and documented the regression trigger.','1. Reproduced report 17 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Replaced the damaged patch cable and restored automatic negotiation. 4. Copied a test file and checked uplink error counters. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that an access-switch uplink negotiated at the wrong speed. The technician replaced the damaged patch cable and restored automatic negotiation and copied a test file and checked uplink error counters; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 45);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: file server cannot be reached','When starting work today, file server cannot be reached. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    1,4,1,16,'P3','{"impact": 1, "urgency": 4, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 16, "score": 16, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'An access-switch uplink negotiated at the wrong speed.','Inspection confirmed that an access-switch uplink negotiated at the wrong speed. The technician replaced the damaged patch cable and restored automatic negotiation and copied a test file and checked uplink error counters; compared the repaired configuration with the approved baseline.','1. Reproduced report 18 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Replaced the damaged patch cable and restored automatic negotiation. 4. Copied a test file and checked uplink error counters. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that an access-switch uplink negotiated at the wrong speed. The technician replaced the damaged patch cable and restored automatic negotiation and copied a test file and checked uplink error counters; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 58);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'File server cannot be reached again today','While checking the shared workspace, file server cannot be reached. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    1,4,1,16,'P3','{"impact": 1, "urgency": 4, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 16, "score": 16, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'An access-switch uplink negotiated at the wrong speed.','Inspection confirmed that an access-switch uplink negotiated at the wrong speed. The technician replaced the damaged patch cable and restored automatic negotiation and copied a test file and checked uplink error counters; added a targeted operational alert for recurrence.','1. Reproduced report 19 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Replaced the damaged patch cable and restored automatic negotiation. 4. Copied a test file and checked uplink error counters. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that an access-switch uplink negotiated at the wrong speed. The technician replaced the damaged patch cable and restored automatic negotiation and copied a test file and checked uplink error counters; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 71);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 264);
  ack_time := started + make_interval(secs => 1584);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: file server cannot be reached','After reconnecting this moring, file server cannot be reached. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    1,4,1,16,'P3','{"impact": 1, "urgency": 4, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 16, "score": 16, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'An access-switch uplink negotiated at the wrong speed.','Inspection confirmed that an access-switch uplink negotiated at the wrong speed. The technician replaced the damaged patch cable and restored automatic negotiation and copied a test file and checked uplink error counters; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 20 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Replaced the damaged patch cable and restored automatic negotiation. 4. Copied a test file and checked uplink error counters. 5. Asked the reporter to confirm recovery.',264,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that an access-switch uplink negotiated at the wrong speed. The technician replaced the damaged patch cable and restored automatic negotiation and copied a test file and checked uplink error counters; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 84);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='VPN';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'VPN login stalls after entering the code','Since the morning update, VPN login stalls after entering the code. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    2,3,8,24,'P3','{"impact": 2, "urgency": 3, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 24, "score": 24, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The gateway clock drifted outside the token validation window.','Inspection confirmed that the gateway clock drifted outside the token validation window. The technician restored NTP synchronization on the gateway and completed a new VPN login with a fresh token; added a configuration check to the maintenance checklist.','1. Reproduced report 21 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored NTP synchronization on the gateway. 4. Completed a new VPN login with a fresh token. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the gateway clock drifted outside the token validation window. The technician restored NTP synchronization on the gateway and completed a new VPN login with a fresh token; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 8);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='VPN';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'VPN login stalls after entering the code in the shared workspace','During the afternoon shift, VPN login stalls after entering the code. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    2,3,8,24,'P3','{"impact": 2, "urgency": 3, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 24, "score": 24, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The gateway clock drifted outside the token validation window.','Inspection confirmed that the gateway clock drifted outside the token validation window. The technician restored NTP synchronization on the gateway and completed a new VPN login with a fresh token; reviewed the change history and documented the regression trigger.','1. Reproduced report 22 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored NTP synchronization on the gateway. 4. Completed a new VPN login with a fresh token. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the gateway clock drifted outside the token validation window. The technician restored NTP synchronization on the gateway and completed a new VPN login with a fresh token; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 21);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='VPN';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: VPN login stalls after entering the code','When starting work today, VPN login stalls after entering the code. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    2,3,8,24,'P3','{"impact": 2, "urgency": 3, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 24, "score": 24, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The gateway clock drifted outside the token validation window.','Inspection confirmed that the gateway clock drifted outside the token validation window. The technician restored NTP synchronization on the gateway and completed a new VPN login with a fresh token; compared the repaired configuration with the approved baseline.','1. Reproduced report 23 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored NTP synchronization on the gateway. 4. Completed a new VPN login with a fresh token. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the gateway clock drifted outside the token validation window. The technician restored NTP synchronization on the gateway and completed a new VPN login with a fresh token; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 34);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='VPN';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'VPN login stalls after entering the code again today','While checking the shared workspace, VPN login stalls after entering the code. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    2,3,8,24,'P3','{"impact": 2, "urgency": 3, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 24, "score": 24, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The gateway clock drifted outside the token validation window.','Inspection confirmed that the gateway clock drifted outside the token validation window. The technician restored NTP synchronization on the gateway and completed a new VPN login with a fresh token; added a targeted operational alert for recurrence.','1. Reproduced report 24 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored NTP synchronization on the gateway. 4. Completed a new VPN login with a fresh token. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the gateway clock drifted outside the token validation window. The technician restored NTP synchronization on the gateway and completed a new VPN login with a fresh token; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 47);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='VPN';
  finished := started + make_interval(mins => 264);
  ack_time := started + make_interval(secs => 1584);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: VPN login stalls after entering the code','After reconnecting this moring, VPN login stalls after entering the code. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    2,3,8,24,'P3','{"impact": 2, "urgency": 3, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 24, "score": 24, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The gateway clock drifted outside the token validation window.','Inspection confirmed that the gateway clock drifted outside the token validation window. The technician restored NTP synchronization on the gateway and completed a new VPN login with a fresh token; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 25 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored NTP synchronization on the gateway. 4. Completed a new VPN login with a fresh token. 5. Asked the reporter to confirm recovery.',264,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the gateway clock drifted outside the token validation window. The technician restored NTP synchronization on the gateway and completed a new VPN login with a fresh token; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 60);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Desk connection briefly drops during calls','Since the morning update, desk connection briefly drops during calls. An entire department has important work blocked; 150 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    4,1,150,24,'P3','{"impact": 4, "urgency": 1, "criticality": 4, "usersMultiplier": 1.5, "baseScore": 16, "score": 24, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A switch port had repeated spanning-tree topology changes.','Inspection confirmed that a switch port had repeated spanning-tree topology changes. The technician removed an accidental cable loop and enabled the approved edge-port setting and observed stable topology and completed a ten-minute call; added a configuration check to the maintenance checklist.','1. Reproduced report 26 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed an accidental cable loop and enabled the approved edge-port setting. 4. Observed stable topology and completed a ten-minute call. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a switch port had repeated spanning-tree topology changes. The technician removed an accidental cable loop and enabled the approved edge-port setting and observed stable topology and completed a ten-minute call; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 73);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Desk connection briefly drops during calls in the shared workspace','During the afternoon shift, desk connection briefly drops during calls. An entire department has important work blocked; 150 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    4,1,150,24,'P3','{"impact": 4, "urgency": 1, "criticality": 4, "usersMultiplier": 1.5, "baseScore": 16, "score": 24, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A switch port had repeated spanning-tree topology changes.','Inspection confirmed that a switch port had repeated spanning-tree topology changes. The technician removed an accidental cable loop and enabled the approved edge-port setting and observed stable topology and completed a ten-minute call; reviewed the change history and documented the regression trigger.','1. Reproduced report 27 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed an accidental cable loop and enabled the approved edge-port setting. 4. Observed stable topology and completed a ten-minute call. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a switch port had repeated spanning-tree topology changes. The technician removed an accidental cable loop and enabled the approved edge-port setting and observed stable topology and completed a ten-minute call; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 86);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: desk connection briefly drops during calls','When starting work today, desk connection briefly drops during calls. An entire department has important work blocked; 150 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    4,1,150,24,'P3','{"impact": 4, "urgency": 1, "criticality": 4, "usersMultiplier": 1.5, "baseScore": 16, "score": 24, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A switch port had repeated spanning-tree topology changes.','Inspection confirmed that a switch port had repeated spanning-tree topology changes. The technician removed an accidental cable loop and enabled the approved edge-port setting and observed stable topology and completed a ten-minute call; compared the repaired configuration with the approved baseline.','1. Reproduced report 28 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed an accidental cable loop and enabled the approved edge-port setting. 4. Observed stable topology and completed a ten-minute call. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a switch port had repeated spanning-tree topology changes. The technician removed an accidental cable loop and enabled the approved edge-port setting and observed stable topology and completed a ten-minute call; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 10);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Desk connection briefly drops during calls again today','While checking the shared workspace, desk connection briefly drops during calls. An entire department has important work blocked; 150 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    4,1,150,24,'P3','{"impact": 4, "urgency": 1, "criticality": 4, "usersMultiplier": 1.5, "baseScore": 16, "score": 24, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A switch port had repeated spanning-tree topology changes.','Inspection confirmed that a switch port had repeated spanning-tree topology changes. The technician removed an accidental cable loop and enabled the approved edge-port setting and observed stable topology and completed a ten-minute call; added a targeted operational alert for recurrence.','1. Reproduced report 29 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed an accidental cable loop and enabled the approved edge-port setting. 4. Observed stable topology and completed a ten-minute call. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a switch port had repeated spanning-tree topology changes. The technician removed an accidental cable loop and enabled the approved edge-port setting and observed stable topology and completed a ten-minute call; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 23);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 264);
  ack_time := started + make_interval(secs => 1584);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: desk connection briefly drops during calls','After reconnecting this moring, desk connection briefly drops during calls. An entire department has important work blocked; 150 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    4,1,150,24,'P3','{"impact": 4, "urgency": 1, "criticality": 4, "usersMultiplier": 1.5, "baseScore": 16, "score": 24, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A switch port had repeated spanning-tree topology changes.','Inspection confirmed that a switch port had repeated spanning-tree topology changes. The technician removed an accidental cable loop and enabled the approved edge-port setting and observed stable topology and completed a ten-minute call; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 30 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed an accidental cable loop and enabled the approved edge-port setting. 4. Observed stable topology and completed a ten-minute call. 5. Asked the reporter to confirm recovery.',264,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a switch port had repeated spanning-tree topology changes. The technician removed an accidental cable loop and enabled the approved edge-port setting and observed stable topology and completed a ten-minute call; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 36);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Wi-Fi';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Guest wireless opens no sign-in page','Since the morning update, guest wireless opens no sign-in page. One person is affected by this minor inconvenience; 1 user is affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    1,5,1,20,'P3','{"impact": 1, "urgency": 5, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 20, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The captive portal certificate chain was incomplete.','Inspection confirmed that the captive portal certificate chain was incomplete. The technician installed the missing intermediate certificate and reloaded the portal and opened the portal from a clean browser and joined the guest network; added a configuration check to the maintenance checklist.','1. Reproduced report 31 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Installed the missing intermediate certificate and reloaded the portal. 4. Opened the portal from a clean browser and joined the guest network. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the captive portal certificate chain was incomplete. The technician installed the missing intermediate certificate and reloaded the portal and opened the portal from a clean browser and joined the guest network; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 49);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Wi-Fi';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Guest wireless opens no sign-in page in the shared workspace','During the afternoon shift, guest wireless opens no sign-in page. One person is affected by this minor inconvenience; 1 user is affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    1,5,1,20,'P3','{"impact": 1, "urgency": 5, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 20, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The captive portal certificate chain was incomplete.','Inspection confirmed that the captive portal certificate chain was incomplete. The technician installed the missing intermediate certificate and reloaded the portal and opened the portal from a clean browser and joined the guest network; reviewed the change history and documented the regression trigger.','1. Reproduced report 32 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Installed the missing intermediate certificate and reloaded the portal. 4. Opened the portal from a clean browser and joined the guest network. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the captive portal certificate chain was incomplete. The technician installed the missing intermediate certificate and reloaded the portal and opened the portal from a clean browser and joined the guest network; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 62);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Wi-Fi';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: guest wireless opens no sign-in page','When starting work today, guest wireless opens no sign-in page. One person is affected by this minor inconvenience; 1 user is affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    1,5,1,20,'P3','{"impact": 1, "urgency": 5, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 20, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The captive portal certificate chain was incomplete.','Inspection confirmed that the captive portal certificate chain was incomplete. The technician installed the missing intermediate certificate and reloaded the portal and opened the portal from a clean browser and joined the guest network; compared the repaired configuration with the approved baseline.','1. Reproduced report 33 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Installed the missing intermediate certificate and reloaded the portal. 4. Opened the portal from a clean browser and joined the guest network. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the captive portal certificate chain was incomplete. The technician installed the missing intermediate certificate and reloaded the portal and opened the portal from a clean browser and joined the guest network; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 75);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Wi-Fi';
  finished := started + make_interval(mins => 1512);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Guest wireless opens no sign-in page again today','While checking the shared workspace, guest wireless opens no sign-in page. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,4,'P4','{"impact": 1, "urgency": 1, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 4, "score": 4, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The captive portal certificate chain was incomplete.','Inspection confirmed that the captive portal certificate chain was incomplete. The technician installed the missing intermediate certificate and reloaded the portal and opened the portal from a clean browser and joined the guest network; added a targeted operational alert for recurrence.','1. Reproduced report 34 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Installed the missing intermediate certificate and reloaded the portal. 4. Opened the portal from a clean browser and joined the guest network. 5. Asked the reporter to confirm recovery.',1512,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the captive portal certificate chain was incomplete. The technician installed the missing intermediate certificate and reloaded the portal and opened the portal from a clean browser and joined the guest network; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 77760));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',4320,assignee_key,started+make_interval(mins => 1440));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 1440));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 88);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Wi-Fi';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: guest wireless opens no sign-in page','After reconnecting this moring, guest wireless opens no sign-in page. A few people are affected, with a workaround available; 8 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    2,1,8,8,'P4','{"impact": 2, "urgency": 1, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 8, "score": 8, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The captive portal certificate chain was incomplete.','Inspection confirmed that the captive portal certificate chain was incomplete. The technician installed the missing intermediate certificate and reloaded the portal and opened the portal from a clean browser and joined the guest network; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 35 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Installed the missing intermediate certificate and reloaded the portal. 4. Opened the portal from a clean browser and joined the guest network. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the captive portal certificate chain was incomplete. The technician installed the missing intermediate certificate and reloaded the portal and opened the portal from a clean browser and joined the guest network; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 12);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 648);
  ack_time := started + make_interval(secs => 3888);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Remote desktop feels unusually laggy','Since the morning update, remote desktop feels unusually laggy. A few people are affected, with a workaround available; 8 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    2,1,8,8,'P4','{"impact": 2, "urgency": 1, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 8, "score": 8, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A backup job saturated the branch uplink.','Inspection confirmed that a backup job saturated the branch uplink. The technician moved the backup to its scheduled window and applied the approved traffic policy and measured round-trip latency during a remote desktop session; added a configuration check to the maintenance checklist.','1. Reproduced report 36 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Moved the backup to its scheduled window and applied the approved traffic policy. 4. Measured round-trip latency during a remote desktop session. 5. Asked the reporter to confirm recovery.',648,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a backup job saturated the branch uplink. The technician moved the backup to its scheduled window and applied the approved traffic policy and measured round-trip latency during a remote desktop session; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 25);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 936);
  ack_time := started + make_interval(secs => 5616);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Remote desktop feels unusually laggy in the shared workspace','During the afternoon shift, remote desktop feels unusually laggy. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,8,'P4','{"impact": 1, "urgency": 2, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 8, "score": 8, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A backup job saturated the branch uplink.','Inspection confirmed that a backup job saturated the branch uplink. The technician moved the backup to its scheduled window and applied the approved traffic policy and measured round-trip latency during a remote desktop session; reviewed the change history and documented the regression trigger.','1. Reproduced report 37 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Moved the backup to its scheduled window and applied the approved traffic policy. 4. Measured round-trip latency during a remote desktop session. 5. Asked the reporter to confirm recovery.',936,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a backup job saturated the branch uplink. The technician moved the backup to its scheduled window and applied the approved traffic policy and measured round-trip latency during a remote desktop session; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 38);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 1224);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: remote desktop feels unusually laggy','When starting work today, remote desktop feels unusually laggy. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,4,'P4','{"impact": 1, "urgency": 1, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 4, "score": 4, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A backup job saturated the branch uplink.','Inspection confirmed that a backup job saturated the branch uplink. The technician moved the backup to its scheduled window and applied the approved traffic policy and measured round-trip latency during a remote desktop session; compared the repaired configuration with the approved baseline.','1. Reproduced report 38 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Moved the backup to its scheduled window and applied the approved traffic policy. 4. Measured round-trip latency during a remote desktop session. 5. Asked the reporter to confirm recovery.',1224,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a backup job saturated the branch uplink. The technician moved the backup to its scheduled window and applied the approved traffic policy and measured round-trip latency during a remote desktop session; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 51);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 1512);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Remote desktop feels unusually laggy again today','While checking the shared workspace, remote desktop feels unusually laggy. A few people are affected, with a workaround available; 8 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    2,1,8,8,'P4','{"impact": 2, "urgency": 1, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 8, "score": 8, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A backup job saturated the branch uplink.','Inspection confirmed that a backup job saturated the branch uplink. The technician moved the backup to its scheduled window and applied the approved traffic policy and measured round-trip latency during a remote desktop session; added a targeted operational alert for recurrence.','1. Reproduced report 39 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Moved the backup to its scheduled window and applied the approved traffic policy. 4. Measured round-trip latency during a remote desktop session. 5. Asked the reporter to confirm recovery.',1512,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a backup job saturated the branch uplink. The technician moved the backup to its scheduled window and applied the approved traffic policy and measured round-trip latency during a remote desktop session; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 77760));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',4320,assignee_key,started+make_interval(mins => 1440));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 1440));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 64);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Network';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: remote desktop feels unusually laggy','After reconnecting this moring, remote desktop feels unusually laggy. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,8,'P4','{"impact": 1, "urgency": 2, "criticality": 4, "usersMultiplier": 1.0, "baseScore": 8, "score": 8, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A backup job saturated the branch uplink.','Inspection confirmed that a backup job saturated the branch uplink. The technician moved the backup to its scheduled window and applied the approved traffic policy and measured round-trip latency during a remote desktop session; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 40 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Moved the backup to its scheduled window and applied the approved traffic policy. 4. Measured round-trip latency during a remote desktop session. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a backup job saturated the branch uplink. The technician moved the backup to its scheduled window and applied the approved traffic policy and measured round-trip latency during a remote desktop session; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 77);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 13);
  ack_time := started + make_interval(secs => 78);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Dashboard queries take too long','Since the morning update, dashboard queries take too long. An entire department has important work blocked; 25 users are affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    4,5,25,125,'P1','{"impact": 4, "urgency": 5, "criticality": 5, "usersMultiplier": 1.25, "baseScore": 100, "score": 125, "band": "P1", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 5),started+make_interval(mins => 30),
    'The incident search query stopped using its composite index after statistics became stale.','Inspection confirmed that the incident search query stopped using its composite index after statistics became stale. The technician refreshed table statistics and verified the query execution plan and ran the representative query set and checked its response times; added a configuration check to the maintenance checklist.','1. Reproduced report 41 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Refreshed table statistics and verified the query execution plan. 4. Ran the representative query set and checked its response times. 5. Asked the reporter to confirm recovery.',13,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the incident search query stopped using its composite index after statistics became stale. The technician refreshed table statistics and verified the query execution plan and ran the representative query set and checked its response times; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 90);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 19);
  ack_time := started + make_interval(secs => 114);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Dashboard queries take too long in the shared workspace','During the afternoon shift, dashboard queries take too long. An entire department has important work blocked; 150 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    4,2,150,60,'P1','{"impact": 4, "urgency": 2, "criticality": 5, "usersMultiplier": 1.5, "baseScore": 40, "score": 60, "band": "P1", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 5),started+make_interval(mins => 30),
    'The incident search query stopped using its composite index after statistics became stale.','Inspection confirmed that the incident search query stopped using its composite index after statistics became stale. The technician refreshed table statistics and verified the query execution plan and ran the representative query set and checked its response times; reviewed the change history and documented the regression trigger.','1. Reproduced report 42 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Refreshed table statistics and verified the query execution plan. 4. Ran the representative query set and checked its response times. 5. Asked the reporter to confirm recovery.',19,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the incident search query stopped using its composite index after statistics became stale. The technician refreshed table statistics and verified the query execution plan and ran the representative query set and checked its response times; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 14);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 102);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: dashboard queries take too long','When starting work today, dashboard queries take too long. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    2,3,8,30,'P2','{"impact": 2, "urgency": 3, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 30, "score": 30, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'The incident search query stopped using its composite index after statistics became stale.','Inspection confirmed that the incident search query stopped using its composite index after statistics became stale. The technician refreshed table statistics and verified the query execution plan and ran the representative query set and checked its response times; compared the repaired configuration with the approved baseline.','1. Reproduced report 43 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Refreshed table statistics and verified the query execution plan. 4. Ran the representative query set and checked its response times. 5. Asked the reporter to confirm recovery.',102,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the incident search query stopped using its composite index after statistics became stale. The technician refreshed table statistics and verified the query execution plan and ran the representative query set and checked its response times; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 5400));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 27);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 126);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Dashboard queries take too long again today','While checking the shared workspace, dashboard queries take too long. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    2,3,8,30,'P2','{"impact": 2, "urgency": 3, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 30, "score": 30, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'The incident search query stopped using its composite index after statistics became stale.','Inspection confirmed that the incident search query stopped using its composite index after statistics became stale. The technician refreshed table statistics and verified the query execution plan and ran the representative query set and checked its response times; added a targeted operational alert for recurrence.','1. Reproduced report 44 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Refreshed table statistics and verified the query execution plan. 4. Ran the representative query set and checked its response times. 5. Asked the reporter to confirm recovery.',126,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the incident search query stopped using its composite index after statistics became stale. The technician refreshed table statistics and verified the query execution plan and ran the representative query set and checked its response times; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 5400));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 6480));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',360,assignee_key,started+make_interval(mins => 120));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 120));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 40);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 66);
  ack_time := started + make_interval(secs => 396);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: dashboard queries take too long','After reconnecting this moring, dashboard queries take too long. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    2,3,8,30,'P2','{"impact": 2, "urgency": 3, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 30, "score": 30, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'The incident search query stopped using its composite index after statistics became stale.','Inspection confirmed that the incident search query stopped using its composite index after statistics became stale. The technician refreshed table statistics and verified the query execution plan and ran the representative query set and checked its response times; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 45 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Refreshed table statistics and verified the query execution plan. 4. Ran the representative query set and checked its response times. 5. Asked the reporter to confirm recovery.',66,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the incident search query stopped using its composite index after statistics became stale. The technician refreshed table statistics and verified the query execution plan and ran the representative query set and checked its response times; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 53);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 54);
  ack_time := started + make_interval(secs => 324);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Application cannot acquire a database connection','Since the morning update, application cannot acquire a database connection. Our team is affected and work is slowed; 25 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    3,2,25,37,'P2','{"impact": 3, "urgency": 2, "criticality": 5, "usersMultiplier": 1.25, "baseScore": 30, "score": 37, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'An error branch left pooled connections open.','Inspection confirmed that an error branch left pooled connections open. The technician patched the connection cleanup path and recycled the affected pool and ran repeated requests and confirmed connection counts returned to baseline; added a configuration check to the maintenance checklist.','1. Reproduced report 46 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Patched the connection cleanup path and recycled the affected pool. 4. Ran repeated requests and confirmed connection counts returned to baseline. 5. Asked the reporter to confirm recovery.',54,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that an error branch left pooled connections open. The technician patched the connection cleanup path and recycled the affected pool and ran repeated requests and confirmed connection counts returned to baseline; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 66);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 78);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Application cannot acquire a database connection in the shared workspace','During the afternoon shift, application cannot acquire a database connection. Our team is affected and work is slowed; 25 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    3,2,25,37,'P2','{"impact": 3, "urgency": 2, "criticality": 5, "usersMultiplier": 1.25, "baseScore": 30, "score": 37, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'An error branch left pooled connections open.','Inspection confirmed that an error branch left pooled connections open. The technician patched the connection cleanup path and recycled the affected pool and ran repeated requests and confirmed connection counts returned to baseline; reviewed the change history and documented the regression trigger.','1. Reproduced report 47 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Patched the connection cleanup path and recycled the affected pool. 4. Ran repeated requests and confirmed connection counts returned to baseline. 5. Asked the reporter to confirm recovery.',78,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that an error branch left pooled connections open. The technician patched the connection cleanup path and recycled the affected pool and ran repeated requests and confirmed connection counts returned to baseline; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 79);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 102);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: application cannot acquire a database connection','When starting work today, application cannot acquire a database connection. Our team is affected and work is slowed; 25 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    3,2,25,37,'P2','{"impact": 3, "urgency": 2, "criticality": 5, "usersMultiplier": 1.25, "baseScore": 30, "score": 37, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'An error branch left pooled connections open.','Inspection confirmed that an error branch left pooled connections open. The technician patched the connection cleanup path and recycled the affected pool and ran repeated requests and confirmed connection counts returned to baseline; compared the repaired configuration with the approved baseline.','1. Reproduced report 48 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Patched the connection cleanup path and recycled the affected pool. 4. Ran repeated requests and confirmed connection counts returned to baseline. 5. Asked the reporter to confirm recovery.',102,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that an error branch left pooled connections open. The technician patched the connection cleanup path and recycled the affected pool and ran repeated requests and confirmed connection counts returned to baseline; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 5400));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 3);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 126);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Application cannot acquire a database connection again today','While checking the shared workspace, application cannot acquire a database connection. Our team is affected and work is slowed; 25 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    3,2,25,37,'P2','{"impact": 3, "urgency": 2, "criticality": 5, "usersMultiplier": 1.25, "baseScore": 30, "score": 37, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'An error branch left pooled connections open.','Inspection confirmed that an error branch left pooled connections open. The technician patched the connection cleanup path and recycled the affected pool and ran repeated requests and confirmed connection counts returned to baseline; added a targeted operational alert for recurrence.','1. Reproduced report 49 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Patched the connection cleanup path and recycled the affected pool. 4. Ran repeated requests and confirmed connection counts returned to baseline. 5. Asked the reporter to confirm recovery.',126,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that an error branch left pooled connections open. The technician patched the connection cleanup path and recycled the affected pool and ran repeated requests and confirmed connection counts returned to baseline; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 5400));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 6480));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',360,assignee_key,started+make_interval(mins => 120));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 120));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 16);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 264);
  ack_time := started + make_interval(secs => 1584);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: application cannot acquire a database connection','After reconnecting this moring, application cannot acquire a database connection. One person is affected by this minor inconvenience; 1 user is affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    1,5,1,25,'P3','{"impact": 1, "urgency": 5, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 25, "score": 25, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'An error branch left pooled connections open.','Inspection confirmed that an error branch left pooled connections open. The technician patched the connection cleanup path and recycled the affected pool and ran repeated requests and confirmed connection counts returned to baseline; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 50 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Patched the connection cleanup path and recycled the affected pool. 4. Ran repeated requests and confirmed connection counts returned to baseline. 5. Asked the reporter to confirm recovery.',264,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that an error branch left pooled connections open. The technician patched the connection cleanup path and recycled the affected pool and ran repeated requests and confirmed connection counts returned to baseline; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 29);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Read replica shows old records','Since the morning update, read replica shows old records. Our team is affected and work is slowed; 25 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    3,1,25,18,'P3','{"impact": 3, "urgency": 1, "criticality": 5, "usersMultiplier": 1.25, "baseScore": 15, "score": 18, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'Replication replay paused after the replica disk filled.','Inspection confirmed that replication replay paused after the replica disk filled. The technician removed expired local log files and resumed replay and compared the replica replay position with the primary; added a configuration check to the maintenance checklist.','1. Reproduced report 51 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed expired local log files and resumed replay. 4. Compared the replica replay position with the primary. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that replication replay paused after the replica disk filled. The technician removed expired local log files and resumed replay and compared the replica replay position with the primary; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 42);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Read replica shows old records in the shared workspace','During the afternoon shift, read replica shows old records. Our team is affected and work is slowed; 25 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    3,1,25,18,'P3','{"impact": 3, "urgency": 1, "criticality": 5, "usersMultiplier": 1.25, "baseScore": 15, "score": 18, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'Replication replay paused after the replica disk filled.','Inspection confirmed that replication replay paused after the replica disk filled. The technician removed expired local log files and resumed replay and compared the replica replay position with the primary; reviewed the change history and documented the regression trigger.','1. Reproduced report 52 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed expired local log files and resumed replay. 4. Compared the replica replay position with the primary. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that replication replay paused after the replica disk filled. The technician removed expired local log files and resumed replay and compared the replica replay position with the primary; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 55);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: read replica shows old records','When starting work today, read replica shows old records. Our team is affected and work is slowed; 25 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    3,1,25,18,'P3','{"impact": 3, "urgency": 1, "criticality": 5, "usersMultiplier": 1.25, "baseScore": 15, "score": 18, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'Replication replay paused after the replica disk filled.','Inspection confirmed that replication replay paused after the replica disk filled. The technician removed expired local log files and resumed replay and compared the replica replay position with the primary; compared the repaired configuration with the approved baseline.','1. Reproduced report 53 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed expired local log files and resumed replay. 4. Compared the replica replay position with the primary. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that replication replay paused after the replica disk filled. The technician removed expired local log files and resumed replay and compared the replica replay position with the primary; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 68);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Read replica shows old records again today','While checking the shared workspace, read replica shows old records. Our team is affected and work is slowed; 25 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    3,1,25,18,'P3','{"impact": 3, "urgency": 1, "criticality": 5, "usersMultiplier": 1.25, "baseScore": 15, "score": 18, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'Replication replay paused after the replica disk filled.','Inspection confirmed that replication replay paused after the replica disk filled. The technician removed expired local log files and resumed replay and compared the replica replay position with the primary; added a targeted operational alert for recurrence.','1. Reproduced report 54 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed expired local log files and resumed replay. 4. Compared the replica replay position with the primary. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that replication replay paused after the replica disk filled. The technician removed expired local log files and resumed replay and compared the replica replay position with the primary; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 81);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 264);
  ack_time := started + make_interval(secs => 1584);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: read replica shows old records','After reconnecting this moring, read replica shows old records. Our team is affected and work is slowed; 25 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    3,1,25,18,'P3','{"impact": 3, "urgency": 1, "criticality": 5, "usersMultiplier": 1.25, "baseScore": 15, "score": 18, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'Replication replay paused after the replica disk filled.','Inspection confirmed that replication replay paused after the replica disk filled. The technician removed expired local log files and resumed replay and compared the replica replay position with the primary; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 55 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed expired local log files and resumed replay. 4. Compared the replica replay position with the primary. 5. Asked the reporter to confirm recovery.',264,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that replication replay paused after the replica disk filled. The technician removed expired local log files and resumed replay and compared the replica replay position with the primary; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 5);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Database writes fail with no space left','Since the morning update, database writes fail with no space left. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,15,'P3','{"impact": 1, "urgency": 3, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 15, "score": 15, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'Temporary export files exhausted the data volume.','Inspection confirmed that temporary export files exhausted the data volume. The technician deleted the approved expired exports and increased the temporary-file alert threshold and inserted and read back a test record while checking free space; added a configuration check to the maintenance checklist.','1. Reproduced report 56 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Deleted the approved expired exports and increased the temporary-file alert threshold. 4. Inserted and read back a test record while checking free space. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that temporary export files exhausted the data volume. The technician deleted the approved expired exports and increased the temporary-file alert threshold and inserted and read back a test record while checking free space; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 18);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Database writes fail with no space left in the shared workspace','During the afternoon shift, database writes fail with no space left. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,15,'P3','{"impact": 1, "urgency": 3, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 15, "score": 15, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'Temporary export files exhausted the data volume.','Inspection confirmed that temporary export files exhausted the data volume. The technician deleted the approved expired exports and increased the temporary-file alert threshold and inserted and read back a test record while checking free space; reviewed the change history and documented the regression trigger.','1. Reproduced report 57 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Deleted the approved expired exports and increased the temporary-file alert threshold. 4. Inserted and read back a test record while checking free space. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that temporary export files exhausted the data volume. The technician deleted the approved expired exports and increased the temporary-file alert threshold and inserted and read back a test record while checking free space; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 31);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: database writes fail with no space left','When starting work today, database writes fail with no space left. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,15,'P3','{"impact": 1, "urgency": 3, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 15, "score": 15, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'Temporary export files exhausted the data volume.','Inspection confirmed that temporary export files exhausted the data volume. The technician deleted the approved expired exports and increased the temporary-file alert threshold and inserted and read back a test record while checking free space; compared the repaired configuration with the approved baseline.','1. Reproduced report 58 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Deleted the approved expired exports and increased the temporary-file alert threshold. 4. Inserted and read back a test record while checking free space. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that temporary export files exhausted the data volume. The technician deleted the approved expired exports and increased the temporary-file alert threshold and inserted and read back a test record while checking free space; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 44);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Database writes fail with no space left again today','While checking the shared workspace, database writes fail with no space left. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,15,'P3','{"impact": 1, "urgency": 3, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 15, "score": 15, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'Temporary export files exhausted the data volume.','Inspection confirmed that temporary export files exhausted the data volume. The technician deleted the approved expired exports and increased the temporary-file alert threshold and inserted and read back a test record while checking free space; added a targeted operational alert for recurrence.','1. Reproduced report 59 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Deleted the approved expired exports and increased the temporary-file alert threshold. 4. Inserted and read back a test record while checking free space. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that temporary export files exhausted the data volume. The technician deleted the approved expired exports and increased the temporary-file alert threshold and inserted and read back a test record while checking free space; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 57);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 264);
  ack_time := started + make_interval(secs => 1584);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: database writes fail with no space left','After reconnecting this moring, database writes fail with no space left. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,15,'P3','{"impact": 1, "urgency": 3, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 15, "score": 15, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'Temporary export files exhausted the data volume.','Inspection confirmed that temporary export files exhausted the data volume. The technician deleted the approved expired exports and increased the temporary-file alert threshold and inserted and read back a test record while checking free space; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 60 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Deleted the approved expired exports and increased the temporary-file alert threshold. 4. Inserted and read back a test record while checking free space. 5. Asked the reporter to confirm recovery.',264,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that temporary export files exhausted the data volume. The technician deleted the approved expired exports and increased the temporary-file alert threshold and inserted and read back a test record while checking free space; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 70);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Scheduled import waits without finishing','Since the morning update, scheduled import waits without finishing. A few people are affected, with a workaround available; 8 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    2,1,8,10,'P3','{"impact": 2, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 10, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A forgotten maintenance transaction held a table lock.','Inspection confirmed that a forgotten maintenance transaction held a table lock. The technician confirmed the session owner and ended the abandoned transaction and reran the import and checked that no blocking lock remained; added a configuration check to the maintenance checklist.','1. Reproduced report 61 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Confirmed the session owner and ended the abandoned transaction. 4. Reran the import and checked that no blocking lock remained. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a forgotten maintenance transaction held a table lock. The technician confirmed the session owner and ended the abandoned transaction and reran the import and checked that no blocking lock remained; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 83);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Scheduled import waits without finishing in the shared workspace','During the afternoon shift, scheduled import waits without finishing. A few people are affected, with a workaround available; 8 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    2,1,8,10,'P3','{"impact": 2, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 10, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A forgotten maintenance transaction held a table lock.','Inspection confirmed that a forgotten maintenance transaction held a table lock. The technician confirmed the session owner and ended the abandoned transaction and reran the import and checked that no blocking lock remained; reviewed the change history and documented the regression trigger.','1. Reproduced report 62 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Confirmed the session owner and ended the abandoned transaction. 4. Reran the import and checked that no blocking lock remained. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a forgotten maintenance transaction held a table lock. The technician confirmed the session owner and ended the abandoned transaction and reran the import and checked that no blocking lock remained; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 7);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: scheduled import waits without finishing','When starting work today, scheduled import waits without finishing. A few people are affected, with a workaround available; 8 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    2,1,8,10,'P3','{"impact": 2, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 10, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A forgotten maintenance transaction held a table lock.','Inspection confirmed that a forgotten maintenance transaction held a table lock. The technician confirmed the session owner and ended the abandoned transaction and reran the import and checked that no blocking lock remained; compared the repaired configuration with the approved baseline.','1. Reproduced report 63 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Confirmed the session owner and ended the abandoned transaction. 4. Reran the import and checked that no blocking lock remained. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a forgotten maintenance transaction held a table lock. The technician confirmed the session owner and ended the abandoned transaction and reran the import and checked that no blocking lock remained; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 20);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Scheduled import waits without finishing again today','While checking the shared workspace, scheduled import waits without finishing. A few people are affected, with a workaround available; 8 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    2,1,8,10,'P3','{"impact": 2, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 10, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A forgotten maintenance transaction held a table lock.','Inspection confirmed that a forgotten maintenance transaction held a table lock. The technician confirmed the session owner and ended the abandoned transaction and reran the import and checked that no blocking lock remained; added a targeted operational alert for recurrence.','1. Reproduced report 64 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Confirmed the session owner and ended the abandoned transaction. 4. Reran the import and checked that no blocking lock remained. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a forgotten maintenance transaction held a table lock. The technician confirmed the session owner and ended the abandoned transaction and reran the import and checked that no blocking lock remained; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 33);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: scheduled import waits without finishing','After reconnecting this moring, scheduled import waits without finishing. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,5,'P4','{"impact": 1, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A forgotten maintenance transaction held a table lock.','Inspection confirmed that a forgotten maintenance transaction held a table lock. The technician confirmed the session owner and ended the abandoned transaction and reran the import and checked that no blocking lock remained; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 65 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Confirmed the session owner and ended the abandoned transaction. 4. Reran the import and checked that no blocking lock remained. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a forgotten maintenance transaction held a table lock. The technician confirmed the session owner and ended the abandoned transaction and reran the import and checked that no blocking lock remained; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 46);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 648);
  ack_time := started + make_interval(secs => 3888);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Nightly backup reports a permission error','Since the morning update, nightly backup reports a permission error. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,5,'P4','{"impact": 1, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The backup service account lost write access after a directory move.','Inspection confirmed that the backup service account lost write access after a directory move. The technician restored the approved directory ownership and reran the backup and restored a sample table into an isolated verification database; added a configuration check to the maintenance checklist.','1. Reproduced report 66 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved directory ownership and reran the backup. 4. Restored a sample table into an isolated verification database. 5. Asked the reporter to confirm recovery.',648,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the backup service account lost write access after a directory move. The technician restored the approved directory ownership and reran the backup and restored a sample table into an isolated verification database; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 59);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 936);
  ack_time := started + make_interval(secs => 5616);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Nightly backup reports a permission error in the shared workspace','During the afternoon shift, nightly backup reports a permission error. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,5,'P4','{"impact": 1, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The backup service account lost write access after a directory move.','Inspection confirmed that the backup service account lost write access after a directory move. The technician restored the approved directory ownership and reran the backup and restored a sample table into an isolated verification database; reviewed the change history and documented the regression trigger.','1. Reproduced report 67 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved directory ownership and reran the backup. 4. Restored a sample table into an isolated verification database. 5. Asked the reporter to confirm recovery.',936,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the backup service account lost write access after a directory move. The technician restored the approved directory ownership and reran the backup and restored a sample table into an isolated verification database; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 72);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 1224);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: nightly backup reports a permission error','When starting work today, nightly backup reports a permission error. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,5,'P4','{"impact": 1, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The backup service account lost write access after a directory move.','Inspection confirmed that the backup service account lost write access after a directory move. The technician restored the approved directory ownership and reran the backup and restored a sample table into an isolated verification database; compared the repaired configuration with the approved baseline.','1. Reproduced report 68 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved directory ownership and reran the backup. 4. Restored a sample table into an isolated verification database. 5. Asked the reporter to confirm recovery.',1224,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the backup service account lost write access after a directory move. The technician restored the approved directory ownership and reran the backup and restored a sample table into an isolated verification database; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 85);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 1512);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Nightly backup reports a permission error again today','While checking the shared workspace, nightly backup reports a permission error. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,5,'P4','{"impact": 1, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The backup service account lost write access after a directory move.','Inspection confirmed that the backup service account lost write access after a directory move. The technician restored the approved directory ownership and reran the backup and restored a sample table into an isolated verification database; added a targeted operational alert for recurrence.','1. Reproduced report 69 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved directory ownership and reran the backup. 4. Restored a sample table into an isolated verification database. 5. Asked the reporter to confirm recovery.',1512,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the backup service account lost write access after a directory move. The technician restored the approved directory ownership and reran the backup and restored a sample table into an isolated verification database; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 77760));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',4320,assignee_key,started+make_interval(mins => 1440));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 1440));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 9);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech2@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Database';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: nightly backup reports a permission error','After reconnecting this moring, nightly backup reports a permission error. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,5,'P4','{"impact": 1, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The backup service account lost write access after a directory move.','Inspection confirmed that the backup service account lost write access after a directory move. The technician restored the approved directory ownership and reran the backup and restored a sample table into an isolated verification database; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 70 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved directory ownership and reran the backup. 4. Restored a sample table into an isolated verification database. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the backup service account lost write access after a directory move. The technician restored the approved directory ownership and reran the backup and restored a sample table into an isolated verification database; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 22);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 13);
  ack_time := started + make_interval(secs => 78);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Sign-in returns to the login page repeatedly','Since the morning update, sign-in returns to the login page repeatedly. Core business activity is stopped; 150 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    5,2,150,75,'P1','{"impact": 5, "urgency": 2, "criticality": 5, "usersMultiplier": 1.5, "baseScore": 50, "score": 75, "band": "P1", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 5),started+make_interval(mins => 30),
    'The application callback address differed from the identity-provider registration.','Inspection confirmed that the application callback address differed from the identity-provider registration. The technician corrected the callback registration and cleared the stale login session and signed in from a fresh browser without a redirect loop; added a configuration check to the maintenance checklist.','1. Reproduced report 71 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Corrected the callback registration and cleared the stale login session. 4. Signed in from a fresh browser without a redirect loop. 5. Asked the reporter to confirm recovery.',13,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the application callback address differed from the identity-provider registration. The technician corrected the callback registration and cleared the stale login session and signed in from a fresh browser without a redirect loop; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 35);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 78);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Sign-in returns to the login page repeatedly in the shared workspace','During the afternoon shift, sign-in returns to the login page repeatedly. A few people are affected, with a workaround available; 8 users are affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    2,5,8,50,'P2','{"impact": 2, "urgency": 5, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 50, "score": 50, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'The application callback address differed from the identity-provider registration.','Inspection confirmed that the application callback address differed from the identity-provider registration. The technician corrected the callback registration and cleared the stale login session and signed in from a fresh browser without a redirect loop; reviewed the change history and documented the regression trigger.','1. Reproduced report 72 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Corrected the callback registration and cleared the stale login session. 4. Signed in from a fresh browser without a redirect loop. 5. Asked the reporter to confirm recovery.',78,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the application callback address differed from the identity-provider registration. The technician corrected the callback registration and cleared the stale login session and signed in from a fresh browser without a redirect loop; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 48);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 102);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: sign-in returns to the login page repeatedly','When starting work today, sign-in returns to the login page repeatedly. A few people are affected, with a workaround available; 8 users are affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    2,5,8,50,'P2','{"impact": 2, "urgency": 5, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 50, "score": 50, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'The application callback address differed from the identity-provider registration.','Inspection confirmed that the application callback address differed from the identity-provider registration. The technician corrected the callback registration and cleared the stale login session and signed in from a fresh browser without a redirect loop; compared the repaired configuration with the approved baseline.','1. Reproduced report 73 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Corrected the callback registration and cleared the stale login session. 4. Signed in from a fresh browser without a redirect loop. 5. Asked the reporter to confirm recovery.',102,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the application callback address differed from the identity-provider registration. The technician corrected the callback registration and cleared the stale login session and signed in from a fresh browser without a redirect loop; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 5400));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 61);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 126);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Sign-in returns to the login page repeatedly again today','While checking the shared workspace, sign-in returns to the login page repeatedly. A few people are affected, with a workaround available; 8 users are affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    2,5,8,50,'P2','{"impact": 2, "urgency": 5, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 50, "score": 50, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'The application callback address differed from the identity-provider registration.','Inspection confirmed that the application callback address differed from the identity-provider registration. The technician corrected the callback registration and cleared the stale login session and signed in from a fresh browser without a redirect loop; added a targeted operational alert for recurrence.','1. Reproduced report 74 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Corrected the callback registration and cleared the stale login session. 4. Signed in from a fresh browser without a redirect loop. 5. Asked the reporter to confirm recovery.',126,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the application callback address differed from the identity-provider registration. The technician corrected the callback registration and cleared the stale login session and signed in from a fresh browser without a redirect loop; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 5400));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 6480));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',360,assignee_key,started+make_interval(mins => 120));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 120));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 74);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 66);
  ack_time := started + make_interval(secs => 396);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: sign-in returns to the login page repeatedly','After reconnecting this moring, sign-in returns to the login page repeatedly. A few people are affected, with a workaround available; 8 users are affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    2,5,8,50,'P2','{"impact": 2, "urgency": 5, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 50, "score": 50, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'The application callback address differed from the identity-provider registration.','Inspection confirmed that the application callback address differed from the identity-provider registration. The technician corrected the callback registration and cleared the stale login session and signed in from a fresh browser without a redirect loop; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 75 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Corrected the callback registration and cleared the stale login session. 4. Signed in from a fresh browser without a redirect loop. 5. Asked the reporter to confirm recovery.',66,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the application callback address differed from the identity-provider registration. The technician corrected the callback registration and cleared the stale login session and signed in from a fresh browser without a redirect loop; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 87);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 54);
  ack_time := started + make_interval(secs => 324);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Account remains locked after a password reset','Since the morning update, account remains locked after a password reset. An entire department has important work blocked; 150 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    4,1,150,30,'P2','{"impact": 4, "urgency": 1, "criticality": 5, "usersMultiplier": 1.5, "baseScore": 20, "score": 30, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'A saved desktop credential kept submitting the previous password.','Inspection confirmed that a saved desktop credential kept submitting the previous password. The technician removed the obsolete saved credential and unlocked the account and confirmed a successful login and no new failed attempts; added a configuration check to the maintenance checklist.','1. Reproduced report 76 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed the obsolete saved credential and unlocked the account. 4. Confirmed a successful login and no new failed attempts. 5. Asked the reporter to confirm recovery.',54,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a saved desktop credential kept submitting the previous password. The technician removed the obsolete saved credential and unlocked the account and confirmed a successful login and no new failed attempts; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 11);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Account remains locked after a password reset in the shared workspace','During the afternoon shift, account remains locked after a password reset. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    2,2,8,20,'P3','{"impact": 2, "urgency": 2, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 20, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A saved desktop credential kept submitting the previous password.','Inspection confirmed that a saved desktop credential kept submitting the previous password. The technician removed the obsolete saved credential and unlocked the account and confirmed a successful login and no new failed attempts; reviewed the change history and documented the regression trigger.','1. Reproduced report 77 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed the obsolete saved credential and unlocked the account. 4. Confirmed a successful login and no new failed attempts. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a saved desktop credential kept submitting the previous password. The technician removed the obsolete saved credential and unlocked the account and confirmed a successful login and no new failed attempts; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 24);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: account remains locked after a password reset','When starting work today, account remains locked after a password reset. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    2,2,8,20,'P3','{"impact": 2, "urgency": 2, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 20, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A saved desktop credential kept submitting the previous password.','Inspection confirmed that a saved desktop credential kept submitting the previous password. The technician removed the obsolete saved credential and unlocked the account and confirmed a successful login and no new failed attempts; compared the repaired configuration with the approved baseline.','1. Reproduced report 78 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed the obsolete saved credential and unlocked the account. 4. Confirmed a successful login and no new failed attempts. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a saved desktop credential kept submitting the previous password. The technician removed the obsolete saved credential and unlocked the account and confirmed a successful login and no new failed attempts; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 37);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Account remains locked after a password reset again today','While checking the shared workspace, account remains locked after a password reset. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    2,2,8,20,'P3','{"impact": 2, "urgency": 2, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 20, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A saved desktop credential kept submitting the previous password.','Inspection confirmed that a saved desktop credential kept submitting the previous password. The technician removed the obsolete saved credential and unlocked the account and confirmed a successful login and no new failed attempts; added a targeted operational alert for recurrence.','1. Reproduced report 79 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed the obsolete saved credential and unlocked the account. 4. Confirmed a successful login and no new failed attempts. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a saved desktop credential kept submitting the previous password. The technician removed the obsolete saved credential and unlocked the account and confirmed a successful login and no new failed attempts; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 50);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 264);
  ack_time := started + make_interval(secs => 1584);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: account remains locked after a password reset','After reconnecting this moring, account remains locked after a password reset. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    2,2,8,20,'P3','{"impact": 2, "urgency": 2, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 20, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A saved desktop credential kept submitting the previous password.','Inspection confirmed that a saved desktop credential kept submitting the previous password. The technician removed the obsolete saved credential and unlocked the account and confirmed a successful login and no new failed attempts; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 80 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed the obsolete saved credential and unlocked the account. 4. Confirmed a successful login and no new failed attempts. 5. Asked the reporter to confirm recovery.',264,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a saved desktop credential kept submitting the previous password. The technician removed the obsolete saved credential and unlocked the account and confirmed a successful login and no new failed attempts; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 63);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Sign-in certificate is shown as expired','Since the morning update, sign-in certificate is shown as expired. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,10,'P3','{"impact": 1, "urgency": 2, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 10, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The identity proxy still served the old certificate after renewal.','Inspection confirmed that the identity proxy still served the old certificate after renewal. The technician installed the renewed certificate on every proxy node and reloaded TLS and checked the certificate expiry and completed sign-in through each node; added a configuration check to the maintenance checklist.','1. Reproduced report 81 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Installed the renewed certificate on every proxy node and reloaded TLS. 4. Checked the certificate expiry and completed sign-in through each node. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the identity proxy still served the old certificate after renewal. The technician installed the renewed certificate on every proxy node and reloaded TLS and checked the certificate expiry and completed sign-in through each node; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 76);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Sign-in certificate is shown as expired in the shared workspace','During the afternoon shift, sign-in certificate is shown as expired. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,10,'P3','{"impact": 1, "urgency": 2, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 10, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The identity proxy still served the old certificate after renewal.','Inspection confirmed that the identity proxy still served the old certificate after renewal. The technician installed the renewed certificate on every proxy node and reloaded TLS and checked the certificate expiry and completed sign-in through each node; reviewed the change history and documented the regression trigger.','1. Reproduced report 82 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Installed the renewed certificate on every proxy node and reloaded TLS. 4. Checked the certificate expiry and completed sign-in through each node. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the identity proxy still served the old certificate after renewal. The technician installed the renewed certificate on every proxy node and reloaded TLS and checked the certificate expiry and completed sign-in through each node; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 89);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: sign-in certificate is shown as expired','When starting work today, sign-in certificate is shown as expired. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,10,'P3','{"impact": 1, "urgency": 2, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 10, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The identity proxy still served the old certificate after renewal.','Inspection confirmed that the identity proxy still served the old certificate after renewal. The technician installed the renewed certificate on every proxy node and reloaded TLS and checked the certificate expiry and completed sign-in through each node; compared the repaired configuration with the approved baseline.','1. Reproduced report 83 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Installed the renewed certificate on every proxy node and reloaded TLS. 4. Checked the certificate expiry and completed sign-in through each node. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the identity proxy still served the old certificate after renewal. The technician installed the renewed certificate on every proxy node and reloaded TLS and checked the certificate expiry and completed sign-in through each node; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 13);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Sign-in certificate is shown as expired again today','While checking the shared workspace, sign-in certificate is shown as expired. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,10,'P3','{"impact": 1, "urgency": 2, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 10, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The identity proxy still served the old certificate after renewal.','Inspection confirmed that the identity proxy still served the old certificate after renewal. The technician installed the renewed certificate on every proxy node and reloaded TLS and checked the certificate expiry and completed sign-in through each node; added a targeted operational alert for recurrence.','1. Reproduced report 84 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Installed the renewed certificate on every proxy node and reloaded TLS. 4. Checked the certificate expiry and completed sign-in through each node. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the identity proxy still served the old certificate after renewal. The technician installed the renewed certificate on every proxy node and reloaded TLS and checked the certificate expiry and completed sign-in through each node; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 26);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 264);
  ack_time := started + make_interval(secs => 1584);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: sign-in certificate is shown as expired','After reconnecting this moring, sign-in certificate is shown as expired. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,10,'P3','{"impact": 1, "urgency": 2, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 10, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The identity proxy still served the old certificate after renewal.','Inspection confirmed that the identity proxy still served the old certificate after renewal. The technician installed the renewed certificate on every proxy node and reloaded TLS and checked the certificate expiry and completed sign-in through each node; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 85 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Installed the renewed certificate on every proxy node and reloaded TLS. 4. Checked the certificate expiry and completed sign-in through each node. 5. Asked the reporter to confirm recovery.',264,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the identity proxy still served the old certificate after renewal. The technician installed the renewed certificate on every proxy node and reloaded TLS and checked the certificate expiry and completed sign-in through each node; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 39);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Password reset link is rejected immediately','Since the morning update, password reset link is rejected immediately. One person is affected by this minor inconvenience; 1 user is affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    1,5,1,25,'P3','{"impact": 1, "urgency": 5, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 25, "score": 25, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'Reset tokens were checked against a node with a clock offset.','Inspection confirmed that reset tokens were checked against a node with a clock offset. The technician synchronized the affected node and issued a fresh reset token and used the new link once and confirmed that reuse was rejected; added a configuration check to the maintenance checklist.','1. Reproduced report 86 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Synchronized the affected node and issued a fresh reset token. 4. Used the new link once and confirmed that reuse was rejected. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that reset tokens were checked against a node with a clock offset. The technician synchronized the affected node and issued a fresh reset token and used the new link once and confirmed that reuse was rejected; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 52);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Password reset link is rejected immediately in the shared workspace','During the afternoon shift, password reset link is rejected immediately. One person is affected by this minor inconvenience; 1 user is affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    1,5,1,25,'P3','{"impact": 1, "urgency": 5, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 25, "score": 25, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'Reset tokens were checked against a node with a clock offset.','Inspection confirmed that reset tokens were checked against a node with a clock offset. The technician synchronized the affected node and issued a fresh reset token and used the new link once and confirmed that reuse was rejected; reviewed the change history and documented the regression trigger.','1. Reproduced report 87 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Synchronized the affected node and issued a fresh reset token. 4. Used the new link once and confirmed that reuse was rejected. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that reset tokens were checked against a node with a clock offset. The technician synchronized the affected node and issued a fresh reset token and used the new link once and confirmed that reuse was rejected; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 65);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 1224);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: password reset link is rejected immediately','When starting work today, password reset link is rejected immediately. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,5,'P4','{"impact": 1, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'Reset tokens were checked against a node with a clock offset.','Inspection confirmed that reset tokens were checked against a node with a clock offset. The technician synchronized the affected node and issued a fresh reset token and used the new link once and confirmed that reuse was rejected; compared the repaired configuration with the approved baseline.','1. Reproduced report 88 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Synchronized the affected node and issued a fresh reset token. 4. Used the new link once and confirmed that reuse was rejected. 5. Asked the reporter to confirm recovery.',1224,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that reset tokens were checked against a node with a clock offset. The technician synchronized the affected node and issued a fresh reset token and used the new link once and confirmed that reuse was rejected; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 78);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 1512);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Password reset link is rejected immediately again today','While checking the shared workspace, password reset link is rejected immediately. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,5,'P4','{"impact": 1, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'Reset tokens were checked against a node with a clock offset.','Inspection confirmed that reset tokens were checked against a node with a clock offset. The technician synchronized the affected node and issued a fresh reset token and used the new link once and confirmed that reuse was rejected; added a targeted operational alert for recurrence.','1. Reproduced report 89 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Synchronized the affected node and issued a fresh reset token. 4. Used the new link once and confirmed that reuse was rejected. 5. Asked the reporter to confirm recovery.',1512,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that reset tokens were checked against a node with a clock offset. The technician synchronized the affected node and issued a fresh reset token and used the new link once and confirmed that reuse was rejected; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 77760));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',4320,assignee_key,started+make_interval(mins => 1440));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 1440));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 2);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: password reset link is rejected immediately','After reconnecting this moring, password reset link is rejected immediately. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,5,'P4','{"impact": 1, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'Reset tokens were checked against a node with a clock offset.','Inspection confirmed that reset tokens were checked against a node with a clock offset. The technician synchronized the affected node and issued a fresh reset token and used the new link once and confirmed that reuse was rejected; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 90 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Synchronized the affected node and issued a fresh reset token. 4. Used the new link once and confirmed that reuse was rejected. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that reset tokens were checked against a node with a clock offset. The technician synchronized the affected node and issued a fresh reset token and used the new link once and confirmed that reuse was rejected; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 15);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 648);
  ack_time := started + make_interval(secs => 3888);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Verification code never arrives','Since the morning update, verification code never arrives. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,5,'P4','{"impact": 1, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The identity notification queue stopped after a worker restart.','Inspection confirmed that the identity notification queue stopped after a worker restart. The technician restarted the worker with the correct queue credentials and requested a new code and confirmed delivery before expiry; added a configuration check to the maintenance checklist.','1. Reproduced report 91 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restarted the worker with the correct queue credentials. 4. Requested a new code and confirmed delivery before expiry. 5. Asked the reporter to confirm recovery.',648,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the identity notification queue stopped after a worker restart. The technician restarted the worker with the correct queue credentials and requested a new code and confirmed delivery before expiry; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 28);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 936);
  ack_time := started + make_interval(secs => 5616);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Verification code never arrives in the shared workspace','During the afternoon shift, verification code never arrives. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,5,'P4','{"impact": 1, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The identity notification queue stopped after a worker restart.','Inspection confirmed that the identity notification queue stopped after a worker restart. The technician restarted the worker with the correct queue credentials and requested a new code and confirmed delivery before expiry; reviewed the change history and documented the regression trigger.','1. Reproduced report 92 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restarted the worker with the correct queue credentials. 4. Requested a new code and confirmed delivery before expiry. 5. Asked the reporter to confirm recovery.',936,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the identity notification queue stopped after a worker restart. The technician restarted the worker with the correct queue credentials and requested a new code and confirmed delivery before expiry; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 41);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 1224);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: verification code never arrives','When starting work today, verification code never arrives. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,5,'P4','{"impact": 1, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The identity notification queue stopped after a worker restart.','Inspection confirmed that the identity notification queue stopped after a worker restart. The technician restarted the worker with the correct queue credentials and requested a new code and confirmed delivery before expiry; compared the repaired configuration with the approved baseline.','1. Reproduced report 93 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restarted the worker with the correct queue credentials. 4. Requested a new code and confirmed delivery before expiry. 5. Asked the reporter to confirm recovery.',1224,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the identity notification queue stopped after a worker restart. The technician restarted the worker with the correct queue credentials and requested a new code and confirmed delivery before expiry; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 54);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 1512);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Verification code never arrives again today','While checking the shared workspace, verification code never arrives. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,5,'P4','{"impact": 1, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The identity notification queue stopped after a worker restart.','Inspection confirmed that the identity notification queue stopped after a worker restart. The technician restarted the worker with the correct queue credentials and requested a new code and confirmed delivery before expiry; added a targeted operational alert for recurrence.','1. Reproduced report 94 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restarted the worker with the correct queue credentials. 4. Requested a new code and confirmed delivery before expiry. 5. Asked the reporter to confirm recovery.',1512,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the identity notification queue stopped after a worker restart. The technician restarted the worker with the correct queue credentials and requested a new code and confirmed delivery before expiry; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 77760));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',4320,assignee_key,started+make_interval(mins => 1440));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 1440));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 67);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: verification code never arrives','After reconnecting this moring, verification code never arrives. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,5,'P4','{"impact": 1, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The identity notification queue stopped after a worker restart.','Inspection confirmed that the identity notification queue stopped after a worker restart. The technician restarted the worker with the correct queue credentials and requested a new code and confirmed delivery before expiry; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 95 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restarted the worker with the correct queue credentials. 4. Requested a new code and confirmed delivery before expiry. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the identity notification queue stopped after a worker restart. The technician restarted the worker with the correct queue credentials and requested a new code and confirmed delivery before expiry; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 80);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Storage';
  finished := started + make_interval(mins => 13);
  ack_time := started + make_interval(secs => 78);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Shared folder refuses uploads','Since the morning update, shared folder refuses uploads. An entire department has important work blocked; 25 users are affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    4,4,25,60,'P1','{"impact": 4, "urgency": 4, "criticality": 3, "usersMultiplier": 1.25, "baseScore": 48, "score": 60, "band": "P1", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 5),started+make_interval(mins => 30),
    'The team storage quota had been reached by obsolete exports.','Inspection confirmed that the team storage quota had been reached by obsolete exports. The technician archived approved exports and released the occupied quota and uploaded a small test file and checked the remaining quota; added a configuration check to the maintenance checklist.','1. Reproduced report 96 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Archived approved exports and released the occupied quota. 4. Uploaded a small test file and checked the remaining quota. 5. Asked the reporter to confirm recovery.',13,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the team storage quota had been reached by obsolete exports. The technician archived approved exports and released the occupied quota and uploaded a small test file and checked the remaining quota; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 4);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Storage';
  finished := started + make_interval(mins => 78);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Shared folder refuses uploads in the shared workspace','During the afternoon shift, shared folder refuses uploads. An entire department has important work blocked; 150 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    4,3,150,54,'P2','{"impact": 4, "urgency": 3, "criticality": 3, "usersMultiplier": 1.5, "baseScore": 36, "score": 54, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'The team storage quota had been reached by obsolete exports.','Inspection confirmed that the team storage quota had been reached by obsolete exports. The technician archived approved exports and released the occupied quota and uploaded a small test file and checked the remaining quota; reviewed the change history and documented the regression trigger.','1. Reproduced report 97 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Archived approved exports and released the occupied quota. 4. Uploaded a small test file and checked the remaining quota. 5. Asked the reporter to confirm recovery.',78,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the team storage quota had been reached by obsolete exports. The technician archived approved exports and released the occupied quota and uploaded a small test file and checked the remaining quota; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 17);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Storage';
  finished := started + make_interval(mins => 102);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: shared folder refuses uploads','When starting work today, shared folder refuses uploads. An entire department has important work blocked; 25 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    4,3,25,45,'P2','{"impact": 4, "urgency": 3, "criticality": 3, "usersMultiplier": 1.25, "baseScore": 36, "score": 45, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'The team storage quota had been reached by obsolete exports.','Inspection confirmed that the team storage quota had been reached by obsolete exports. The technician archived approved exports and released the occupied quota and uploaded a small test file and checked the remaining quota; compared the repaired configuration with the approved baseline.','1. Reproduced report 98 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Archived approved exports and released the occupied quota. 4. Uploaded a small test file and checked the remaining quota. 5. Asked the reporter to confirm recovery.',102,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the team storage quota had been reached by obsolete exports. The technician archived approved exports and released the occupied quota and uploaded a small test file and checked the remaining quota; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 5400));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 30);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Storage';
  finished := started + make_interval(mins => 126);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Shared folder refuses uploads again today','While checking the shared workspace, shared folder refuses uploads. An entire department has important work blocked; 150 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    4,2,150,36,'P2','{"impact": 4, "urgency": 2, "criticality": 3, "usersMultiplier": 1.5, "baseScore": 24, "score": 36, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'The team storage quota had been reached by obsolete exports.','Inspection confirmed that the team storage quota had been reached by obsolete exports. The technician archived approved exports and released the occupied quota and uploaded a small test file and checked the remaining quota; added a targeted operational alert for recurrence.','1. Reproduced report 99 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Archived approved exports and released the occupied quota. 4. Uploaded a small test file and checked the remaining quota. 5. Asked the reporter to confirm recovery.',126,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the team storage quota had been reached by obsolete exports. The technician archived approved exports and released the occupied quota and uploaded a small test file and checked the remaining quota; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 5400));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 6480));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',360,assignee_key,started+make_interval(mins => 120));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 120));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 43);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Storage';
  finished := started + make_interval(mins => 66);
  ack_time := started + make_interval(secs => 396);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: shared folder refuses uploads','After reconnecting this moring, shared folder refuses uploads. An entire department has important work blocked; 25 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    4,2,25,30,'P2','{"impact": 4, "urgency": 2, "criticality": 3, "usersMultiplier": 1.25, "baseScore": 24, "score": 30, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'The team storage quota had been reached by obsolete exports.','Inspection confirmed that the team storage quota had been reached by obsolete exports. The technician archived approved exports and released the occupied quota and uploaded a small test file and checked the remaining quota; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 100 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Archived approved exports and released the occupied quota. 4. Uploaded a small test file and checked the remaining quota. 5. Asked the reporter to confirm recovery.',66,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the team storage quota had been reached by obsolete exports. The technician archived approved exports and released the occupied quota and uploaded a small test file and checked the remaining quota; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 56);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Cloud';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Desktop files stay stuck on syncing','Since the morning update, desktop files stay stuck on syncing. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    1,4,1,12,'P3','{"impact": 1, "urgency": 4, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 12, "score": 12, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The synchronization client cached an obsolete endpoint.','Inspection confirmed that the synchronization client cached an obsolete endpoint. The technician updated the endpoint configuration and restarted synchronization and created a file on one client and read it from a second client; added a configuration check to the maintenance checklist.','1. Reproduced report 101 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the endpoint configuration and restarted synchronization. 4. Created a file on one client and read it from a second client. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the synchronization client cached an obsolete endpoint. The technician updated the endpoint configuration and restarted synchronization and created a file on one client and read it from a second client; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 69);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Cloud';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Desktop files stay stuck on syncing in the shared workspace','During the afternoon shift, desktop files stay stuck on syncing. An entire department has important work blocked; 150 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    4,1,150,18,'P3','{"impact": 4, "urgency": 1, "criticality": 3, "usersMultiplier": 1.5, "baseScore": 12, "score": 18, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The synchronization client cached an obsolete endpoint.','Inspection confirmed that the synchronization client cached an obsolete endpoint. The technician updated the endpoint configuration and restarted synchronization and created a file on one client and read it from a second client; reviewed the change history and documented the regression trigger.','1. Reproduced report 102 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the endpoint configuration and restarted synchronization. 4. Created a file on one client and read it from a second client. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the synchronization client cached an obsolete endpoint. The technician updated the endpoint configuration and restarted synchronization and created a file on one client and read it from a second client; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 82);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Cloud';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: desktop files stay stuck on syncing','When starting work today, desktop files stay stuck on syncing. Our team is affected and work is slowed; 25 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    3,2,25,22,'P3','{"impact": 3, "urgency": 2, "criticality": 3, "usersMultiplier": 1.25, "baseScore": 18, "score": 22, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The synchronization client cached an obsolete endpoint.','Inspection confirmed that the synchronization client cached an obsolete endpoint. The technician updated the endpoint configuration and restarted synchronization and created a file on one client and read it from a second client; compared the repaired configuration with the approved baseline.','1. Reproduced report 103 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the endpoint configuration and restarted synchronization. 4. Created a file on one client and read it from a second client. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the synchronization client cached an obsolete endpoint. The technician updated the endpoint configuration and restarted synchronization and created a file on one client and read it from a second client; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 6);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Cloud';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Desktop files stay stuck on syncing again today','While checking the shared workspace, desktop files stay stuck on syncing. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    2,4,8,24,'P3','{"impact": 2, "urgency": 4, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 24, "score": 24, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The synchronization client cached an obsolete endpoint.','Inspection confirmed that the synchronization client cached an obsolete endpoint. The technician updated the endpoint configuration and restarted synchronization and created a file on one client and read it from a second client; added a targeted operational alert for recurrence.','1. Reproduced report 104 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the endpoint configuration and restarted synchronization. 4. Created a file on one client and read it from a second client. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the synchronization client cached an obsolete endpoint. The technician updated the endpoint configuration and restarted synchronization and created a file on one client and read it from a second client; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 19);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Cloud';
  finished := started + make_interval(mins => 264);
  ack_time := started + make_interval(secs => 1584);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: desktop files stay stuck on syncing','After reconnecting this moring, desktop files stay stuck on syncing. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    2,2,8,12,'P3','{"impact": 2, "urgency": 2, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 12, "score": 12, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The synchronization client cached an obsolete endpoint.','Inspection confirmed that the synchronization client cached an obsolete endpoint. The technician updated the endpoint configuration and restarted synchronization and created a file on one client and read it from a second client; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 105 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the endpoint configuration and restarted synchronization. 4. Created a file on one client and read it from a second client. 5. Asked the reporter to confirm recovery.',264,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the synchronization client cached an obsolete endpoint. The technician updated the endpoint configuration and restarted synchronization and created a file on one client and read it from a second client; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 32);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Storage';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Shared documents show access denied','Since the morning update, shared documents show access denied. Our team is affected and work is slowed; 25 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    3,1,25,11,'P3','{"impact": 3, "urgency": 1, "criticality": 3, "usersMultiplier": 1.25, "baseScore": 9, "score": 11, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A group mapping was removed during a folder permission change.','Inspection confirmed that a group mapping was removed during a folder permission change. The technician restored the approved group mapping without granting public access and checked access as both an authorized and an unauthorized test user; added a configuration check to the maintenance checklist.','1. Reproduced report 106 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved group mapping without granting public access. 4. Checked access as both an authorized and an unauthorized test user. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a group mapping was removed during a folder permission change. The technician restored the approved group mapping without granting public access and checked access as both an authorized and an unauthorized test user; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 45);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Storage';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Shared documents show access denied in the shared workspace','During the afternoon shift, shared documents show access denied. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    2,3,8,18,'P3','{"impact": 2, "urgency": 3, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 18, "score": 18, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A group mapping was removed during a folder permission change.','Inspection confirmed that a group mapping was removed during a folder permission change. The technician restored the approved group mapping without granting public access and checked access as both an authorized and an unauthorized test user; reviewed the change history and documented the regression trigger.','1. Reproduced report 107 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved group mapping without granting public access. 4. Checked access as both an authorized and an unauthorized test user. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a group mapping was removed during a folder permission change. The technician restored the approved group mapping without granting public access and checked access as both an authorized and an unauthorized test user; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 58);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Storage';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: shared documents show access denied','When starting work today, shared documents show access denied. One person is affected by this minor inconvenience; 1 user is affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    1,5,1,15,'P3','{"impact": 1, "urgency": 5, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 15, "score": 15, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A group mapping was removed during a folder permission change.','Inspection confirmed that a group mapping was removed during a folder permission change. The technician restored the approved group mapping without granting public access and checked access as both an authorized and an unauthorized test user; compared the repaired configuration with the approved baseline.','1. Reproduced report 108 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved group mapping without granting public access. 4. Checked access as both an authorized and an unauthorized test user. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a group mapping was removed during a folder permission change. The technician restored the approved group mapping without granting public access and checked access as both an authorized and an unauthorized test user; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 71);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Storage';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Shared documents show access denied again today','While checking the shared workspace, shared documents show access denied. Core business activity is stopped; 150 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    5,1,150,22,'P3','{"impact": 5, "urgency": 1, "criticality": 3, "usersMultiplier": 1.5, "baseScore": 15, "score": 22, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A group mapping was removed during a folder permission change.','Inspection confirmed that a group mapping was removed during a folder permission change. The technician restored the approved group mapping without granting public access and checked access as both an authorized and an unauthorized test user; added a targeted operational alert for recurrence.','1. Reproduced report 109 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved group mapping without granting public access. 4. Checked access as both an authorized and an unauthorized test user. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a group mapping was removed during a folder permission change. The technician restored the approved group mapping without granting public access and checked access as both an authorized and an unauthorized test user; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 84);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Storage';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: shared documents show access denied','After reconnecting this moring, shared documents show access denied. A few people are affected, with a workaround available; 8 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    2,1,8,6,'P4','{"impact": 2, "urgency": 1, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 6, "score": 6, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A group mapping was removed during a folder permission change.','Inspection confirmed that a group mapping was removed during a folder permission change. The technician restored the approved group mapping without granting public access and checked access as both an authorized and an unauthorized test user; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 110 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved group mapping without granting public access. 4. Checked access as both an authorized and an unauthorized test user. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a group mapping was removed during a folder permission change. The technician restored the approved group mapping without granting public access and checked access as both an authorized and an unauthorized test user; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 8);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Cloud';
  finished := started + make_interval(mins => 648);
  ack_time := started + make_interval(secs => 3888);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Cloud files open the previous version','Since the morning update, cloud files open the previous version. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,9,'P4','{"impact": 1, "urgency": 3, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 9, "score": 9, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A local synchronization conflict kept an older file pinned.','Inspection confirmed that a local synchronization conflict kept an older file pinned. The technician preserved both revisions and cleared the obsolete local conflict marker and compared file hashes and opened the chosen version on two clients; added a configuration check to the maintenance checklist.','1. Reproduced report 111 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Preserved both revisions and cleared the obsolete local conflict marker. 4. Compared file hashes and opened the chosen version on two clients. 5. Asked the reporter to confirm recovery.',648,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a local synchronization conflict kept an older file pinned. The technician preserved both revisions and cleared the obsolete local conflict marker and compared file hashes and opened the chosen version on two clients; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 21);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Cloud';
  finished := started + make_interval(mins => 936);
  ack_time := started + make_interval(secs => 5616);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Cloud files open the previous version in the shared workspace','During the afternoon shift, cloud files open the previous version. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,9,'P4','{"impact": 1, "urgency": 3, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 9, "score": 9, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A local synchronization conflict kept an older file pinned.','Inspection confirmed that a local synchronization conflict kept an older file pinned. The technician preserved both revisions and cleared the obsolete local conflict marker and compared file hashes and opened the chosen version on two clients; reviewed the change history and documented the regression trigger.','1. Reproduced report 112 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Preserved both revisions and cleared the obsolete local conflict marker. 4. Compared file hashes and opened the chosen version on two clients. 5. Asked the reporter to confirm recovery.',936,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a local synchronization conflict kept an older file pinned. The technician preserved both revisions and cleared the obsolete local conflict marker and compared file hashes and opened the chosen version on two clients; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 34);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Cloud';
  finished := started + make_interval(mins => 1224);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: cloud files open the previous version','When starting work today, cloud files open the previous version. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,9,'P4','{"impact": 1, "urgency": 3, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 9, "score": 9, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A local synchronization conflict kept an older file pinned.','Inspection confirmed that a local synchronization conflict kept an older file pinned. The technician preserved both revisions and cleared the obsolete local conflict marker and compared file hashes and opened the chosen version on two clients; compared the repaired configuration with the approved baseline.','1. Reproduced report 113 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Preserved both revisions and cleared the obsolete local conflict marker. 4. Compared file hashes and opened the chosen version on two clients. 5. Asked the reporter to confirm recovery.',1224,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a local synchronization conflict kept an older file pinned. The technician preserved both revisions and cleared the obsolete local conflict marker and compared file hashes and opened the chosen version on two clients; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 47);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Cloud';
  finished := started + make_interval(mins => 1512);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Cloud files open the previous version again today','While checking the shared workspace, cloud files open the previous version. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,9,'P4','{"impact": 1, "urgency": 3, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 9, "score": 9, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A local synchronization conflict kept an older file pinned.','Inspection confirmed that a local synchronization conflict kept an older file pinned. The technician preserved both revisions and cleared the obsolete local conflict marker and compared file hashes and opened the chosen version on two clients; added a targeted operational alert for recurrence.','1. Reproduced report 114 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Preserved both revisions and cleared the obsolete local conflict marker. 4. Compared file hashes and opened the chosen version on two clients. 5. Asked the reporter to confirm recovery.',1512,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a local synchronization conflict kept an older file pinned. The technician preserved both revisions and cleared the obsolete local conflict marker and compared file hashes and opened the chosen version on two clients; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 77760));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',4320,assignee_key,started+make_interval(mins => 1440));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 1440));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 60);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Cloud';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: cloud files open the previous version','After reconnecting this moring, cloud files open the previous version. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,9,'P4','{"impact": 1, "urgency": 3, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 9, "score": 9, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A local synchronization conflict kept an older file pinned.','Inspection confirmed that a local synchronization conflict kept an older file pinned. The technician preserved both revisions and cleared the obsolete local conflict marker and compared file hashes and opened the chosen version on two clients; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 115 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Preserved both revisions and cleared the obsolete local conflict marker. 4. Compared file hashes and opened the chosen version on two clients. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a local synchronization conflict kept an older file pinned. The technician preserved both revisions and cleared the obsolete local conflict marker and compared file hashes and opened the chosen version on two clients; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 73);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 9);
  ack_time := started + make_interval(secs => 54);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Payment application times out at checkout','Since the morning update, payment application times out at checkout. An entire department has important work blocked; 25 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    4,3,25,75,'P1','{"impact": 4, "urgency": 3, "criticality": 5, "usersMultiplier": 1.25, "baseScore": 60, "score": 75, "band": "P1", "overrideRule": "Payment service is always P1"}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 3),started+make_interval(mins => 20),
    'The gateway connection pool was exhausted by unclosed response streams.','Inspection confirmed that the gateway connection pool was exhausted by unclosed response streams. The technician closed leaked response streams and recycled the gateway client pool and ran a synthetic checkout in the isolated test environment; added a configuration check to the maintenance checklist.','1. Reproduced report 116 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Closed leaked response streams and recycled the gateway client pool. 4. Ran a synthetic checkout in the isolated test environment. 5. Asked the reporter to confirm recovery.',9,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the gateway connection pool was exhausted by unclosed response streams. The technician closed leaked response streams and recycled the gateway client pool and ran a synthetic checkout in the isolated test environment; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 86);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 13);
  ack_time := started + make_interval(secs => 78);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Payment application times out at checkout in the shared workspace','During the afternoon shift, payment application times out at checkout. Core business activity is stopped; 150 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    5,3,150,112,'P1','{"impact": 5, "urgency": 3, "criticality": 5, "usersMultiplier": 1.5, "baseScore": 75, "score": 112, "band": "P1", "overrideRule": "Payment service is always P1"}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 3),started+make_interval(mins => 20),
    'The gateway connection pool was exhausted by unclosed response streams.','Inspection confirmed that the gateway connection pool was exhausted by unclosed response streams. The technician closed leaked response streams and recycled the gateway client pool and ran a synthetic checkout in the isolated test environment; reviewed the change history and documented the regression trigger.','1. Reproduced report 117 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Closed leaked response streams and recycled the gateway client pool. 4. Ran a synthetic checkout in the isolated test environment. 5. Asked the reporter to confirm recovery.',13,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the gateway connection pool was exhausted by unclosed response streams. The technician closed leaked response streams and recycled the gateway client pool and ran a synthetic checkout in the isolated test environment; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 10);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 17);
  ack_time := started + make_interval(secs => 90);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: payment application times out at checkout','When starting work today, payment application times out at checkout. An entire department has important work blocked; 150 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    4,2,150,60,'P1','{"impact": 4, "urgency": 2, "criticality": 5, "usersMultiplier": 1.5, "baseScore": 40, "score": 60, "band": "P1", "overrideRule": "Payment service is always P1"}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 3),started+make_interval(mins => 20),
    'The gateway connection pool was exhausted by unclosed response streams.','Inspection confirmed that the gateway connection pool was exhausted by unclosed response streams. The technician closed leaked response streams and recycled the gateway client pool and ran a synthetic checkout in the isolated test environment; compared the repaired configuration with the approved baseline.','1. Reproduced report 118 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Closed leaked response streams and recycled the gateway client pool. 4. Ran a synthetic checkout in the isolated test environment. 5. Asked the reporter to confirm recovery.',17,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the gateway connection pool was exhausted by unclosed response streams. The technician closed leaked response streams and recycled the gateway client pool and ran a synthetic checkout in the isolated test environment; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 900));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 23);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 63);
  ack_time := started + make_interval(secs => 300);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Payment application times out at checkout again today','While checking the shared workspace, payment application times out at checkout. Our team is affected and work is slowed; 25 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    3,3,25,56,'P2','{"impact": 3, "urgency": 3, "criticality": 5, "usersMultiplier": 1.25, "baseScore": 45, "score": 56, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 10),started+make_interval(mins => 60),
    'The gateway connection pool was exhausted by unclosed response streams.','Inspection confirmed that the gateway connection pool was exhausted by unclosed response streams. The technician closed leaked response streams and recycled the gateway client pool and ran a synthetic checkout in the isolated test environment; added a targeted operational alert for recurrence.','1. Reproduced report 119 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Closed leaked response streams and recycled the gateway client pool. 4. Ran a synthetic checkout in the isolated test environment. 5. Asked the reporter to confirm recovery.',63,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the gateway connection pool was exhausted by unclosed response streams. The technician closed leaked response streams and recycled the gateway client pool and ran a synthetic checkout in the isolated test environment; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 2700));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 3240));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',180,assignee_key,started+make_interval(mins => 60));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 60));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 36);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 33);
  ack_time := started + make_interval(secs => 198);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: payment application times out at checkout','After reconnecting this moring, payment application times out at checkout. A few people are affected, with a workaround available; 8 users are affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    2,5,8,50,'P2','{"impact": 2, "urgency": 5, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 50, "score": 50, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 10),started+make_interval(mins => 60),
    'The gateway connection pool was exhausted by unclosed response streams.','Inspection confirmed that the gateway connection pool was exhausted by unclosed response streams. The technician closed leaked response streams and recycled the gateway client pool and ran a synthetic checkout in the isolated test environment; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 120 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Closed leaked response streams and recycled the gateway client pool. 4. Ran a synthetic checkout in the isolated test environment. 5. Asked the reporter to confirm recovery.',33,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the gateway connection pool was exhausted by unclosed response streams. The technician closed leaked response streams and recycled the gateway client pool and ran a synthetic checkout in the isolated test environment; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 49);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 27);
  ack_time := started + make_interval(secs => 162);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Payment callback leaves transactions pending','Since the morning update, payment callback leaves transactions pending. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    2,3,8,30,'P2','{"impact": 2, "urgency": 3, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 30, "score": 30, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 10),started+make_interval(mins => 60),
    'The callback worker used an outdated signing certificate.','Inspection confirmed that the callback worker used an outdated signing certificate. The technician updated the trusted certificate and replayed the approved test callbacks and confirmed that test transactions moved out of pending exactly once; added a configuration check to the maintenance checklist.','1. Reproduced report 121 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the trusted certificate and replayed the approved test callbacks. 4. Confirmed that test transactions moved out of pending exactly once. 5. Asked the reporter to confirm recovery.',27,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the callback worker used an outdated signing certificate. The technician updated the trusted certificate and replayed the approved test callbacks and confirmed that test transactions moved out of pending exactly once; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 62);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 39);
  ack_time := started + make_interval(secs => 234);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Payment callback leaves transactions pending in the shared workspace','During the afternoon shift, payment callback leaves transactions pending. Our team is affected and work is slowed; 25 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    3,2,25,37,'P2','{"impact": 3, "urgency": 2, "criticality": 5, "usersMultiplier": 1.25, "baseScore": 30, "score": 37, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 10),started+make_interval(mins => 60),
    'The callback worker used an outdated signing certificate.','Inspection confirmed that the callback worker used an outdated signing certificate. The technician updated the trusted certificate and replayed the approved test callbacks and confirmed that test transactions moved out of pending exactly once; reviewed the change history and documented the regression trigger.','1. Reproduced report 122 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the trusted certificate and replayed the approved test callbacks. 4. Confirmed that test transactions moved out of pending exactly once. 5. Asked the reporter to confirm recovery.',39,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the callback worker used an outdated signing certificate. The technician updated the trusted certificate and replayed the approved test callbacks and confirmed that test transactions moved out of pending exactly once; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 75);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 51);
  ack_time := started + make_interval(secs => 300);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: payment callback leaves transactions pending','When starting work today, payment callback leaves transactions pending. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    2,4,8,40,'P2','{"impact": 2, "urgency": 4, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 40, "score": 40, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 10),started+make_interval(mins => 60),
    'The callback worker used an outdated signing certificate.','Inspection confirmed that the callback worker used an outdated signing certificate. The technician updated the trusted certificate and replayed the approved test callbacks and confirmed that test transactions moved out of pending exactly once; compared the repaired configuration with the approved baseline.','1. Reproduced report 123 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the trusted certificate and replayed the approved test callbacks. 4. Confirmed that test transactions moved out of pending exactly once. 5. Asked the reporter to confirm recovery.',51,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the callback worker used an outdated signing certificate. The technician updated the trusted certificate and replayed the approved test callbacks and confirmed that test transactions moved out of pending exactly once; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 2700));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 88);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 63);
  ack_time := started + make_interval(secs => 300);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Payment callback leaves transactions pending again today','While checking the shared workspace, payment callback leaves transactions pending. Our team is affected and work is slowed; 25 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    3,3,25,56,'P2','{"impact": 3, "urgency": 3, "criticality": 5, "usersMultiplier": 1.25, "baseScore": 45, "score": 56, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 10),started+make_interval(mins => 60),
    'The callback worker used an outdated signing certificate.','Inspection confirmed that the callback worker used an outdated signing certificate. The technician updated the trusted certificate and replayed the approved test callbacks and confirmed that test transactions moved out of pending exactly once; added a targeted operational alert for recurrence.','1. Reproduced report 124 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the trusted certificate and replayed the approved test callbacks. 4. Confirmed that test transactions moved out of pending exactly once. 5. Asked the reporter to confirm recovery.',63,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the callback worker used an outdated signing certificate. The technician updated the trusted certificate and replayed the approved test callbacks and confirmed that test transactions moved out of pending exactly once; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 2700));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 3240));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',180,assignee_key,started+make_interval(mins => 60));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 60));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 12);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 264);
  ack_time := started + make_interval(secs => 1584);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: payment callback leaves transactions pending','After reconnecting this moring, payment callback leaves transactions pending. A few people are affected, with a workaround available; 8 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    2,1,8,10,'P3','{"impact": 2, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 10, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The callback worker used an outdated signing certificate.','Inspection confirmed that the callback worker used an outdated signing certificate. The technician updated the trusted certificate and replayed the approved test callbacks and confirmed that test transactions moved out of pending exactly once; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 125 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the trusted certificate and replayed the approved test callbacks. 4. Confirmed that test transactions moved out of pending exactly once. 5. Asked the reporter to confirm recovery.',264,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the callback worker used an outdated signing certificate. The technician updated the trusted certificate and replayed the approved test callbacks and confirmed that test transactions moved out of pending exactly once; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 25);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Reconciliation report omits recent transactions','Since the morning update, reconciliation report omits recent transactions. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,10,'P3','{"impact": 1, "urgency": 2, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 10, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The scheduled reconciliation job used the previous cutoff timezone.','Inspection confirmed that the scheduled reconciliation job used the previous cutoff timezone. The technician corrected the UTC cutoff and regenerated the test report and matched the regenerated totals against the test transaction ledger; added a configuration check to the maintenance checklist.','1. Reproduced report 126 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Corrected the UTC cutoff and regenerated the test report. 4. Matched the regenerated totals against the test transaction ledger. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the scheduled reconciliation job used the previous cutoff timezone. The technician corrected the UTC cutoff and regenerated the test report and matched the regenerated totals against the test transaction ledger; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 38);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Reconciliation report omits recent transactions in the shared workspace','During the afternoon shift, reconciliation report omits recent transactions. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,15,'P3','{"impact": 1, "urgency": 3, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 15, "score": 15, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The scheduled reconciliation job used the previous cutoff timezone.','Inspection confirmed that the scheduled reconciliation job used the previous cutoff timezone. The technician corrected the UTC cutoff and regenerated the test report and matched the regenerated totals against the test transaction ledger; reviewed the change history and documented the regression trigger.','1. Reproduced report 127 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Corrected the UTC cutoff and regenerated the test report. 4. Matched the regenerated totals against the test transaction ledger. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the scheduled reconciliation job used the previous cutoff timezone. The technician corrected the UTC cutoff and regenerated the test report and matched the regenerated totals against the test transaction ledger; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 51);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: reconciliation report omits recent transactions','When starting work today, reconciliation report omits recent transactions. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    1,4,1,20,'P3','{"impact": 1, "urgency": 4, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 20, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The scheduled reconciliation job used the previous cutoff timezone.','Inspection confirmed that the scheduled reconciliation job used the previous cutoff timezone. The technician corrected the UTC cutoff and regenerated the test report and matched the regenerated totals against the test transaction ledger; compared the repaired configuration with the approved baseline.','1. Reproduced report 128 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Corrected the UTC cutoff and regenerated the test report. 4. Matched the regenerated totals against the test transaction ledger. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the scheduled reconciliation job used the previous cutoff timezone. The technician corrected the UTC cutoff and regenerated the test report and matched the regenerated totals against the test transaction ledger; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 64);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Reconciliation report omits recent transactions again today','While checking the shared workspace, reconciliation report omits recent transactions. One person is affected by this minor inconvenience; 1 user is affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    1,5,1,25,'P3','{"impact": 1, "urgency": 5, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 25, "score": 25, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The scheduled reconciliation job used the previous cutoff timezone.','Inspection confirmed that the scheduled reconciliation job used the previous cutoff timezone. The technician corrected the UTC cutoff and regenerated the test report and matched the regenerated totals against the test transaction ledger; added a targeted operational alert for recurrence.','1. Reproduced report 129 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Corrected the UTC cutoff and regenerated the test report. 4. Matched the regenerated totals against the test transaction ledger. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the scheduled reconciliation job used the previous cutoff timezone. The technician corrected the UTC cutoff and regenerated the test report and matched the regenerated totals against the test transaction ledger; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 77);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 264);
  ack_time := started + make_interval(secs => 1584);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: reconciliation report omits recent transactions','After reconnecting this moring, reconciliation report omits recent transactions. A few people are affected, with a workaround available; 8 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    2,1,8,10,'P3','{"impact": 2, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 10, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The scheduled reconciliation job used the previous cutoff timezone.','Inspection confirmed that the scheduled reconciliation job used the previous cutoff timezone. The technician corrected the UTC cutoff and regenerated the test report and matched the regenerated totals against the test transaction ledger; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 130 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Corrected the UTC cutoff and regenerated the test report. 4. Matched the regenerated totals against the test transaction ledger. 5. Asked the reporter to confirm recovery.',264,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the scheduled reconciliation job used the previous cutoff timezone. The technician corrected the UTC cutoff and regenerated the test report and matched the regenerated totals against the test transaction ledger; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 90);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Payment page returns a server error','Since the morning update, payment page returns a server error. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,10,'P3','{"impact": 1, "urgency": 2, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 10, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A deployment omitted the gateway endpoint configuration.','Inspection confirmed that a deployment omitted the gateway endpoint configuration. The technician restored the approved endpoint configuration and restarted the affected instance and completed synthetic checkout requests and checked the error log; added a configuration check to the maintenance checklist.','1. Reproduced report 131 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved endpoint configuration and restarted the affected instance. 4. Completed synthetic checkout requests and checked the error log. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a deployment omitted the gateway endpoint configuration. The technician restored the approved endpoint configuration and restarted the affected instance and completed synthetic checkout requests and checked the error log; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 14);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Payment page returns a server error in the shared workspace','During the afternoon shift, payment page returns a server error. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,15,'P3','{"impact": 1, "urgency": 3, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 15, "score": 15, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A deployment omitted the gateway endpoint configuration.','Inspection confirmed that a deployment omitted the gateway endpoint configuration. The technician restored the approved endpoint configuration and restarted the affected instance and completed synthetic checkout requests and checked the error log; reviewed the change history and documented the regression trigger.','1. Reproduced report 132 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved endpoint configuration and restarted the affected instance. 4. Completed synthetic checkout requests and checked the error log. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a deployment omitted the gateway endpoint configuration. The technician restored the approved endpoint configuration and restarted the affected instance and completed synthetic checkout requests and checked the error log; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 27);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: payment page returns a server error','When starting work today, payment page returns a server error. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    1,4,1,20,'P3','{"impact": 1, "urgency": 4, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 20, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A deployment omitted the gateway endpoint configuration.','Inspection confirmed that a deployment omitted the gateway endpoint configuration. The technician restored the approved endpoint configuration and restarted the affected instance and completed synthetic checkout requests and checked the error log; compared the repaired configuration with the approved baseline.','1. Reproduced report 133 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved endpoint configuration and restarted the affected instance. 4. Completed synthetic checkout requests and checked the error log. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a deployment omitted the gateway endpoint configuration. The technician restored the approved endpoint configuration and restarted the affected instance and completed synthetic checkout requests and checked the error log; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 40);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 1512);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Payment page returns a server error again today','While checking the shared workspace, payment page returns a server error. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,5,'P4','{"impact": 1, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A deployment omitted the gateway endpoint configuration.','Inspection confirmed that a deployment omitted the gateway endpoint configuration. The technician restored the approved endpoint configuration and restarted the affected instance and completed synthetic checkout requests and checked the error log; added a targeted operational alert for recurrence.','1. Reproduced report 134 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved endpoint configuration and restarted the affected instance. 4. Completed synthetic checkout requests and checked the error log. 5. Asked the reporter to confirm recovery.',1512,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a deployment omitted the gateway endpoint configuration. The technician restored the approved endpoint configuration and restarted the affected instance and completed synthetic checkout requests and checked the error log; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 77760));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',4320,assignee_key,started+make_interval(mins => 1440));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 1440));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 53);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Payment';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: payment page returns a server error','After reconnecting this moring, payment page returns a server error. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,5,'P4','{"impact": 1, "urgency": 1, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A deployment omitted the gateway endpoint configuration.','Inspection confirmed that a deployment omitted the gateway endpoint configuration. The technician restored the approved endpoint configuration and restarted the affected instance and completed synthetic checkout requests and checked the error log; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 135 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved endpoint configuration and restarted the affected instance. 4. Completed synthetic checkout requests and checked the error log. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a deployment omitted the gateway endpoint configuration. The technician restored the approved endpoint configuration and restarted the affected instance and completed synthetic checkout requests and checked the error log; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 66);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 54);
  ack_time := started + make_interval(secs => 324);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Messages wait in the outbox for a long time','Since the morning update, messages wait in the outbox for a long time. A few people are affected, with a workaround available; 8 users are affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    2,5,8,30,'P2','{"impact": 2, "urgency": 5, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 30, "score": 30, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'A mail relay retained a stale upstream route.','Inspection confirmed that a mail relay retained a stale upstream route. The technician updated the relay route and released the deferred test messages and sent a message between two demo mailboxes and checked delivery headers; added a configuration check to the maintenance checklist.','1. Reproduced report 136 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the relay route and released the deferred test messages. 4. Sent a message between two demo mailboxes and checked delivery headers. 5. Asked the reporter to confirm recovery.',54,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a mail relay retained a stale upstream route. The technician updated the relay route and released the deferred test messages and sent a message between two demo mailboxes and checked delivery headers; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 79);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 78);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Messages wait in the outbox for a long time in the shared workspace','During the afternoon shift, messages wait in the outbox for a long time. Core business activity is stopped; 150 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    5,2,150,45,'P2','{"impact": 5, "urgency": 2, "criticality": 3, "usersMultiplier": 1.5, "baseScore": 30, "score": 45, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'A mail relay retained a stale upstream route.','Inspection confirmed that a mail relay retained a stale upstream route. The technician updated the relay route and released the deferred test messages and sent a message between two demo mailboxes and checked delivery headers; reviewed the change history and documented the regression trigger.','1. Reproduced report 137 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the relay route and released the deferred test messages. 4. Sent a message between two demo mailboxes and checked delivery headers. 5. Asked the reporter to confirm recovery.',78,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a mail relay retained a stale upstream route. The technician updated the relay route and released the deferred test messages and sent a message between two demo mailboxes and checked delivery headers; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 3);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 102);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: messages wait in the outbox for a long time','When starting work today, messages wait in the outbox for a long time. An entire department has important work blocked; 150 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    4,3,150,54,'P2','{"impact": 4, "urgency": 3, "criticality": 3, "usersMultiplier": 1.5, "baseScore": 36, "score": 54, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'A mail relay retained a stale upstream route.','Inspection confirmed that a mail relay retained a stale upstream route. The technician updated the relay route and released the deferred test messages and sent a message between two demo mailboxes and checked delivery headers; compared the repaired configuration with the approved baseline.','1. Reproduced report 138 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the relay route and released the deferred test messages. 4. Sent a message between two demo mailboxes and checked delivery headers. 5. Asked the reporter to confirm recovery.',102,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a mail relay retained a stale upstream route. The technician updated the relay route and released the deferred test messages and sent a message between two demo mailboxes and checked delivery headers; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 5400));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 16);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 126);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Messages wait in the outbox for a long time again today','While checking the shared workspace, messages wait in the outbox for a long time. An entire department has important work blocked; 25 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    4,3,25,45,'P2','{"impact": 4, "urgency": 3, "criticality": 3, "usersMultiplier": 1.25, "baseScore": 36, "score": 45, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'A mail relay retained a stale upstream route.','Inspection confirmed that a mail relay retained a stale upstream route. The technician updated the relay route and released the deferred test messages and sent a message between two demo mailboxes and checked delivery headers; added a targeted operational alert for recurrence.','1. Reproduced report 139 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the relay route and released the deferred test messages. 4. Sent a message between two demo mailboxes and checked delivery headers. 5. Asked the reporter to confirm recovery.',126,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a mail relay retained a stale upstream route. The technician updated the relay route and released the deferred test messages and sent a message between two demo mailboxes and checked delivery headers; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 5400));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 6480));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',360,assignee_key,started+make_interval(mins => 120));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 120));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 29);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 66);
  ack_time := started + make_interval(secs => 396);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: messages wait in the outbox for a long time','After reconnecting this moring, messages wait in the outbox for a long time. An entire department has important work blocked; 150 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    4,2,150,36,'P2','{"impact": 4, "urgency": 2, "criticality": 3, "usersMultiplier": 1.5, "baseScore": 24, "score": 36, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'A mail relay retained a stale upstream route.','Inspection confirmed that a mail relay retained a stale upstream route. The technician updated the relay route and released the deferred test messages and sent a message between two demo mailboxes and checked delivery headers; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 140 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the relay route and released the deferred test messages. 4. Sent a message between two demo mailboxes and checked delivery headers. 5. Asked the reporter to confirm recovery.',66,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a mail relay retained a stale upstream route. The technician updated the relay route and released the deferred test messages and sent a message between two demo mailboxes and checked delivery headers; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 42);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Storage';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Mailbox stops receiving new messages','Since the morning update, mailbox stops receiving new messages. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    1,4,1,12,'P3','{"impact": 1, "urgency": 4, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 12, "score": 12, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The mailbox quota was full because of retained attachments.','Inspection confirmed that the mailbox quota was full because of retained attachments. The technician archived approved old attachments and released mailbox space and delivered a fresh test message and checked the quota counter; added a configuration check to the maintenance checklist.','1. Reproduced report 141 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Archived approved old attachments and released mailbox space. 4. Delivered a fresh test message and checked the quota counter. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the mailbox quota was full because of retained attachments. The technician archived approved old attachments and released mailbox space and delivered a fresh test message and checked the quota counter; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 55);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Storage';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Mailbox stops receiving new messages in the shared workspace','During the afternoon shift, mailbox stops receiving new messages. An entire department has important work blocked; 150 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    4,1,150,18,'P3','{"impact": 4, "urgency": 1, "criticality": 3, "usersMultiplier": 1.5, "baseScore": 12, "score": 18, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The mailbox quota was full because of retained attachments.','Inspection confirmed that the mailbox quota was full because of retained attachments. The technician archived approved old attachments and released mailbox space and delivered a fresh test message and checked the quota counter; reviewed the change history and documented the regression trigger.','1. Reproduced report 142 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Archived approved old attachments and released mailbox space. 4. Delivered a fresh test message and checked the quota counter. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the mailbox quota was full because of retained attachments. The technician archived approved old attachments and released mailbox space and delivered a fresh test message and checked the quota counter; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 68);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Storage';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: mailbox stops receiving new messages','When starting work today, mailbox stops receiving new messages. Our team is affected and work is slowed; 25 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    3,2,25,22,'P3','{"impact": 3, "urgency": 2, "criticality": 3, "usersMultiplier": 1.25, "baseScore": 18, "score": 22, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The mailbox quota was full because of retained attachments.','Inspection confirmed that the mailbox quota was full because of retained attachments. The technician archived approved old attachments and released mailbox space and delivered a fresh test message and checked the quota counter; compared the repaired configuration with the approved baseline.','1. Reproduced report 143 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Archived approved old attachments and released mailbox space. 4. Delivered a fresh test message and checked the quota counter. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the mailbox quota was full because of retained attachments. The technician archived approved old attachments and released mailbox space and delivered a fresh test message and checked the quota counter; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 81);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Storage';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Mailbox stops receiving new messages again today','While checking the shared workspace, mailbox stops receiving new messages. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    2,4,8,24,'P3','{"impact": 2, "urgency": 4, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 24, "score": 24, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The mailbox quota was full because of retained attachments.','Inspection confirmed that the mailbox quota was full because of retained attachments. The technician archived approved old attachments and released mailbox space and delivered a fresh test message and checked the quota counter; added a targeted operational alert for recurrence.','1. Reproduced report 144 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Archived approved old attachments and released mailbox space. 4. Delivered a fresh test message and checked the quota counter. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the mailbox quota was full because of retained attachments. The technician archived approved old attachments and released mailbox space and delivered a fresh test message and checked the quota counter; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 5);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Storage';
  finished := started + make_interval(mins => 264);
  ack_time := started + make_interval(secs => 1584);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: mailbox stops receiving new messages','After reconnecting this moring, mailbox stops receiving new messages. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    2,2,8,12,'P3','{"impact": 2, "urgency": 2, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 12, "score": 12, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The mailbox quota was full because of retained attachments.','Inspection confirmed that the mailbox quota was full because of retained attachments. The technician archived approved old attachments and released mailbox space and delivered a fresh test message and checked the quota counter; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 145 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Archived approved old attachments and released mailbox space. 4. Delivered a fresh test message and checked the quota counter. 5. Asked the reporter to confirm recovery.',264,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the mailbox quota was full because of retained attachments. The technician archived approved old attachments and released mailbox space and delivered a fresh test message and checked the quota counter; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 18);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Security';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Legitimate meeting notices go to spam','Since the morning update, legitimate meeting notices go to spam. Our team is affected and work is slowed; 25 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    3,1,25,11,'P3','{"impact": 3, "urgency": 1, "criticality": 3, "usersMultiplier": 1.25, "baseScore": 9, "score": 11, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'An overbroad filtering rule matched a normal calendar header.','Inspection confirmed that an overbroad filtering rule matched a normal calendar header. The technician narrowed the rule and reprocessed the affected demo messages and confirmed delivery of a calendar notice and continued blocking of a test spam message; added a configuration check to the maintenance checklist.','1. Reproduced report 146 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Narrowed the rule and reprocessed the affected demo messages. 4. Confirmed delivery of a calendar notice and continued blocking of a test spam message. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that an overbroad filtering rule matched a normal calendar header. The technician narrowed the rule and reprocessed the affected demo messages and confirmed delivery of a calendar notice and continued blocking of a test spam message; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 31);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Security';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Legitimate meeting notices go to spam in the shared workspace','During the afternoon shift, legitimate meeting notices go to spam. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    2,3,8,18,'P3','{"impact": 2, "urgency": 3, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 18, "score": 18, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'An overbroad filtering rule matched a normal calendar header.','Inspection confirmed that an overbroad filtering rule matched a normal calendar header. The technician narrowed the rule and reprocessed the affected demo messages and confirmed delivery of a calendar notice and continued blocking of a test spam message; reviewed the change history and documented the regression trigger.','1. Reproduced report 147 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Narrowed the rule and reprocessed the affected demo messages. 4. Confirmed delivery of a calendar notice and continued blocking of a test spam message. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that an overbroad filtering rule matched a normal calendar header. The technician narrowed the rule and reprocessed the affected demo messages and confirmed delivery of a calendar notice and continued blocking of a test spam message; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 44);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Security';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: legitimate meeting notices go to spam','When starting work today, legitimate meeting notices go to spam. One person is affected by this minor inconvenience; 1 user is affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    1,5,1,15,'P3','{"impact": 1, "urgency": 5, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 15, "score": 15, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'An overbroad filtering rule matched a normal calendar header.','Inspection confirmed that an overbroad filtering rule matched a normal calendar header. The technician narrowed the rule and reprocessed the affected demo messages and confirmed delivery of a calendar notice and continued blocking of a test spam message; compared the repaired configuration with the approved baseline.','1. Reproduced report 148 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Narrowed the rule and reprocessed the affected demo messages. 4. Confirmed delivery of a calendar notice and continued blocking of a test spam message. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that an overbroad filtering rule matched a normal calendar header. The technician narrowed the rule and reprocessed the affected demo messages and confirmed delivery of a calendar notice and continued blocking of a test spam message; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 57);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Security';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Legitimate meeting notices go to spam again today','While checking the shared workspace, legitimate meeting notices go to spam. Core business activity is stopped; 150 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    5,1,150,22,'P3','{"impact": 5, "urgency": 1, "criticality": 3, "usersMultiplier": 1.5, "baseScore": 15, "score": 22, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'An overbroad filtering rule matched a normal calendar header.','Inspection confirmed that an overbroad filtering rule matched a normal calendar header. The technician narrowed the rule and reprocessed the affected demo messages and confirmed delivery of a calendar notice and continued blocking of a test spam message; added a targeted operational alert for recurrence.','1. Reproduced report 149 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Narrowed the rule and reprocessed the affected demo messages. 4. Confirmed delivery of a calendar notice and continued blocking of a test spam message. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that an overbroad filtering rule matched a normal calendar header. The technician narrowed the rule and reprocessed the affected demo messages and confirmed delivery of a calendar notice and continued blocking of a test spam message; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 70);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Security';
  finished := started + make_interval(mins => 264);
  ack_time := started + make_interval(secs => 1584);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: legitimate meeting notices go to spam','After reconnecting this moring, legitimate meeting notices go to spam. An entire department has important work blocked; 25 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    4,1,25,15,'P3','{"impact": 4, "urgency": 1, "criticality": 3, "usersMultiplier": 1.25, "baseScore": 12, "score": 15, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'An overbroad filtering rule matched a normal calendar header.','Inspection confirmed that an overbroad filtering rule matched a normal calendar header. The technician narrowed the rule and reprocessed the affected demo messages and confirmed delivery of a calendar notice and continued blocking of a test spam message; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 150 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Narrowed the rule and reprocessed the affected demo messages. 4. Confirmed delivery of a calendar notice and continued blocking of a test spam message. 5. Asked the reporter to confirm recovery.',264,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that an overbroad filtering rule matched a normal calendar header. The technician narrowed the rule and reprocessed the affected demo messages and confirmed delivery of a calendar notice and continued blocking of a test spam message; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 83);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Calendar invite appears twice','Since the morning update, calendar invite appears twice. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    1,4,1,12,'P3','{"impact": 1, "urgency": 4, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 12, "score": 12, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A retry job lacked a stable message identifier.','Inspection confirmed that a retry job lacked a stable message identifier. The technician restored idempotent message identifiers and cleared the duplicate retry entries and sent a test invitation and confirmed a single calendar entry; added a configuration check to the maintenance checklist.','1. Reproduced report 151 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored idempotent message identifiers and cleared the duplicate retry entries. 4. Sent a test invitation and confirmed a single calendar entry. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a retry job lacked a stable message identifier. The technician restored idempotent message identifiers and cleared the duplicate retry entries and sent a test invitation and confirmed a single calendar entry; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 7);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Calendar invite appears twice in the shared workspace','During the afternoon shift, calendar invite appears twice. An entire department has important work blocked; 150 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    4,1,150,18,'P3','{"impact": 4, "urgency": 1, "criticality": 3, "usersMultiplier": 1.5, "baseScore": 12, "score": 18, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A retry job lacked a stable message identifier.','Inspection confirmed that a retry job lacked a stable message identifier. The technician restored idempotent message identifiers and cleared the duplicate retry entries and sent a test invitation and confirmed a single calendar entry; reviewed the change history and documented the regression trigger.','1. Reproduced report 152 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored idempotent message identifiers and cleared the duplicate retry entries. 4. Sent a test invitation and confirmed a single calendar entry. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a retry job lacked a stable message identifier. The technician restored idempotent message identifiers and cleared the duplicate retry entries and sent a test invitation and confirmed a single calendar entry; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 20);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 1224);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: calendar invite appears twice','When starting work today, calendar invite appears twice. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,9,'P4','{"impact": 1, "urgency": 3, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 9, "score": 9, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A retry job lacked a stable message identifier.','Inspection confirmed that a retry job lacked a stable message identifier. The technician restored idempotent message identifiers and cleared the duplicate retry entries and sent a test invitation and confirmed a single calendar entry; compared the repaired configuration with the approved baseline.','1. Reproduced report 153 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored idempotent message identifiers and cleared the duplicate retry entries. 4. Sent a test invitation and confirmed a single calendar entry. 5. Asked the reporter to confirm recovery.',1224,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a retry job lacked a stable message identifier. The technician restored idempotent message identifiers and cleared the duplicate retry entries and sent a test invitation and confirmed a single calendar entry; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 33);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 1512);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Calendar invite appears twice again today','While checking the shared workspace, calendar invite appears twice. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,9,'P4','{"impact": 1, "urgency": 3, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 9, "score": 9, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A retry job lacked a stable message identifier.','Inspection confirmed that a retry job lacked a stable message identifier. The technician restored idempotent message identifiers and cleared the duplicate retry entries and sent a test invitation and confirmed a single calendar entry; added a targeted operational alert for recurrence.','1. Reproduced report 154 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored idempotent message identifiers and cleared the duplicate retry entries. 4. Sent a test invitation and confirmed a single calendar entry. 5. Asked the reporter to confirm recovery.',1512,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a retry job lacked a stable message identifier. The technician restored idempotent message identifiers and cleared the duplicate retry entries and sent a test invitation and confirmed a single calendar entry; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 77760));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',4320,assignee_key,started+make_interval(mins => 1440));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 1440));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 46);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: calendar invite appears twice','After reconnecting this moring, calendar invite appears twice. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,9,'P4','{"impact": 1, "urgency": 3, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 9, "score": 9, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A retry job lacked a stable message identifier.','Inspection confirmed that a retry job lacked a stable message identifier. The technician restored idempotent message identifiers and cleared the duplicate retry entries and sent a test invitation and confirmed a single calendar entry; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 155 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored idempotent message identifiers and cleared the duplicate retry entries. 4. Sent a test invitation and confirmed a single calendar entry. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a retry job lacked a stable message identifier. The technician restored idempotent message identifiers and cleared the duplicate retry entries and sent a test invitation and confirmed a single calendar entry; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 59);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 648);
  ack_time := started + make_interval(secs => 3888);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Webmail search cannot find recent messages','Since the morning update, webmail search cannot find recent messages. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,6,'P4','{"impact": 1, "urgency": 2, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 6, "score": 6, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The mailbox search indexer stopped after its service account rotated.','Inspection confirmed that the mailbox search indexer stopped after its service account rotated. The technician updated the indexer credential and rebuilt the affected index and searched for a newly received test subject and an older known subject; added a configuration check to the maintenance checklist.','1. Reproduced report 156 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the indexer credential and rebuilt the affected index. 4. Searched for a newly received test subject and an older known subject. 5. Asked the reporter to confirm recovery.',648,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the mailbox search indexer stopped after its service account rotated. The technician updated the indexer credential and rebuilt the affected index and searched for a newly received test subject and an older known subject; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 72);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 936);
  ack_time := started + make_interval(secs => 5616);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Webmail search cannot find recent messages in the shared workspace','During the afternoon shift, webmail search cannot find recent messages. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,6,'P4','{"impact": 1, "urgency": 2, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 6, "score": 6, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The mailbox search indexer stopped after its service account rotated.','Inspection confirmed that the mailbox search indexer stopped after its service account rotated. The technician updated the indexer credential and rebuilt the affected index and searched for a newly received test subject and an older known subject; reviewed the change history and documented the regression trigger.','1. Reproduced report 157 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the indexer credential and rebuilt the affected index. 4. Searched for a newly received test subject and an older known subject. 5. Asked the reporter to confirm recovery.',936,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the mailbox search indexer stopped after its service account rotated. The technician updated the indexer credential and rebuilt the affected index and searched for a newly received test subject and an older known subject; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 85);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 1224);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: webmail search cannot find recent messages','When starting work today, webmail search cannot find recent messages. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,6,'P4','{"impact": 1, "urgency": 2, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 6, "score": 6, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The mailbox search indexer stopped after its service account rotated.','Inspection confirmed that the mailbox search indexer stopped after its service account rotated. The technician updated the indexer credential and rebuilt the affected index and searched for a newly received test subject and an older known subject; compared the repaired configuration with the approved baseline.','1. Reproduced report 158 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the indexer credential and rebuilt the affected index. 4. Searched for a newly received test subject and an older known subject. 5. Asked the reporter to confirm recovery.',1224,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the mailbox search indexer stopped after its service account rotated. The technician updated the indexer credential and rebuilt the affected index and searched for a newly received test subject and an older known subject; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 9);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 1512);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Webmail search cannot find recent messages again today','While checking the shared workspace, webmail search cannot find recent messages. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,6,'P4','{"impact": 1, "urgency": 2, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 6, "score": 6, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The mailbox search indexer stopped after its service account rotated.','Inspection confirmed that the mailbox search indexer stopped after its service account rotated. The technician updated the indexer credential and rebuilt the affected index and searched for a newly received test subject and an older known subject; added a targeted operational alert for recurrence.','1. Reproduced report 159 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the indexer credential and rebuilt the affected index. 4. Searched for a newly received test subject and an older known subject. 5. Asked the reporter to confirm recovery.',1512,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the mailbox search indexer stopped after its service account rotated. The technician updated the indexer credential and rebuilt the affected index and searched for a newly received test subject and an older known subject; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 77760));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',4320,assignee_key,started+make_interval(mins => 1440));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 1440));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 22);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Email';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: webmail search cannot find recent messages','After reconnecting this moring, webmail search cannot find recent messages. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,6,'P4','{"impact": 1, "urgency": 2, "criticality": 3, "usersMultiplier": 1.0, "baseScore": 6, "score": 6, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The mailbox search indexer stopped after its service account rotated.','Inspection confirmed that the mailbox search indexer stopped after its service account rotated. The technician updated the indexer credential and rebuilt the affected index and searched for a newly received test subject and an older known subject; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 160 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Updated the indexer credential and rebuilt the affected index. 4. Searched for a newly received test subject and an older known subject. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the mailbox search indexer stopped after its service account rotated. The technician updated the indexer credential and rebuilt the affected index and searched for a newly received test subject and an older known subject; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 35);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 54);
  ack_time := started + make_interval(secs => 324);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Staff directory page returns an error','Since the morning update, staff directory page returns an error. An entire department has important work blocked; 25 users are affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    4,4,25,40,'P2','{"impact": 4, "urgency": 4, "criticality": 2, "usersMultiplier": 1.25, "baseScore": 32, "score": 40, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'The directory service address changed but the portal cache kept the old address.','Inspection confirmed that the directory service address changed but the portal cache kept the old address. The technician refreshed the directory endpoint and invalidated the affected portal cache and opened the directory and searched for a fictional test employee; added a configuration check to the maintenance checklist.','1. Reproduced report 161 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Refreshed the directory endpoint and invalidated the affected portal cache. 4. Opened the directory and searched for a fictional test employee. 5. Asked the reporter to confirm recovery.',54,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the directory service address changed but the portal cache kept the old address. The technician refreshed the directory endpoint and invalidated the affected portal cache and opened the directory and searched for a fictional test employee; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 48);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 78);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Staff directory page returns an error in the shared workspace','During the afternoon shift, staff directory page returns an error. An entire department has important work blocked; 150 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    4,3,150,36,'P2','{"impact": 4, "urgency": 3, "criticality": 2, "usersMultiplier": 1.5, "baseScore": 24, "score": 36, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'The directory service address changed but the portal cache kept the old address.','Inspection confirmed that the directory service address changed but the portal cache kept the old address. The technician refreshed the directory endpoint and invalidated the affected portal cache and opened the directory and searched for a fictional test employee; reviewed the change history and documented the regression trigger.','1. Reproduced report 162 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Refreshed the directory endpoint and invalidated the affected portal cache. 4. Opened the directory and searched for a fictional test employee. 5. Asked the reporter to confirm recovery.',78,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the directory service address changed but the portal cache kept the old address. The technician refreshed the directory endpoint and invalidated the affected portal cache and opened the directory and searched for a fictional test employee; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 61);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 102);
  ack_time := started + make_interval(secs => 450);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: staff directory page returns an error','When starting work today, staff directory page returns an error. An entire department has important work blocked; 25 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    4,3,25,30,'P2','{"impact": 4, "urgency": 3, "criticality": 2, "usersMultiplier": 1.25, "baseScore": 24, "score": 30, "band": "P2", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 15),started+make_interval(mins => 120),
    'The directory service address changed but the portal cache kept the old address.','Inspection confirmed that the directory service address changed but the portal cache kept the old address. The technician refreshed the directory endpoint and invalidated the affected portal cache and opened the directory and searched for a fictional test employee; compared the repaired configuration with the approved baseline.','1. Reproduced report 163 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Refreshed the directory endpoint and invalidated the affected portal cache. 4. Opened the directory and searched for a fictional test employee. 5. Asked the reporter to confirm recovery.',102,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the directory service address changed but the portal cache kept the old address. The technician refreshed the directory endpoint and invalidated the affected portal cache and opened the directory and searched for a fictional test employee; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 5400));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 74);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Staff directory page returns an error again today','While checking the shared workspace, staff directory page returns an error. One person is affected by this minor inconvenience; 1 user is affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    1,5,1,10,'P3','{"impact": 1, "urgency": 5, "criticality": 2, "usersMultiplier": 1.0, "baseScore": 10, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The directory service address changed but the portal cache kept the old address.','Inspection confirmed that the directory service address changed but the portal cache kept the old address. The technician refreshed the directory endpoint and invalidated the affected portal cache and opened the directory and searched for a fictional test employee; added a targeted operational alert for recurrence.','1. Reproduced report 164 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Refreshed the directory endpoint and invalidated the affected portal cache. 4. Opened the directory and searched for a fictional test employee. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the directory service address changed but the portal cache kept the old address. The technician refreshed the directory endpoint and invalidated the affected portal cache and opened the directory and searched for a fictional test employee; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 87);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 264);
  ack_time := started + make_interval(secs => 1584);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: staff directory page returns an error','After reconnecting this moring, staff directory page returns an error. An entire department has important work blocked; 25 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    4,2,25,20,'P3','{"impact": 4, "urgency": 2, "criticality": 2, "usersMultiplier": 1.25, "baseScore": 16, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The directory service address changed but the portal cache kept the old address.','Inspection confirmed that the directory service address changed but the portal cache kept the old address. The technician refreshed the directory endpoint and invalidated the affected portal cache and opened the directory and searched for a fictional test employee; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 165 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Refreshed the directory endpoint and invalidated the affected portal cache. 4. Opened the directory and searched for a fictional test employee. 5. Asked the reporter to confirm recovery.',264,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the directory service address changed but the portal cache kept the old address. The technician refreshed the directory endpoint and invalidated the affected portal cache and opened the directory and searched for a fictional test employee; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 11);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Policy document link opens a missing page','Since the morning update, policy document link opens a missing page. One person is affected by this minor inconvenience; 1 user is affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    1,5,1,10,'P3','{"impact": 1, "urgency": 5, "criticality": 2, "usersMultiplier": 1.0, "baseScore": 10, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A publishing update moved the document without retaining its redirect.','Inspection confirmed that a publishing update moved the document without retaining its redirect. The technician restored the approved redirect and corrected the navigation link and followed the navigation link and an older bookmarked address; added a configuration check to the maintenance checklist.','1. Reproduced report 166 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved redirect and corrected the navigation link. 4. Followed the navigation link and an older bookmarked address. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a publishing update moved the document without retaining its redirect. The technician restored the approved redirect and corrected the navigation link and followed the navigation link and an older bookmarked address; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 24);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Policy document link opens a missing page in the shared workspace','During the afternoon shift, policy document link opens a missing page. An entire department has important work blocked; 25 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    4,2,25,20,'P3','{"impact": 4, "urgency": 2, "criticality": 2, "usersMultiplier": 1.25, "baseScore": 16, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A publishing update moved the document without retaining its redirect.','Inspection confirmed that a publishing update moved the document without retaining its redirect. The technician restored the approved redirect and corrected the navigation link and followed the navigation link and an older bookmarked address; reviewed the change history and documented the regression trigger.','1. Reproduced report 167 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved redirect and corrected the navigation link. 4. Followed the navigation link and an older bookmarked address. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a publishing update moved the document without retaining its redirect. The technician restored the approved redirect and corrected the navigation link and followed the navigation link and an older bookmarked address; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 37);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: policy document link opens a missing page','When starting work today, policy document link opens a missing page. Our team is affected and work is slowed; 25 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    3,3,25,22,'P3','{"impact": 3, "urgency": 3, "criticality": 2, "usersMultiplier": 1.25, "baseScore": 18, "score": 22, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A publishing update moved the document without retaining its redirect.','Inspection confirmed that a publishing update moved the document without retaining its redirect. The technician restored the approved redirect and corrected the navigation link and followed the navigation link and an older bookmarked address; compared the repaired configuration with the approved baseline.','1. Reproduced report 168 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved redirect and corrected the navigation link. 4. Followed the navigation link and an older bookmarked address. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a publishing update moved the document without retaining its redirect. The technician restored the approved redirect and corrected the navigation link and followed the navigation link and an older bookmarked address; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 50);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Policy document link opens a missing page again today','While checking the shared workspace, policy document link opens a missing page. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    2,4,8,16,'P3','{"impact": 2, "urgency": 4, "criticality": 2, "usersMultiplier": 1.0, "baseScore": 16, "score": 16, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A publishing update moved the document without retaining its redirect.','Inspection confirmed that a publishing update moved the document without retaining its redirect. The technician restored the approved redirect and corrected the navigation link and followed the navigation link and an older bookmarked address; added a targeted operational alert for recurrence.','1. Reproduced report 169 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved redirect and corrected the navigation link. 4. Followed the navigation link and an older bookmarked address. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a publishing update moved the document without retaining its redirect. The technician restored the approved redirect and corrected the navigation link and followed the navigation link and an older bookmarked address; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 63);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 264);
  ack_time := started + make_interval(secs => 1584);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: policy document link opens a missing page','After reconnecting this moring, policy document link opens a missing page. Core business activity is stopped; 150 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    5,1,150,15,'P3','{"impact": 5, "urgency": 1, "criticality": 2, "usersMultiplier": 1.5, "baseScore": 10, "score": 15, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A publishing update moved the document without retaining its redirect.','Inspection confirmed that a publishing update moved the document without retaining its redirect. The technician restored the approved redirect and corrected the navigation link and followed the navigation link and an older bookmarked address; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 170 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Restored the approved redirect and corrected the navigation link. 4. Followed the navigation link and an older bookmarked address. 5. Asked the reporter to confirm recovery.',264,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a publishing update moved the document without retaining its redirect. The technician restored the approved redirect and corrected the navigation link and followed the navigation link and an older bookmarked address; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 76);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Portal home page loads very slowly','Since the morning update, portal home page loads very slowly. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    2,4,8,16,'P3','{"impact": 2, "urgency": 4, "criticality": 2, "usersMultiplier": 1.0, "baseScore": 16, "score": 16, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A homepage widget waited synchronously for an unavailable statistics feed.','Inspection confirmed that a homepage widget waited synchronously for an unavailable statistics feed. The technician disabled the failed widget using its feature setting and limited its request timeout and loaded the homepage repeatedly and checked that other widgets remained available; added a configuration check to the maintenance checklist.','1. Reproduced report 171 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Disabled the failed widget using its feature setting and limited its request timeout. 4. Loaded the homepage repeatedly and checked that other widgets remained available. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a homepage widget waited synchronously for an unavailable statistics feed. The technician disabled the failed widget using its feature setting and limited its request timeout and loaded the homepage repeatedly and checked that other widgets remained available; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 89);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Portal home page loads very slowly in the shared workspace','During the afternoon shift, portal home page loads very slowly. Core business activity is stopped; 150 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    5,1,150,15,'P3','{"impact": 5, "urgency": 1, "criticality": 2, "usersMultiplier": 1.5, "baseScore": 10, "score": 15, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A homepage widget waited synchronously for an unavailable statistics feed.','Inspection confirmed that a homepage widget waited synchronously for an unavailable statistics feed. The technician disabled the failed widget using its feature setting and limited its request timeout and loaded the homepage repeatedly and checked that other widgets remained available; reviewed the change history and documented the regression trigger.','1. Reproduced report 172 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Disabled the failed widget using its feature setting and limited its request timeout. 4. Loaded the homepage repeatedly and checked that other widgets remained available. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a homepage widget waited synchronously for an unavailable statistics feed. The technician disabled the failed widget using its feature setting and limited its request timeout and loaded the homepage repeatedly and checked that other widgets remained available; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 13);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: portal home page loads very slowly','When starting work today, portal home page loads very slowly. An entire department has important work blocked; 150 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    4,1,150,12,'P3','{"impact": 4, "urgency": 1, "criticality": 2, "usersMultiplier": 1.5, "baseScore": 8, "score": 12, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'A homepage widget waited synchronously for an unavailable statistics feed.','Inspection confirmed that a homepage widget waited synchronously for an unavailable statistics feed. The technician disabled the failed widget using its feature setting and limited its request timeout and loaded the homepage repeatedly and checked that other widgets remained available; compared the repaired configuration with the approved baseline.','1. Reproduced report 173 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Disabled the failed widget using its feature setting and limited its request timeout. 4. Loaded the homepage repeatedly and checked that other widgets remained available. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a homepage widget waited synchronously for an unavailable statistics feed. The technician disabled the failed widget using its feature setting and limited its request timeout and loaded the homepage repeatedly and checked that other widgets remained available; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 26);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 1512);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Portal home page loads very slowly again today','While checking the shared workspace, portal home page loads very slowly. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    1,4,1,8,'P4','{"impact": 1, "urgency": 4, "criticality": 2, "usersMultiplier": 1.0, "baseScore": 8, "score": 8, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A homepage widget waited synchronously for an unavailable statistics feed.','Inspection confirmed that a homepage widget waited synchronously for an unavailable statistics feed. The technician disabled the failed widget using its feature setting and limited its request timeout and loaded the homepage repeatedly and checked that other widgets remained available; added a targeted operational alert for recurrence.','1. Reproduced report 174 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Disabled the failed widget using its feature setting and limited its request timeout. 4. Loaded the homepage repeatedly and checked that other widgets remained available. 5. Asked the reporter to confirm recovery.',1512,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a homepage widget waited synchronously for an unavailable statistics feed. The technician disabled the failed widget using its feature setting and limited its request timeout and loaded the homepage repeatedly and checked that other widgets remained available; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 77760));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',4320,assignee_key,started+make_interval(mins => 1440));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 1440));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 39);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Application';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: portal home page loads very slowly','After reconnecting this moring, portal home page loads very slowly. A few people are affected, with a workaround available; 8 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    2,1,8,4,'P4','{"impact": 2, "urgency": 1, "criticality": 2, "usersMultiplier": 1.0, "baseScore": 4, "score": 4, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A homepage widget waited synchronously for an unavailable statistics feed.','Inspection confirmed that a homepage widget waited synchronously for an unavailable statistics feed. The technician disabled the failed widget using its feature setting and limited its request timeout and loaded the homepage repeatedly and checked that other widgets remained available; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 175 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Disabled the failed widget using its feature setting and limited its request timeout. 4. Loaded the homepage repeatedly and checked that other widgets remained available. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a homepage widget waited synchronously for an unavailable statistics feed. The technician disabled the failed widget using its feature setting and limited its request timeout and loaded the homepage repeatedly and checked that other widgets remained available; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 52);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 648);
  ack_time := started + make_interval(secs => 3888);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Portal signs out when opening the leave page','Since the morning update, portal signs out when opening the leave page. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,2,'P4','{"impact": 1, "urgency": 1, "criticality": 2, "usersMultiplier": 1.0, "baseScore": 2, "score": 2, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The leave module used a cookie path that excluded its callback route.','Inspection confirmed that the leave module used a cookie path that excluded its callback route. The technician corrected the cookie path and renewed the test session and opened the leave page and returned to the portal without another login; added a configuration check to the maintenance checklist.','1. Reproduced report 176 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Corrected the cookie path and renewed the test session. 4. Opened the leave page and returned to the portal without another login. 5. Asked the reporter to confirm recovery.',648,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the leave module used a cookie path that excluded its callback route. The technician corrected the cookie path and renewed the test session and opened the leave page and returned to the portal without another login; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 65);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 936);
  ack_time := started + make_interval(secs => 5616);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Portal signs out when opening the leave page in the shared workspace','During the afternoon shift, portal signs out when opening the leave page. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,4,'P4','{"impact": 1, "urgency": 2, "criticality": 2, "usersMultiplier": 1.0, "baseScore": 4, "score": 4, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The leave module used a cookie path that excluded its callback route.','Inspection confirmed that the leave module used a cookie path that excluded its callback route. The technician corrected the cookie path and renewed the test session and opened the leave page and returned to the portal without another login; reviewed the change history and documented the regression trigger.','1. Reproduced report 177 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Corrected the cookie path and renewed the test session. 4. Opened the leave page and returned to the portal without another login. 5. Asked the reporter to confirm recovery.',936,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the leave module used a cookie path that excluded its callback route. The technician corrected the cookie path and renewed the test session and opened the leave page and returned to the portal without another login; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 78);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 1224);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: portal signs out when opening the leave page','When starting work today, portal signs out when opening the leave page. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,6,'P4','{"impact": 1, "urgency": 3, "criticality": 2, "usersMultiplier": 1.0, "baseScore": 6, "score": 6, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The leave module used a cookie path that excluded its callback route.','Inspection confirmed that the leave module used a cookie path that excluded its callback route. The technician corrected the cookie path and renewed the test session and opened the leave page and returned to the portal without another login; compared the repaired configuration with the approved baseline.','1. Reproduced report 178 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Corrected the cookie path and renewed the test session. 4. Opened the leave page and returned to the portal without another login. 5. Asked the reporter to confirm recovery.',1224,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the leave module used a cookie path that excluded its callback route. The technician corrected the cookie path and renewed the test session and opened the leave page and returned to the portal without another login; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 2);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 1512);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Portal signs out when opening the leave page again today','While checking the shared workspace, portal signs out when opening the leave page. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    1,4,1,8,'P4','{"impact": 1, "urgency": 4, "criticality": 2, "usersMultiplier": 1.0, "baseScore": 8, "score": 8, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The leave module used a cookie path that excluded its callback route.','Inspection confirmed that the leave module used a cookie path that excluded its callback route. The technician corrected the cookie path and renewed the test session and opened the leave page and returned to the portal without another login; added a targeted operational alert for recurrence.','1. Reproduced report 179 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Corrected the cookie path and renewed the test session. 4. Opened the leave page and returned to the portal without another login. 5. Asked the reporter to confirm recovery.',1512,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the leave module used a cookie path that excluded its callback route. The technician corrected the cookie path and renewed the test session and opened the leave page and returned to the portal without another login; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 77760));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',4320,assignee_key,started+make_interval(mins => 1440));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 1440));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 15);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='priya.nair@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Intranet Portal';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: portal signs out when opening the leave page','After reconnecting this moring, portal signs out when opening the leave page. A few people are affected, with a workaround available; 8 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    2,1,8,4,'P4','{"impact": 2, "urgency": 1, "criticality": 2, "usersMultiplier": 1.0, "baseScore": 4, "score": 4, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The leave module used a cookie path that excluded its callback route.','Inspection confirmed that the leave module used a cookie path that excluded its callback route. The technician corrected the cookie path and renewed the test session and opened the leave page and returned to the portal without another login; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 180 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Corrected the cookie path and renewed the test session. 4. Opened the leave page and returned to the portal without another login. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the leave module used a cookie path that excluded its callback route. The technician corrected the cookie path and renewed the test session and opened the leave page and returned to the portal without another login; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 28);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Hardware';
  finished := started + make_interval(mins => 216);
  ack_time := started + make_interval(secs => 1296);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Printer is offline although power is on','Since the morning update, printer is offline although power is on. Core business activity is stopped; 150 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    5,3,150,22,'P3','{"impact": 5, "urgency": 3, "criticality": 1, "usersMultiplier": 1.5, "baseScore": 15, "score": 22, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The printer retained an old static gateway after a subnet change.','Inspection confirmed that the printer retained an old static gateway after a subnet change. The technician applied the approved network settings and renewed the print-server port and printed a network test page and checked connectivity from the print server; added a configuration check to the maintenance checklist.','1. Reproduced report 181 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Applied the approved network settings and renewed the print-server port. 4. Printed a network test page and checked connectivity from the print server. 5. Asked the reporter to confirm recovery.',216,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the printer retained an old static gateway after a subnet change. The technician applied the approved network settings and renewed the print-server port and printed a network test page and checked connectivity from the print server; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 41);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Hardware';
  finished := started + make_interval(mins => 312);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Printer is offline although power is on in the shared workspace','During the afternoon shift, printer is offline although power is on. An entire department has important work blocked; 150 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    4,3,150,18,'P3','{"impact": 4, "urgency": 3, "criticality": 1, "usersMultiplier": 1.5, "baseScore": 12, "score": 18, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The printer retained an old static gateway after a subnet change.','Inspection confirmed that the printer retained an old static gateway after a subnet change. The technician applied the approved network settings and renewed the print-server port and printed a network test page and checked connectivity from the print server; reviewed the change history and documented the regression trigger.','1. Reproduced report 182 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Applied the approved network settings and renewed the print-server port. 4. Printed a network test page and checked connectivity from the print server. 5. Asked the reporter to confirm recovery.',312,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the printer retained an old static gateway after a subnet change. The technician applied the approved network settings and renewed the print-server port and printed a network test page and checked connectivity from the print server; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 54);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Hardware';
  finished := started + make_interval(mins => 408);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: printer is offline although power is on','When starting work today, printer is offline although power is on. Our team is affected and work is slowed; 25 users are affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    3,4,25,15,'P3','{"impact": 3, "urgency": 4, "criticality": 1, "usersMultiplier": 1.25, "baseScore": 12, "score": 15, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The printer retained an old static gateway after a subnet change.','Inspection confirmed that the printer retained an old static gateway after a subnet change. The technician applied the approved network settings and renewed the print-server port and printed a network test page and checked connectivity from the print server; compared the repaired configuration with the approved baseline.','1. Reproduced report 183 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Applied the approved network settings and renewed the print-server port. 4. Printed a network test page and checked connectivity from the print server. 5. Asked the reporter to confirm recovery.',408,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the printer retained an old static gateway after a subnet change. The technician applied the approved network settings and renewed the print-server port and printed a network test page and checked connectivity from the print server; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 67);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Hardware';
  finished := started + make_interval(mins => 504);
  ack_time := started + make_interval(secs => 1800);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Printer is offline although power is on again today','While checking the shared workspace, printer is offline although power is on. An entire department has important work blocked; 25 users are affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    4,5,25,25,'P3','{"impact": 4, "urgency": 5, "criticality": 1, "usersMultiplier": 1.25, "baseScore": 20, "score": 25, "band": "P3", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 60),started+make_interval(mins => 480),
    'The printer retained an old static gateway after a subnet change.','Inspection confirmed that the printer retained an old static gateway after a subnet change. The technician applied the approved network settings and renewed the print-server port and printed a network test page and checked connectivity from the print server; added a targeted operational alert for recurrence.','1. Reproduced report 184 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Applied the approved network settings and renewed the print-server port. 4. Printed a network test page and checked connectivity from the print server. 5. Asked the reporter to confirm recovery.',504,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the printer retained an old static gateway after a subnet change. The technician applied the approved network settings and renewed the print-server port and printed a network test page and checked connectivity from the print server; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 21600));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 25920));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',1440,assignee_key,started+make_interval(mins => 480));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 480));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 80);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Hardware';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: printer is offline although power is on','After reconnecting this moring, printer is offline although power is on. One person is affected by this minor inconvenience; 1 user is affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    1,5,1,5,'P4','{"impact": 1, "urgency": 5, "criticality": 1, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'The printer retained an old static gateway after a subnet change.','Inspection confirmed that the printer retained an old static gateway after a subnet change. The technician applied the approved network settings and renewed the print-server port and printed a network test page and checked connectivity from the print server; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 185 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Applied the approved network settings and renewed the print-server port. 4. Printed a network test page and checked connectivity from the print server. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that the printer retained an old static gateway after a subnet change. The technician applied the approved network settings and renewed the print-server port and printed a network test page and checked connectivity from the print server; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 4);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 648);
  ack_time := started + make_interval(secs => 3888);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Print jobs remain stuck in the queue','Since the morning update, print jobs remain stuck in the queue. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    2,3,8,6,'P4','{"impact": 2, "urgency": 3, "criticality": 1, "usersMultiplier": 1.0, "baseScore": 6, "score": 6, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A malformed spool file blocked the queue worker.','Inspection confirmed that a malformed spool file blocked the queue worker. The technician removed only the damaged job and restarted the spooler and printed two test documents in order; added a configuration check to the maintenance checklist.','1. Reproduced report 186 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed only the damaged job and restarted the spooler. 4. Printed two test documents in order. 5. Asked the reporter to confirm recovery.',648,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a malformed spool file blocked the queue worker. The technician removed only the damaged job and restarted the spooler and printed two test documents in order; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 17);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 936);
  ack_time := started + make_interval(secs => 5616);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Print jobs remain stuck in the queue in the shared workspace','During the afternoon shift, print jobs remain stuck in the queue. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,2,'P4','{"impact": 1, "urgency": 2, "criticality": 1, "usersMultiplier": 1.0, "baseScore": 2, "score": 2, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A malformed spool file blocked the queue worker.','Inspection confirmed that a malformed spool file blocked the queue worker. The technician removed only the damaged job and restarted the spooler and printed two test documents in order; reviewed the change history and documented the regression trigger.','1. Reproduced report 187 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed only the damaged job and restarted the spooler. 4. Printed two test documents in order. 5. Asked the reporter to confirm recovery.',936,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a malformed spool file blocked the queue worker. The technician removed only the damaged job and restarted the spooler and printed two test documents in order; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 30);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 1224);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: print jobs remain stuck in the queue','When starting work today, print jobs remain stuck in the queue. Our team is affected and work is slowed; 25 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    3,1,25,3,'P4','{"impact": 3, "urgency": 1, "criticality": 1, "usersMultiplier": 1.25, "baseScore": 3, "score": 3, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A malformed spool file blocked the queue worker.','Inspection confirmed that a malformed spool file blocked the queue worker. The technician removed only the damaged job and restarted the spooler and printed two test documents in order; compared the repaired configuration with the approved baseline.','1. Reproduced report 188 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed only the damaged job and restarted the spooler. 4. Printed two test documents in order. 5. Asked the reporter to confirm recovery.',1224,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a malformed spool file blocked the queue worker. The technician removed only the damaged job and restarted the spooler and printed two test documents in order; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 43);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 1512);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Print jobs remain stuck in the queue again today','While checking the shared workspace, print jobs remain stuck in the queue. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    1,4,1,4,'P4','{"impact": 1, "urgency": 4, "criticality": 1, "usersMultiplier": 1.0, "baseScore": 4, "score": 4, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A malformed spool file blocked the queue worker.','Inspection confirmed that a malformed spool file blocked the queue worker. The technician removed only the damaged job and restarted the spooler and printed two test documents in order; added a targeted operational alert for recurrence.','1. Reproduced report 189 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed only the damaged job and restarted the spooler. 4. Printed two test documents in order. 5. Asked the reporter to confirm recovery.',1512,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a malformed spool file blocked the queue worker. The technician removed only the damaged job and restarted the spooler and printed two test documents in order; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 77760));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',4320,assignee_key,started+make_interval(mins => 1440));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 1440));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 56);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: print jobs remain stuck in the queue','After reconnecting this moring, print jobs remain stuck in the queue. An entire department has important work blocked; 25 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    4,1,25,5,'P4','{"impact": 4, "urgency": 1, "criticality": 1, "usersMultiplier": 1.25, "baseScore": 4, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A malformed spool file blocked the queue worker.','Inspection confirmed that a malformed spool file blocked the queue worker. The technician removed only the damaged job and restarted the spooler and printed two test documents in order; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 190 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Removed only the damaged job and restarted the spooler. 4. Printed two test documents in order. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a malformed spool file blocked the queue worker. The technician removed only the damaged job and restarted the spooler and printed two test documents in order; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 69);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Hardware';
  finished := started + make_interval(mins => 648);
  ack_time := started + make_interval(secs => 3888);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Printer produces repeated paper jams','Since the morning update, printer produces repeated paper jams. One person is affected by this minor inconvenience; 1 user is affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    1,1,1,1,'P4','{"impact": 1, "urgency": 1, "criticality": 1, "usersMultiplier": 1.0, "baseScore": 1, "score": 1, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'Worn pickup rollers failed to separate sheets.','Inspection confirmed that worn pickup rollers failed to separate sheets. The technician replaced the pickup rollers and cleaned the paper path and printed a ten-page test without a jam; added a configuration check to the maintenance checklist.','1. Reproduced report 191 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Replaced the pickup rollers and cleaned the paper path. 4. Printed a ten-page test without a jam. 5. Asked the reporter to confirm recovery.',648,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that worn pickup rollers failed to separate sheets. The technician replaced the pickup rollers and cleaned the paper path and printed a ten-page test without a jam; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 82);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Hardware';
  finished := started + make_interval(mins => 936);
  ack_time := started + make_interval(secs => 5616);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Printer produces repeated paper jams in the shared workspace','During the afternoon shift, printer produces repeated paper jams. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    2,4,8,8,'P4','{"impact": 2, "urgency": 4, "criticality": 1, "usersMultiplier": 1.0, "baseScore": 8, "score": 8, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'Worn pickup rollers failed to separate sheets.','Inspection confirmed that worn pickup rollers failed to separate sheets. The technician replaced the pickup rollers and cleaned the paper path and printed a ten-page test without a jam; reviewed the change history and documented the regression trigger.','1. Reproduced report 192 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Replaced the pickup rollers and cleaned the paper path. 4. Printed a ten-page test without a jam. 5. Asked the reporter to confirm recovery.',936,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that worn pickup rollers failed to separate sheets. The technician replaced the pickup rollers and cleaned the paper path and printed a ten-page test without a jam; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 6);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Hardware';
  finished := started + make_interval(mins => 1224);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: printer produces repeated paper jams','When starting work today, printer produces repeated paper jams. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    1,3,1,3,'P4','{"impact": 1, "urgency": 3, "criticality": 1, "usersMultiplier": 1.0, "baseScore": 3, "score": 3, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'Worn pickup rollers failed to separate sheets.','Inspection confirmed that worn pickup rollers failed to separate sheets. The technician replaced the pickup rollers and cleaned the paper path and printed a ten-page test without a jam; compared the repaired configuration with the approved baseline.','1. Reproduced report 193 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Replaced the pickup rollers and cleaned the paper path. 4. Printed a ten-page test without a jam. 5. Asked the reporter to confirm recovery.',1224,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that worn pickup rollers failed to separate sheets. The technician replaced the pickup rollers and cleaned the paper path and printed a ten-page test without a jam; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 19);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Hardware';
  finished := started + make_interval(mins => 1512);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Printer produces repeated paper jams again today','While checking the shared workspace, printer produces repeated paper jams. Our team is affected and work is slowed; 25 users are affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    3,2,25,7,'P4','{"impact": 3, "urgency": 2, "criticality": 1, "usersMultiplier": 1.25, "baseScore": 6, "score": 7, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'Worn pickup rollers failed to separate sheets.','Inspection confirmed that worn pickup rollers failed to separate sheets. The technician replaced the pickup rollers and cleaned the paper path and printed a ten-page test without a jam; added a targeted operational alert for recurrence.','1. Reproduced report 194 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Replaced the pickup rollers and cleaned the paper path. 4. Printed a ten-page test without a jam. 5. Asked the reporter to confirm recovery.',1512,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that worn pickup rollers failed to separate sheets. The technician replaced the pickup rollers and cleaned the paper path and printed a ten-page test without a jam; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 77760));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',4320,assignee_key,started+make_interval(mins => 1440));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 1440));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 32);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Hardware';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: printer produces repeated paper jams','After reconnecting this moring, printer produces repeated paper jams. One person is affected by this minor inconvenience; 1 user is affected. Immediate action is needed.',reporter_key,assignee_key,service_key,category_key,
    1,5,1,5,'P4','{"impact": 1, "urgency": 5, "criticality": 1, "usersMultiplier": 1.0, "baseScore": 5, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'Worn pickup rollers failed to separate sheets.','Inspection confirmed that worn pickup rollers failed to separate sheets. The technician replaced the pickup rollers and cleaned the paper path and printed a ten-page test without a jam; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 195 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Replaced the pickup rollers and cleaned the paper path. 4. Printed a ten-page test without a jam. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that worn pickup rollers failed to separate sheets. The technician replaced the pickup rollers and cleaned the paper path and printed a ten-page test without a jam; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,3,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 45);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 648);
  ack_time := started + make_interval(secs => 3888);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Document margins are cut off when printed','Since the morning update, document margins are cut off when printed. A few people are affected, with a workaround available; 8 users are affected. A fix is needed within a day.',reporter_key,assignee_key,service_key,category_key,
    2,3,8,6,'P4','{"impact": 2, "urgency": 3, "criticality": 1, "usersMultiplier": 1.0, "baseScore": 6, "score": 6, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A generic driver selected the wrong paper size.','Inspection confirmed that a generic driver selected the wrong paper size. The technician installed the approved model driver and selected the correct paper profile and printed a page containing marked margins on all four sides; added a configuration check to the maintenance checklist.','1. Reproduced report 196 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Installed the approved model driver and selected the correct paper profile. 4. Printed a page containing marked margins on all four sides. 5. Asked the reporter to confirm recovery.',648,true,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a generic driver selected the wrong paper size. The technician installed the approved model driver and selected the correct paper profile and printed a page containing marked margins on all four sides; added a configuration check to the maintenance checklist.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 58);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 936);
  ack_time := started + make_interval(secs => 5616);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Document margins are cut off when printed in the shared workspace','During the afternoon shift, document margins are cut off when printed. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within a few days.',reporter_key,assignee_key,service_key,category_key,
    1,2,1,2,'P4','{"impact": 1, "urgency": 2, "criticality": 1, "usersMultiplier": 1.0, "baseScore": 2, "score": 2, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A generic driver selected the wrong paper size.','Inspection confirmed that a generic driver selected the wrong paper size. The technician installed the approved model driver and selected the correct paper profile and printed a page containing marked margins on all four sides; reviewed the change history and documented the regression trigger.','1. Reproduced report 197 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Installed the approved model driver and selected the correct paper profile. 4. Printed a page containing marked margins on all four sides. 5. Asked the reporter to confirm recovery.',936,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a generic driver selected the wrong paper size. The technician installed the approved model driver and selected the correct paper profile and printed a page containing marked margins on all four sides; reviewed the change history and documented the regression trigger.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 71);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 1224);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Need help: document margins are cut off when printed','When starting work today, document margins are cut off when printed. Our team is affected and work is slowed; 25 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    3,1,25,3,'P4','{"impact": 3, "urgency": 1, "criticality": 1, "usersMultiplier": 1.25, "baseScore": 3, "score": 3, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A generic driver selected the wrong paper size.','Inspection confirmed that a generic driver selected the wrong paper size. The technician installed the approved model driver and selected the correct paper profile and printed a page containing marked margins on all four sides; compared the repaired configuration with the approved baseline.','1. Reproduced report 198 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Installed the approved model driver and selected the correct paper profile. 4. Printed a page containing marked margins on all four sides. 5. Asked the reporter to confirm recovery.',1224,false,
    true,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a generic driver selected the wrong paper size. The technician installed the approved model driver and selected the correct paper profile and printed a page containing marked margins on all four sides; compared the repaired configuration with the approved baseline.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,2,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 84);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 1512);
  ack_time := started + make_interval(secs => 7200);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Document margins are cut off when printed again today','While checking the shared workspace, document margins are cut off when printed. One person is affected by this minor inconvenience; 1 user is affected. A fix is needed within hours.',reporter_key,assignee_key,service_key,category_key,
    1,4,1,4,'P4','{"impact": 1, "urgency": 4, "criticality": 1, "usersMultiplier": 1.0, "baseScore": 4, "score": 4, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A generic driver selected the wrong paper size.','Inspection confirmed that a generic driver selected the wrong paper size. The technician installed the approved model driver and selected the correct paper profile and printed a page containing marked margins on all four sides; added a targeted operational alert for recurrence.','1. Reproduced report 199 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Installed the approved model driver and selected the correct paper profile. 4. Printed a page containing marked margins on all four sides. 5. Asked the reporter to confirm recovery.',1512,false,
    true,true,true)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a generic driver selected the wrong paper size. The technician installed the approved model driver and selected the correct paper profile and printed a page containing marked margins on all four sides; added a targeted operational alert for recurrence.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 75 percent elapsed',started+make_interval(secs => 64800));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_WARNING','Resolution deadline 90 percent elapsed',started+make_interval(secs => 77760));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (incident_key,'RESOLUTION',4320,assignee_key,started+make_interval(mins => 1440));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (incident_key,'SLA_VIOLATED','Historical resolution target missed',started+make_interval(mins => 1440));
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,4,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
DO $$
DECLARE
  incident_key BIGINT; reporter_key BIGINT; assignee_key BIGINT; service_key BIGINT; category_key BIGINT;
  started TIMESTAMPTZ := transaction_timestamp() - make_interval(days => 8);
  finished TIMESTAMPTZ; ack_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
  SELECT id INTO STRICT assignee_key FROM users WHERE email='tech5@iitsm.demo';
  SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
  SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
  finished := started + make_interval(mins => 792);
  ack_time := started + make_interval(secs => 4752);
  INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,
    impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,closure_reason,
    created_at,updated_at,acknowledged_at,resolved_at,closed_at,response_due,resolution_due,
    root_cause,resolution_notes,resolution_steps,time_spent_minutes,reusable_solution,
    res_warn75_sent,res_warn90_sent,res_violated)
  VALUES ('INC-' || to_char(started AT TIME ZONE 'UTC','YYYY') || '-' || lpad(nextval('incident_code_seq')::text,5,'0'),
    'Still seeing this: document margins are cut off when printed','After reconnecting this moring, document margins are cut off when printed. An entire department has important work blocked; 25 users are affected. A fix can wait a week.',reporter_key,assignee_key,service_key,category_key,
    4,1,25,5,'P4','{"impact": 4, "urgency": 1, "criticality": 1, "usersMultiplier": 1.25, "baseScore": 4, "score": 5, "band": "P4", "overrideRule": null}'::jsonb,'CLOSED','VERIFIED',
    started,finished+interval '2 minutes',ack_time,finished,finished+interval '2 minutes',
    started+make_interval(mins => 240),started+make_interval(mins => 1440),
    'A generic driver selected the wrong paper size.','Inspection confirmed that a generic driver selected the wrong paper size. The technician installed the approved model driver and selected the correct paper profile and printed a page containing marked margins on all four sides; reviewed the repeated failure with the service owner and documented prevention steps.','1. Reproduced report 200 in the demo environment. 2. Inspected the relevant logs and configuration. 3. Installed the approved model driver and selected the correct paper profile. 4. Printed a page containing marked margins on all four sides. 5. Asked the reporter to confirm recovery.',792,false,
    false,false,false)
  RETURNING id INTO incident_key;
  INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES
    (incident_key,reporter_key,'INCIDENT_CREATED',NULL,'NEW','Historical demo incident reported',started),
    (incident_key,NULL,'CLASSIFIED','NEW','CLASSIFIED','Category set from curated seed content',started),
    (incident_key,NULL,'PRIORITY_CALCULATED','CLASSIFIED','CLASSIFIED','Priority calculated from locked business rules',started),
    (incident_key,NULL,'ASSIGNED','CLASSIFIED','ASSIGNED','Assigned to a suitably skilled demo technician',started),
    (incident_key,assignee_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',ack_time),
    (incident_key,assignee_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',ack_time+interval '1 second'),
    (incident_key,assignee_key,'RESOLVED','IN_PROGRESS','RESOLVED','Inspection confirmed that a generic driver selected the wrong paper size. The technician installed the approved model driver and selected the correct paper profile and printed a page containing marked margins on all four sides; reviewed the repeated failure with the service owner and documented prevention steps.',finished),
    (incident_key,reporter_key,'VERIFIED','RESOLVED','VERIFIED','Reporter confirmed recovery',finished+interval '1 minute'),
    (incident_key,NULL,'CLOSED','VERIFIED','CLOSED','Closed after reporter verification',finished+interval '2 minutes');
INSERT INTO feedback(incident_id,rating,comment,created_at) VALUES (incident_key,5,'Fictional demonstration feedback',finished+interval '2 minutes');
END;
$$;
-- Embeddings intentionally absent; backend backfills them using its configured model.
