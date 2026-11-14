-- DEV/DEMO ONLY. Load after reference and history SQL. One shot; not idempotent.
INSERT INTO problem_records(title,service_id,status,created_at) VALUES ('Demo: correlated Network reports',(SELECT id FROM services WHERE name='Network'),'OPEN',transaction_timestamp()-interval '15 minutes');
DO $$
DECLARE k BIGINT; actor_key BIGINT; reporter_key BIGINT; service_key BIGINT; category_key BIGINT;
 started TIMESTAMPTZ := transaction_timestamp()-make_interval(mins => 10);
BEGIN
 SELECT id INTO STRICT actor_key FROM users WHERE email='tech1@iitsm.demo';
 SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
 SELECT id INTO STRICT service_key FROM services WHERE name='Network';
 SELECT id INTO STRICT category_key FROM categories WHERE name='Wi-Fi';
 INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,created_at,updated_at,acknowledged_at,response_due,resolution_due,paused_at,resolved_at,problem_id,res_violated,res_warn75_sent,res_warn90_sent)
 VALUES ('INC-'||to_char(started AT TIME ZONE 'UTC','YYYY')||'-'||lpad(nextval('incident_code_seq')::text,5,'0'),'Wi-Fi down on floor 3','Wi-Fi down on floor 3. This fictional fixture demonstrates the IN_PROGRESS workflow and requires the next action shown in the incident view.',reporter_key,actor_key,service_key,category_key,2,2,25,20,'P3','{"impact": 2, "urgency": 2, "criticality": 4, "usersMultiplier": 1.25, "baseScore": 16, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'IN_PROGRESS',started,transaction_timestamp(),started + interval '1 minute',started+make_interval(mins => 60),started+make_interval(mins => 480),NULL,NULL,(SELECT id FROM problem_records WHERE title='Demo: correlated Network reports'),false,false,false) RETURNING id INTO k;
 INSERT INTO audit_records(incident_id,actor_id,action,new_state,description,created_at) VALUES
 (k,reporter_key,'INCIDENT_CREATED','NEW','Fictional live-demo fixture',started),
 (k,NULL,'CLASSIFIED','CLASSIFIED','Classified using the seeded category',started),
 (k,NULL,'PRIORITY_CALCULATED','CLASSIFIED','Locked priority formula applied',started),
 (k,NULL,'ASSIGNED','ASSIGNED','Seeded assignment with matching skill',started);

INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',started+interval '1 minute');
INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',started+interval '2 minutes');
END;
$$;
DO $$
DECLARE k BIGINT; actor_key BIGINT; reporter_key BIGINT; service_key BIGINT; category_key BIGINT;
 started TIMESTAMPTZ := transaction_timestamp()-make_interval(mins => 12);
BEGIN
 SELECT id INTO STRICT actor_key FROM users WHERE email='tech1@iitsm.demo';
 SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
 SELECT id INTO STRICT service_key FROM services WHERE name='Network';
 SELECT id INTO STRICT category_key FROM categories WHERE name='Network';
 INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,created_at,updated_at,acknowledged_at,response_due,resolution_due,paused_at,resolved_at,problem_id,res_violated,res_warn75_sent,res_warn90_sent)
 VALUES ('INC-'||to_char(started AT TIME ZONE 'UTC','YYYY')||'-'||lpad(nextval('incident_code_seq')::text,5,'0'),'Cannot reach file server','Cannot reach file server. This fictional fixture demonstrates the IN_PROGRESS workflow and requires the next action shown in the incident view.',reporter_key,actor_key,service_key,category_key,2,2,25,20,'P3','{"impact": 2, "urgency": 2, "criticality": 4, "usersMultiplier": 1.25, "baseScore": 16, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'IN_PROGRESS',started,transaction_timestamp(),started + interval '1 minute',started+make_interval(mins => 60),started+make_interval(mins => 480),NULL,NULL,(SELECT id FROM problem_records WHERE title='Demo: correlated Network reports'),false,false,false) RETURNING id INTO k;
 INSERT INTO audit_records(incident_id,actor_id,action,new_state,description,created_at) VALUES
 (k,reporter_key,'INCIDENT_CREATED','NEW','Fictional live-demo fixture',started),
 (k,NULL,'CLASSIFIED','CLASSIFIED','Classified using the seeded category',started),
 (k,NULL,'PRIORITY_CALCULATED','CLASSIFIED','Locked priority formula applied',started),
 (k,NULL,'ASSIGNED','ASSIGNED','Seeded assignment with matching skill',started);

INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',started+interval '1 minute');
INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',started+interval '2 minutes');
END;
$$;
DO $$
DECLARE k BIGINT; actor_key BIGINT; reporter_key BIGINT; service_key BIGINT; category_key BIGINT;
 started TIMESTAMPTZ := transaction_timestamp()-make_interval(mins => 8);
BEGIN
 SELECT id INTO STRICT actor_key FROM users WHERE email='tech1@iitsm.demo';
 SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
 SELECT id INTO STRICT service_key FROM services WHERE name='Network';
 SELECT id INTO STRICT category_key FROM categories WHERE name='VPN';
 INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,created_at,updated_at,acknowledged_at,response_due,resolution_due,paused_at,resolved_at,problem_id,res_violated,res_warn75_sent,res_warn90_sent)
 VALUES ('INC-'||to_char(started AT TIME ZONE 'UTC','YYYY')||'-'||lpad(nextval('incident_code_seq')::text,5,'0'),'VPN disconnects','VPN disconnects. This fictional fixture demonstrates the ACKNOWLEDGED workflow and requires the next action shown in the incident view.',reporter_key,actor_key,service_key,category_key,2,2,25,20,'P3','{"impact": 2, "urgency": 2, "criticality": 4, "usersMultiplier": 1.25, "baseScore": 16, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'ACKNOWLEDGED',started,transaction_timestamp(),started + interval '1 minute',started+make_interval(mins => 60),started+make_interval(mins => 480),NULL,NULL,(SELECT id FROM problem_records WHERE title='Demo: correlated Network reports'),false,false,false) RETURNING id INTO k;
 INSERT INTO audit_records(incident_id,actor_id,action,new_state,description,created_at) VALUES
 (k,reporter_key,'INCIDENT_CREATED','NEW','Fictional live-demo fixture',started),
 (k,NULL,'CLASSIFIED','CLASSIFIED','Classified using the seeded category',started),
 (k,NULL,'PRIORITY_CALCULATED','CLASSIFIED','Locked priority formula applied',started),
 (k,NULL,'ASSIGNED','ASSIGNED','Seeded assignment with matching skill',started);

INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',started+interval '1 minute');
END;
$$;
DO $$
DECLARE k BIGINT; actor_key BIGINT; reporter_key BIGINT; service_key BIGINT; category_key BIGINT;
 started TIMESTAMPTZ := transaction_timestamp()-make_interval(mins => 1);
BEGIN
 SELECT id INTO STRICT actor_key FROM users WHERE email='tech1@iitsm.demo';
 SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
 SELECT id INTO STRICT service_key FROM services WHERE name='Network';
 SELECT id INTO STRICT category_key FROM categories WHERE name='VPN';
 INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,created_at,updated_at,acknowledged_at,response_due,resolution_due,paused_at,resolved_at,problem_id,res_violated,res_warn75_sent,res_warn90_sent)
 VALUES ('INC-'||to_char(started AT TIME ZONE 'UTC','YYYY')||'-'||lpad(nextval('incident_code_seq')::text,5,'0'),'VPN disconnects every few minutes','The VPN connection drops about every five minutes on both home Wi-Fi and a mobile hotspot. Reconnecting restores it briefly, but the tunnel disconnects again.',reporter_key,actor_key,service_key,category_key,2,2,25,20,'P3','{"impact": 2, "urgency": 2, "criticality": 4, "usersMultiplier": 1.25, "baseScore": 16, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'ASSIGNED',started,transaction_timestamp(),NULL,started+make_interval(mins => 60),started+make_interval(mins => 480),NULL,NULL,NULL,false,false,false) RETURNING id INTO k;
 INSERT INTO audit_records(incident_id,actor_id,action,new_state,description,created_at) VALUES
 (k,reporter_key,'INCIDENT_CREATED','NEW','Fictional live-demo fixture',started),
 (k,NULL,'CLASSIFIED','CLASSIFIED','Classified using the seeded category',started),
 (k,NULL,'PRIORITY_CALCULATED','CLASSIFIED','Locked priority formula applied',started),
 (k,NULL,'ASSIGNED','ASSIGNED','Seeded assignment with matching skill',started);

END;
$$;
DO $$
DECLARE k BIGINT; actor_key BIGINT; reporter_key BIGINT; service_key BIGINT; category_key BIGINT;
 started TIMESTAMPTZ := transaction_timestamp()-make_interval(mins => 355);
BEGIN
 SELECT id INTO STRICT actor_key FROM users WHERE email='tech5@iitsm.demo';
 SELECT id INTO STRICT reporter_key FROM users WHERE email='employee5@iitsm.demo';
 SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
 SELECT id INTO STRICT category_key FROM categories WHERE name='Hardware';
 INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,created_at,updated_at,acknowledged_at,response_due,resolution_due,paused_at,resolved_at,problem_id,res_violated,res_warn75_sent,res_warn90_sent)
 VALUES ('INC-'||to_char(started AT TIME ZONE 'UTC','YYYY')||'-'||lpad(nextval('incident_code_seq')::text,5,'0'),'Reception printer is offline','Reception printer is offline. This fictional fixture demonstrates the IN_PROGRESS workflow and requires the next action shown in the incident view.',reporter_key,actor_key,service_key,category_key,4,2,25,10,'P3','{"impact": 4, "urgency": 2, "criticality": 1, "usersMultiplier": 1.25, "baseScore": 8, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'IN_PROGRESS',started,transaction_timestamp(),started + interval '1 minute',started+make_interval(mins => 60),started+make_interval(mins => 480),NULL,NULL,NULL,false,false,false) RETURNING id INTO k;
 INSERT INTO audit_records(incident_id,actor_id,action,new_state,description,created_at) VALUES
 (k,reporter_key,'INCIDENT_CREATED','NEW','Fictional live-demo fixture',started),
 (k,NULL,'CLASSIFIED','CLASSIFIED','Classified using the seeded category',started),
 (k,NULL,'PRIORITY_CALCULATED','CLASSIFIED','Locked priority formula applied',started),
 (k,NULL,'ASSIGNED','ASSIGNED','Seeded assignment with matching skill',started);

INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',started+interval '1 minute');
INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',started+interval '2 minutes');
END;
$$;
DO $$
DECLARE k BIGINT; actor_key BIGINT; reporter_key BIGINT; service_key BIGINT; category_key BIGINT;
 started TIMESTAMPTZ := transaction_timestamp()-make_interval(mins => 6);
BEGIN
 SELECT id INTO STRICT actor_key FROM users WHERE email='tech5@iitsm.demo';
 SELECT id INTO STRICT reporter_key FROM users WHERE email='employee6@iitsm.demo';
 SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
 SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
 INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,created_at,updated_at,acknowledged_at,response_due,resolution_due,paused_at,resolved_at,problem_id,res_violated,res_warn75_sent,res_warn90_sent)
 VALUES ('INC-'||to_char(started AT TIME ZONE 'UTC','YYYY')||'-'||lpad(nextval('incident_code_seq')::text,5,'0'),'Training room queue is stuck','Training room queue is stuck. This fictional fixture demonstrates the ASSIGNED workflow and requires the next action shown in the incident view.',reporter_key,actor_key,service_key,category_key,4,2,25,10,'P3','{"impact": 4, "urgency": 2, "criticality": 1, "usersMultiplier": 1.25, "baseScore": 8, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'ASSIGNED',started,transaction_timestamp(),NULL,started+make_interval(mins => 60),started+make_interval(mins => 480),NULL,NULL,NULL,false,false,false) RETURNING id INTO k;
 INSERT INTO audit_records(incident_id,actor_id,action,new_state,description,created_at) VALUES
 (k,reporter_key,'INCIDENT_CREATED','NEW','Fictional live-demo fixture',started),
 (k,NULL,'CLASSIFIED','CLASSIFIED','Classified using the seeded category',started),
 (k,NULL,'PRIORITY_CALCULATED','CLASSIFIED','Locked priority formula applied',started),
 (k,NULL,'ASSIGNED','ASSIGNED','Seeded assignment with matching skill',started);

END;
$$;
DO $$
DECLARE k BIGINT; actor_key BIGINT; reporter_key BIGINT; service_key BIGINT; category_key BIGINT;
 started TIMESTAMPTZ := transaction_timestamp()-make_interval(mins => 7);
BEGIN
 SELECT id INTO STRICT actor_key FROM users WHERE email='tech5@iitsm.demo';
 SELECT id INTO STRICT reporter_key FROM users WHERE email='employee7@iitsm.demo';
 SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
 SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
 INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,created_at,updated_at,acknowledged_at,response_due,resolution_due,paused_at,resolved_at,problem_id,res_violated,res_warn75_sent,res_warn90_sent)
 VALUES ('INC-'||to_char(started AT TIME ZONE 'UTC','YYYY')||'-'||lpad(nextval('incident_code_seq')::text,5,'0'),'Dispatch printer needs a driver update','Dispatch printer needs a driver update. This fictional fixture demonstrates the IN_PROGRESS workflow and requires the next action shown in the incident view.',reporter_key,actor_key,service_key,category_key,4,2,25,10,'P3','{"impact": 4, "urgency": 2, "criticality": 1, "usersMultiplier": 1.25, "baseScore": 8, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'IN_PROGRESS',started,transaction_timestamp(),started + interval '1 minute',started+make_interval(mins => 60),started+make_interval(mins => 480),NULL,NULL,NULL,false,false,false) RETURNING id INTO k;
 INSERT INTO audit_records(incident_id,actor_id,action,new_state,description,created_at) VALUES
 (k,reporter_key,'INCIDENT_CREATED','NEW','Fictional live-demo fixture',started),
 (k,NULL,'CLASSIFIED','CLASSIFIED','Classified using the seeded category',started),
 (k,NULL,'PRIORITY_CALCULATED','CLASSIFIED','Locked priority formula applied',started),
 (k,NULL,'ASSIGNED','ASSIGNED','Seeded assignment with matching skill',started);

INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',started+interval '1 minute');
INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',started+interval '2 minutes');
END;
$$;
DO $$
DECLARE k BIGINT; actor_key BIGINT; reporter_key BIGINT; service_key BIGINT; category_key BIGINT;
 started TIMESTAMPTZ := transaction_timestamp()-make_interval(mins => 8);
BEGIN
 SELECT id INTO STRICT actor_key FROM users WHERE email='tech5@iitsm.demo';
 SELECT id INTO STRICT reporter_key FROM users WHERE email='employee8@iitsm.demo';
 SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
 SELECT id INTO STRICT category_key FROM categories WHERE name='Software';
 INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,created_at,updated_at,acknowledged_at,response_due,resolution_due,paused_at,resolved_at,problem_id,res_violated,res_warn75_sent,res_warn90_sent)
 VALUES ('INC-'||to_char(started AT TIME ZONE 'UTC','YYYY')||'-'||lpad(nextval('incident_code_seq')::text,5,'0'),'Print margins need the approved paper profile','Print margins need the approved paper profile. This fictional fixture demonstrates the ACKNOWLEDGED workflow and requires the next action shown in the incident view.',reporter_key,actor_key,service_key,category_key,4,2,25,10,'P3','{"impact": 4, "urgency": 2, "criticality": 1, "usersMultiplier": 1.25, "baseScore": 8, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'ACKNOWLEDGED',started,transaction_timestamp(),started + interval '1 minute',started+make_interval(mins => 60),started+make_interval(mins => 480),NULL,NULL,NULL,false,false,false) RETURNING id INTO k;
 INSERT INTO audit_records(incident_id,actor_id,action,new_state,description,created_at) VALUES
 (k,reporter_key,'INCIDENT_CREATED','NEW','Fictional live-demo fixture',started),
 (k,NULL,'CLASSIFIED','CLASSIFIED','Classified using the seeded category',started),
 (k,NULL,'PRIORITY_CALCULATED','CLASSIFIED','Locked priority formula applied',started),
 (k,NULL,'ASSIGNED','ASSIGNED','Seeded assignment with matching skill',started);

INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',started+interval '1 minute');
END;
$$;
DO $$
DECLARE k BIGINT; actor_key BIGINT; reporter_key BIGINT; service_key BIGINT; category_key BIGINT;
 started TIMESTAMPTZ := transaction_timestamp()-make_interval(mins => 9);
BEGIN
 SELECT id INTO STRICT actor_key FROM users WHERE email='tech5@iitsm.demo';
 SELECT id INTO STRICT reporter_key FROM users WHERE email='employee1@iitsm.demo';
 SELECT id INTO STRICT service_key FROM services WHERE name='Printing';
 SELECT id INTO STRICT category_key FROM categories WHERE name='Hardware';
 INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,created_at,updated_at,acknowledged_at,response_due,resolution_due,paused_at,resolved_at,problem_id,res_violated,res_warn75_sent,res_warn90_sent)
 VALUES ('INC-'||to_char(started AT TIME ZONE 'UTC','YYYY')||'-'||lpad(nextval('incident_code_seq')::text,5,'0'),'Shared printer cannot scan to a folder','Shared printer cannot scan to a folder. This fictional fixture demonstrates the ASSIGNED workflow and requires the next action shown in the incident view.',reporter_key,actor_key,service_key,category_key,4,2,25,10,'P3','{"impact": 4, "urgency": 2, "criticality": 1, "usersMultiplier": 1.25, "baseScore": 8, "score": 10, "band": "P3", "overrideRule": null}'::jsonb,'ASSIGNED',started,transaction_timestamp(),NULL,started+make_interval(mins => 60),started+make_interval(mins => 480),NULL,NULL,NULL,false,false,false) RETURNING id INTO k;
 INSERT INTO audit_records(incident_id,actor_id,action,new_state,description,created_at) VALUES
 (k,reporter_key,'INCIDENT_CREATED','NEW','Fictional live-demo fixture',started),
 (k,NULL,'CLASSIFIED','CLASSIFIED','Classified using the seeded category',started),
 (k,NULL,'PRIORITY_CALCULATED','CLASSIFIED','Locked priority formula applied',started),
 (k,NULL,'ASSIGNED','ASSIGNED','Seeded assignment with matching skill',started);

END;
$$;
DO $$
DECLARE k BIGINT; actor_key BIGINT; reporter_key BIGINT; service_key BIGINT; category_key BIGINT;
 started TIMESTAMPTZ := transaction_timestamp()-make_interval(mins => 130);
BEGIN
 SELECT id INTO STRICT actor_key FROM users WHERE email='tech2@iitsm.demo';
 SELECT id INTO STRICT reporter_key FROM users WHERE email='employee2@iitsm.demo';
 SELECT id INTO STRICT service_key FROM services WHERE name='Database';
 SELECT id INTO STRICT category_key FROM categories WHERE name='Database';
 INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,created_at,updated_at,acknowledged_at,response_due,resolution_due,paused_at,resolved_at,problem_id,res_violated,res_warn75_sent,res_warn90_sent)
 VALUES ('INC-'||to_char(started AT TIME ZONE 'UTC','YYYY')||'-'||lpad(nextval('incident_code_seq')::text,5,'0'),'Database report blocked beyond its target','Database report blocked beyond its target. This fictional fixture demonstrates the IN_PROGRESS workflow and requires the next action shown in the incident view.',reporter_key,actor_key,service_key,category_key,3,2,25,37,'P2','{"impact": 3, "urgency": 2, "criticality": 5, "usersMultiplier": 1.25, "baseScore": 30, "score": 37, "band": "P2", "overrideRule": null}'::jsonb,'IN_PROGRESS',started,transaction_timestamp(),started + interval '1 minute',started+make_interval(mins => 15),started+make_interval(mins => 120),NULL,NULL,NULL,true,true,true) RETURNING id INTO k;
 INSERT INTO audit_records(incident_id,actor_id,action,new_state,description,created_at) VALUES
 (k,reporter_key,'INCIDENT_CREATED','NEW','Fictional live-demo fixture',started),
 (k,NULL,'CLASSIFIED','CLASSIFIED','Classified using the seeded category',started),
 (k,NULL,'PRIORITY_CALCULATED','CLASSIFIED','Locked priority formula applied',started),
 (k,NULL,'ASSIGNED','ASSIGNED','Seeded assignment with matching skill',started);

INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',started+interval '1 minute');
INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',started+interval '2 minutes');
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (k,'SLA_WARNING','Seeded resolution deadline warning',started+make_interval(secs => 5400));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (k,'SLA_WARNING','Seeded resolution deadline warning',started+make_interval(secs => 6480));
INSERT INTO sla_violations(incident_id,type,overdue_seconds,technician_id,created_at) VALUES (k,'RESOLUTION',600,actor_key,started+make_interval(mins => 120));
INSERT INTO audit_records(incident_id,action,description,created_at) VALUES (k,'SLA_VIOLATED','Seeded resolution target missed',started+make_interval(mins => 120));
END;
$$;
DO $$
DECLARE k BIGINT; actor_key BIGINT; reporter_key BIGINT; service_key BIGINT; category_key BIGINT;
 started TIMESTAMPTZ := transaction_timestamp()-make_interval(mins => 40);
BEGIN
 SELECT id INTO STRICT actor_key FROM users WHERE email='tech3@iitsm.demo';
 SELECT id INTO STRICT reporter_key FROM users WHERE email='employee3@iitsm.demo';
 SELECT id INTO STRICT service_key FROM services WHERE name='Cloud Storage';
 SELECT id INTO STRICT category_key FROM categories WHERE name='Storage';
 INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,created_at,updated_at,acknowledged_at,response_due,resolution_due,paused_at,resolved_at,problem_id,res_violated,res_warn75_sent,res_warn90_sent)
 VALUES ('INC-'||to_char(started AT TIME ZONE 'UTC','YYYY')||'-'||lpad(nextval('incident_code_seq')::text,5,'0'),'Shared folder access awaiting reporter details','Shared folder access awaiting reporter details. This fictional fixture demonstrates the PENDING_USER_INFO workflow and requires the next action shown in the incident view.',reporter_key,actor_key,service_key,category_key,2,2,25,15,'P3','{"impact": 2, "urgency": 2, "criticality": 3, "usersMultiplier": 1.25, "baseScore": 12, "score": 15, "band": "P3", "overrideRule": null}'::jsonb,'PENDING_USER_INFO',started,transaction_timestamp(),started + interval '1 minute',started+make_interval(mins => 60),started+make_interval(mins => 480),transaction_timestamp()-interval '20 minutes',NULL,NULL,false,false,false) RETURNING id INTO k;
 INSERT INTO audit_records(incident_id,actor_id,action,new_state,description,created_at) VALUES
 (k,reporter_key,'INCIDENT_CREATED','NEW','Fictional live-demo fixture',started),
 (k,NULL,'CLASSIFIED','CLASSIFIED','Classified using the seeded category',started),
 (k,NULL,'PRIORITY_CALCULATED','CLASSIFIED','Locked priority formula applied',started),
 (k,NULL,'ASSIGNED','ASSIGNED','Seeded assignment with matching skill',started);

INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',started+interval '1 minute');
INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',started+interval '2 minutes');
INSERT INTO incident_comments(incident_id,author_id,visibility,body,created_at) VALUES (k,actor_key,'PUBLIC','Please confirm which shared folder is affected and the error message. Do not send passwords.',transaction_timestamp()-interval '20 minutes');
INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'INFO_REQUESTED','IN_PROGRESS','PENDING_USER_INFO','Reporter details requested; resolution clock paused',transaction_timestamp()-interval '20 minutes');
END;
$$;
DO $$
DECLARE k BIGINT; actor_key BIGINT; reporter_key BIGINT; service_key BIGINT; category_key BIGINT;
 started TIMESTAMPTZ := transaction_timestamp()-make_interval(mins => 20);
BEGIN
 SELECT id INTO STRICT actor_key FROM users WHERE email='neha@iitsm.demo';
 SELECT id INTO STRICT reporter_key FROM users WHERE email='employee4@iitsm.demo';
 SELECT id INTO STRICT service_key FROM services WHERE name='Authentication';
 SELECT id INTO STRICT category_key FROM categories WHERE name='Authentication';
 INSERT INTO incidents(code,title,description,reporter_id,assignee_id,service_id,category_id,impact,urgency,affected_users,priority_score,priority,priority_breakdown,status,created_at,updated_at,acknowledged_at,response_due,resolution_due,paused_at,resolved_at,problem_id,res_violated,res_warn75_sent,res_warn90_sent)
 VALUES ('INC-'||to_char(started AT TIME ZONE 'UTC','YYYY')||'-'||lpad(nextval('incident_code_seq')::text,5,'0'),'Sign-in loop fixed, awaiting confirmation','Sign-in loop fixed, awaiting confirmation. This fictional fixture demonstrates the RESOLVED workflow and requires the next action shown in the incident view.',reporter_key,actor_key,service_key,category_key,2,2,1,20,'P3','{"impact": 2, "urgency": 2, "criticality": 5, "usersMultiplier": 1.0, "baseScore": 20, "score": 20, "band": "P3", "overrideRule": null}'::jsonb,'RESOLVED',started,transaction_timestamp(),started + interval '1 minute',started+make_interval(mins => 60),started+make_interval(mins => 480),NULL,started+interval '10 minutes',NULL,false,false,false) RETURNING id INTO k;
 INSERT INTO audit_records(incident_id,actor_id,action,new_state,description,created_at) VALUES
 (k,reporter_key,'INCIDENT_CREATED','NEW','Fictional live-demo fixture',started),
 (k,NULL,'CLASSIFIED','CLASSIFIED','Classified using the seeded category',started),
 (k,NULL,'PRIORITY_CALCULATED','CLASSIFIED','Locked priority formula applied',started),
 (k,NULL,'ASSIGNED','ASSIGNED','Seeded assignment with matching skill',started);

INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'ACKNOWLEDGED','ASSIGNED','ACKNOWLEDGED','Technician acknowledged',started+interval '1 minute');
INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'WORK_STARTED','ACKNOWLEDGED','IN_PROGRESS','Investigation started',started+interval '2 minutes');
UPDATE incidents SET root_cause='Callback cookie path excluded the identity return route',resolution_notes='Corrected the cookie path and confirmed sign-in with a clean demo browser.',resolution_steps='Checked callback routing; corrected cookie path; tested a fresh login.',time_spent_minutes=10,reusable_solution=true WHERE id=k;
INSERT INTO audit_records(incident_id,actor_id,action,previous_state,new_state,description,created_at) VALUES (k,actor_key,'RESOLVED','IN_PROGRESS','RESOLVED','Callback cookie path corrected and fresh login verified',started+interval '10 minutes');
END;
$$;
UPDATE technician_profiles SET last_assigned_at=(SELECT max(i.created_at) FROM incidents i WHERE i.assignee_id=technician_profiles.user_id);
