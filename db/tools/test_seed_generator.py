"""Boundary and invalid-input tests for the CSV-to-SQL generator."""
import csv
import io
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from build_content import priority
from generate_history_sql import generate


class SeedGeneratorTests(unittest.TestCase):
    def test_multiplier_edges_and_flooring(self):
        self.assertEqual([priority(4,4,n,'Email','Software')['score']
                          for n in (9,10,100,101)], [48,60,60,72])
        self.assertEqual(priority(3,3,10,'Database','Database')['score'], 56)

    def test_overrides(self):
        self.assertEqual(priority(1,1,1,'Database','Security')['band'], 'P2')
        self.assertEqual(priority(4,1,1,'Payment','Application')['band'], 'P1')
        self.assertEqual(priority(3,1,1,'Payment','Application')['band'], 'P3')

    def run_row(self, **changes):
        with (ROOT/'docs/content/historical_incidents.csv').open(newline='') as f:
            row = next(csv.DictReader(f))
        row.update(changes)
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'input.csv'
            with path.open('w',newline='') as f:
                writer=csv.DictWriter(f, fieldnames=row.keys()); writer.writeheader(); writer.writerow(row)
            return generate(path)

    def test_sql_quotes_in_text(self):
        self.assertIn("reporter''s VPN", self.run_row(title="reporter's VPN"))

    def test_rejects_invalid_rating(self):
        with self.assertRaises(ValueError): self.run_row(feedback_rating='6')

    def test_rejects_future_resolution(self):
        with self.assertRaises(ValueError): self.run_row(days_ago_created='1', minutes_to_resolve='1440')

    def test_rejects_self_assignment(self):
        with self.assertRaises(ValueError): self.run_row(reporter_email='priya.nair@iitsm.demo')

    def test_rejects_unskilled_assignee(self):
        with self.assertRaises(ValueError): self.run_row(assignee_email='tech2@iitsm.demo')


if __name__ == '__main__':
    unittest.main()
