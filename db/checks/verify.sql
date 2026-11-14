-- Run with psql -v ON_ERROR_STOP=1 after loading a fresh dev/demo database.
DO $$
DECLARE n INTEGER; expected INTEGER; actual INTEGER;
BEGIN
    SELECT count(*) INTO n FROM users;
    IF n <> 18 THEN RAISE EXCEPTION 'Expected 18 users, got %', n; END IF;
    IF EXISTS (SELECT 1 FROM users u WHERE NOT EXISTS (
        SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role_type='EMPLOYEE'))
    THEN RAISE EXCEPTION 'Every demo account needs the employee role'; END IF;
    SELECT count(*) INTO n FROM incidents WHERE status='CLOSED';
    IF n <> 200 THEN RAISE EXCEPTION 'Expected 200 closed historical incidents, got %', n; END IF;
    SELECT count(*) INTO n FROM incidents WHERE status <> 'CLOSED';
    IF n <> 12 THEN RAISE EXCEPTION 'Expected 12 staged incidents, got %', n; END IF;
    IF EXISTS (SELECT 1 FROM incidents i JOIN services s ON s.id=i.service_id
               WHERE s.name='Payment' AND i.status <> 'CLOSED')
    THEN RAISE EXCEPTION 'Payment must be clear for the live demo'; END IF;
    SELECT count(*) INTO n FROM incidents WHERE problem_id IS NOT NULL;
    IF n <> 3 THEN RAISE EXCEPTION 'Expected 3 correlated Network incidents'; END IF;
    SELECT sum(CASE i.priority WHEN 'P1' THEN 4 WHEN 'P2' THEN 3 WHEN 'P3' THEN 2 ELSE 1 END)
      INTO actual FROM incidents i JOIN users u ON u.id=i.assignee_id
      WHERE u.email='tech5@iitsm.demo' AND i.status IN
      ('ASSIGNED','ACKNOWLEDGED','IN_PROGRESS','PENDING_USER_INFO','REOPENED');
    SELECT t.max_load INTO expected FROM technician_profiles t JOIN users u ON u.id=t.user_id
      WHERE u.email='tech5@iitsm.demo';
    IF actual <> expected THEN RAISE EXCEPTION 'Busy technician load % must equal capacity %', actual, expected; END IF;
    IF NOT EXISTS (SELECT 1 FROM technician_profiles WHERE availability='AWAY')
    THEN RAISE EXCEPTION 'Missing away technician'; END IF;
    IF (SELECT count(*) FROM feedback) <> 180 THEN RAISE EXCEPTION 'Expected 180 feedback rows'; END IF;
    IF EXISTS (SELECT 1 FROM incidents i JOIN services s ON s.id=i.service_id
        WHERE i.priority_score <> floor(i.impact::numeric*i.urgency*s.criticality*
          CASE WHEN i.affected_users >= 101 THEN 1.5 WHEN i.affected_users >= 10 THEN 1.25 ELSE 1 END))
    THEN RAISE EXCEPTION 'Priority score does not match the specification'; END IF;
    IF EXISTS (SELECT 1 FROM incidents i WHERE
        (i.priority_breakdown->>'score')::integer <> i.priority_score OR
        i.priority_breakdown->>'band' <> trim(i.priority))
    THEN RAISE EXCEPTION 'Stored priority breakdown is inconsistent'; END IF;
    IF EXISTS (SELECT 1 FROM incidents WHERE status='CLOSED' AND
        (closure_reason <> 'VERIFIED' OR acknowledged_at < created_at OR
         resolved_at < acknowledged_at OR closed_at < resolved_at OR closed_at > now()))
    THEN RAISE EXCEPTION 'Historical lifecycle timestamps are inconsistent'; END IF;
    IF EXISTS (SELECT 1 FROM incidents WHERE status='CLOSED' AND
        (SELECT count(*) FROM audit_records a WHERE a.incident_id=incidents.id) < 9)
    THEN RAISE EXCEPTION 'Historical incident audit chain is incomplete'; END IF;
    IF EXISTS (SELECT 1 FROM incidents i JOIN services s ON s.id=i.service_id
        JOIN sla_policies p ON p.priority=i.priority AND
           (p.service_id=s.id OR (p.service_id IS NULL AND NOT EXISTS (
               SELECT 1 FROM sla_policies sp WHERE sp.service_id=s.id AND sp.priority=i.priority)))
        WHERE i.status='CLOSED' AND
           (i.response_due <> i.created_at + p.response_minutes*interval '1 minute' OR
            i.resolution_due <> i.created_at + p.resolution_minutes*interval '1 minute' OR
            i.res_violated <> (i.resolved_at >= i.resolution_due)))
    THEN RAISE EXCEPTION 'Seed SLA deadlines or violation flags are inconsistent'; END IF;
    -- Exact historical distribution from the content specification.
    IF (SELECT count(*) FROM incidents WHERE status='CLOSED' AND priority='P1') <> 10 OR
       (SELECT count(*) FROM incidents WHERE status='CLOSED' AND priority='P2') <> 40 OR
       (SELECT count(*) FROM incidents WHERE status='CLOSED' AND priority='P3') <> 90 OR
       (SELECT count(*) FROM incidents WHERE status='CLOSED' AND priority='P4') <> 60
    THEN RAISE EXCEPTION 'Historical priority mix must be 5/20/45/30 percent'; END IF;
    IF abs((SELECT sum(value::numeric) FROM app_config WHERE key LIKE 'assignment.weight.%')-1) > 0.000001
    THEN RAISE EXCEPTION 'Assignment weights must add up to one'; END IF;
    IF EXISTS (SELECT 1 FROM incidents i WHERE NOT EXISTS (
        SELECT 1 FROM technician_skills ts JOIN category_skills cs ON cs.skill_id=ts.skill_id
        WHERE ts.technician_id=i.assignee_id AND cs.category_id=i.category_id))
    THEN RAISE EXCEPTION 'Seeded assignee lacks a required category skill'; END IF;
    IF NOT EXISTS (SELECT 1 FROM incidents WHERE status='IN_PROGRESS' AND
        now()-created_at BETWEEN 0.73*(resolution_due-created_at) AND 0.75*(resolution_due-created_at))
    THEN RAISE EXCEPTION 'Missing case close to 75 percent resolution warning'; END IF;
END $$;

-- These subtransactions prove the trigger rejects changes without damaging data.
DO $$
BEGIN
    BEGIN
        UPDATE audit_records SET description='should fail' WHERE id=(SELECT min(id) FROM audit_records);
        RAISE EXCEPTION 'Audit UPDATE was allowed';
    EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;
    BEGIN
        DELETE FROM audit_records WHERE id=(SELECT min(id) FROM audit_records);
        RAISE EXCEPTION 'Audit DELETE was allowed';
    EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;
    BEGIN
        -- Include its new referencing table so PostgreSQL reaches the protection trigger.
        TRUNCATE audit_records, audit_seal_entries;
        RAISE EXCEPTION 'Audit TRUNCATE was allowed';
    EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;
END $$;
SELECT 'Seed integrity and audit immutability checks passed' AS result;
