# ===========================================
# SCM-INSIGHTS Backend Application
# ===========================================
# Main entry. Same tech and flow as main Impexinfo backend; separate DB and auth.

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from config import (
    FLASK_CONFIG,
    CORS_ORIGINS,
    SSL_CONFIG,
    get_database_config,
)


def create_app(config_override=None):
    app = Flask(__name__)
    app.secret_key = FLASK_CONFIG["SECRET_KEY"]
    app.config["ENV"] = FLASK_CONFIG["ENV"]
    app.config["DEBUG"] = FLASK_CONFIG["DEBUG"]
    if config_override:
        app.config.update(config_override)

    print(f"   CORS Origins: {CORS_ORIGINS}")
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

    from controllers.auth_controller import auth_bp
    from controllers.admin_controller import admin_bp
    from controllers.user_controller import user_bp
    from controllers.sims_data_controller import sims_data_bp
    from controllers.public_controller import public_bp
    from controllers.contact_controller import contact_bp
    from controllers.trade_controller import trade_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(sims_data_bp)
    app.register_blueprint(public_bp)
    app.register_blueprint(contact_bp)
    app.register_blueprint(trade_bp)

    # Legacy routes (same as /api/auth/*) so SCM frontend can use /login, /signup, /logout without change
    from controllers.auth_controller import login, signup, logout, forgot_password
    app.add_url_rule("/login", view_func=login, methods=["POST"])
    app.add_url_rule("/signup", view_func=signup, methods=["POST"])
    app.add_url_rule("/logout", view_func=logout, methods=["POST"])
    app.add_url_rule("/forgot-password", view_func=forgot_password, methods=["POST"])

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


@app.route("/health", methods=["GET"])
def health_check():
    return {"status": "healthy", "service": "scm-insights-backend"}, 200


if __name__ == "__main__":
    flask_env = FLASK_CONFIG["ENV"]
    debug_mode = flask_env == "development"
    host = FLASK_CONFIG["HOST"]
    port = FLASK_CONFIG["PORT"]
    print("")
    print("=" * 60)
    print("SCM-INSIGHTS Backend Server")
    print("=" * 60)
    print(f"   Environment:  {flask_env}")
    print(f"   Debug:       {debug_mode}")
    print(f"   Host:        {host}")
    print(f"   Port:        {port}")
    print("=" * 60)
    print("")
    if debug_mode:
        app.run(debug=True, host=host, port=port)
    else:
        cert_path = SSL_CONFIG["cert_path"]
        key_path = SSL_CONFIG["key_path"]
        if os.path.exists(cert_path) and os.path.exists(key_path):
            app.run(ssl_context=(cert_path, key_path), host=host, port=FLASK_CONFIG["SSL_PORT"])
        else:
            app.run(host=host, port=port)
