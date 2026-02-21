# SCM-INSIGHTS Admin Repository (PostgreSQL) - users, overview, licenses - psycopg3
import os
import json

from modules.repositories.Admin.abstract_admin_repo import AdminRepository
from utils.constants import get_valid_till_date
from modules.repositories.utils import with_connection
from modules.db.postgres_models import (
    CREATE_USER_PROFILE_TABLE,
    CREATE_LICENSE_TABLE,
    CREATE_SESSION_TABLE,
    CREATE_USER_TOKEN_TABLE,
    CREATE_ACTIVATION_TABLE,
    CREATE_PASSWORD_RESET_TABLE,
    CREATE_CONTACT_TABLE,
    CREATE_HS_CODE_TABLE,
    HS_CODE_INDEX_STATEMENTS,
    CREATE_SIMS_DIRECTORY_TABLE,
    SIMS_DIRECTORY_INDEX_STATEMENTS,
    DROP_USER_PROFILE_TABLE,
    DROP_LICENSE_TABLE,
    DROP_SESSION_TABLE,
    DROP_USER_TOKEN_TABLE,
    DROP_ACTIVATION_TABLE,
    DROP_PASSWORD_RESET_TABLE,
    DROP_CONTACT_TABLE,
    DROP_SIMS_DIRECTORY_TABLE,
)
from psycopg_pool import ConnectionPool


def _conninfo(host, port, dbname, user, password):
    return f"host={host} port={port} dbname={dbname} user={user} password={password}"


class PostgresAdminRepository(AdminRepository):
    def __init__(self, db_user, db_password, db_name, db_host, db_port):
        self.connection_pool = ConnectionPool(
            _conninfo(db_host, db_port, db_name, db_user, db_password),
            min_size=1,
            max_size=10,
            check=ConnectionPool.check_connection,
        )

    def close(self):
        """Close the connection pool. Call before process exit (e.g. init_db) to avoid shutdown errors."""
        if getattr(self, "connection_pool", None) is not None:
            try:
                self.connection_pool.close()
            except Exception:
                pass
            self.connection_pool = None

    @with_connection(commit=True)
    def create_tables(self, cursor):
        cursor.execute(CREATE_USER_PROFILE_TABLE)
        cursor.execute(CREATE_LICENSE_TABLE)
        cursor.execute(CREATE_SESSION_TABLE)
        cursor.execute(CREATE_USER_TOKEN_TABLE)
        cursor.execute(CREATE_ACTIVATION_TABLE)
        cursor.execute(CREATE_PASSWORD_RESET_TABLE)
        cursor.execute(CREATE_CONTACT_TABLE)
        cursor.execute(CREATE_HS_CODE_TABLE)
        cursor.connection.commit()
        for stmt in HS_CODE_INDEX_STATEMENTS:
            try:
                cursor.execute(stmt)
                cursor.connection.commit()
            except Exception:
                cursor.connection.rollback()
                pass
        
        cursor.execute(CREATE_SIMS_DIRECTORY_TABLE)
        cursor.connection.commit()
        try:
            cursor.execute("ALTER TABLE SimsDirectory ADD COLUMN IecCode VARCHAR(50)")
            cursor.connection.commit()
        except Exception:
            cursor.connection.rollback()
            pass
            
        for stmt in SIMS_DIRECTORY_INDEX_STATEMENTS:
            try:
                cursor.execute(stmt)
                cursor.connection.commit()
            except Exception:
                cursor.connection.rollback()
                pass
        
        # SimsDirectory: no seed. Remove legacy dummy rows if present (exact match).
        try:
            for _email in (
                "contact@globalimports.example.com",
                "info@tradesolutions.example.com",
                "sales@mumbaiexim.example.com",
                "hello@chennaitrading.example.com",
                "enquiry@delhitraders.example.com",
            ):
                cursor.execute(
                    "DELETE FROM SimsDirectory WHERE Email = %s", (_email,)
                )
        except Exception:
            pass
        # Seed plans: TRIAL + 3 paid plans (Directory, Trade, Bundle)
        plans_seed = [
            (
                "TRIAL",
                {
                    "LicenseName": "Trial",
                    "Price": 0,
                    "PriceINR": 0,
                    "PriceUSD": 0,
                    "ShortDescription": "Limited access to directory, buyers and suppliers. Try all features with small limits.",
                    "Directory": {"Access": "limited", "MaxRows": 10, "MaxRowsPerSearch": 5},
                    "Buyers": {"Access": "custom", "MaxSearchesPerPeriod": 5, "MaxRowsPerSearch": 5},
                    "Suppliers": {"Access": "custom", "MaxSearchesPerPeriod": 5, "MaxRowsPerSearch": 5},
                    "Validity": "Year",
                    "ValidityDays": 365,
                },
            ),
            (
                "DIRECTORY",
                {
                    "LicenseName": "Directory",
                    "Price": 4999,
                    "PriceINR": 4999,
                    "PriceUSD": 60,
                    "ShortDescription": "Full access to the Buyers Directory. Browse and search verified importers with contact details. No buyers or suppliers trade search.",
                    "Directory": {"Access": "full"},
                    "Buyers": {"Access": "custom", "MaxSearchesPerPeriod": 0, "MaxRowsPerSearch": 0},
                    "Suppliers": {"Access": "custom", "MaxSearchesPerPeriod": 0, "MaxRowsPerSearch": 0},
                    "Validity": "Year",
                    "ValidityDays": 365,
                },
            ),
            (
                "TRADE",
                {
                    "LicenseName": "Buyers & Suppliers",
                    "Price": 9999,
                    "PriceINR": 9999,
                    "PriceUSD": 120,
                    "ShortDescription": "Full access to Buyers and Suppliers search by HS code, country and year. Limited directory access.",
                    "Directory": {"Access": "limited", "MaxRows": 10, "MaxRowsPerSearch": 5},
                    "Buyers": {"Access": "full"},
                    "Suppliers": {"Access": "full"},
                    "Validity": "Year",
                    "ValidityDays": 365,
                },
            ),
            (
                "BUNDLE",
                {
                    "LicenseName": "Unlimited Bundle",
                    "Price": 19999,
                    "PriceINR": 19999,
                    "PriceUSD": 240,
                    "ShortDescription": "Complete access: unlimited directory, full buyers and suppliers search. Best value for serious trade professionals.",
                    "Directory": {"Access": "full"},
                    "Buyers": {"Access": "full"},
                    "Suppliers": {"Access": "full"},
                    "Validity": "Year",
                    "ValidityDays": 365,
                },
            ),
        ]
        for license_type, info in plans_seed:
            cursor.execute(
                """INSERT INTO License (LicenseType, LicenseInfoJson)
                   VALUES (%s, %s)
                   ON CONFLICT (LicenseType) DO UPDATE SET LicenseInfoJson = EXCLUDED.LicenseInfoJson""",
                (license_type, json.dumps(info)),
            )

    @with_connection(commit=True)
    def drop_tables(self, cursor):
        cursor.execute(DROP_ACTIVATION_TABLE)
        cursor.execute(DROP_PASSWORD_RESET_TABLE)
        cursor.execute(DROP_CONTACT_TABLE)
        cursor.execute(DROP_SIMS_DIRECTORY_TABLE)
        cursor.execute(DROP_SESSION_TABLE)
        cursor.execute(DROP_USER_TOKEN_TABLE)
        cursor.execute(DROP_LICENSE_TABLE)
        cursor.execute(DROP_USER_PROFILE_TABLE)

    @with_connection(commit=False)
    def get_all_users(self, cursor, sort_order="asc", search_term=None):
        order = "ASC" if str(sort_order).lower() == "asc" else "DESC"
        where = ""
        params = []
        if search_term and search_term.strip():
            term = f"%{search_term.strip()}%"
            where = " WHERE (LOWER(EmailId) LIKE LOWER(%s) OR LOWER(Name) LIKE LOWER(%s) OR LOWER(CompanyName) LIKE LOWER(%s))"
            params = [term, term, term]
        cursor.execute(
            f"""
            SELECT UserId, LicenseType, EmailId, Name, CompanyName, PhoneNumberCountryCode, PhoneNumber,
                   gst, activationStatus, LogOnTimeStamp
            FROM UserProfile
            {where}
            ORDER BY UserId {order}
            """,
            tuple(params) if params else None,
        )
        rows = cursor.fetchall() or []
        return [
            {
                "UserId": r[0],
                "LicenseType": r[1],
                "EmailId": r[2],
                "Name": r[3],
                "Company": r[4],
                "PhoneStd": r[5],
                "Phone": r[6],
                "Gst": r[7],
                "ActivationStatus": r[8],
                "CreatedAt": r[9],
                "RecordsConsumed": 0,
            }
            for r in rows
        ]

    @with_connection(commit=False)
    def is_user_admin(self, cursor, user_id):
        admin_ids = os.getenv("WHITELISTED_ADMINS", "").split(",")
        if user_id and user_id.strip() in [a.strip() for a in admin_ids if a]:
            return True
        cursor.execute("SELECT Role FROM UserProfile WHERE UserId = %s", (user_id,))
        record = cursor.fetchone()
        return record and record[0] == "ADMIN"

    @with_connection(commit=True)
    def update_user_activation_status(self, cursor, user_id, activation_status):
        cursor.execute(
            "UPDATE UserProfile SET activationStatus = %s WHERE UserId = %s",
            (activation_status, user_id),
        )

    @with_connection(commit=True)
    def delete_user(self, cursor, user_id):
        cursor.execute("DELETE FROM UserProfile WHERE UserId = %s", (user_id,))

    @with_connection(commit=False)
    def get_license_by_type(self, cursor, license_type):
        cursor.execute("SELECT LicenseInfoJson FROM License WHERE LicenseType = %s", (license_type,))
        row = cursor.fetchone()
        return row[0] if row else None

    @with_connection(commit=False)
    def get_all_licenses(self, cursor):
        cursor.execute("SELECT LicenseType, LicenseInfoJson FROM License ORDER BY LicenseType")
        rows = cursor.fetchall() or []
        result = []
        for r in rows:
            try:
                info = json.loads(r[1]) if isinstance(r[1], str) else (r[1] or {})
            except (json.JSONDecodeError, TypeError):
                info = {}
            result.append({"LicenseType": r[0], "LicenseInfo": info})
        return result

    @with_connection(commit=True)
    def create_license(self, cursor, license_type, license_data):
        payload = json.dumps(license_data) if isinstance(license_data, dict) else license_data
        cursor.execute(
            """INSERT INTO License (LicenseType, LicenseInfoJson)
               VALUES (%s, %s)
               ON CONFLICT (LicenseType) DO UPDATE SET LicenseInfoJson = EXCLUDED.LicenseInfoJson""",
            (license_type, payload),
        )

    @with_connection(commit=True)
    def delete_license(self, cursor, license_type):
        cursor.execute("DELETE FROM License WHERE LicenseType = %s", (license_type,))

    @with_connection(commit=True)
    def assign_license(self, cursor, user_id, license_type):
        raw = self.get_license_by_type(license_type)
        if not raw:
            return
        try:
            info = json.loads(raw) if isinstance(raw, str) else raw
        except (json.JSONDecodeError, TypeError):
            info = {}
        from datetime import datetime, timezone
        valid_till = get_valid_till_date(
            datetime.now(timezone.utc),
            info.get("Validity") or info.get("Period"),
            info.get("ValidityDays"),
        )
        cursor.execute(
            "UPDATE UserProfile SET LicenseType = %s, LicenseValidTill = %s WHERE UserId = %s",
            (license_type, valid_till, user_id),
        )

    @with_connection(commit=True)
    def save_contact_message(self, cursor, name, email, phone, message):
        cursor.execute(
            """INSERT INTO ContactMessage (Name, Email, PhoneNumber, Message)
               VALUES (%s, %s, %s, %s)""",
            (name, email, phone or "", message),
        )

    @with_connection(commit=False)
    def get_contact_messages(self, cursor, page=1, page_size=50, sort_order="desc"):
        order = "DESC" if str(sort_order).lower() == "desc" else "ASC"
        offset = (max(1, page) - 1) * max(1, min(page_size, 100))
        limit = max(1, min(page_size, 100))
        cursor.execute(
            f"""SELECT ContactId, Name, Email, PhoneNumber, Message, Status, CreatedTime
                FROM ContactMessage
                ORDER BY CreatedTime {order}
                LIMIT %s OFFSET %s""",
            (limit, offset),
        )
        rows = cursor.fetchall() or []
        cursor.execute("SELECT COUNT(*) FROM ContactMessage")
        total = cursor.fetchone()[0] if cursor.rowcount else 0
        return [
            {
                "ContactId": str(r[0]),
                "Name": r[1],
                "Email": r[2],
                "PhoneNumber": r[3],
                "Message": r[4],
                "Status": r[5],
                "CreatedTime": r[6].isoformat() if r[6] and hasattr(r[6], "isoformat") else str(r[6]),
            }
            for r in rows
        ], total

    @with_connection(commit=True)
    def update_contact_status(self, cursor, contact_id, status):
        cursor.execute(
            "UPDATE ContactMessage SET Status = %s WHERE ContactId = %s",
            (status, contact_id),
        )

    @with_connection(commit=True)
    def delete_contact(self, cursor, contact_id):
        cursor.execute("DELETE FROM ContactMessage WHERE ContactId = %s", (contact_id,))

    @with_connection(commit=False)
    def get_contact_by_id(self, cursor, contact_id):
        cursor.execute(
            """SELECT ContactId, Name, Email, PhoneNumber, Message, Status, CreatedTime
                FROM ContactMessage WHERE ContactId = %s""",
            (contact_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "ContactId": str(row[0]),
            "Name": row[1],
            "Email": row[2],
            "PhoneNumber": row[3],
            "Message": row[4],
            "Status": row[5],
            "CreatedTime": row[6].isoformat() if row[6] and hasattr(row[6], "isoformat") else str(row[6]),
        }

    @with_connection(commit=False)
    def get_sims_directory_page(self, cursor, page=1, limit=50, search_term=""):
        """Return (list of {id, IEC_NAME, IEC_EMAIL, IEC_MOBILE}, total_items). Real data from SimsDirectory."""
        page = max(1, page)
        limit = max(1, min(100, limit))
        offset = (page - 1) * limit
        params = []
        where = ""
        if search_term and search_term.strip():
            where = """
                WHERE LOWER(CompanyName) LIKE LOWER(%s)
                OR LOWER(Email) LIKE LOWER(%s)
                OR Mobile LIKE %s
            """
            pattern = f"%{search_term.strip()}%"
            params = [pattern, pattern, pattern]
        cursor.execute(f"SELECT COUNT(*) FROM SimsDirectory {where}", tuple(params) if params else None)
        total_items = (cursor.fetchone() or [0])[0]
        cursor.execute(
            f"""SELECT Id, CompanyName, Email, Mobile, IecCode FROM SimsDirectory {where}
                ORDER BY Id LIMIT %s OFFSET %s""",
            (params + [limit, offset]) if params else [limit, offset],
        )
        rows = cursor.fetchall() or []
        data = [
            {
                "id": r[0],
                "IEC_NAME": (r[1] or ""),
                "IEC_EMAIL": (r[2] or ""),
                "IEC_MOBILE": (r[3] or ""),
                "IEC_CODE": (r[4] or "") if len(r) > 4 else "",
            }
            for r in rows
        ]
        return data, total_items

    @with_connection(commit=False)
    def get_all_hscodes(self, cursor):
        """Return list of {code, description} from HSCodeDescription (seeded from CSV)."""
        try:
            cursor.execute(
                "SELECT HsCode, Unit, Description FROM HSCodeDescription ORDER BY HsCode"
            )
        except Exception:
            return []
        rows = cursor.fetchall() or []
        return [
            {"code": (r[0] or ""), "unit": (r[1] or ""), "description": (r[2] or "")}
            for r in rows
        ]
