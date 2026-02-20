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

FLASK_CONFIG = {
    "SECRET_KEY": get_env("FLASK_SECRET_KEY", "change-this-secret-in-production"),
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
    "http://localhost:3000,https://scminsights.ai,https://www.scminsights.ai",
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

if os.environ.get("FLASK_ENV", "development") == "production":
    DOMAIN_URL = get_env("DOMAIN_URL", "https://scminsights.ai")
else:
    DOMAIN_URL = get_env("DOMAIN_URL", "http://localhost:3001")
BACKEND_URL = get_env("BACKEND_URL", "http://localhost:5001")


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
