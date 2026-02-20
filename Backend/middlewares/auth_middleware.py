# SCM-INSIGHTS Auth Middleware
from functools import wraps
from flask import request, jsonify
from datetime import datetime, timezone
from config import WHITELISTED_ADMINS


def require_auth(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        from repositories.repo_provider import RepoProvider
        user_repo = RepoProvider.get_user_repo()
        session_token = (
            request.cookies.get("session_token")
            or request.headers.get("Session-Token")
            or request.headers.get("session-token")
            or request.headers.get("session_token")
        )
        if not session_token:
            return jsonify({"error": "Authentication required", "code": "SESSION_TOKEN_MISSING"}), 401
        session = user_repo.get_user_session_from_session_token(session_token)
        if not session:
            return jsonify({"error": "Invalid session token", "code": "SESSION_INVALID"}), 401
        expiration_time = session.get("expiration_time")
        if expiration_time:
            if expiration_time.tzinfo is None:
                expiration_time = expiration_time.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > expiration_time:
                return jsonify({"error": "Session expired, please login again", "code": "SESSION_EXPIRED"}), 401
        user = user_repo.get_user_by_id(session["user_id"])
        if not user:
            return jsonify({"error": "User not found", "code": "USER_NOT_FOUND"}), 404
        request.user_id = user["UserId"]
        request.user = user
        return func(*args, **kwargs)
    return wrapper


def require_admin(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        from repositories.repo_provider import RepoProvider
        user_id = getattr(request, "user_id", None)
        if not user_id:
            return jsonify({"error": "Authentication required", "code": "UNAUTHORIZED"}), 401
        if user_id in WHITELISTED_ADMINS:
            return func(*args, **kwargs)
        admin_repo = RepoProvider.get_admin_repo()
        if admin_repo.is_user_admin(user_id):
            return func(*args, **kwargs)
        return jsonify({"error": "Admin access required", "code": "FORBIDDEN"}), 403
    return wrapper
