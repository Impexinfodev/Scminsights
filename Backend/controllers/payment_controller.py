# ===========================================
# SCM-INSIGHTS Payment Controller
# ===========================================
# Razorpay (INR) + Checkout.com (USD) dual-gateway support.
# Keys stored in DB (PaymentGatewayConfig) via Admin → Payment Settings.
# Falls back to .env vars (RAZORPAY_KEY_ID etc.) for backwards compatibility.
#
# Endpoints:
#   GET  /api/payment/active-gateways            (@require_auth)
#   POST /api/payment/create-order               (@require_auth) — Razorpay
#   POST /api/payment/verify                     (@require_auth) — Razorpay
#   POST /api/payment/webhook                    (no auth, HMAC) — Razorpay
#   POST /api/payment/checkout/create-session    (@require_auth) — Checkout.com HPP
#   GET  /api/payment/checkout/status/<txn_id>   (@require_auth) — Checkout.com poll
#   POST /api/payment/checkout/webhook           (no auth, HMAC) — Checkout.com

import json
import uuid
import hmac
import hashlib
import logging
import requests as _requests

from flask import Blueprint, request, jsonify

from middlewares.auth_middleware import require_auth
from services.payment_service import PaymentService, PaymentServiceError
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


def _get_checkout_config():
    """
    Return (public_key, secret_key, processing_channel_id, is_sandbox).
    Raises ValueError if Checkout.com not active / not configured.
    """
    from repositories.repo_provider import RepoProvider
    row = RepoProvider.get_admin_repo().get_raw_gateway_secret("checkout")
    if not row or not row.get("is_active"):
        raise ValueError("Checkout.com gateway is not active")
    public_key = row["key_id"]     or ""
    secret_key = row["key_secret"] or ""
    if not secret_key:
        raise ValueError("Checkout.com Secret Key not set in Admin → Payment Settings")
    extra = row.get("extra") or {}
    processing_channel_id = extra.get("processingChannelId") or ""
    flag = extra.get("sandboxMode", "")
    if flag == "true":
        is_sandbox = True
    elif flag == "false":
        is_sandbox = False
    else:
        is_sandbox = public_key.startswith("pk_sbox_") or secret_key.startswith("sk_sbox_")
    return public_key, secret_key, processing_channel_id, is_sandbox


def _checkout_base_url(is_sandbox: bool) -> str:
    return "https://api.sandbox.checkout.com" if is_sandbox else "https://api.checkout.com"


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
    """Returns { razorpay: bool, checkout: bool } based on DB config."""
    from repositories.repo_provider import RepoProvider
    try:
        configs = RepoProvider.get_admin_repo().get_payment_gateway_configs()
        config_map = {c["gatewayId"]: c["isActive"] for c in configs}
    except Exception:
        config_map = {}
    return jsonify({
        "razorpay": config_map.get("razorpay", bool(RAZORPAY_KEY_ID)),
        "checkout": config_map.get("checkout", False),
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
        admin_repo.apply_payment_transaction_alters()
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
    order_id     = (data.get("razorpay_order_id")   or "").strip()
    payment_id   = (data.get("razorpay_payment_id")  or "").strip()
    signature    = (data.get("razorpay_signature")   or "").strip()
    license_type = (data.get("license_type") or data.get("LicenseType") or "").strip()

    if not all([order_id, payment_id, signature, license_type]):
        return jsonify({"error": "razorpay_order_id, razorpay_payment_id, razorpay_signature, license_type required"}), 400

    try:
        _, rzp_key_secret, _ = _get_razorpay_config()
        valid = PaymentService.verify_payment(order_id, payment_id, signature, rzp_key_secret)
    except PaymentServiceError as e:
        return jsonify({"error": str(e)}), 503

    if not valid:
        return jsonify({"error": "Payment signature verification failed", "code": "SIGNATURE_INVALID"}), 400

    admin_repo = RepoProvider.get_admin_repo()
    txn = admin_repo.get_transaction_by_order_id(order_id)
    if txn and txn.get("Status") == "captured":
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
        return jsonify({"error": "Payment verified but license activation failed. Contact support."}), 500

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


# ---------------------------------------------------------------------------
# Checkout.com: Create Payment Session
# ---------------------------------------------------------------------------

@payment_bp.route("/checkout/create-session", methods=["POST"])
@require_auth
def checkout_create_session():
    from repositories.repo_provider import RepoProvider

    user_id = request.user_id
    data = request.json or {}
    license_type = (data.get("license_type") or data.get("LicenseType") or "").strip()
    if not license_type:
        return jsonify({"error": "license_type is required"}), 400

    admin_repo = RepoProvider.get_admin_repo()
    lic_raw = admin_repo.get_license_by_type(license_type)
    if not lic_raw:
        return jsonify({"error": "License type not found"}), 400
    lic_info = _parse_license_info(lic_raw)

    price_usd = lic_info.get("PriceUSD") or 0
    try:
        price_usd = float(price_usd)
    except (ValueError, TypeError):
        price_usd = 0
    if price_usd <= 0:
        return jsonify({"error": "This plan has no USD price. Set PriceUSD in the license config."}), 400

    amount_cents = int(round(price_usd * 100))

    try:
        _, secret_key, processing_channel_id, is_sandbox = _get_checkout_config()
    except ValueError as e:
        return jsonify({"error": str(e), "code": "PAYMENT_UNAVAILABLE"}), 503

    if not processing_channel_id:
        return jsonify({
            "error": "Checkout.com Processing Channel ID not set. "
                     "Go to Admin → Payment Settings → Checkout.com → Advanced Settings."
        }), 400

    user_email = _get_user_email(user_id)
    user_name = ""
    try:
        info = RepoProvider.get_user_repo().get_user_by_id(user_id)
        user_name = (info or {}).get("Name") or ""
    except Exception:
        pass

    txn_id = str(uuid.uuid4())
    frontend_url = (data.get("frontend_url") or "").strip().rstrip("/") or request.host_url.rstrip("/")
    success_url = data.get("success_url") or f"{frontend_url}/checkout?payment=success&txn={txn_id}"
    failure_url = data.get("failure_url") or f"{frontend_url}/checkout?payment=failed&txn={txn_id}"

    cko_api = _checkout_base_url(is_sandbox)
    payload = {
        "amount": amount_cents,
        "currency": "USD",
        "reference": txn_id,
        "description": f"{license_type} — SCM Insights",
        "return_url": success_url,
        "failure_url": failure_url,
        "expires_in": 86400,
        "customer": {
            "name":  user_name  or "Customer",
            "email": user_email or "noreply@scminsights.ai",
        },
        "billing": {"address": {"country": "IN"}},
        "metadata": {"license_type": license_type, "user_id": user_id},
        "processing_channel_id": processing_channel_id,
    }

    try:
        resp = _requests.post(
            f"{cko_api}/payment-links",
            json=payload,
            headers={"Authorization": f"Bearer {secret_key}", "Content-Type": "application/json"},
            timeout=15,
        )
        resp.raise_for_status()
        cko_data = resp.json()
    except _requests.exceptions.Timeout:
        return jsonify({"error": "Checkout.com request timed out"}), 503
    except _requests.exceptions.HTTPError:
        sc = resp.status_code
        try:
            detail = resp.json()
        except Exception:
            detail = resp.text
        if sc == 401:
            return jsonify({
                "error": "Checkout.com authentication failed (401). "
                         "Re-enter your sk_sbox_... key in Admin → Payment Settings.",
                "detail": detail,
            }), 503
        logger.error("Checkout.com create-session error %s: %s", sc, detail)
        return jsonify({"error": f"Checkout.com error ({sc})", "detail": detail}), 503
    except Exception as e:
        logger.error("Checkout.com unexpected error: %s", e)
        return jsonify({"error": "Could not create Checkout.com session"}), 503

    redirect_url = cko_data.get("_links", {}).get("redirect", {}).get("href")
    cko_id = cko_data.get("id", txn_id)
    if not redirect_url:
        return jsonify({"error": "No redirect URL in Checkout.com response"}), 503

    try:
        admin_repo.apply_payment_transaction_alters()
        admin_repo.insert_payment_transaction(
            razorpay_order_id=cko_id,
            user_id=user_id,
            email_id=user_email,
            license_type=license_type,
            amount_paise=0,
            currency="USD",
            status="created",
            source_website=(PAYMENT_SOURCE_WEBSITE or "scminsights.ai"),
            metadata_json={"txn_id": txn_id, "gateway": "checkout", "cko_id": cko_id, "amount_cents": amount_cents},
        )
    except Exception as e:
        logger.error("Failed to save Checkout.com transaction: %s", e)

    return jsonify({
        "redirect_url":   redirect_url,
        "transaction_id": txn_id,
        "amount_usd":     price_usd,
    }), 200


# ---------------------------------------------------------------------------
# Checkout.com: Poll Status
# ---------------------------------------------------------------------------

@payment_bp.route("/checkout/status/<txn_id>", methods=["GET"])
@require_auth
def checkout_status(txn_id: str):
    from repositories.repo_provider import RepoProvider

    user_id = request.user_id
    admin_repo = RepoProvider.get_admin_repo()

    # Find transaction by txn_id stored in MetadataJson
    txn = None
    try:
        pool = admin_repo.connection_pool
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT UserId, LicenseType, Status, RazorpayOrderId "
                    "FROM PaymentTransaction "
                    "WHERE MetadataJson::text LIKE %s "
                    "ORDER BY CreatedAt DESC LIMIT 1",
                    (f'%"{txn_id}"%',),
                )
                row = cur.fetchone()
                if row:
                    txn = {"UserId": row[0], "LicenseType": row[1], "Status": row[2], "CkoId": row[3]}
    except Exception as e:
        logger.error("checkout_status: DB error txn=%s: %s", txn_id, e)
        return jsonify({"status": "PENDING", "message": "Could not fetch payment status"}), 200

    if not txn:
        return jsonify({"status": "PENDING", "message": "Transaction not found"}), 200
    if txn["UserId"] != user_id:
        return jsonify({"error": "Forbidden"}), 403
    if txn["Status"] == "captured":
        return jsonify({"status": "COMPLETED", "license_type": txn["LicenseType"], "message": "Payment complete — plan activated!"}), 200
    if txn["Status"] == "failed":
        return jsonify({"status": "FAILED", "message": "Payment failed or was cancelled"}), 200

    # Ask Checkout.com for current status
    cko_id = txn.get("CkoId")
    if cko_id:
        try:
            _, secret_key, _, is_sandbox = _get_checkout_config()
            resp = _requests.get(
                f"{_checkout_base_url(is_sandbox)}/payment-links/{cko_id}",
                headers={"Authorization": f"Bearer {secret_key}"},
                timeout=10,
            )
            if resp.status_code == 200:
                raw_status = resp.json().get("status", "")
                if raw_status.replace(" ", "").lower() in ("paymentreceived", "paid", "completed"):
                    try:
                        admin_repo.update_payment_transaction(
                            razorpay_order_id=cko_id,
                            razorpay_payment_id=cko_id,
                            status="captured",
                            metadata_json={"verified_by": "poll"},
                        )
                        _assign_license(user_id, txn["LicenseType"])
                    except Exception as e:
                        logger.error("checkout_status: license assignment failed: %s", e)
                    return jsonify({"status": "COMPLETED", "license_type": txn["LicenseType"], "message": "Payment complete — plan activated!"}), 200
        except ValueError:
            pass
        except Exception as e:
            logger.warning("checkout_status: CKO API check failed: %s", e)

    return jsonify({"status": "PENDING", "message": "Payment is being processed…"}), 200


# ---------------------------------------------------------------------------
# Checkout.com: Webhook
# ---------------------------------------------------------------------------

@payment_bp.route("/checkout/webhook", methods=["POST"])
def checkout_webhook():
    payload_bytes = request.get_data()
    cko_sig = (request.headers.get("Cko-Signature") or "").strip()

    from repositories.repo_provider import RepoProvider
    admin_repo = RepoProvider.get_admin_repo()

    try:
        row = admin_repo.get_raw_gateway_secret("checkout")
        webhook_secret = (row or {}).get("webhook_secret") or ""
    except Exception:
        webhook_secret = ""

    if webhook_secret and cko_sig:
        expected = hmac.new(webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, cko_sig):
            logger.warning("Checkout.com webhook: invalid signature from %s", request.remote_addr)
            return "Invalid signature", 400

    try:
        event = json.loads(payload_bytes)
    except (ValueError, TypeError):
        return "Bad JSON", 400

    event_type     = (event.get("type") or "").strip()
    payment_data   = event.get("data", {})
    cko_payment_id = payment_data.get("id", "")
    reference      = payment_data.get("reference", "")
    metadata       = payment_data.get("metadata", {})
    logger.info("Checkout.com webhook: type=%s payment=%s ref=%s", event_type, cko_payment_id, reference)

    def _find_txn():
        for val in [cko_payment_id, reference]:
            if not val:
                continue
            t = admin_repo.get_transaction_by_order_id(val)
            if t:
                return t
            try:
                pool = admin_repo.connection_pool
                with pool.connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            "SELECT UserId, LicenseType, Status, RazorpayOrderId FROM PaymentTransaction "
                            "WHERE MetadataJson::text LIKE %s LIMIT 1",
                            (f'%"{val}"%',),
                        )
                        r = cur.fetchone()
                        if r:
                            return {"UserId": r[0], "LicenseType": r[1], "Status": r[2], "RazorpayOrderId": r[3]}
            except Exception:
                pass
        return None

    if event_type in ("payment_approved", "payment_captured"):
        txn = None
        try:
            txn = _find_txn()
        except Exception as e:
            logger.error("Checkout webhook DB error: %s", e)
            return "DB error", 500
        if not txn:
            return "OK", 200
        if txn.get("Status") == "captured":
            return "OK", 200
        try:
            admin_repo.update_payment_transaction(
                razorpay_order_id=txn["RazorpayOrderId"],
                razorpay_payment_id=cko_payment_id,
                status="captured",
                metadata_json={"verified_by": "checkout_webhook"},
            )
            lic = txn.get("LicenseType") or metadata.get("license_type", "")
            uid = txn.get("UserId")      or metadata.get("user_id", "")
            if lic and uid:
                _assign_license(uid, lic)
                logger.info("Checkout webhook: license %s → user %s", lic, uid)
        except Exception as e:
            logger.error("Checkout webhook processing failed: %s", e)
            return "Processing error", 500

    elif event_type in ("payment_declined", "payment_expired", "payment_cancelled"):
        try:
            txn = _find_txn()
            if txn:
                admin_repo.update_payment_transaction(
                    razorpay_order_id=txn["RazorpayOrderId"],
                    razorpay_payment_id=cko_payment_id,
                    status="failed",
                    metadata_json={"source": "checkout_webhook", "event": event_type},
                )
        except Exception as e:
            logger.error("Checkout webhook failed-mark error: %s", e)

    return "OK", 200
