#!/usr/bin/env python3
# Update a user's role in SCM-INSIGHTS (e.g. set to ADMIN).
# Usage: python -m tools.update_user_role <email> [role]
# Example: python -m tools.update_user_role khanrustam2809@gmail.com ADMIN

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

import psycopg

VALID_ROLES = ("USER", "ADMIN")


def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: python -m tools.update_user_role <email> [role]")
        print("Example: python -m tools.update_user_role khanrustam2809@gmail.com ADMIN")
        sys.exit(1)

    email = args[0].strip().lower()
    role = (args[1].strip().upper() if len(args) > 1 else "ADMIN")

    if role not in VALID_ROLES:
        print(f"Error: role must be one of {VALID_ROLES}")
        sys.exit(1)

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
        dbname=dbname,
    )

    with conn.cursor() as cur:
        # UserId is the email in this app
        cur.execute(
            "SELECT UserId, Name, Role FROM UserProfile WHERE EmailId = %s OR UserId = %s",
            (email, email),
        )
        row = cur.fetchone()

        if not row:
            print(f"Error: No user found with email '{email}'.")
            conn.close()
            sys.exit(1)

        current_role = row[2]
        if current_role == role:
            print(f"User {email} already has role '{role}'. No change made.")
            conn.close()
            sys.exit(0)

        cur.execute(
            "UPDATE UserProfile SET Role = %s WHERE UserId = %s",
            (role, row[0]),
        )

    conn.commit()
    conn.close()

    print(f"Updated role for {email}: '{current_role}' -> '{role}'.")
    print("Done.")


if __name__ == "__main__":
    main()
