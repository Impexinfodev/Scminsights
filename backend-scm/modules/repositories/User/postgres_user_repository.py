# SCM-INSIGHTS User Repository (PostgreSQL) - psycopg3
from datetime import datetime, timedelta, timezone
import uuid
import json

from modules.repositories.User.abstract_user_repository import UserRepository
from psycopg_pool import ConnectionPool
from modules.repositories.utils import with_connection
from modules.db.postgres_models import (
    CREATE_USER_PROFILE_TABLE,
    CREATE_LICENSE_TABLE,
    CREATE_SESSION_TABLE,
    CREATE_USER_TOKEN_TABLE,
    CREATE_ACTIVATION_TABLE,
    CREATE_PASSWORD_RESET_TABLE,
)

TRIAL = "TRIAL"


def _normalize_license_for_api(info):
    """Normalize license JSON to flat shape for /userLicenseInfo (Directory/Buyers/Suppliers or legacy)."""
    if not info or not isinstance(info, dict):
        return info
    # New plan shape: Directory.Buyers.Suppliers
    directory = info.get("Directory") or {}
    if isinstance(directory, dict) and "Access" in directory:
        access = directory.get("Access") or "limited"
        info["IsSimsAccess"] = access == "full"
        info["NumberOfRowsPerPeriod"] = directory.get("MaxRows", 10) if access == "limited" else 99999
        info["DirectoryRowsPerSearch"] = directory.get("MaxRowsPerSearch", 5) if access == "limited" else 100
    # Ensure flat keys exist for frontend
    if "IsSimsAccess" not in info:
        info["IsSimsAccess"] = info.get("IsSimsAccess", False)
    if "NumberOfRowsPerPeriod" not in info:
        info["NumberOfRowsPerPeriod"] = info.get("NumberOfRowsPerPeriod", 10)
    if "DirectoryRowsPerSearch" not in info:
        info["DirectoryRowsPerSearch"] = info.get("DirectoryRowsPerSearch", 5)
    return info


def _conninfo(host, port, dbname, user, password):
    return f"host={host} port={port} dbname={dbname} user={user} password={password}"


class PostgresUserRepository(UserRepository):
    def __init__(self, db_user, db_password, db_name, db_host, db_port):
        self.connection_pool = ConnectionPool(
            _conninfo(db_host, db_port, db_name, db_user, db_password),
            min_size=1,
            max_size=10,
        )

    @with_connection(commit=False)
    def get_user_by_email(self, cursor, email):
        cursor.execute(
            "SELECT UserId, HashPassword, activationStatus FROM UserProfile WHERE EmailId = %s",
            (email,),
        )
        record = cursor.fetchone()
        if not record:
            return None
        return {
            "UserId": record[0],
            "HashPassword": record[1],
            "ActivationStatus": record[2],
        }

    @with_connection(commit=False)
    def get_user_by_id(self, cursor, user_id):
        cursor.execute(
            """SELECT UserId, HashPassword, LicenseType, CompanyName, PhoneNumber, gst,
               LicenseValidTill, activationStatus, Name, Role, EmailId
               FROM UserProfile WHERE UserId = %s""",
            (user_id,),
        )
        record = cursor.fetchone()
        if not record:
            return {}
        return {
            "UserId": record[0],
            "HashPassword": record[1],
            "LicenseType": record[2],
            "CompanyName": record[3],
            "PhoneNumber": record[4],
            "Gst": record[5],
            "LicenseValidTill": record[6].replace(tzinfo=timezone.utc) if record[6] else None,
            "ActivationStatus": record[7],
            "Name": record[8],
            "Role": record[9],
            "EmailId": record[10],
        }

    @with_connection(commit=True)
    def get_user_with_license_check(self, cursor, user_id):
        return self.get_user_by_id(user_id)

    @with_connection(commit=True)
    def create_user(self, cursor, user_data):
        cursor.execute(
            """DELETE FROM UserProfile WHERE UserId = %s""",
            (user_data["user_id"],),
        )
        cursor.execute(
            """
            INSERT INTO UserProfile (UserId, EmailId, Name, HashPassword, LogOnTimeStamp, LicenseType,
                PhoneNumber, PhoneNumberCountryCode, CompanyName, gst, activationStatus, LicenseValidTill, Role)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_data["user_id"],
                user_data["email"],
                user_data["name"],
                user_data["hash_password"],
                user_data["logon_timestamp"],
                TRIAL,
                user_data.get("phone_number", ""),
                user_data.get("phone_number_country_code", "+91"),
                user_data.get("company_name"),
                user_data.get("gst"),
                False,
                datetime.max.replace(tzinfo=timezone.utc),
                "USER",
            ),
        )
        activation_code = str(uuid.uuid4())
        expiration_time = datetime.now(timezone.utc) + timedelta(hours=24)
        cursor.execute("DELETE FROM AccountActivation WHERE UserId = %s", (user_data["user_id"],))
        cursor.execute(
            "INSERT INTO AccountActivation (ActivationToken, UserId, ExpirationTime) VALUES (%s, %s, %s)",
            (activation_code, user_data["user_id"], expiration_time),
        )
        return activation_code

    @with_connection(commit=True)
    def create_new_activation_link(self, cursor, user_id):
        activation_code = str(uuid.uuid4())
        expiration_time = datetime.now(timezone.utc) + timedelta(hours=24)
        cursor.execute("DELETE FROM AccountActivation WHERE UserId = %s", (user_id,))
        cursor.execute(
            "INSERT INTO AccountActivation (ActivationToken, UserId, ExpirationTime) VALUES (%s, %s, %s)",
            (activation_code, user_id, expiration_time),
        )
        return activation_code

    @with_connection(commit=False)
    def get_user_if_activation_link_valid(self, cursor, activation_code):
        cursor.execute(
            "SELECT UserId, ExpirationTime FROM AccountActivation WHERE ActivationToken = %s LIMIT 1",
            (activation_code,),
        )
        record = cursor.fetchone()
        if not record:
            return None
        exp = record[1].replace(tzinfo=timezone.utc) if record[1].tzinfo is None else record[1]
        return record[0] if exp > datetime.now(timezone.utc) else None

    @with_connection(commit=True)
    def activate_user(self, cursor, user_id):
        cursor.execute("UPDATE UserProfile SET activationStatus = TRUE WHERE UserId = %s", (user_id,))
        cursor.execute("DELETE FROM AccountActivation WHERE UserId = %s", (user_id,))

    @with_connection(commit=False)
    def user_exists(self, cursor, email, phone_number, phone_number_country_code):
        cursor.execute(
            """SELECT 1 FROM UserProfile WHERE (EmailId = %s OR (PhoneNumber = %s AND PhoneNumberCountryCode = %s)) AND activationStatus = %s""",
            (email, phone_number, phone_number_country_code, True),
        )
        return cursor.fetchone() is not None

    @with_connection(commit=False)
    def get_user_session_from_session_token(self, cursor, session_token):
        cursor.execute(
            "SELECT UserId, ExpirationTime FROM Session WHERE SessionKey = %s",
            (session_token,),
        )
        record = cursor.fetchone()
        if not record:
            return None
        return {
            "user_id": record[0],
            "expiration_time": record[1].replace(tzinfo=timezone.utc) if record[1] and record[1].tzinfo is None else record[1],
        }

    @with_connection(commit=True)
    def create_new_session(self, cursor, user_id, client_id="scm-insights"):
        session_token = str(uuid.uuid4())
        expiration_time = datetime.now(timezone.utc) + timedelta(hours=1)
        cursor.execute(
            """
            INSERT INTO Session (SessionKey, UserId, ExpirationTime, ClientId)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (UserId, ClientId) DO UPDATE SET
                SessionKey = EXCLUDED.SessionKey,
                ExpirationTime = EXCLUDED.ExpirationTime
            """,
            (session_token, user_id, expiration_time, client_id),
        )
        return session_token, expiration_time

    @with_connection(commit=True)
    def delete_session(self, cursor, user_id, client_id="scm-insights"):
        cursor.execute("DELETE FROM Session WHERE UserId = %s AND ClientId = %s", (user_id, client_id))

    @with_connection(commit=False)
    def get_user_by_reset_token(self, cursor, token):
        cursor.execute(
            "SELECT UserId FROM PasswordReset WHERE ResetToken = %s AND ExpirationTime > %s",
            (token, datetime.now(timezone.utc)),
        )
        record = cursor.fetchone()
        return record[0] if record else None

    @with_connection(commit=True)
    def delete_reset_token(self, cursor, token):
        cursor.execute("DELETE FROM PasswordReset WHERE ResetToken = %s", (token,))

    @with_connection(commit=True)
    def update_password(self, cursor, user_id, new_hash_password):
        cursor.execute("UPDATE UserProfile SET HashPassword = %s WHERE UserId = %s", (new_hash_password, user_id))

    @with_connection(commit=True)
    def create_reset_token(self, cursor, user_id):
        reset_token = str(uuid.uuid4())
        expiration_time = datetime.now(timezone.utc) + timedelta(hours=1)
        cursor.execute("DELETE FROM PasswordReset WHERE UserId = %s", (user_id,))
        cursor.execute(
            "INSERT INTO PasswordReset (ResetToken, UserId, ExpirationTime) VALUES (%s, %s, %s)",
            (reset_token, user_id, expiration_time),
        )
        return reset_token

    @with_connection(commit=False)
    def get_license_by_user_id(self, cursor, user_id):
        cursor.execute(
            """SELECT lt.LicenseInfoJson, lt.LicenseType, up.LicenseValidTill
               FROM UserProfile up
               LEFT JOIN License lt ON up.LicenseType = lt.LicenseType
               WHERE up.UserId = %s""",
            (user_id,),
        )
        record = cursor.fetchone()
        if not record or not record[0]:
            return {
                "LicenseType": TRIAL,
                "NumberOfRowsPerPeriod": 10,
                "DirectoryRowsPerSearch": 5,
                "Period": "Month",
                "IsSimsAccess": False,
                "LicenseValidTill": datetime.max.replace(tzinfo=timezone.utc),
            }
        try:
            info = json.loads(record[0]) if isinstance(record[0], str) else record[0]
        except (json.JSONDecodeError, TypeError):
            info = {}
        if not isinstance(info, dict):
            info = {}
        info["LicenseType"] = record[1] or TRIAL
        if record[2]:
            info["LicenseValidTill"] = record[2].replace(tzinfo=timezone.utc) if record[2].tzinfo is None else record[2]
        else:
            info["LicenseValidTill"] = datetime.max.replace(tzinfo=timezone.utc)
        return _normalize_license_for_api(info)

    @with_connection(commit=False)
    def get_tokens(self, cursor, user_id):
        cursor.execute(
            "SELECT UserId, TokensRemaining, StartTime, EndTime FROM UserToken WHERE UserId = %s",
            (user_id,),
        )
        record = cursor.fetchone()
        if not record:
            return None
        return {
            "userId": record[0],
            "tokens": record[1],
            "startTime": record[2].replace(tzinfo=timezone.utc) if record[2] and record[2].tzinfo is None else record[2],
            "endTime": record[3].replace(tzinfo=timezone.utc) if record[3] and record[3].tzinfo is None else record[3],
        }

    @with_connection(commit=True)
    def refresh_tokens(self, cursor, user_id):
        tokens = self.get_tokens(user_id)
        now = datetime.now(timezone.utc)
        if not tokens or tokens["endTime"] < now:
            license_dict = self.get_license_by_user_id(user_id)
            num_rows = license_dict.get("NumberOfRowsPerPeriod", 0)
            end_time = license_dict.get("LicenseValidTill", now + timedelta(days=365))
            if hasattr(end_time, "replace") and end_time.tzinfo is None:
                end_time = end_time.replace(tzinfo=timezone.utc)
            cursor.execute(
                """INSERT INTO UserToken (StartTime, EndTime, TokensRemaining, UserId)
                   VALUES (%s, %s, %s, %s)
                   ON CONFLICT (UserId) DO UPDATE SET
                       StartTime = EXCLUDED.StartTime,
                       EndTime = EXCLUDED.EndTime,
                       TokensRemaining = EXCLUDED.TokensRemaining""",
                (now, end_time, num_rows, user_id),
            )
            tokens_remaining, end_time = num_rows, end_time
        else:
            tokens_remaining = tokens["tokens"]
            end_time = tokens["endTime"]
        return {"userId": user_id, "tokens": tokens_remaining, "endTime": end_time}
