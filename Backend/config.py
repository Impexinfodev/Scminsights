# ===========================================
# SCM-INSIGHTS Backend Configuration
# ===========================================
# Centralized configuration. All sensitive values from environment variables.
# Use .env for local development; never hardcode credentials.

import os
from typing import List, Any
from dotenv import load_dotenv

load_dotenv()


def get_env(key: str, default: Any = None, required: bool = False) -> str:
    value = os.getenv(key, default)
    if required and not value:
        raise ValueError(
            f"Required environment variable '{key}' is not set. "
            "Check .env or environment configuration."
        )
    return value


def get_env_bool(key: str, default: bool = False) -> bool:
    value = os.getenv(key, str(default)).lower()
    return value in ("true", "1", "yes", "on")


def get_env_int(key: str, default: int = 0) -> int:
    try:
        return int(os.getenv(key, str(default)))
    except (ValueError, TypeError):
        return default


def get_env_list(key: str, default: str = "", separator: str = ",") -> List[str]:
    value = os.getenv(key, default)
    return [item.strip() for item in value.split(separator) if item.strip()]


# ===========================================
# Database (PostgreSQL only)
# ===========================================

# Same DB for SCM and trade_company_report (host, port, user, password, database).
POSTGRES_CONFIG = {
    "host": get_env("POSTGRES_DB_HOST", "localhost"),
    "port": get_env_int("POSTGRES_DB_PORT", 5432),
    "user": get_env("POSTGRES_DB_USER", "postgres"),
    "password": get_env("POSTGRES_DB_PASSWORD", ""),
    "database": get_env("POSTGRES_DB_NAME", "scm_insights"),
}


# ===========================================
# Flask
# ===========================================

def _get_secret_key() -> str:
    key = get_env("FLASK_SECRET_KEY", "change-this-secret-in-production")
    if os.environ.get("FLASK_ENV", "development") == "production" and (
        not key or key == "change-this-secret-in-production"
    ):
        raise ValueError(
            "FLASK_SECRET_KEY must be set to a secure value in production. "
            "Do not use the default. Set it in .env or environment."

        )
    return key


FLASK_CONFIG = {
    "SECRET_KEY": _get_secret_key(),
    "ENV": get_env("FLASK_ENV", "development"),
    "DEBUG": get_env_bool("FLASK_DEBUG", False),
    "HOST": get_env("FLASK_HOST", "0.0.0.0"),
    "PORT": get_env_int("FLASK_PORT", 5001),
    "SSL_PORT": get_env_int("FLASK_SSL_PORT", 443),
}


# ===========================================
# CORS
# ===========================================

CORS_ORIGINS = get_env_list(
    "CORS_ORIGINS",
)


# ===========================================
# Email / SMTP
# ===========================================

EMAIL_CONFIG = {
    "smtp_host": get_env("SMTP_HOST", "smtp.gmail.com"),
    "smtp_port": get_env_int("SMTP_PORT", 587),
    "smtp_user": get_env("SMTP_USER", ""),
    "smtp_password": get_env("SMTP_PASSWORD", ""),
    "from_name": get_env("EMAIL_FROM_NAME", "SCM Insights"),
    "use_tls": get_env_bool("SMTP_USE_TLS", True),
}


# ===========================================
# Application URLs
# ===========================================
# FRONTEND_URL: base URL for links in emails (activation, reset password).
# Set in .env: dev -> http://localhost:3000 (or your local frontend), production -> https://your-live-domain.com
# DOMAIN_URL: fallback if FRONTEND_URL not set (kept for compatibility).

_is_production = os.environ.get("FLASK_ENV", "development") == "production"
_DEFAULT_FRONTEND_URL = "https://scminsights.ai" if _is_production else "http://localhost:3000"
_DEFAULT_DOMAIN_URL = "https://scminsights.ai" if _is_production else "http://localhost:3001"

FRONTEND_URL = (get_env("FRONTEND_URL", get_env("DOMAIN_URL", _DEFAULT_FRONTEND_URL)) or "").rstrip("/")
DOMAIN_URL = get_env("DOMAIN_URL", _DEFAULT_DOMAIN_URL)
# FRONTEND_URL is used for email links (activation, reset password).
BACKEND_URL = get_env("BACKEND_URL", "http://localhost:5001")


# ===========================================
# Razorpay (payments in INR)
# ===========================================
# Strip whitespace so .env values don't cause 401 Authentication failed
RAZORPAY_KEY_ID = (get_env("RAZORPAY_KEY_ID", "") or "").strip()
RAZORPAY_KEY_SECRET = (get_env("RAZORPAY_KEY_SECRET", "") or "").strip()
# Webhook secret: set the same value in Razorpay Dashboard → Webhooks → Secret
RAZORPAY_WEBHOOK_SECRET = (get_env("RAZORPAY_WEBHOOK_SECRET", "") or "").strip()

# Default website/platform identifier for this deployment (used in order notes and PaymentTransaction.SourceWebsite).
# Other sites using the same Razorpay account should set their own value (e.g. "website-b", "website-c").
PAYMENT_SOURCE_WEBSITE = (get_env("PAYMENT_SOURCE_WEBSITE", "scminsights") or "scminsights").strip() or "scminsights"

# ===========================================
# Admin
# ===========================================

WHITELISTED_ADMINS = get_env_list("WHITELISTED_ADMINS", "")


# ===========================================
# SSL
# ===========================================

SSL_CONFIG = {
    "cert_path": get_env("SSL_CERT_PATH", "cert.pem"),
    "key_path": get_env("SSL_KEY_PATH", "key.pem"),
}


# ===========================================
# Database config for app
# ===========================================

def get_database_config() -> dict:
    return {
        "DATABASE_TYPE": "postgres",
        "POSTGRES_DB_HOST": POSTGRES_CONFIG["host"],
        "POSTGRES_DB_PORT": POSTGRES_CONFIG["port"],
        "POSTGRES_DB_USER": POSTGRES_CONFIG["user"],
        "POSTGRES_DB_PASSWORD": POSTGRES_CONFIG["password"],
        "POSTGRES_DB_NAME": POSTGRES_CONFIG["database"],
    }
