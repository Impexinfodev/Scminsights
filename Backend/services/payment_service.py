# ===========================================
# SCM-INSIGHTS Payment Service
# ===========================================
# Razorpay SDK wrapper — keys passed in by caller (read from DB or env fallback).

import hashlib
import hmac
import time
import uuid
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# REL-02: Retry configuration for transient Razorpay API errors.
_RAZORPAY_MAX_RETRIES = 3
_RAZORPAY_RETRY_BASE_DELAY = 0.5  # seconds; doubles on each attempt (0.5s, 1s, 2s)


class PaymentServiceError(Exception):
    """Raised for payment service configuration or API errors."""
    pass


def _make_razorpay_client(key_id: str, key_secret: str):
    """Return an authenticated razorpay.Client instance."""
    try:
        import razorpay
    except ImportError:
        raise PaymentServiceError(
            "razorpay package is not installed. Run: pip install razorpay"
        )
    if not key_id or not key_secret:
        raise PaymentServiceError(
            "Razorpay Key ID and Secret Key are not configured. "
            "Go to Admin → Payment Settings → Razorpay and enter your keys."
        )
    return razorpay.Client(auth=(key_id, key_secret))


class PaymentService:
    """
    Razorpay payment integration.

    Flow:
        1. create_order()    → returns order_id, amount (paise), currency, key_id
        2. Frontend opens Razorpay checkout popup with those values
        3. On success Razorpay returns razorpay_order_id, razorpay_payment_id,
           razorpay_signature to the frontend handler
        4. Frontend calls POST /api/payment/verify with those three values
        5. verify_payment() checks HMAC signature → assigns license
        6. Razorpay also fires a webhook (payment.captured) as a safety net
    """

    @staticmethod
    def generate_receipt() -> str:
        """Generate a unique receipt ID (max 40 chars for Razorpay)."""
        return f"scm_{uuid.uuid4().hex[:32]}"

    @staticmethod
    def create_order(
        amount_inr: int,
        license_type: str,
        user_id: str,
        key_id: str = "",
        key_secret: str = "",
    ) -> Dict[str, Any]:
        """
        Create a Razorpay order.

        Args:
            amount_inr:   Amount in whole INR (multiplied ×100 for paise).
            license_type: License being purchased.
            user_id:      Buyer's user ID.
            key_id:       Razorpay Key ID (from DB or env).
            key_secret:   Razorpay Key Secret (from DB or env).

        Returns:
            Dict with: order_id, amount (paise), currency, key_id
        """
        client = _make_razorpay_client(key_id, key_secret)
        amount_paise = int(amount_inr) * 100
        order_data = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": PaymentService.generate_receipt(),
            "notes": {
                "user_id": user_id,
                "license_type": license_type,
                "website": "scminsights.ai",
            },
        }
        # REL-02 FIX: Retry up to _RAZORPAY_MAX_RETRIES times with exponential
        # backoff to recover from transient Razorpay 5xx / network errors.
        last_error: Exception = Exception("Unknown error")
        for attempt in range(1, _RAZORPAY_MAX_RETRIES + 1):
            try:
                order = client.order.create(data=order_data)
                return {
                    "order_id": order["id"],
                    "amount":   order["amount"],
                    "currency": order["currency"],
                    "key_id":   key_id,
                }
            except Exception as e:
                last_error = e
                if attempt < _RAZORPAY_MAX_RETRIES:
                    delay = _RAZORPAY_RETRY_BASE_DELAY * (2 ** (attempt - 1))
                    logger.warning("Razorpay order creation attempt %d/%d failed: %s — retrying in %.1fs",
                                   attempt, _RAZORPAY_MAX_RETRIES, type(e).__name__, delay)
                    time.sleep(delay)
        raise PaymentServiceError(f"Razorpay order creation failed after {_RAZORPAY_MAX_RETRIES} attempts: {last_error}")

    @staticmethod
    def verify_payment(
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
        key_secret: str = "",
    ) -> bool:
        """
        Verify the HMAC-SHA256 signature returned by Razorpay after checkout.
        Returns True if the signature is authentic.
        """
        if not key_secret:
            raise PaymentServiceError(
                "Razorpay Secret Key is not configured. "
                "Go to Admin → Payment Settings → Razorpay and enter your keys."
            )
        message = f"{razorpay_order_id}|{razorpay_payment_id}"
        expected = hmac.new(
            key_secret.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, razorpay_signature)

    @staticmethod
    def verify_webhook_signature(
        payload_bytes: bytes,
        signature: str,
        webhook_secret: str = "",
    ) -> bool:
        """
        Verify a Razorpay webhook request using HMAC-SHA256.
        If webhook_secret is not set, skips verification (logs a warning).
        """
        if not webhook_secret:
            logger.warning(
                "Razorpay Webhook Secret is not set — skipping signature check. "
                "Set it in Admin → Payment Settings → Razorpay for production."
            )
            return True
        expected = hmac.new(
            webhook_secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
