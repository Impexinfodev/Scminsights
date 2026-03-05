# Create PaymentTransaction table if missing (e.g. after adding Razorpay).
# Usage: python -m tools.ensure_payment_table
# Set .env (POSTGRES_DB_*) before running.

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from config import get_database_config
from repositories.repo_provider import RepoProvider
from modules.db.postgres_models import CREATE_PAYMENT_TABLE, PAYMENT_INDEX_STATEMENTS, ALTER_PAYMENT_ADD_SOURCE_WEBSITE


def main():
    config = get_database_config()
    RepoProvider(config)
    admin_repo = RepoProvider.get_admin_repo()
    try:
        with admin_repo.connection_pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(CREATE_PAYMENT_TABLE)
                conn.commit()
                try:
                    cur.execute(ALTER_PAYMENT_ADD_SOURCE_WEBSITE)
                    conn.commit()
                except Exception as e:
                    conn.rollback()
                    print("ALTER SourceWebsite (may already exist):", e)
                for stmt in PAYMENT_INDEX_STATEMENTS:
                    try:
                        cur.execute(stmt)
                        conn.commit()
                    except Exception as e:
                        conn.rollback()
                        print("Index (may already exist):", e)
        print("PaymentTransaction table ready.")
    except Exception as e:
        print("Error:", e)
        sys.exit(1)
    finally:
        if hasattr(admin_repo, "close"):
            admin_repo.close()
        RepoProvider.reset()


if __name__ == "__main__":
    main()
