# Seed HSCodeDescription from static/all_hscodes_with_descriptions.csv
# Run after init_db: python -m tools.seed_hscodes
# Requires: backend-scm/static/all_hscodes_with_descriptions.csv

import os
import sys
import csv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from config import POSTGRES_CONFIG
import psycopg

BATCH = 500


def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base, "static", "all_hscodes_with_descriptions.csv")
    if not os.path.isfile(path):
        print(f"File not found: {path}")
        sys.exit(1)

    c = POSTGRES_CONFIG
    conn = psycopg.connect(
        host=c["host"],
        port=c["port"],
        user=c["user"],
        password=c["password"],
        dbname=c["database"],
    )
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM HSCodeDescription"
            )
            existing = cur.fetchone()[0]
            if existing > 0:
                print(f"HSCodeDescription already has {existing} rows. Truncating to re-seed...")
                cur.execute("TRUNCATE TABLE HSCodeDescription RESTART IDENTITY")

            rows = []
            with open(path, "r", encoding="utf-8-sig", newline="") as f:
                reader = csv.reader(f)
                next(reader, None)
                for row in reader:
                    if not row or not row[0]:
                        continue
                    code = str(row[0]).strip()[:20]
                    unit = (row[1] if len(row) > 1 else "").strip()[:50]
                    desc = (row[2] if len(row) > 2 else "").strip()
                    if len(row) > 3:
                        desc = ",".join(row[2:]).strip()
                    rows.append((code, unit, desc))

            inserted = 0
            for i in range(0, len(rows), BATCH):
                batch = rows[i : i + BATCH]
                cur.executemany(
                    """INSERT INTO HSCodeDescription (HsCode, Unit, Description)
                       VALUES (%s, %s, %s)
                       ON CONFLICT (HsCode) DO UPDATE SET Unit = EXCLUDED.Unit, Description = EXCLUDED.Description""",
                    batch,
                )
                inserted += len(batch)
                print(f"  {inserted}/{len(rows)}")
            conn.commit()
            print(f"Done. HSCodeDescription: {inserted} rows.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
