# SCM-INSIGHTS Auth Controller
import os
import logging
from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from services.auth_service import AuthService
from services.email_service import EmailService
from middlewares.auth_middleware import require_auth
from utils.helpers import is_valid_email
from utils.audit import audit_event
from config import FRONTEND_URL
from extensions import limiter

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10/minute")
def login():
    from repositories.repo_provider import RepoProvider
    from datetime import datetime, timezone
    data = request.json or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    user_repo = RepoProvider.get_user_repo()
    user = user_repo.get_user_by_email(email)
    # SEC-04: Use constant-time response for unknown email (no enumeration)
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    user_id = user["UserId"]

    # SEC-04: Check per-account lockout BEFORE password verification
    try:
        lockout = user_repo.get_login_lockout_status(user_id)
        locked_until = lockout.get("locked_until")
        if locked_until and datetime.now(timezone.utc) < locked_until:
            remaining = int((locked_until - datetime.now(timezone.utc)).total_seconds() / 60) + 1
            audit_event("login_blocked", user_id=user_id, outcome="fail", reason="account_locked", remaining_minutes=remaining)
            return jsonify({
                "error": f"Account temporarily locked due to too many failed attempts. Try again in {remaining} minute(s).",
                "code": "ACCOUNT_LOCKED",
            }), 429
    except Exception as _e:
        # OBS-05 FIX: Log at DEBUG instead of silently swallowing — helps diagnose
        # DB migration issues where lockout columns don't yet exist.
        logger.debug("Lockout check skipped (columns may not exist yet): %s", type(_e).__name__)

    if not AuthService.verify_password(password, user["HashPassword"]):
        # SEC-04: Record failed attempt; may trigger lockout
        try:
            user_repo.record_failed_login(user_id)
        except Exception as _e:
            logger.debug("record_failed_login skipped: %s", type(_e).__name__)
        audit_event("login_fail", user_id=user_id, outcome="fail", reason="bad_password")
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.get("ActivationStatus", False):
        audit_event("login_fail", user_id=user_id, outcome="fail", reason="account_not_activated")
        return jsonify({
            "error": "Account not activated. Please check your email.",
            "code": "ACCOUNT_NOT_ACTIVATED",
        }), 401

    # SEC-04: Successful login — reset failed attempt counter
    try:
        user_repo.reset_failed_login(user_id)
    except Exception as _e:
        logger.debug("reset_failed_login skipped: %s", type(_e).__name__)

    session_token, expiration_time = user_repo.create_new_session(user_id, client_id="scm-insights")
    user_info = user_repo.get_user_by_id(user_id)
    license_info = user_repo.get_license_by_user_id(user_id)
    tokens = user_repo.refresh_tokens(user_id)
    response_data = {
        "session_token": session_token,
        "session_expiration_time": str(expiration_time),
        "user_id": user_id,
        "user_details": user_info,
        "license": license_info,
        "tokens": tokens,
    }
    response = jsonify(response_data)
    secure_cookie = os.environ.get("FLASK_ENV") == "production"
    response.set_cookie(
        "session_token", session_token,
        httponly=True, samesite="Lax", secure=secure_cookie
    )
    response.set_cookie(
        "user_id", user_id,
        httponly=True, samesite="Lax", secure=secure_cookie
    )
    audit_event("login_success", user_id=user_id, outcome="ok")
    return response, 200


@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    from repositories.repo_provider import RepoProvider
    user_repo = RepoProvider.get_user_repo()
    user_repo.delete_session(request.user_id, client_id="scm-insights")
    audit_event("logout", user_id=request.user_id, outcome="ok")
    response = jsonify({"message": "Logout successful"})
    response.delete_cookie("session_token")
    response.delete_cookie("user_id")
    return response, 200


@auth_bp.route("/signup", methods=["POST"])
@limiter.limit("5/minute")
def signup():
    from repositories.repo_provider import RepoProvider
    data = request.json or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")
    name = data.get("name", "").strip()
    phone_number = data.get("phoneNumber", "").strip()
    phone_country_code = data.get("phoneNumberCountryCode", "+91").strip()
    company_name = data.get("companyName", "").strip()
    if not is_valid_email(email):
        return jsonify({"error": "Invalid email format"}), 400
    password_check = AuthService.validate_password_strength(password)
    if not password_check["valid"]:
        return jsonify({"error": "Password does not meet requirements", "details": password_check["errors"]}), 400
    user_repo = RepoProvider.get_user_repo()
    if user_repo.user_exists(email, phone_number, phone_country_code):
        return jsonify({"error": "Email or phone number already registered"}), 400
    hashed_password = AuthService.hash_password(password)
    user_data = {
        "user_id": email,
        "email": email,
        "name": name or email.split("@")[0],
        "hash_password": hashed_password,
        "logon_timestamp": datetime.now(timezone.utc),
        "company_name": company_name,
        "phone_number": phone_number,
        "phone_number_country_code": phone_country_code,
    }
    activation_code = user_repo.create_user(user_data)
    activation_url = f"{FRONTEND_URL}/account-activate?token={activation_code}"
    EmailService().send_activation_email(email, activation_url)
    audit_event("signup", user_id=user_data["user_id"], outcome="ok")
    return jsonify({
        "message": "Registration successful. Please check your email to activate your account.",
    }), 201


@auth_bp.route("/account-activate", methods=["POST"])
def activate_account():
    from repositories.repo_provider import RepoProvider
    # Accept token from POST body (preferred: not logged in server access logs or Referer headers)
    # Fall back to query param for backwards-compatibility with existing activation email links
    data = request.json or {}
    token = (data.get("token") or request.args.get("token") or "").strip()
    if not token:
        return jsonify({"error": "Activation token is required"}), 400
    user_repo = RepoProvider.get_user_repo()
    user_id = user_repo.get_user_if_activation_link_valid(token)
    if not user_id:
        return jsonify({"error": "Invalid or expired activation token"}), 400
    user_repo.activate_user(user_id)
    return jsonify({"message": "Account activated successfully. You can now login."}), 200


@auth_bp.route("/resend-activation", methods=["POST"])
@limiter.limit("3/minute;10/hour")
def resend_activation():
    from repositories.repo_provider import RepoProvider
    data = request.json or {}
    email = data.get("email", "").strip()
    if not is_valid_email(email):
        return jsonify({"error": "Invalid email format"}), 400
    user_repo = RepoProvider.get_user_repo()
    user = user_repo.get_user_by_email(email)
    # CQ-07 FIX: Use constant-time response to prevent email enumeration.
    # We silently do nothing for unknown/already-activated emails.
    if user and not user.get("ActivationStatus", False):
        activation_code = user_repo.create_new_activation_link(email)
        activation_url = f"{FRONTEND_URL}/account-activate?token={activation_code}"
        EmailService().send_activation_email(email, activation_url)
    return jsonify({"message": "If an unactivated account exists for this email, a new activation link has been sent."}), 200


@auth_bp.route("/forgot-password", methods=["POST"])
@limiter.limit("5/minute;20/hour")
def forgot_password():
    from repositories.repo_provider import RepoProvider
    data = request.json or {}
    email = data.get("email", "").strip()
    if not email:
        return jsonify({"error": "Email is required"}), 400
    user_repo = RepoProvider.get_user_repo()
    user = user_repo.get_user_by_email(email)
    if user:
        reset_token = user_repo.create_reset_token(user["UserId"])
        reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"
        EmailService().send_password_reset_email(email, reset_url)
    return jsonify({
        "message": "If an account exists with this email, a password reset link has been sent.",
    }), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    from repositories.repo_provider import RepoProvider
    data = request.json or {}
    # Accept token from POST body (preferred) or query param (backwards-compat for email links)
    token = (data.get("token") or request.args.get("token") or "").strip()
    new_password = data.get("new_password", "")
    if not token:
        return jsonify({"error": "Reset token is required"}), 400
    if not new_password:
        return jsonify({"error": "New password is required"}), 400
    password_check = AuthService.validate_password_strength(new_password)
    if not password_check["valid"]:
        return jsonify({"error": "Password does not meet requirements", "details": password_check["errors"]}), 400
    user_repo = RepoProvider.get_user_repo()
    user_id = user_repo.get_user_by_reset_token(token)
    if not user_id:
        return jsonify({"error": "Invalid or expired reset token"}), 400
    hashed = AuthService.hash_password(new_password)
    user_repo.update_password(user_id, hashed)
    user_repo.delete_reset_token(token)
    # SEC-03 FIX: Invalidate ALL existing sessions so any attacker who obtained
    # a session before the reset cannot continue using it post-password-change.
    try:
        user_repo.delete_all_sessions(user_id)
    except Exception as _e:
        logger.warning(
            "Could not purge sessions after password reset for user %s: %s",
            str(user_id)[:8] + "***", type(_e).__name__,
        )
    audit_event("password_reset", user_id=user_id, outcome="ok")
    return jsonify({"message": "Password has been reset successfully. You can now login."}), 200
