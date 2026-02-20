# SCM-INSIGHTS Contact form (public submit, no auth)
import re
from flask import Blueprint, request, jsonify

contact_bp = Blueprint("contact", __name__, url_prefix="/api/contact")


def _is_valid_email(email):
    if not email or not isinstance(email, str):
        return False
    return bool(re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email.strip()))


@contact_bp.route("", methods=["POST", "OPTIONS"])
def submit_contact():
    if request.method == "OPTIONS":
        return "", 204
    data = request.json or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or data.get("Email") or "").strip()
    phone = (data.get("phone") or data.get("phoneNumber") or "").strip()
    message = (data.get("message") or "").strip()

    if not name:
        return jsonify({"error": "Name is required"}), 400
    if not email or not _is_valid_email(email):
        return jsonify({"error": "Valid email is required"}), 400
    if not message:
        return jsonify({"error": "Message is required"}), 400

    try:
        from repositories.repo_provider import RepoProvider
        admin_repo = RepoProvider.get_admin_repo()
        admin_repo.save_contact_message(name, email, phone, message)
        return jsonify({"message": "Thank you for your message. We'll get back to you soon."}), 200
    except Exception as e:
        print(f"Contact save error: {e}")
        return jsonify({"error": "Failed to submit your message. Please try again."}), 500
