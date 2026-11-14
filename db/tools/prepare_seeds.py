"""Rebuild the synthetic CSV and Flyway seed files; Python standard library only."""
import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
import build_content


def load_script(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def flyway_sql(text):
    # Flyway owns the transaction for each versioned migration.
    return '\n'.join(line for line in text.splitlines()
                     if line.strip() not in ('BEGIN;', 'COMMIT;')) + '\n'


def main():
    for subdir in ('seed', 'demo'):
        (ROOT / 'db' / subdir).mkdir(parents=True, exist_ok=True)
    build_content.build_reference()
    build_content.build_history()
    seeds = ROOT / 'db' / 'seed'
    (seeds / 'V100__reference_data.sql').write_text(
        flyway_sql((seeds / '01_reference.sql').read_text()))
    (seeds / '01_reference.sql').unlink()
    (ROOT / 'db' / 'demo' / '01_timer_overrides.sql').unlink()
    history = load_script('generate_history_sql')
    (seeds / 'V101__historical_incidents.sql').write_text(
        flyway_sql(history.generate(ROOT / 'docs/content/historical_incidents.csv')))
    staged = load_script('generate_demo_sql')
    (seeds / 'V102__staged_demo.sql').write_text(flyway_sql(staged.generate()))
    overrides = """-- Demo profile only. Production/test schema locations do not include this directory.
UPDATE escalation_policies SET timeout_minutes = 1 WHERE priority IN ('P1', 'P2');
UPDATE app_config SET value = CASE key
    WHEN 'sla.monitor.interval.seconds' THEN '30'
    WHEN 'escalation.monitor.interval.seconds' THEN '15'
    WHEN 'escalation.exhausted.minutes' THEN '1'
    WHEN 'verify.auto.hours' THEN '0.033'
    WHEN 'verify.monitor.interval.seconds' THEN '30'
    ELSE value END;
"""
    (ROOT / 'db/demo/V200__demo_timers.sql').write_text(overrides)
    # Canonical SQL is kept under db/. Backend resources are reproducible copies.
    for subdir in ('migration', 'seed', 'demo'):
        source = ROOT / 'db' / subdir
        destination = ROOT / 'backend/src/main/resources/db' / subdir
        destination.mkdir(parents=True, exist_ok=True)
        for file in source.glob('V*.sql'):
            (destination / file.name).write_bytes(file.read_bytes())
    print('Prepared 18 accounts, 200 historical incidents, 12 staged cases, and demo timers.')


if __name__ == '__main__':
    main()
