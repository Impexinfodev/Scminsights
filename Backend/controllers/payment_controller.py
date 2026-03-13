# ===========================================
# SCM-INSIGHTS Payment Controller
# ===========================================
# Razorpay (INR) — single gateway.
# Keys stored in DB (PaymentGatewayConfig) via Admin → Payment Settings.
# Falls back to .env vars (RAZORPAY_KEY_ID etc.) for backwards compatibility.
#
# Endpoints:
#   GET  /api/payment/active-gateways   (@require_auth)
#   POST /api/payment/create-order      (@require_auth) — Razorpay
#   POST /api/payment/verify            (@require_auth) — Razorpay
#   POST /api/payment/webhook           (no auth, HMAC) — Razorpay

import json
import uuid
import logging

from flask import Blueprint, request, jsonify

from middlewares.auth_middleware import require_auth
from services.payment_service import PaymentService, PaymentServiceError
from utils.audit import audit_event
from config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, PAYMENT_SOURCE_WEBSITE

logger = logging.getLogger(__name__)

payment_bp = Blueprint("payment", __name__, url_prefix="/api/payment")


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

def _get_razorpay_config():
    """
    Return (key_id, key_secret, webhook_secret) from DB first, env fallback.
    """
    from repositories.repo_provider import RepoProvider
    try:
        row = RepoProvider.get_admin_repo().get_raw_gateway_secret("razorpay")
    except Exception:
        row = None
    if row and row.get("is_active"):
        return (
            row["key_id"]         or RAZORPAY_KEY_ID         or "",
            row["key_secret"]     or RAZORPAY_KEY_SECRET     or "",
            row["webhook_secret"] or RAZORPAY_WEBHOOK_SECRET or "",
        )
    return (RAZORPAY_KEY_ID or "", RAZORPAY_KEY_SECRET or "", RAZORPAY_WEBHOOK_SECRET or "")


def _get_user_email(user_id: str) -> str:
    try:
        from repositories.repo_provider import RepoProvider
        user = RepoProvider.get_user_repo().get_user_by_id(user_id)
        return (user or {}).get("EmailId") or ""
    except Exception:
        return ""


def _assign_license(user_id: str, license_type: str):
    from repositories.repo_provider import RepoProvider
    RepoProvider.get_admin_repo().assign_license(user_id, license_type)


def _parse_license_info(raw):
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw)
    except Exception:
        return {}


# ---------------------------------------------------------------------------
# Active Gateways
# ---------------------------------------------------------------------------

@payment_bp.route("/active-gateways", methods=["GET"])
@require_auth
def active_gateways():
    """Returns { razorpay: bool } based on DB config."""
    from repositories.repo_provider import RepoProvider
    try:
        configs = RepoProvider.get_admin_repo().get_payment_gateway_configs()
        config_map = {c["gatewayId"]: c["isActive"] for c in configs}
    except Exception:
        config_map = {}
    return jsonify({
        "razorpay": config_map.get("razorpay", bool(RAZORPAY_KEY_ID)),
    }), 200


# ---------------------------------------------------------------------------
# Razorpay: Create Order
# ---------------------------------------------------------------------------

@payment_bp.route("/create-order", methods=["POST"])
@require_auth
def create_order():
    from repositories.repo_provider import RepoProvider

    user_id = request.user_id
    data = request.json or {}
    license_type = (data.get("license_type") or data.get("LicenseType") or "").strip()
    if not license_type:
        return jsonify({"error": "license_type is required"}), 400

    website = (data.get("website") or data.get("source_website") or PAYMENT_SOURCE_WEBSITE or "").strip()[:255]
    admin_repo = RepoProvider.get_admin_repo()

    lic_raw = admin_repo.get_license_by_type(license_type)
    if not lic_raw:
        return jsonify({"error": "License type not found"}), 400
    lic_info = _parse_license_info(lic_raw)
    amount_rupees = lic_info.get("PriceINR") or lic_info.get("Price") or 0
    try:
        amount_rupees = int(amount_rupees)
    except (ValueError, TypeError):
        amount_rupees = 0
    if amount_rupees <= 0:
        return jsonify({"error": "This plan has no valid INR price configured"}), 400

    try:
        rzp_key_id, rzp_key_secret, _ = _get_razorpay_config()
        order = PaymentService.create_order(amount_rupees, license_type, user_id, rzp_key_id, rzp_key_secret)
    except PaymentServiceError as e:
        logger.error("Razorpay create_order failed: %s", e)
        return jsonify({"error": str(e), "code": "PAYMENT_UNAVAILABLE"}), 503

    txn_id = str(uuid.uuid4())
    email_id = _get_user_email(user_id)
    try:
        # ARCH-08 FIX: apply_payment_transaction_alters() (DDL) is now run only at
        # startup in app.py, not on every create-order request. Removed from hot path.
        admin_repo.insert_payment_transaction(
            razorpay_order_id=order["order_id"],
            user_id=user_id,
            email_id=email_id,
            license_type=license_type,
            amount_paise=order["amount"],
            currency="INR",
            status="created",
            source_website=website,
            metadata_json={"txn_id": txn_id, "gateway": "razorpay"},
            is_test_mode=rzp_key_id.startswith("rzp_test_"),
        )
    except Exception as e:
        logger.error("Failed to save PaymentTransaction: %s", e)

    return jsonify({
        "order_id":       order["order_id"],
        "amount":         order["amount"],
        "currency":       order["currency"],
        "key_id":         order["key_id"],
        "amount_rupees":  amount_rupees,
        "transaction_id": txn_id,
    }), 200


# ---------------------------------------------------------------------------
# Razorpay: Verify Payment
# ---------------------------------------------------------------------------

@payment_bp.route("/verify", methods=["POST"])
@require_auth
def verify_payment():
    from repositories.repo_provider import RepoProvider

    user_id = request.user_id
    data = request.json or {}
    order_id   = (data.get("razorpay_order_id")  or "").strip()
    payment_id = (data.get("razorpay_payment_id") or "").strip()
    signature  = (data.get("razorpay_signature")  or "").strip()

    if not all([order_id, payment_id, signature]):
        return jsonify({"error": "razorpay_order_id, razorpay_payment_id, razorpay_signature required"}), 400

    try:
        _, rzp_key_secret, _ = _get_razorpay_config()
        valid = PaymentService.verify_payment(order_id, payment_id, signature, rzp_key_secret)
    except PaymentServiceError as e:
        return jsonify({"error": str(e)}), 503

    if not valid:
        return jsonify({"error": "Payment signature verification failed", "code": "SIGNATURE_INVALID"}), 400

    admin_repo = RepoProvider.get_admin_repo()
    txn = admin_repo.get_transaction_by_order_id(order_id)

    # SEC-01 FIX: license_type is ALWAYS read from the server-side transaction record,
    # never from the client-supplied POST body. This prevents users from upgrading
    # their plan by modifying the request body.
    if not txn:
        logger.error("verify_payment: no transaction found for order_id=%s user=%s", order_id, user_id)
        return jsonify({"error": "Transaction not found"}), 404

    # Ensure this transaction belongs to the authenticated user
    if txn.get("UserId") != user_id:
        logger.warning("verify_payment: user=%s attempted to verify order belonging to user=%s", user_id, txn.get("UserId"))
        return jsonify({"error": "Transaction does not belong to this account", "code": "FORBIDDEN"}), 403

    license_type = txn.get("LicenseType", "")
    if not license_type:
        logger.error("verify_payment: transaction %s has no LicenseType", order_id)
        return jsonify({"error": "Transaction has no associated plan. Contact support."}), 500

    if txn.get("Status") == "captured":
        return jsonify({"message": "Payment already processed", "license_type": license_type}), 200

    try:
        admin_repo.update_payment_transaction(
            razorpay_order_id=order_id,
            razorpay_payment_id=payment_id,
            status="captured",
            metadata_json={"verified_by": "api"},
        )
    except Exception as e:
        logger.error("Failed to update txn status: %s", e)

    try:
        _assign_license(user_id, license_type)
    except Exception as e:
        logger.error("License assignment failed user=%s plan=%s: %s", user_id, license_type, e)
        audit_event("payment_license_fail", user_id=user_id, outcome="fail", plan=license_type, order_id=order_id)
        return jsonify({"error": "Payment verified but license activation failed. Contact support."}), 500

    audit_event("payment_verified", user_id=user_id, outcome="ok", plan=license_type, order_id=order_id)
    return jsonify({"message": "Payment verified and plan activated", "license_type": license_type}), 200


# ---------------------------------------------------------------------------
# Razorpay: Webhook
# ---------------------------------------------------------------------------

@payment_bp.route("/webhook", methods=["POST"])
def razorpay_webhook():
    payload_bytes = request.get_data()
    signature = (request.headers.get("X-Razorpay-Signature") or "").strip()

    try:
        _, _, rzp_webhook_secret = _get_razorpay_config()
        valid = PaymentService.verify_webhook_signature(payload_bytes, signature, rzp_webhook_secret)
    except Exception as e:
        logger.error("Webhook signature check error: %s", e)
        return jsonify({"error": "Signature error"}), 400

    if not valid:
        logger.warning("Razorpay webhook invalid signature from %s", request.remote_addr)
        return jsonify({"error": "Invalid signature"}), 400

    try:
        event = json.loads(payload_bytes)
    except (ValueError, TypeError):
        return jsonify({"error": "Bad JSON"}), 400

    # SEC-11 FIX: Validate the webhook event timestamp to reject replayed events.
    # Razorpay includes "created_at" (Unix timestamp) in the event payload.
    # Reject events older than 5 minutes to defeat replay attacks.
    import time as _time
    event_created_at = event.get("created_at")
    if event_created_at:
        try:
            age_seconds = _time.time() - int(event_created_at)
            if age_seconds > 300:  # 5-minute replay window
                logger.warning("Razorpay webhook rejected: event too old (%ds) order may be replay", int(age_seconds))
                return jsonify({"error": "Event timestamp too old"}), 400
        except (TypeError, ValueError):
            pass  # If created_at is missing/unparseable, allow through (Razorpay format may vary)

    event_type = (event.get("event") or "").strip()
    entity     = (event.get("payload") or {}).get("payment", {}).get("entity", {})
    order_id   = (entity.get("order_id") or "").strip()
    payment_id = (entity.get("id")       or "").strip()

    from repositories.repo_provider import RepoProvider
    admin_repo = RepoProvider.get_admin_repo()

    if event_type == "payment.captured" and order_id:
        txn = admin_repo.get_transaction_by_order_id(order_id)
        if txn and txn.get("Status") != "captured":
            try:
                admin_repo.update_payment_transaction(
                    razorpay_order_id=order_id,
                    razorpay_payment_id=payment_id,
                    status="captured",
                    metadata_json={"verified_by": "webhook"},
                )
                _assign_license(txn["UserId"], txn["LicenseType"])
                logger.info("Webhook captured: order=%s user=%s plan=%s", order_id, txn["UserId"], txn["LicenseType"])
                audit_event("payment_webhook_captured", user_id=txn["UserId"], outcome="ok", plan=txn["LicenseType"], order_id=order_id)
            except Exception as e:
                logger.error("Webhook processing error order=%s: %s", order_id, e)
                return jsonify({"error": "Processing failed"}), 500

    elif event_type == "payment.failed" and order_id:
        try:
            txn = admin_repo.get_transaction_by_order_id(order_id)
            if txn and txn.get("Status") == "created":
                admin_repo.update_payment_transaction(
                    razorpay_order_id=order_id,
                    razorpay_payment_id=payment_id,
                    status="failed",
                    metadata_json={"source": "webhook"},
                )
        except Exception as e:
            logger.error("Webhook failed-mark error order=%s: %s", order_id, e)

    return jsonify({"ok": True}), 200
