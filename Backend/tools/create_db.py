# Create scm_insights database if it doesn't exist. Uses .env for credentials.
# Run: python -m tools.create_db

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

import psycopg

def main():
    host = os.getenv("POSTGRES_DB_HOST", "localhost")
    port = int(os.getenv("POSTGRES_DB_PORT", "5432"))
    user = os.getenv("POSTGRES_DB_USER", "postgres")
    password = os.getenv("POSTGRES_DB_PASSWORD", "")
    dbname = os.getenv("POSTGRES_DB_NAME", "scm_insights")

    conn = psycopg.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        dbname="postgres",
    )
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (dbname,))
        if cur.fetchone():
            print(f"Database '{dbname}' already exists.")
        else:
            cur.execute(f'CREATE DATABASE "{dbname}"')
            print(f"Database '{dbname}' created.")
    conn.close()

if __name__ == "__main__":
    main()
