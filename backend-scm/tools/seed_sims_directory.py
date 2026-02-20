# Seed SimsDirectory from static/sims-data.json
# Run after init_db: python -m tools.seed_sims_directory
# Requires: backend-scm/static/sims-data.json (array of {IEC_CODE, IEC_NAME, IEC_EMAIL, IEC_MOBILE})

import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from config import POSTGRES_CONFIG
import psycopg

BATCH = 1000


def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base, "static", "sims-data.json")
    if not os.path.isfile(path):
        print(f"File not found: {path}")
        sys.exit(1)

    print("Loading JSON (may take a moment)...")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        print("Expected JSON array of {IEC_CODE, IEC_NAME, IEC_EMAIL, IEC_MOBILE}")
        sys.exit(1)

    rows = []
    for item in data:
        if not item or not isinstance(item, dict):
            continue
        iec_code = str(item.get("IEC_CODE") or "").strip()[:50]
        name = str(item.get("IEC_NAME") or "").strip()[:255]
        if not name:
            continue
        email = str(item.get("IEC_EMAIL") or "").strip()[:255]
        mobile = str(item.get("IEC_MOBILE") or "").strip()[:50]
        rows.append((iec_code or None, name, email or None, mobile or None))

    print(f"Inserting {len(rows)} directory records...")

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
            cur.execute("SELECT COUNT(*) FROM SimsDirectory")
            existing = cur.fetchone()[0]
            if existing > 0:
                print(f"SimsDirectory already has {existing} rows.")
                ans = input("Truncate and re-seed? [y/N]: ").strip().lower()
                if ans != "y":
                    print("Exiting.")
                    return
                cur.execute("TRUNCATE TABLE SimsDirectory RESTART IDENTITY")

            inserted = 0
            for i in range(0, len(rows), BATCH):
                batch = rows[i : i + BATCH]
                cur.executemany(
                    """INSERT INTO SimsDirectory (IecCode, CompanyName, Email, Mobile)
                       VALUES (%s, %s, %s, %s)""",
                    batch,
                )
                inserted += len(batch)
                if inserted % 10000 == 0 or inserted == len(rows):
                    print(f"  {inserted}/{len(rows)}")
            conn.commit()
            print(f"Done. SimsDirectory: {inserted} rows.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
