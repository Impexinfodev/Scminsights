# SCM-INSIGHTS Payment Controller - Razorpay (INR)
import json
import logging
import hmac
import hashlib
import uuid
import requests
from flask import Blueprint, request, jsonify

from middlewares.auth_middleware import require_auth
from config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, PAYMENT_SOURCE_WEBSITE

logger = logging.getLogger(__name__)

payment_bp = Blueprint("payment", __name__, url_prefix="/api/payment")

RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders"


def _get_plan_amount_inr(admin_repo, license_type):
    """Return (amount_rupees, error_message). TRIAL is 0."""
    if not license_type or (license_type or "").strip().upper() == "TRIAL":
        return 0, None
    raw = admin_repo.get_license_by_type(license_type.strip())
    if not raw:
        return None, "Invalid plan"
    try:
        info = raw if isinstance(raw, dict) else json.loads(raw)
    except Exception:
        info = {}
    amount = info.get("PriceINR") or info.get("Price") or 0
    try:
        amount = int(amount)
    except (TypeError, ValueError):
        amount = 0
    if amount < 0:
        return None, "Invalid plan amount"
    return amount, None


def _create_razorpay_order(amount_paise, receipt_id, notes=None):
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        return None, "Razorpay not configured"
    payload = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt_id[:40] if receipt_id else str(uuid.uuid4())[:40],
    }
    if notes:
        payload["notes"] = notes
    resp = requests.post(
        RAZORPAY_ORDERS_URL,
        auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET),
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=15,
    )
    if resp.status_code != 200:
        if resp.status_code == 401:
            logger.warning(
                "Razorpay 401 Authentication failed. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env: "
                "use Test keys (rzp_test_...) in test mode, no extra spaces or quotes."
            )
            return None, "Razorpay authentication failed. Check backend .env (Key ID and Secret)."
        logger.warning("Razorpay order create failed: %s %s", resp.status_code, resp.text)
        return None, "Could not create order"
    data = resp.json()
    order_id = data.get("id")
    if not order_id:
        return None, "Invalid order response"
    return order_id, None


def _verify_signature(order_id, payment_id, signature):
    if not RAZORPAY_KEY_SECRET:
        return False
    payload = f"{order_id}|{payment_id}"
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature or "")


@payment_bp.route("/create-order", methods=["POST"])
@require_auth
def create_order():
    """Create Razorpay order for a plan. Body: { "license_type": "DIRECTORY" }. Returns order_id, amount, currency, key_id for checkout."""
    from repositories.repo_provider import RepoProvider

    data = request.json or {}
    license_type = (data.get("license_type") or data.get("LicenseType") or "").strip()
    if not license_type or license_type.upper() == "TRIAL":
        return jsonify({"error": "Valid paid plan is required"}), 400

    # Website/platform: from body or default for this deployment (used in Razorpay notes and DB)
    website = (data.get("website") or data.get("source_website") or PAYMENT_SOURCE_WEBSITE or "").strip() or PAYMENT_SOURCE_WEBSITE
    if len(website) > 255:
        website = website[:255]

    admin_repo = RepoProvider.get_admin_repo()
    amount_rupees, err = _get_plan_amount_inr(admin_repo, license_type)
    if err:
        return jsonify({"error": err}), 400
    if amount_rupees <= 0:
        return jsonify({"error": "Plan is free; no payment required"}), 400

    amount_paise = amount_rupees * 100
    receipt_id = f"scm_{request.user_id}_{license_type}_{uuid.uuid4().hex[:8]}"
    order_id, err = _create_razorpay_order(
        amount_paise,
        receipt_id,
        notes={"user_id": request.user_id, "license_type": license_type, "website": website},
    )
    if err:
        return jsonify({"error": err}), 500

    admin_repo.insert_payment_transaction(
        razorpay_order_id=order_id,
        user_id=request.user_id,
        email_id=getattr(request, "user", {}).get("EmailId") or request.user_id,
        license_type=license_type,
        amount_paise=amount_paise,
        currency="INR",
        status="created",
        source_website=website,
    )
    return jsonify({
        "order_id": order_id,
        "amount": amount_paise,
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID,
        "amount_rupees": amount_rupees,
    }), 200


@payment_bp.route("/verify", methods=["POST"])
@require_auth
def verify_payment():
    """Verify Razorpay signature and assign license. Body: razorpay_order_id, razorpay_payment_id, razorpay_signature, license_type."""
    from repositories.repo_provider import RepoProvider

    data = request.json or {}
    order_id = (data.get("razorpay_order_id") or "").strip()
    payment_id = (data.get("razorpay_payment_id") or "").strip()
    signature = (data.get("razorpay_signature") or "").strip()
    license_type = (data.get("license_type") or "").strip()
    if not order_id or not payment_id or not signature or not license_type:
        return jsonify({"error": "Missing payment details"}), 400

    if not _verify_signature(order_id, payment_id, signature):
        return jsonify({"error": "Invalid payment signature"}), 400

    admin_repo = RepoProvider.get_admin_repo()
    txn = admin_repo.get_transaction_by_order_id(order_id)
    if not txn:
        return jsonify({"error": "Order not found"}), 404
    if txn.get("UserId") != request.user_id:
        return jsonify({"error": "Order does not belong to this user"}), 403
    if txn.get("Status") == "captured":
        return jsonify({"message": "Already applied", "license_type": license_type}), 200

    admin_repo.update_payment_transaction(
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        status="captured",
        metadata_json={"verified_by": "api"},
    )
    admin_repo.assign_license(request.user_id, license_type)
    return jsonify({
        "message": "Payment verified and plan activated",
        "license_type": license_type,
    }), 200


def _verify_webhook_signature(body: bytes, signature: str) -> bool:
    """Verify Razorpay webhook using X-Razorpay-Signature and RAZORPAY_WEBHOOK_SECRET."""
    if not RAZORPAY_WEBHOOK_SECRET or not signature:
        return False
    expected = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def _get_payment_entity_from_payload(payload: dict) -> dict:
    """Extract payment entity from webhook payload. Supports payload.payment.entity or payload.entity."""
    p = payload.get("payload") or {}
    entity = (p.get("payment") or {}).get("entity") or p.get("entity") or {}
    return entity if isinstance(entity, dict) else {}


@payment_bp.route("/webhook", methods=["POST"])
def webhook():
    """
    Razorpay webhook endpoint. Configure in Dashboard → Webhooks with:
    - URL: https://api.scminsights.ai/api/payment/webhook
    - Secret: same as RAZORPAY_WEBHOOK_SECRET in .env
    - Events: payment.captured, payment.failed
    """
    raw_body = request.get_data()
    signature = (request.headers.get("X-Razorpay-Signature") or "").strip()

    if not raw_body:
        return jsonify({"error": "Empty body"}), 400
    if not _verify_webhook_signature(raw_body, signature):
        logger.warning("Webhook: invalid signature")
        return jsonify({"error": "Invalid signature"}), 400

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except (ValueError, TypeError, UnicodeDecodeError) as e:
        logger.warning("Webhook: invalid JSON %s", e)
        return jsonify({"error": "Invalid JSON"}), 400

    event = (payload.get("event") or "").strip()
    if not event:
        return jsonify({"error": "Missing event"}), 400

    from repositories.repo_provider import RepoProvider
    admin_repo = RepoProvider.get_admin_repo()

    if event == "payment.captured":
        entity = _get_payment_entity_from_payload(payload)
        order_id = (entity.get("order_id") or "").strip()
        payment_id = (entity.get("id") or "").strip()
        if not order_id:
            logger.warning("Webhook payment.captured: no order_id in payload")
            return jsonify({"ok": True}), 200
        txn = admin_repo.get_transaction_by_order_id(order_id)
        if not txn:
            logger.warning("Webhook payment.captured: order not found %s", order_id)
            return jsonify({"ok": True}), 200
        if txn.get("Status") != "captured":
            admin_repo.update_payment_transaction(
                razorpay_order_id=order_id,
                razorpay_payment_id=payment_id,
                status="captured",
                metadata_json={"verified_by": "webhook", "event": event},
            )
            user_id = txn.get("UserId")
            license_type = txn.get("LicenseType")
            if user_id and license_type:
                admin_repo.assign_license(user_id, license_type)
                logger.info("Webhook: payment captured order=%s user=%s plan=%s", order_id, user_id, license_type)
        return jsonify({"ok": True}), 200

    if event == "payment.failed":
        entity = _get_payment_entity_from_payload(payload)
        order_id = (entity.get("order_id") or "").strip()
        payment_id = (entity.get("id") or "").strip()
        if not order_id:
            logger.warning("Webhook payment.failed: no order_id in payload")
            return jsonify({"ok": True}), 200
        txn = admin_repo.get_transaction_by_order_id(order_id)
        if txn and txn.get("Status") == "created":
            admin_repo.update_payment_transaction(
                razorpay_order_id=order_id,
                razorpay_payment_id=payment_id,
                status="failed",
                metadata_json={"source": "webhook", "event": event},
            )
            logger.info("Webhook: payment failed order=%s", order_id)
        return jsonify({"ok": True}), 200

    # Unknown event: acknowledge so Razorpay does not retry
    logger.info("Webhook: ignored event=%s", event)
    return jsonify({"ok": True}), 200
