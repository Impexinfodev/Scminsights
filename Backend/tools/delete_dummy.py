import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from config import get_database_config
from repositories.repo_provider import RepoProvider

def main():
    config = get_database_config()
    RepoProvider(config)
    admin_repo = RepoProvider.get_admin_repo()
    try:
        with admin_repo.connection_pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM SimsDirectory WHERE Email ILIKE '%example.com%'")
                conn.commit()
                print(f"Deleted {cursor.rowcount} dummy rows.")
    finally:
        if hasattr(admin_repo, "close"):
            admin_repo.close()
        RepoProvider.reset()

if __name__ == "__main__":
    main()
