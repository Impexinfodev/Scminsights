# SCM-INSIGHTS User Repository (PostgreSQL) - psycopg3
from datetime import datetime, timedelta, timezone
import uuid
import secrets
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
    USER_PROFILE_DPDP_ALTER_STATEMENTS,
    USER_PROFILE_LOCKOUT_ALTER_STATEMENTS,
)

TRIAL = "TRIAL"
# SEC-04: lock account for this many minutes after MAX_FAILED_ATTEMPTS bad logins
_MAX_FAILED_ATTEMPTS = 5
_LOCKOUT_MINUTES = 15


def _normalize_license_for_api(info):
    """Normalize license JSON to flat shape for /userLicenseInfo and plan-based access checks."""
    if not info or not isinstance(info, dict):
        return info
    # Directory
    directory = info.get("Directory") or {}
    if isinstance(directory, dict) and directory.get("Access") is not None:
        access = directory.get("Access") or "limited"
        info["IsSimsAccess"] = access == "full"
        info["NumberOfRowsPerPeriod"] = directory.get("MaxRows", 10) if access == "limited" else 99999
        info["DirectoryRowsPerSearch"] = directory.get("MaxRowsPerSearch", 5) if access == "limited" else 100
    if "IsSimsAccess" not in info:
        info["IsSimsAccess"] = info.get("IsSimsAccess", False)
    if "NumberOfRowsPerPeriod" not in info:
        info["NumberOfRowsPerPeriod"] = info.get("NumberOfRowsPerPeriod", 10)
    if "DirectoryRowsPerSearch" not in info:
        info["DirectoryRowsPerSearch"] = info.get("DirectoryRowsPerSearch", 5)
    # Buyers / Suppliers (trade API access)
    for key, sub in (("Buyers", "Buyers"), ("Suppliers", "Suppliers")):
        sub_info = info.get(key) or {}
        if not isinstance(sub_info, dict):
            sub_info = {}
        acc = sub_info.get("Access") or "custom"
        searches = sub_info.get("MaxSearchesPerPeriod")
        rows = sub_info.get("MaxRowsPerSearch")
        if acc == "full":
            info[f"{key}Access"] = "full"
            info[f"{key}SearchesPerPeriod"] = 99999
            info[f"{key}RowsPerSearch"] = 100
        elif (searches or 0) > 0 or (rows or 0) > 0:
            info[f"{key}Access"] = "limited"
            info[f"{key}SearchesPerPeriod"] = int(searches) if searches is not None else 5
            info[f"{key}RowsPerSearch"] = int(rows) if rows is not None else 5
        else:
            info[f"{key}Access"] = "none"
            info[f"{key}SearchesPerPeriod"] = 0
            info[f"{key}RowsPerSearch"] = 0
    # HsCode (HS Code search / descriptions)
    hscode = info.get("HsCode") or {}
    if not isinstance(hscode, dict):
        hscode = {}
    acc = hscode.get("Access") or "full"
    max_rows = int(hscode.get("MaxRows") or 99999)
    rows_per_search = int(hscode.get("MaxRowsPerSearch") or 100)
    if acc == "full":
        info["HsCodeAccess"] = "full"
        info["HsCodeMaxRows"] = 99999
        info["HsCodeMaxRowsPerSearch"] = 100
    elif acc == "limited":
        info["HsCodeAccess"] = "limited"
        info["HsCodeMaxRows"] = max(0, max_rows)
        info["HsCodeMaxRowsPerSearch"] = min(100, max(0, rows_per_search))
    else:
        info["HsCodeAccess"] = "none"
        info["HsCodeMaxRows"] = 0
        info["HsCodeMaxRowsPerSearch"] = 0
    return info


def _conninfo(host, port, dbname, user, password):
    return f"host={host} port={port} dbname={dbname} user={user} password={password}"


class PostgresUserRepository(UserRepository):
    def __init__(self, pool=None, db_user=None, db_password=None, db_name=None, db_host=None, db_port=None):
        # ARCH-03 FIX: Accept a shared pool from RepoProvider. If one is not
        # provided (e.g. direct instantiation in tests/tools), fall back to
        # creating a local pool from the individual credentials.
        if pool is not None:
            self.connection_pool = pool
        else:
            self.connection_pool = ConnectionPool(
                _conninfo(db_host, db_port, db_name, db_user, db_password),
                min_size=1,
                max_size=10,
                check=ConnectionPool.check_connection,
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

    def get_user_with_license_check(self, user_id):
        """ARCH-01 FIX: Plain delegation — no @with_connection wrapper.
        The old wrapper opened a second pool connection while get_user_by_id
        already opens its own, exhausting pool slots on every login."""
        return self.get_user_by_id(user_id)

    @with_connection(commit=True)
    def create_user(self, cursor, user_data):
        # ARCH-07 FIX: Replaced DELETE+INSERT with a single atomic upsert so that
        # a concurrent duplicate signup cannot slip through the gap between the two statements.
        cursor.execute(
            """
            INSERT INTO UserProfile (UserId, EmailId, Name, HashPassword, LogOnTimeStamp, LicenseType,
                PhoneNumber, PhoneNumberCountryCode, CompanyName, gst, activationStatus, LicenseValidTill, Role)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (UserId) DO UPDATE SET
                EmailId = EXCLUDED.EmailId,
                Name = EXCLUDED.Name,
                HashPassword = EXCLUDED.HashPassword,
                LogOnTimeStamp = EXCLUDED.LogOnTimeStamp,
                LicenseType = EXCLUDED.LicenseType,
                PhoneNumber = EXCLUDED.PhoneNumber,
                PhoneNumberCountryCode = EXCLUDED.PhoneNumberCountryCode,
                CompanyName = EXCLUDED.CompanyName,
                gst = EXCLUDED.gst,
                activationStatus = EXCLUDED.activationStatus,
                LicenseValidTill = EXCLUDED.LicenseValidTill,
                Role = EXCLUDED.Role
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
        # SEC-05: Use secrets.token_urlsafe(32) for 256-bit cryptographically secure tokens
        activation_code = secrets.token_urlsafe(32)
        expiration_time = datetime.now(timezone.utc) + timedelta(hours=24)
        # ARCH-07 FIX: Atomic upsert for AccountActivation as well.
        cursor.execute(
            """
            INSERT INTO AccountActivation (ActivationToken, UserId, ExpirationTime)
            VALUES (%s, %s, %s)
            ON CONFLICT (UserId) DO UPDATE SET
                ActivationToken = EXCLUDED.ActivationToken,
                ExpirationTime = EXCLUDED.ExpirationTime
            """,
            (activation_code, user_data["user_id"], expiration_time),
        )
        return activation_code

    @with_connection(commit=True)
    def create_new_activation_link(self, cursor, user_id):
        # SEC-05: Use secrets.token_urlsafe(32) for 256-bit cryptographically secure tokens
        activation_code = secrets.token_urlsafe(32)
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

    @with_connection(commit=True)
    def delete_all_sessions(self, cursor, user_id):
        """SEC-03: Delete ALL sessions for a user (used on password reset to revoke any active tokens)."""
        cursor.execute("DELETE FROM Session WHERE UserId = %s", (user_id,))

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
        # SEC-05: Use secrets.token_urlsafe(32) for 256-bit cryptographically secure tokens
        reset_token = secrets.token_urlsafe(32)
        expiration_time = datetime.now(timezone.utc) + timedelta(hours=1)
        cursor.execute("DELETE FROM PasswordReset WHERE UserId = %s", (user_id,))
        cursor.execute(
            "INSERT INTO PasswordReset (ResetToken, UserId, ExpirationTime) VALUES (%s, %s, %s)",
            (reset_token, user_id, expiration_time),
        )
        return reset_token

    @with_connection(commit=False)
    def get_license_by_user_id(self, cursor, user_id):
        # Fetch all active licenses from UserLicense table
        cursor.execute(
            """SELECT lt.LicenseInfoJson, lt.LicenseType, ul.ValidTill
               FROM UserLicense ul
               JOIN License lt ON ul.LicenseType = lt.LicenseType
               WHERE ul.UserId = %s AND ul.ValidTill > NOW()
               ORDER BY CASE ul.LicenseType
                   WHEN 'BUNDLE'    THEN 1
                   WHEN 'TRADE'     THEN 2
                   WHEN 'DIRECTORY' THEN 3
                   ELSE 4
               END""",
            (user_id,),
        )
        rows = cursor.fetchall()

        if not rows:
            # No paid plans — return TRIAL defaults
            return {
                "LicenseType": TRIAL,
                "OwnedLicenses": [],
                "NumberOfRowsPerPeriod": 10,
                "DirectoryRowsPerSearch": 5,
                "Period": "Month",
                "IsSimsAccess": False,
                "LicenseValidTill": datetime.max.replace(tzinfo=timezone.utc),
            }

        # Merge all owned plans: take best (most permissive) access per feature
        merged = {}
        owned_types = []
        latest_valid_till = None
        for row in rows:
            try:
                info = json.loads(row[0]) if isinstance(row[0], str) else row[0]
            except (json.JSONDecodeError, TypeError):
                info = {}
            if not isinstance(info, dict):
                continue
            lic_type = row[1]
            valid_till = row[2]
            owned_types.append(lic_type)
            if valid_till:
                vt = valid_till.replace(tzinfo=timezone.utc) if valid_till.tzinfo is None else valid_till
                if latest_valid_till is None or vt > latest_valid_till:
                    latest_valid_till = vt
            # Merge: first row wins for top-level keys (highest-ranked plan first)
            for k, v in info.items():
                if k not in merged:
                    merged[k] = v
            # For sub-feature dicts, take best access level
            for feature in ("Directory", "Buyers", "Suppliers", "HsCode"):
                existing = merged.get(feature) or {}
                incoming = info.get(feature) or {}
                if not isinstance(existing, dict):
                    existing = {}
                if not isinstance(incoming, dict):
                    incoming = {}
                merged_feature = dict(existing)
                # "full" > "limited" > "custom" > "none"
                ACCESS_RANK = {"full": 3, "limited": 2, "custom": 1, "none": 0}
                ex_acc = ACCESS_RANK.get(existing.get("Access", "none"), 0)
                in_acc = ACCESS_RANK.get(incoming.get("Access", "none"), 0)
                if in_acc > ex_acc:
                    merged_feature = dict(incoming)
                elif in_acc == ex_acc and in_acc > 0:
                    # Same tier: take max of numeric limits
                    for num_key in ("MaxRows", "MaxRowsPerSearch", "MaxSearchesPerPeriod"):
                        ex_val = existing.get(num_key) or 0
                        in_val = incoming.get(num_key) or 0
                        merged_feature[num_key] = max(ex_val, in_val)
                merged[feature] = merged_feature

        # Determine display LicenseType: highest-ranked plan
        TYPE_RANK = {"BUNDLE": 4, "TRADE": 3, "DIRECTORY": 2, "TRIAL": 1}
        display_type = max(owned_types, key=lambda t: TYPE_RANK.get(t, 0), default=TRIAL)
        merged["LicenseType"] = display_type
        merged["OwnedLicenses"] = owned_types
        merged["LicenseValidTill"] = latest_valid_till or datetime.max.replace(tzinfo=timezone.utc)
        return _normalize_license_for_api(merged)

    # SEC-07 FIX: Column names are whitelisted via an explicit allowlist mapping to prevent
    # any future contributor from accidentally passing user-controlled column names into SQL.
    _PROFILE_COLUMN_ALLOWLIST = {
        "name": "Name",
        "company_name": "CompanyName",
        "phone_number": "PhoneNumber",
        "phone_country_code": "PhoneNumberCountryCode",
        "gst": "gst",
    }

    @with_connection(commit=True)
    def update_profile(self, cursor, user_id, name=None, company_name=None, phone_number=None, phone_country_code=None, gst=None):
        updates = {
            "name": name,
            "company_name": company_name,
            "phone_number": phone_number,
            "phone_country_code": phone_country_code,
            "gst": gst if gst else None,
        }
        # Only include keys that were explicitly provided (not None)
        provided = {k: v for k, v in updates.items() if v is not None or k == "gst" and gst is not None}
        # Rebuild: skip truly absent fields
        set_clauses = []
        values = []
        for param_key, db_col in self._PROFILE_COLUMN_ALLOWLIST.items():
            if param_key in provided:
                # Only include if the caller passed a value (exclude keys not in kwargs)
                pass
        # Simpler: iterate the local dict directly
        set_clauses = []
        values = []
        if name is not None:
            set_clauses.append("Name = %s"); values.append(name)
        if company_name is not None:
            set_clauses.append("CompanyName = %s"); values.append(company_name)
        if phone_number is not None:
            set_clauses.append("PhoneNumber = %s"); values.append(phone_number)
        if phone_country_code is not None:
            set_clauses.append("PhoneNumberCountryCode = %s"); values.append(phone_country_code)
        if gst is not None:
            set_clauses.append("gst = %s"); values.append(gst if gst else None)
        if not set_clauses:
            return False
        # All column names come from the hardcoded set_clauses list above — never from user input.
        sql = "UPDATE UserProfile SET " + ", ".join(set_clauses) + " WHERE UserId = %s"
        values.append(user_id)
        cursor.execute(sql, values)
        return True

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

    # ── DPDP Act 2023 compliance ────────────────────────────────────────────

    @with_connection(commit=True)
    def record_consent(self, cursor, user_id: str, consent_version: str = "v1.0") -> None:
        """Store the timestamp at which the user gave DPDP consent."""
        cursor.execute(
            """UPDATE UserProfile
               SET ConsentGivenAt = NOW() AT TIME ZONE 'UTC',
                   ConsentVersion = %s
               WHERE UserId = %s""",
            (consent_version, user_id),
        )

    @with_connection(commit=False)
    def get_user_payment_history(self, cursor, user_id: str) -> list:
        """Return payment records for a user — used in data export."""
        cursor.execute(
            """SELECT RazorpayOrderId, LicenseType, AmountPaise, Currency,
                      Status, CreatedAt, UpdatedAt, InvoiceNumber
               FROM PaymentTransaction
               WHERE UserId = %s
               ORDER BY CreatedAt DESC""",
            (user_id,),
        )
        rows = cursor.fetchall()
        result = []
        for r in rows:
            result.append({
                "order_id": r[0],
                "plan": r[1],
                "amount_inr": round((r[2] or 0) / 100, 2),
                "currency": r[3],
                "status": r[4],
                "date": r[5].isoformat() if r[5] else None,
                "updated": r[6].isoformat() if r[6] else None,
                "invoice_number": r[7],
            })
        return result

    @with_connection(commit=True)
    def apply_user_profile_alters(self, cursor) -> None:
        """Apply idempotent ALTER TABLE statements for UserProfile (DPDP columns etc.)."""
        for stmt in USER_PROFILE_DPDP_ALTER_STATEMENTS:
            try:
                cursor.execute(stmt)
            except Exception:
                pass

    @with_connection(commit=True)
    def apply_lockout_alters(self, cursor) -> None:
        """SEC-04: Apply idempotent ALTER TABLE statements for per-account login lockout columns."""
        for stmt in USER_PROFILE_LOCKOUT_ALTER_STATEMENTS:
            try:
                cursor.execute(stmt)
            except Exception:
                pass

    @with_connection(commit=False)
    def get_login_lockout_status(self, cursor, user_id: str) -> dict:
        """SEC-04: Return failed attempt count and lockout expiry for the given user."""
        cursor.execute(
            "SELECT FailedLoginAttempts, LockedUntil FROM UserProfile WHERE UserId = %s",
            (user_id,),
        )
        row = cursor.fetchone()
        if not row:
            return {"attempts": 0, "locked_until": None}
        locked_until = row[1]
        if locked_until and locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        return {"attempts": row[0] or 0, "locked_until": locked_until}

    @with_connection(commit=True)
    def record_failed_login(self, cursor, user_id: str) -> dict:
        """SEC-04: Increment failed login counter; lock account after MAX_FAILED_ATTEMPTS."""
        cursor.execute(
            """UPDATE UserProfile
               SET FailedLoginAttempts = COALESCE(FailedLoginAttempts, 0) + 1,
                   LockedUntil = CASE
                       WHEN COALESCE(FailedLoginAttempts, 0) + 1 >= %s
                       THEN NOW() AT TIME ZONE 'UTC' + INTERVAL '15 minutes'
                       ELSE LockedUntil
                   END
               WHERE UserId = %s
               RETURNING FailedLoginAttempts, LockedUntil""",
            (_MAX_FAILED_ATTEMPTS, user_id),
        )
        row = cursor.fetchone()
        if not row:
            return {"attempts": 1, "locked_until": None}
        locked_until = row[1]
        if locked_until and locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        return {"attempts": row[0] or 1, "locked_until": locked_until}

    @with_connection(commit=True)
    def reset_failed_login(self, cursor, user_id: str) -> None:
        """SEC-04: Reset failed login counter and clear lockout on successful authentication."""
        cursor.execute(
            "UPDATE UserProfile SET FailedLoginAttempts = 0, LockedUntil = NULL WHERE UserId = %s",
            (user_id,),
        )

    @with_connection(commit=True)
    def schedule_account_deletion(self, cursor, user_id: str) -> str:
        """
        DPDP §12 — Schedule deletion 30 days from now.
        Returns the scheduled deletion ISO timestamp.
        """
        cursor.execute(
            """UPDATE UserProfile
               SET DeletionScheduledAt = NOW() AT TIME ZONE 'UTC' + INTERVAL '30 days'
               WHERE UserId = %s
               RETURNING DeletionScheduledAt""",
            (user_id,),
        )
        row = cursor.fetchone()
        ts = row[0] if row else None
        return ts.isoformat() if ts and hasattr(ts, "isoformat") else str(ts)

    @with_connection(commit=True)
    def cancel_account_deletion(self, cursor, user_id: str) -> None:
        """Cancel a previously scheduled deletion."""
        cursor.execute(
            "UPDATE UserProfile SET DeletionScheduledAt = NULL WHERE UserId = %s",
            (user_id,),
        )

    @with_connection(commit=False)
    def get_deletion_scheduled_at(self, cursor, user_id: str):
        """Return DeletionScheduledAt timestamp for a user, or None."""
        cursor.execute(
            "SELECT DeletionScheduledAt FROM UserProfile WHERE UserId = %s",
            (user_id,),
        )
        row = cursor.fetchone()
        if not row or row[0] is None:
            return None
        ts = row[0]
        return ts.isoformat() if hasattr(ts, "isoformat") else str(ts)

    @with_connection(commit=True)
    def delete_user_account(self, cursor, user_id: str) -> None:
        """
        DPDP §12 — Right to Erasure.
        Steps:
          1. Anonymize PaymentTransaction (keep for 7 years, GST Act compliance)
          2. Delete Session, UserToken, AccountActivation, PasswordReset
          3. Delete UserProfile (cascades Session, UserToken via FK)
        """
        import hashlib
        anon_hash = hashlib.sha256(user_id.encode()).hexdigest()[:16]
        anon_user = f"DELETED_{anon_hash}"
        anon_email = f"deleted_{anon_hash}@anon.invalid"
        # Anonymize payment records — must retain for tax compliance
        cursor.execute(
            """UPDATE PaymentTransaction
               SET UserId = %s, EmailId = %s
               WHERE UserId = %s""",
            (anon_user, anon_email, user_id),
        )
        # Delete tokens and activation records
        cursor.execute("DELETE FROM AccountActivation WHERE UserId = %s", (user_id,))
        cursor.execute("DELETE FROM PasswordReset WHERE UserId = %s", (user_id,))
        cursor.execute("DELETE FROM UserToken WHERE UserId = %s", (user_id,))
        cursor.execute("DELETE FROM Session WHERE UserId = %s", (user_id,))
        # Delete the user — FK cascade handles remaining child rows
        cursor.execute("DELETE FROM UserProfile WHERE UserId = %s", (user_id,))
