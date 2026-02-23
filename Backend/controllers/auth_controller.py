# SCM-INSIGHTS Auth Controller
import os
from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from services.auth_service import AuthService
from services.email_service import EmailService
from middlewares.auth_middleware import require_auth
from utils.helpers import is_valid_email
from utils.constants import COUNTRY_NAMES
from config import DOMAIN_URL

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
def login():
    from repositories.repo_provider import RepoProvider
    data = request.json or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    user_repo = RepoProvider.get_user_repo()
    user = user_repo.get_user_by_email(email)
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401
    if not AuthService.verify_password(password, user["HashPassword"]):
        return jsonify({"error": "Invalid email or password"}), 401
    if not user.get("ActivationStatus", False):
        return jsonify({
            "error": "Account not activated. Please check your email.",
            "code": "ACCOUNT_NOT_ACTIVATED",
        }), 401
    user_id = user["UserId"]
    session_token, expiration_time = user_repo.create_new_session(user_id, client_id="scm-insights")
    user_info = user_repo.get_user_with_license_check(user_id)
    license_info = user_repo.get_license_by_user_id(user_id)
    tokens = user_repo.refresh_tokens(user_id)
    response_data = {
        "session_token": session_token,
        "session_expiration_time": str(expiration_time),
        "user_id": user_id,
        "user_details": user_info,
        "license": license_info,
        "tokens": tokens,
        "countries": COUNTRY_NAMES,
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
    return response, 200


@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    from repositories.repo_provider import RepoProvider
    user_repo = RepoProvider.get_user_repo()
    user_repo.delete_session(request.user_id, client_id="scm-insights")
    response = jsonify({"message": "Logout successful"})
    response.delete_cookie("session_token")
    response.delete_cookie("user_id")
    return response, 200


@auth_bp.route("/signup", methods=["POST"])
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
    activation_url = f"{DOMAIN_URL}/account-activate?token={activation_code}"
    EmailService().send_activation_email(email, activation_url)
    return jsonify({
        "message": "Registration successful. Please check your email to activate your account.",
    }), 201


@auth_bp.route("/account-activate", methods=["POST"])
def activate_account():
    from repositories.repo_provider import RepoProvider
    token = request.args.get("token", "").strip()
    if not token:
        return jsonify({"error": "Activation token is required"}), 400
    user_repo = RepoProvider.get_user_repo()
    user_id = user_repo.get_user_if_activation_link_valid(token)
    if not user_id:
        return jsonify({"error": "Invalid or expired activation token"}), 400
    user_repo.activate_user(user_id)
    return jsonify({"message": "Account activated successfully. You can now login."}), 200


@auth_bp.route("/resend-activation", methods=["POST"])
def resend_activation():
    from repositories.repo_provider import RepoProvider
    data = request.json or {}
    email = data.get("email", "").strip()
    if not is_valid_email(email):
        return jsonify({"error": "Invalid email format"}), 400
    user_repo = RepoProvider.get_user_repo()
    user = user_repo.get_user_by_email(email)
    if not user:
        return jsonify({"error": "User not found. Please sign up first."}), 404
    if user.get("ActivationStatus", False):
        return jsonify({"error": "Account is already activated"}), 400
    activation_code = user_repo.create_new_activation_link(email)
    activation_url = f"{DOMAIN_URL}/account-activate?token={activation_code}"
    EmailService().send_activation_email(email, activation_url)
    return jsonify({"message": "Activation email sent. Please check your inbox."}), 200


@auth_bp.route("/forgot-password", methods=["POST"])
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
        reset_url = f"{DOMAIN_URL}/reset-password?token={reset_token}"
        EmailService().send_password_reset_email(email, reset_url)
    return jsonify({
        "message": "If an account exists with this email, a password reset link has been sent.",
    }), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    from repositories.repo_provider import RepoProvider
    token = request.args.get("token", "").strip()
    data = request.json or {}
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
    return jsonify({"message": "Password has been reset successfully. You can now login."}), 200
