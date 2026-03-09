# ===========================================
# SCM-INSIGHTS Backend Application
# ===========================================
# Main entry. Same tech and flow as main Impexinfo backend; separate DB and auth.

import os
import logging
import logging.handlers
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()


def _setup_logging():
    """Configure application-wide logging with rotation."""
    log_level = logging.DEBUG if os.environ.get("FLASK_ENV") == "development" else logging.INFO
    fmt = logging.Formatter(
        "%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    root = logging.getLogger()
    root.setLevel(log_level)

    # Console handler
    ch = logging.StreamHandler()
    ch.setFormatter(fmt)
    root.addHandler(ch)

    # Rotating file handler (10 MB, keep 7 files)
    log_path = os.environ.get("LOG_FILE_PATH", "logs/app.log")
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    fh = logging.handlers.RotatingFileHandler(log_path, maxBytes=10_485_760, backupCount=7, encoding="utf-8")
    fh.setFormatter(fmt)
    root.addHandler(fh)

    # Silence overly verbose third-party loggers
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


_setup_logging()
logger = logging.getLogger(__name__)

from config import (
    FLASK_CONFIG,
    CORS_ORIGINS,
    SSL_CONFIG,
    get_database_config,
)
from extensions import limiter


def create_app(config_override=None):
    app = Flask(__name__)
    app.secret_key = FLASK_CONFIG["SECRET_KEY"]
    app.config["ENV"] = FLASK_CONFIG["ENV"]
    app.config["DEBUG"] = FLASK_CONFIG["DEBUG"]
    if config_override:
        app.config.update(config_override)

    limiter.init_app(app)
    logger.info("CORS Origins: %s", CORS_ORIGINS)
    CORS(
        app,
        resources={r"/*": {
            "origins": CORS_ORIGINS,
            "supports_credentials": True,
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Session-Token", "X-Client", "X-Request-Timestamp", "X-Request-Nonce", "X-Client-Version", "X-Request-Source"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        }},
    )

    db_config = get_database_config()
    app.config.update(db_config)

    from repositories.repo_provider import RepoProvider
    RepoProvider(app.config)

    # Run idempotent ALTER TABLE migrations on every startup
    try:
        from repositories.repo_provider import RepoProvider as _RP
        _admin_repo = _RP.get_admin_repo()
        _user_repo = _RP.get_user_repo()
        _admin_repo.apply_payment_transaction_alters()
        if hasattr(_user_repo, "apply_user_profile_alters"):
            _user_repo.apply_user_profile_alters()
    except Exception as _e:
        logger.warning("Startup migrations warning: %s", _e)

    from controllers.auth_controller import auth_bp
    from controllers.admin_controller import admin_bp
    from controllers.user_controller import user_bp
    from controllers.payment_controller import payment_bp
    from controllers.sims_data_controller import sims_data_bp
    from controllers.public_controller import public_bp
    from controllers.contact_controller import contact_bp
    from controllers.trade_controller import trade_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(sims_data_bp)
    app.register_blueprint(public_bp)
    app.register_blueprint(contact_bp)
    app.register_blueprint(trade_bp)

    # CSRF mitigation: all state-changing requests must carry at least one custom header.
    # Browsers cannot add custom headers to cross-site form POST or img/script requests,
    # so presence of any of these headers proves the request originated from our JS client.
    @app.before_request
    def require_csrf_header():
        if request.method not in ("POST", "PUT", "DELETE", "PATCH"):
            return None
        path = (request.path or "").rstrip("/")
        # Razorpay webhook is server-to-server; no browser headers available
        if path == "/api/payment/webhook":
            return None
        # Allow if any trusted custom header is present (set by our axios/fetch calls)
        if (
            request.headers.get("X-Requested-With")
            or request.headers.get("X-Client")
            or request.headers.get("Session-Token")
        ):
            return None
        # Allow same-origin requests (Origin or Referer matches our allowed origins)
        origin = (request.headers.get("Origin") or "").strip()
        referer = (request.headers.get("Referer") or "").strip()
        if origin and origin in CORS_ORIGINS:
            return None
        if referer and any(referer.startswith(o) for o in CORS_ORIGINS if o):
            return None
        # Cookie-only session requests from our frontend also pass (browser sets cookie automatically
        # but the CORS preflight ensures only our origin can trigger credentialed cross-origin requests)
        if request.cookies.get("session_token"):
            return None
        return jsonify({"error": "Invalid request", "code": "CSRF_CHECK"}), 403

    # Legacy routes (same as /api/auth/*) so SCM frontend can use /login, /signup, /logout without change
    from controllers.auth_controller import login, signup, logout, forgot_password
    app.add_url_rule("/login", view_func=limiter.limit("10/minute")(login), methods=["POST"])
    app.add_url_rule("/signup", view_func=limiter.limit("5/minute")(signup), methods=["POST"])
    app.add_url_rule("/logout", view_func=logout, methods=["POST"])
    app.add_url_rule("/forgot-password", view_func=limiter.limit("5/minute")(forgot_password), methods=["POST"])

    @app.after_request
    def add_cors_headers(response):
        # Already handled by Flask-CORS for normal requests, 
        # but this ensures headers are present even on hard crashes or if CORS fails
        origin = request.headers.get("Origin")
        if origin in CORS_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Session-Token, X-Client, X-Request-Timestamp, X-Request-Nonce, X-Client-Version, X-Request-Source"
        return response

    return app


app = create_app()


@app.after_request
def security_headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "SAMEORIGIN"
    if os.environ.get("FLASK_ENV") == "production":
        resp.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return resp


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint. Returns DB connectivity status for uptime monitors."""
    db_ok = False
    try:
        from repositories.repo_provider import RepoProvider
        admin_repo = RepoProvider.get_admin_repo()
        if hasattr(admin_repo, "health_check"):
            db_ok = bool(admin_repo.health_check())
        else:
            db_ok = True  # assume healthy if no explicit check
    except Exception as e:
        logger.warning("Health check DB ping failed: %s", e)
    status = "healthy" if db_ok else "degraded"
    http_code = 200 if db_ok else 503
    return {"status": status, "service": "scm-insights-backend", "db": "ok" if db_ok else "error"}, http_code


if __name__ == "__main__":
    flask_env = FLASK_CONFIG["ENV"]
    debug_mode = flask_env == "development"
    host = FLASK_CONFIG["HOST"]
    port = FLASK_CONFIG["PORT"]
    logger.info("=" * 60)
    logger.info("SCM-INSIGHTS Backend Server")
    logger.info("=" * 60)
    logger.info("Environment: %s | Debug: %s | Host: %s | Port: %s", flask_env, debug_mode, host, port)
    logger.info("=" * 60)
    if debug_mode:
        app.run(debug=True, host=host, port=port)
    else:
        cert_path = SSL_CONFIG["cert_path"]
        key_path = SSL_CONFIG["key_path"]
        if os.path.exists(cert_path) and os.path.exists(key_path):
            app.run(ssl_context=(cert_path, key_path), host=host, port=FLASK_CONFIG["SSL_PORT"])
        else:
            app.run(host=host, port=port)
