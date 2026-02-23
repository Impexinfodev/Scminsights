# Run indexes_trade_company_report.sql on the DB. Usage: python -m tools.run_trade_indexes
# Uses .env POSTGRES_* (same as app). Safe to run on live: CREATE INDEX IF NOT EXISTS.

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from config import POSTGRES_CONFIG
import psycopg

SCRIPT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts")
SQL_FILE = os.path.join(SCRIPT_DIR, "indexes_trade_company_report.sql")


def main():
    if not os.path.isfile(SQL_FILE):
        print(f"SQL file not found: {SQL_FILE}")
        sys.exit(1)
    with open(SQL_FILE, "r", encoding="utf-8") as f:
        sql = f.read()
    # Run each CREATE INDEX statement (split by ";", skip comments/empty)
    statements = []
    for s in sql.split(";"):
        s = s.strip()
        if not s or s.startswith("--"):
            continue
        # Remove leading comment lines from block
        lines = [line for line in s.split("\n") if not line.strip().startswith("--")]
        stmt = "\n".join(lines).strip()
        if stmt.upper().startswith("CREATE"):
            statements.append(stmt)
    conn = psycopg.connect(
        host=POSTGRES_CONFIG["host"],
        port=POSTGRES_CONFIG["port"],
        user=POSTGRES_CONFIG["user"],
        password=POSTGRES_CONFIG["password"],
        dbname=POSTGRES_CONFIG["database"],
    )
    try:
        with conn.cursor() as cur:
            for stmt in statements:
                if stmt:
                    cur.execute(stmt)
                    print("OK:", stmt[:60].replace("\n", " ") + "...")
        conn.commit()
        print("Trade indexes applied successfully.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
