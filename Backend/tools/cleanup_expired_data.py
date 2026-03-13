#!/usr/bin/env python3
"""
cleanup_expired_data.py — DPDP Act §8(7) Data Retention Policy Enforcement
===========================================================================
Run weekly via cron:
    0 2 * * 0  cd /app && python tools/cleanup_expired_data.py >> logs/cleanup.log 2>&1

Retention policy (per COMPLIANCE_ROADMAP_DPDP.md):
  - Sessions:              expired > 7 days ago
  - AccountActivation:     expired > 1 day ago
  - PasswordReset:         expired > 1 day ago
  - ContactMessage:        status=REPLIED and older than 1 year → email anonymized
  - PaymentTransaction:    NO deletion — 7-year retention required by GST/Income Tax Act

Usage:
    python tools/cleanup_expired_data.py [--dry-run]
"""

import os
import sys
import logging
import argparse
from datetime import datetime, timezone

# Allow running from any directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("cleanup")


def get_conn():
    """Return a psycopg3 connection using environment variables."""
    try:
        import psycopg
    except ImportError:
        import psycopg2 as psycopg  # type: ignore
    from dotenv import load_dotenv
    load_dotenv()
    return psycopg.connect(
        host=os.environ["POSTGRES_HOST"],
        port=os.environ.get("POSTGRES_PORT", "5432"),
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
    )


def run(dry_run: bool = False) -> None:
    # REL-06 FIX: Track per-operation counts and emit a structured CLEANUP_SUMMARY
    # line at the end so log-monitoring tools (e.g. grep/CloudWatch) can detect
    # silent failures or unexpectedly large purges without reading the full log.
    summary: dict = {}
    mode = "[DRY RUN] " if dry_run else ""
    logger.info("=== %sSCM Insights data cleanup started ===", mode)
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # 1. Expired sessions (older than 7 days past expiry)
            cur.execute(
                "SELECT COUNT(*) FROM Session WHERE ExpirationTime < NOW() - INTERVAL '7 days'"
            )
            count = cur.fetchone()[0]
            summary["sessions_deleted"] = count
            logger.info("%sExpired sessions to delete: %d", mode, count)
            if not dry_run:
                cur.execute(
                    "DELETE FROM Session WHERE ExpirationTime < NOW() - INTERVAL '7 days'"
                )

            # 2. AccountActivation tokens expired > 1 day
            cur.execute(
                "SELECT COUNT(*) FROM AccountActivation WHERE ExpirationTime < NOW() - INTERVAL '1 day'"
            )
            count = cur.fetchone()[0]
            summary["activation_tokens_deleted"] = count
            logger.info("%sExpired activation tokens to delete: %d", mode, count)
            if not dry_run:
                cur.execute(
                    "DELETE FROM AccountActivation WHERE ExpirationTime < NOW() - INTERVAL '1 day'"
                )

            # 3. PasswordReset tokens expired > 1 day
            cur.execute(
                "SELECT COUNT(*) FROM PasswordReset WHERE ExpirationTime < NOW() - INTERVAL '1 day'"
            )
            count = cur.fetchone()[0]
            summary["reset_tokens_deleted"] = count
            logger.info("%sExpired password reset tokens to delete: %d", mode, count)
            if not dry_run:
                cur.execute(
                    "DELETE FROM PasswordReset WHERE ExpirationTime < NOW() - INTERVAL '1 day'"
                )

            # 4. Anonymize old ContactMessage (REPLIED, older than 1 year)
            cur.execute(
                """SELECT COUNT(*) FROM ContactMessage
                   WHERE Status = 'REPLIED'
                     AND CreatedTime < NOW() - INTERVAL '1 year'
                     AND Email != 'anon@deleted.invalid'"""
            )
            count = cur.fetchone()[0]
            summary["contacts_anonymized"] = count
            logger.info("%sOld replied contacts to anonymize: %d", mode, count)
            if not dry_run:
                cur.execute(
                    """UPDATE ContactMessage
                       SET Email = 'anon@deleted.invalid',
                           PhoneNumber = '',
                           Name = 'Anonymized'
                       WHERE Status = 'REPLIED'
                         AND CreatedTime < NOW() - INTERVAL '1 year'
                         AND Email != 'anon@deleted.invalid'"""
                )

            # 5. Intentionally NOT deleting PaymentTransaction —
            #    7-year retention required by Income Tax Act §54 / GST Act
            logger.info("PaymentTransaction: skipped (7-year GST/tax retention policy)")

            # 6. Execute scheduled account deletions (30-day cooling-off expired)
            #    Anonymize payment records first, then delete UserProfile (CASCADE handles rest)
            cur.execute(
                """SELECT UserId FROM UserProfile
                   WHERE DeletionScheduledAt IS NOT NULL
                     AND DeletionScheduledAt < NOW()"""
            )
            pending = [row[0] for row in cur.fetchall()]
            summary["accounts_deleted"] = len(pending)
            logger.info("%sScheduled account deletions to execute: %d", mode, len(pending))
            if not dry_run and pending:
                # Anonymize payment records (GST 7-year retention — keep financial data, strip PII)
                cur.execute(
                    """UPDATE PaymentTransaction
                       SET EmailId = 'anon@deleted.invalid',
                           MetadataJson = NULL
                       WHERE UserId = ANY(%s)""",
                    (pending,),
                )
                # Delete user accounts (CASCADE removes sessions, tokens, activation rows)
                cur.execute(
                    "DELETE FROM UserProfile WHERE UserId = ANY(%s)",
                    (pending,),
                )
                logger.info("Deleted %d accounts with expired cooling-off period.", len(pending))

        if not dry_run:
            conn.commit()
            logger.info("All cleanup operations committed.")
        else:
            conn.rollback()
            logger.info("[DRY RUN] No changes committed.")
    except Exception as e:
        conn.rollback()
        # REL-06: Emit a structured CLEANUP_SUMMARY=FAILED line so log monitors can alert on it.
        logger.error("CLEANUP_SUMMARY status=FAILED error=%s", type(e).__name__, exc_info=True)
        sys.exit(1)
    finally:
        conn.close()

    # REL-06 FIX: Emit a single structured summary line — easy to grep/alert on.
    logger.info(
        "CLEANUP_SUMMARY status=OK dry_run=%s sessions=%d activations=%d resets=%d contacts=%d accounts=%d ts=%s",
        dry_run,
        summary.get("sessions_deleted", 0),
        summary.get("activation_tokens_deleted", 0),
        summary.get("reset_tokens_deleted", 0),
        summary.get("contacts_anonymized", 0),
        summary.get("accounts_deleted", 0),
        datetime.now(timezone.utc).isoformat(),
    )
    logger.info("=== Cleanup complete: %s ===", datetime.now(timezone.utc).isoformat())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SCM Insights data retention cleanup")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be deleted without making changes",
    )
    args = parser.parse_args()
    run(dry_run=args.dry_run)
