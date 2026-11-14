-- Demo profile only. Production/test schema locations do not include this directory.
UPDATE escalation_policies SET timeout_minutes = 1 WHERE priority IN ('P1', 'P2');
UPDATE app_config SET value = CASE key
    WHEN 'sla.monitor.interval.seconds' THEN '30'
    WHEN 'escalation.monitor.interval.seconds' THEN '15'
    WHEN 'escalation.exhausted.minutes' THEN '1'
    WHEN 'verify.auto.hours' THEN '0.033'
    WHEN 'verify.monitor.interval.seconds' THEN '30'
    ELSE value END;
