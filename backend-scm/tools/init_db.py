# Run once to create SCM-INSIGHTS DB tables. Usage: python -m tools.init_db
# Set .env (or env vars) for POSTGRES_DB_* before running.

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from config import get_database_config
from repositories.repo_provider import RepoProvider


def main():
    config = get_database_config()
    RepoProvider(config)
    admin_repo = RepoProvider.get_admin_repo()
    try:
        admin_repo.create_tables()
        print("SCM-INSIGHTS tables created successfully.")
        # Verify seed so you know the DB has data
        try:
            trial = admin_repo.get_license_by_type("TRIAL")
            if trial:
                print("Trial plan seeded. Start the backend and visit /api/plans or Admin → Plans.")
            else:
                print("Warning: TRIAL license not found after create_tables.")
        except Exception as e:
            print("Warning: could not verify seed:", e)
    finally:
        # Close pool before exit to avoid 'cannot join thread at interpreter shutdown'
        if hasattr(admin_repo, "close"):
            admin_repo.close()
        RepoProvider.reset()


if __name__ == "__main__":
    main()
