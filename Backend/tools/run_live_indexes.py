# Run only the new indexes on live DB (no table creation). Usage: python -m tools.run_live_indexes
# Uses .env POSTGRES_*. Safe: CREATE INDEX IF NOT EXISTS.

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from config import POSTGRES_CONFIG
from modules.db.postgres_models import SESSION_INDEX_STATEMENTS
import psycopg

SCRIPT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts")
TRADE_SQL_FILE = os.path.join(SCRIPT_DIR, "indexes_trade_company_report.sql")


def main():
    conn = psycopg.connect(
        host=POSTGRES_CONFIG["host"],
        port=POSTGRES_CONFIG["port"],
        user=POSTGRES_CONFIG["user"],
        password=POSTGRES_CONFIG["password"],
        dbname=POSTGRES_CONFIG["database"],
    )
    try:
        with conn.cursor() as cur:
            # 1) Session index (for auth/session expiry)
            for stmt in SESSION_INDEX_STATEMENTS:
                try:
                    cur.execute(stmt)
                    print("OK (Session):", stmt.strip()[:70])
                except Exception as e:
                    print("Skip (Session):", e)

            # 2) trade_company_report indexes
            if os.path.isfile(TRADE_SQL_FILE):
                with open(TRADE_SQL_FILE, "r", encoding="utf-8") as f:
                    sql = f.read()
                for s in sql.split(";"):
                    # Remove comment lines so we detect CREATE even after leading comments
                    lines = [line for line in s.split("\n") if not line.strip().startswith("--")]
                    stmt = "\n".join(lines).strip()
                    if not stmt or not stmt.upper().startswith("CREATE"):
                        continue
                    try:
                        cur.execute(stmt)
                        print("OK (trade):", stmt[:60].replace("\n", " ") + "...")
                    except Exception as e:
                        print("Skip (trade):", e)
            else:
                print("Trade SQL file not found:", TRADE_SQL_FILE)
        conn.commit()
        print("Live indexes applied successfully.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
