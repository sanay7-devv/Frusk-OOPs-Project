"""Fast checks for the Task 3 synthetic data-growth fixture generator."""
import csv
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "deploy"))
sys.path.insert(0, str(ROOT / "db/tools"))

from generate_history_sql import generate
from task3_data_growth import write_growth_csv


class GrowthFixtureTests(unittest.TestCase):
    def test_rows_are_unique_and_accepted_by_existing_seed_generator(self):
        source = ROOT / "docs/content/historical_incidents.csv"
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "growth.csv"
            write_growth_csv(source, target, count=3, offset=9)
            with target.open(newline="", encoding="utf-8") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual(len(rows), 3)
            self.assertEqual(len({row["title"] for row in rows}), 3)
            self.assertTrue(all(len(row["title"]) <= 200 for row in rows))
            sql = generate(target)
            self.assertEqual(sql.count("DO $$"), 3)
            self.assertIn("A7-growth-000010", sql)
            self.assertIn("incident_code_number := nextval('incident_code_seq')", sql)
            self.assertIn(
                "lpad(incident_code_number::text, greatest(5, length(incident_code_number::text)), '0')",
                sql,
            )


if __name__ == "__main__":
    unittest.main()
