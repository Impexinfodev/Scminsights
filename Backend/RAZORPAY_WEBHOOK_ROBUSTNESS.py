"""
RAZORPAY_WEBHOOK_ROBUSTNESS.py
==============================
Audit report and hardened implementation reference for payment_controller.py.

AUDIT DATE: March 2026
FILE REVIEWED: Backend/controllers/payment_controller.py

=============================================================================
SECTION 1: AUDIT FINDINGS — payment_controller.py
=============================================================================

FINDING 1 — hmac.new() is not a standard function (BUG — CRITICAL):
  Line 78:  expected = hmac.new(...)
  Line 182: expected = hmac.new(...)
  STATUS: hmac.new() does NOT exist in Python's stdlib `hmac` module.
  The correct function is hmac.new() — wait, actually in Python:
    - `hmac.HMAC(key, msg, digestmod)` is the constructor
    - `hmac.new(key, msg, digestmod)` IS valid (it is an alias in Python 3)
  CORRECTION: Python's `hmac.new()` is indeed valid. No bug here.
  Both `hmac.new(key, msg, digestmod)` and `hmac.HMAC(key, msg, digestmod)` work.
  The digests are correct (SHA-256, compare_digest for timing-safe comparison).
  VERDICT: Signature verification is correctly implemented. ✅

FINDING 2 — No dedicated webhook event log table:
  Currently all webhook events are written to application logs (rotating file).
  Log rotation means old webhook events disappear after 7 * 10MB = 70MB of logs.
  For audit / reconciliation purposes (DPDP, GST, disputes), webhook events
  should persist in the database for at least 7 years (financial record retention).
  STATUS: Missing — recommend adding WebhookEvent table.

FINDING 3 — No GST invoice triggered on payment.captured webhook:
  The webhook correctly assigns the license but does NOT:
  - Generate a GST invoice
  - Email the invoice to the user
  - Store an InvoiceNumber in PaymentTransaction
  This is a GST compliance gap (Section 3 of COMPLIANCE_ROADMAP_DPDP.md).
  STATUS: Missing.

FINDING 4 — License assignment on both /verify AND webhook (double-assign risk):
  The /verify endpoint assigns the license on successful payment.
  The webhook ALSO assigns the license on payment.captured.
  If both fire (normal Razorpay flow), assign_license() is called twice.
  The webhook checks `if txn.get("Status") != "captured"` before assigning,
  so if /verify ran first (Status already "captured"), the webhook skips.
  VERDICT: Idempotency is correctly handled. ✅

FINDING 5 — Email ID on create-order uses getattr(request, "user", {}).get("EmailId"):
  Line 122: email_id = getattr(request, "user", {}).get("EmailId") or request.user_id
  The `request.user` attribute is set by auth_middleware.py. If the middleware does
  not set `request.user` as a dict (only sets `request.user_id`), this falls back
  to request.user_id (a UUID), not an email. The PaymentTransaction.EmailId would
  store a UUID string instead of an actual email — breaking GST invoice generation
  and admin reporting.
  STATUS: Verify that auth_middleware.py sets `request.user` as a dict with EmailId.
  If not, fetch the email from the repository instead.

FINDING 6 — No retry / dead letter queue for failed webhook processing:
  If admin_repo.assign_license() raises an exception inside the webhook handler,
  the exception is not caught — Flask will return a 500, and Razorpay will retry
  the webhook up to a configured number of times. The retry is handled by Razorpay
  (it retries on 4xx/5xx for several hours). This is acceptable, but there is no
  internal tracking of "webhook received but failed to process."
  STATUS: Acceptable for current scale. Add monitoring alert if needed.

FINDING 7 — No Razorpay IP allowlisting:
  The webhook endpoint accepts POST from any IP address. Razorpay publishes a list
  of its webhook IPs. Adding an IP allowlist provides defense-in-depth.
  Razorpay IPs (as of 2024): 34.212.157.152/32, 52.25.90.188/32, etc.
  STATUS: Enhancement — not critical since HMAC signature is the primary guard.

=============================================================================
SECTION 2: RECOMMENDED DATABASE ADDITION — WebhookEvent table
=============================================================================
"""

# Add this to Backend/modules/db/postgres_models.py:

CREATE_WEBHOOK_EVENT_TABLE = """
CREATE TABLE IF NOT EXISTS WebhookEvent (
    Id          SERIAL PRIMARY KEY,
    EventId     VARCHAR(255),                         -- Razorpay event ID (from payload.id)
    Event       VARCHAR(100) NOT NULL,                -- payment.captured, payment.failed, etc.
    OrderId     VARCHAR(255),                         -- Razorpay order_id from entity
    PaymentId   VARCHAR(255),                         -- Razorpay payment_id from entity
    Status      VARCHAR(50) NOT NULL DEFAULT 'received',  -- received | processed | failed | ignored
    RawPayload  TEXT,                                 -- Full JSON for audit/replay
    ProcessedAt TIMESTAMPTZ,
    ErrorMsg    TEXT,
    CreatedAt   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""

WEBHOOK_EVENT_INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_webhook_event_type ON WebhookEvent (Event);",
    "CREATE INDEX IF NOT EXISTS idx_webhook_order_id ON WebhookEvent (OrderId);",
    "CREATE INDEX IF NOT EXISTS idx_webhook_created ON WebhookEvent (CreatedAt DESC);",
    # Partial index for unprocessed events (for monitoring/alerting)
    "CREATE INDEX IF NOT EXISTS idx_webhook_pending ON WebhookEvent (CreatedAt) WHERE Status = 'received';",
]


# =============================================================================
# SECTION 3: HARDENED WEBHOOK HANDLER (drop-in for payment_controller.py)
# =============================================================================
#
# Key improvements over current implementation:
#   1. Logs every webhook event to WebhookEvent table (audit trail)
#   2. Catches assign_license() exceptions and stores error in DB
#   3. Handles EmailId correctly from PaymentTransaction (not from request.user)
#   4. Structured logging for monitoring/alerting
#   5. Skips unknown events gracefully with "ignored" status in DB
#
# This is reference code — integrate by merging into payment_controller.py.
# =============================================================================

import json
import logging
import hmac
import hashlib
from flask import Blueprint, request, jsonify

logger = logging.getLogger(__name__)


def _log_webhook_event(
    admin_repo,
    event: str,
    order_id: str,
    payment_id: str,
    raw_payload: str,
    status: str = "received",
    error_msg: str = None,
):
    """Persist webhook event to WebhookEvent table for audit trail."""
    try:
        # admin_repo needs a new method: insert_webhook_event()
        # See Section 4 for the repository method signature.
        admin_repo.insert_webhook_event(
            event=event,
            order_id=order_id,
            payment_id=payment_id,
            raw_payload=raw_payload,
            status=status,
            error_msg=error_msg,
        )
    except Exception as log_err:
        # Do not let logging failure break the webhook response
        logger.error("WebhookEvent logging failed: %s", log_err)


def _verify_webhook_signature_v2(body: bytes, signature: str, secret: str) -> bool:
    """
    Verify Razorpay webhook HMAC-SHA256 signature.
    Uses timing-safe comparison (hmac.compare_digest) to prevent timing attacks.
    Returns False if secret is empty (misconfiguration protection).
    """
    if not secret or not signature:
        logger.error("Webhook: RAZORPAY_WEBHOOK_SECRET not configured or signature missing")
        return False
    expected = hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature.strip())


def _get_payment_entity(payload: dict) -> dict:
    """Extract payment entity from Razorpay webhook payload."""
    p = payload.get("payload") or {}
    entity = (p.get("payment") or {}).get("entity") or p.get("entity") or {}
    return entity if isinstance(entity, dict) else {}


def webhook_hardened():
    """
    Hardened Razorpay webhook endpoint.

    Changes vs current implementation:
    - Logs every event to WebhookEvent table
    - Structured exception handling per event type
    - Email for invoice is sourced from PaymentTransaction, not request.user
    """
    from config import RAZORPAY_WEBHOOK_SECRET
    from repositories.repo_provider import RepoProvider

    raw_body = request.get_data()
    signature = (request.headers.get("X-Razorpay-Signature") or "").strip()

    if not raw_body:
        logger.warning("Webhook: empty body")
        return jsonify({"error": "Empty body"}), 400

    if not _verify_webhook_signature_v2(raw_body, signature, RAZORPAY_WEBHOOK_SECRET):
        logger.warning("Webhook: invalid HMAC signature — possible spoofed request from IP=%s",
                       request.remote_addr)
        return jsonify({"error": "Invalid signature"}), 400

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except (ValueError, TypeError, UnicodeDecodeError) as e:
        logger.warning("Webhook: invalid JSON: %s", e)
        return jsonify({"error": "Invalid JSON"}), 400

    event = (payload.get("event") or "").strip()
    event_id = (payload.get("id") or "")
    if not event:
        return jsonify({"error": "Missing event"}), 400

    entity = _get_payment_entity(payload)
    order_id = (entity.get("order_id") or "").strip()
    payment_id = (entity.get("id") or "").strip()
    raw_payload_str = raw_body.decode("utf-8", errors="replace")

    admin_repo = RepoProvider.get_admin_repo()

    # -----------------------------------------------------------------------
    # payment.captured
    # -----------------------------------------------------------------------
    if event == "payment.captured":
        if not order_id:
            logger.warning("Webhook payment.captured: no order_id in payload event_id=%s", event_id)
            _log_webhook_event(admin_repo, event, order_id, payment_id,
                               raw_payload_str, status="ignored",
                               error_msg="no order_id in payload")
            return jsonify({"ok": True}), 200

        txn = admin_repo.get_transaction_by_order_id(order_id)
        if not txn:
            logger.warning("Webhook payment.captured: unknown order_id=%s", order_id)
            _log_webhook_event(admin_repo, event, order_id, payment_id,
                               raw_payload_str, status="ignored",
                               error_msg="order not found in DB")
            return jsonify({"ok": True}), 200

        if txn.get("Status") == "captured":
            # Already processed — idempotent, acknowledge Razorpay
            logger.info("Webhook payment.captured: already captured order=%s", order_id)
            _log_webhook_event(admin_repo, event, order_id, payment_id,
                               raw_payload_str, status="ignored",
                               error_msg="already captured (idempotent)")
            return jsonify({"ok": True}), 200

        # Update status
        try:
            admin_repo.update_payment_transaction(
                razorpay_order_id=order_id,
                razorpay_payment_id=payment_id,
                status="captured",
                metadata_json={"verified_by": "webhook", "event": event, "event_id": event_id},
            )
        except Exception as db_err:
            logger.exception("Webhook: update_payment_transaction failed order=%s: %s", order_id, db_err)
            _log_webhook_event(admin_repo, event, order_id, payment_id,
                               raw_payload_str, status="failed",
                               error_msg=f"update_payment_transaction: {db_err}")
            return jsonify({"error": "DB update failed"}), 500

        # Assign license
        user_id = txn.get("UserId")
        license_type = txn.get("LicenseType")
        # FIX FINDING 5: Use email from PaymentTransaction, not request.user
        user_email = txn.get("EmailId") or ""

        if user_id and license_type:
            try:
                admin_repo.assign_license(user_id, license_type)
                logger.info(
                    "Webhook: payment captured order=%s user=%s email=%s plan=%s",
                    order_id, user_id, user_email, license_type
                )
            except Exception as license_err:
                logger.exception("Webhook: assign_license failed order=%s user=%s: %s",
                                 order_id, user_id, license_err)
                _log_webhook_event(admin_repo, event, order_id, payment_id,
                                   raw_payload_str, status="failed",
                                   error_msg=f"assign_license: {license_err}")
                # Return 500 so Razorpay retries — do NOT return 200 on license failure
                return jsonify({"error": "License assignment failed"}), 500

            # TODO (Phase 3 — GST Compliance): Generate and email invoice here
            # invoice_number = generate_gst_invoice(txn, user_email)
            # send_invoice_email(user_email, invoice_number, txn)

        _log_webhook_event(admin_repo, event, order_id, payment_id,
                           raw_payload_str, status="processed")
        return jsonify({"ok": True}), 200

    # -----------------------------------------------------------------------
    # payment.failed
    # -----------------------------------------------------------------------
    if event == "payment.failed":
        if not order_id:
            _log_webhook_event(admin_repo, event, order_id, payment_id,
                               raw_payload_str, status="ignored",
                               error_msg="no order_id in payload")
            return jsonify({"ok": True}), 200

        txn = admin_repo.get_transaction_by_order_id(order_id)
        if txn and txn.get("Status") == "created":
            try:
                admin_repo.update_payment_transaction(
                    razorpay_order_id=order_id,
                    razorpay_payment_id=payment_id,
                    status="failed",
                    metadata_json={"source": "webhook", "event": event},
                )
                logger.info("Webhook: payment failed order=%s", order_id)
            except Exception as db_err:
                logger.exception("Webhook: update_payment_transaction (failed) error=%s", db_err)
                _log_webhook_event(admin_repo, event, order_id, payment_id,
                                   raw_payload_str, status="failed",
                                   error_msg=str(db_err))
                return jsonify({"error": "DB update failed"}), 500

        _log_webhook_event(admin_repo, event, order_id, payment_id,
                           raw_payload_str, status="processed")
        return jsonify({"ok": True}), 200

    # -----------------------------------------------------------------------
    # Unknown / future events — acknowledge so Razorpay does not retry
    # -----------------------------------------------------------------------
    logger.info("Webhook: ignored event=%s event_id=%s", event, event_id)
    _log_webhook_event(admin_repo, event, order_id, payment_id,
                       raw_payload_str, status="ignored",
                       error_msg=f"unhandled event type: {event}")
    return jsonify({"ok": True}), 200


# =============================================================================
# SECTION 4: REPOSITORY METHOD SIGNATURES TO ADD
# =============================================================================
#
# Add these methods to Backend/modules/repositories/Admin/postgres_admin_repo.py:
#
#
# def insert_webhook_event(
#     self,
#     event: str,
#     order_id: str,
#     payment_id: str,
#     raw_payload: str,
#     status: str = "received",
#     error_msg: str = None,
# ) -> None:
#     """Insert a webhook event record for audit trail."""
#     with self._get_conn() as conn:
#         with conn.cursor() as cur:
#             cur.execute(
#                 """
#                 INSERT INTO WebhookEvent
#                   (Event, OrderId, PaymentId, RawPayload, Status, ErrorMsg, ProcessedAt)
#                 VALUES
#                   (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
#                 """,
#                 (event, order_id or None, payment_id or None,
#                  raw_payload, status, error_msg),
#             )
#         conn.commit()


# =============================================================================
# SECTION 5: RAZORPAY IP ALLOWLIST (Optional Defense-in-Depth)
# =============================================================================
#
# Razorpay's webhook IPs change over time. Check current list at:
# https://razorpay.com/docs/webhooks/
#
# To enable IP allowlisting in app.py (before_request):
#
# RAZORPAY_WEBHOOK_IPS = {
#     "34.212.157.152",
#     "52.25.90.188",
#     # Add more from Razorpay docs
# }
#
# @payment_bp.before_request
# def check_razorpay_ip():
#     if request.path == "/api/payment/webhook":
#         client_ip = request.headers.get("X-Forwarded-For", request.remote_addr)
#         # X-Forwarded-For may be a comma-separated list; take the first
#         ip = client_ip.split(",")[0].strip()
#         if ip not in RAZORPAY_WEBHOOK_IPS:
#             logger.warning("Webhook from unexpected IP: %s", ip)
#             # Log but do not block — HMAC is the primary guard.
#             # Set to `return jsonify({"error": "Forbidden"}), 403` to enforce strictly.


# =============================================================================
# SECTION 6: FIXING FINDING 5 — EmailId in create-order
# =============================================================================
#
# Current code (line 122 of payment_controller.py):
#   email_id=getattr(request, "user", {}).get("EmailId") or request.user_id,
#
# If auth_middleware.py only sets request.user_id (not request.user as a dict),
# then email_id will be the user's UUID string, not their email.
#
# SAFE FIX: Fetch email from repository:
#
# def create_order():
#     ...
#     admin_repo = RepoProvider.get_admin_repo()
#     user_repo = RepoProvider.get_user_repo()
#
#     # Fetch the user's email explicitly (avoids depending on middleware internals)
#     user = user_repo.get_user_by_id(request.user_id)
#     email_id = (user or {}).get("EmailId") or ""
#
#     admin_repo.insert_payment_transaction(
#         ...
#         email_id=email_id,
#         ...
#     )
#
# This is safe because get_user_by_id is already called in many controllers
# and the result is cached by the repo singleton pattern.


# =============================================================================
# SECTION 7: SUMMARY VERDICT
# =============================================================================
#
# payment_controller.py webhook implementation:
#
# ✅ HMAC-SHA256 signature verification (correct, timing-safe)
# ✅ payment.captured: updates status before assigning license
# ✅ payment.failed: updates status correctly
# ✅ Idempotency: Status check before double-processing
# ✅ Unknown events: acknowledged with 200 (correct — prevents Razorpay retries)
# ✅ Raw body used for signature verification (not parsed JSON — correct)
#
# ⚠️  No webhook event audit log (add WebhookEvent table — Section 2)
# ⚠️  Email ID may be a UUID instead of email string (verify auth_middleware.py — Section 6)
# ⚠️  No GST invoice generation on payment.captured (Phase 3 — DPDP roadmap)
# ⚠️  No Razorpay IP allowlisting (optional, Section 5)
# ❌  assign_license() exceptions not caught in webhook — returns 500, Razorpay retries
#     (fixed in hardened version above)
