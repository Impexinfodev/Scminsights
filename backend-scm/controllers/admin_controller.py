# SCM-INSIGHTS Admin Controller - users and overview only
from flask import Blueprint, request, jsonify
from middlewares.auth_middleware import require_auth, require_admin
from utils.helpers import validate_pagination_params

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.route("/users", methods=["GET"])
@require_auth
@require_admin
def get_all_users():
    from repositories.repo_provider import RepoProvider
    is_valid, page, page_size, sort_order = validate_pagination_params(
        request.args.get("page", 1),
        request.args.get("page_size", 50),
        request.args.get("sort_order", "desc"),
    )
    if not is_valid:
        return jsonify({"error": "Invalid pagination parameters"}), 400
    search_term = (request.args.get("search") or "").strip() or None
    admin_repo = RepoProvider.get_admin_repo()
    users = admin_repo.get_all_users(sort_order=sort_order, search_term=search_term)
    total = len(users)
    start = (page - 1) * page_size
    end = start + page_size
    return jsonify({
        "users": users[start:end],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_users": total,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
        },
    }), 200


@admin_bp.route("/user", methods=["GET"])
@require_auth
@require_admin
def get_user_by_id():
    from repositories.repo_provider import RepoProvider
    user_id = request.args.get("EmailId", "").strip()
    if not user_id:
        return jsonify({"error": "EmailId is required"}), 400
    user_repo = RepoProvider.get_user_repo()
    user = user_repo.get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    license_valid = user.get("LicenseValidTill")
    if license_valid and hasattr(license_valid, "isoformat"):
        license_valid = license_valid.isoformat()
    return jsonify({
        "UserId": user.get("UserId"),
        "LicenseType": user.get("LicenseType"),
        "CompanyName": user.get("CompanyName"),
        "PhoneNumber": user.get("PhoneNumber"),
        "Gst": user.get("Gst"),
        "LicenseValidTill": license_valid,
        "ActivationStatus": user.get("ActivationStatus"),
        "Name": user.get("Name"),
        "Role": user.get("Role"),
    }), 200


@admin_bp.route("/user/status", methods=["PUT"])
@require_auth
@require_admin
def update_user_status():
    from repositories.repo_provider import RepoProvider
    data = request.json or {}
    user_id = data.get("EmailId", "").strip()
    status = data.get("ActivationStatus")
    if not user_id:
        return jsonify({"error": "EmailId is required"}), 400
    if status is None or not isinstance(status, bool):
        return jsonify({"error": "ActivationStatus must be true or false"}), 400
    user_repo = RepoProvider.get_user_repo()
    user = user_repo.get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    admin_repo = RepoProvider.get_admin_repo()
    admin_repo.update_user_activation_status(user_id, status)
    return jsonify({"message": "User status updated", "EmailId": user_id, "ActivationStatus": status}), 200


@admin_bp.route("/user", methods=["DELETE"])
@require_auth
@require_admin
def delete_user():
    from repositories.repo_provider import RepoProvider
    user_id = request.args.get("EmailId", "").strip()
    if not user_id:
        return jsonify({"error": "EmailId is required"}), 400
    admin_repo = RepoProvider.get_admin_repo()
    admin_repo.delete_user(user_id)
    return jsonify({"message": "User deleted"}), 200


@admin_bp.route("/overview", methods=["GET"])
@require_auth
@require_admin
def overview():
    """Overview tab: basic stats for admin dashboard."""
    from repositories.repo_provider import RepoProvider
    admin_repo = RepoProvider.get_admin_repo()
    users = admin_repo.get_all_users(sort_order="desc")
    total_users = len(users)
    active_users = sum(1 for u in users if u.get("ActivationStatus"))
    return jsonify({
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
    }), 200


# ---------- License management (same as main backend) ----------

def _license_to_plan_response(lic_type, info):
    """Build plan response for admin (full Directory/Buyers/Suppliers or legacy)."""
    if not info:
        info = {}
    # New shape
    if "Directory" in info or "LicenseName" in info:
        return {
            "LicenseType": lic_type,
            "LicenseName": info.get("LicenseName", lic_type),
            "Price": info.get("Price", 0),
            "PriceINR": info.get("PriceINR"),
            "PriceUSD": info.get("PriceUSD"),
            "ShortDescription": info.get("ShortDescription", ""),
            "Directory": info.get("Directory") or {"Access": "limited", "MaxRows": 10, "MaxRowsPerSearch": 5},
            "Buyers": info.get("Buyers") or {"Access": "custom", "MaxSearchesPerPeriod": 0, "MaxRowsPerSearch": 0},
            "Suppliers": info.get("Suppliers") or {"Access": "custom", "MaxSearchesPerPeriod": 0, "MaxRowsPerSearch": 0},
            "Validity": info.get("Validity", "Year"),
            "ValidityDays": info.get("ValidityDays", 365),
        }
    # Legacy flat shape
    return {
        "LicenseType": lic_type,
        "LicenseName": info.get("LicenseName", lic_type),
        "Price": info.get("Price", 0),
        "PriceINR": info.get("PriceINR"),
        "PriceUSD": info.get("PriceUSD"),
        "ShortDescription": info.get("ShortDescription", ""),
        "Directory": {
            "Access": "full" if info.get("IsSimsAccess") else "limited",
            "MaxRows": info.get("NumberOfRowsPerPeriod", 10),
            "MaxRowsPerSearch": info.get("DirectoryRowsPerSearch", 5),
        },
        "Buyers": {"Access": "custom", "MaxSearchesPerPeriod": 0, "MaxRowsPerSearch": 0},
        "Suppliers": {"Access": "custom", "MaxSearchesPerPeriod": 0, "MaxRowsPerSearch": 0},
        "Validity": info.get("Validity", info.get("Period", "Year")),
        "ValidityDays": info.get("ValidityDays", 365),
    }


@admin_bp.route("/licenses", methods=["GET"])
@require_auth
@require_admin
def get_all_licenses():
    from repositories.repo_provider import RepoProvider
    admin_repo = RepoProvider.get_admin_repo()
    all_licenses = admin_repo.get_all_licenses()
    licenses = [_license_to_plan_response(lic.get("LicenseType", ""), lic.get("LicenseInfo")) for lic in all_licenses]
    return jsonify(licenses), 200


def _normalize_license_payload(data):
    """Ensure Directory, Buyers, Suppliers exist with Access and optional limits."""
    out = dict(data)
    for key in ("Directory", "Buyers", "Suppliers"):
        val = out.get(key)
        if not isinstance(val, dict):
            if key == "Directory":
                val = {"Access": "limited", "MaxRows": 10, "MaxRowsPerSearch": 5}
            else:
                val = {"Access": "custom", "MaxSearchesPerPeriod": 0, "MaxRowsPerSearch": 0}
        else:
            if key == "Directory":
                val.setdefault("Access", "limited")
                val.setdefault("MaxRows", 10)
                val.setdefault("MaxRowsPerSearch", 5)
            else:
                val.setdefault("Access", "custom")
                val.setdefault("MaxSearchesPerPeriod", 0)
                val.setdefault("MaxRowsPerSearch", 0)
        out[key] = val
    out.setdefault("Validity", "Year")
    out.setdefault("ValidityDays", 365)
    if "PriceINR" not in out:
        out["PriceINR"] = out.get("Price", 0)
    if "PriceUSD" not in out:
        out["PriceUSD"] = out.get("Price", 0)
    return out


@admin_bp.route("/license", methods=["POST"])
@require_auth
@require_admin
def create_license():
    from repositories.repo_provider import RepoProvider
    data = request.json or {}
    license_type = (data.get("LicenseType") or "").strip()
    if not license_type:
        return jsonify({"error": "LicenseType is required (e.g. SILVER, GOLD)"}), 400
    license_type = license_type.upper().replace(" ", "_")
    admin_repo = RepoProvider.get_admin_repo()
    if admin_repo.get_license_by_type(license_type):
        return jsonify({"error": "License type already exists"}), 400
    payload = _normalize_license_payload({k: v for k, v in data.items() if k != "LicenseType"})
    payload["LicenseType"] = license_type
    if data.get("LicenseName"):
        payload["LicenseName"] = data["LicenseName"]
    admin_repo.create_license(license_type, payload)
    return jsonify({"message": "License created"}), 201


@admin_bp.route("/license", methods=["PUT"])
@require_auth
@require_admin
def update_license():
    from repositories.repo_provider import RepoProvider
    data = request.json or {}
    license_type = (data.get("LicenseType") or "").strip()
    if not license_type:
        return jsonify({"error": "LicenseType is required"}), 400
    admin_repo = RepoProvider.get_admin_repo()
    if not admin_repo.get_license_by_type(license_type):
        return jsonify({"error": "License type not found"}), 404
    payload = _normalize_license_payload({k: v for k, v in data.items() if k != "LicenseType"})
    payload["LicenseType"] = license_type
    if data.get("LicenseName"):
        payload["LicenseName"] = data["LicenseName"]
    admin_repo.create_license(license_type, payload)
    return jsonify({"message": "License updated"}), 200


@admin_bp.route("/license", methods=["DELETE"])
@require_auth
@require_admin
def delete_license():
    from repositories.repo_provider import RepoProvider
    license_type = (request.args.get("LicenseType") or "").strip()
    if not license_type:
        return jsonify({"error": "LicenseType is required"}), 400
    admin_repo = RepoProvider.get_admin_repo()
    admin_repo.delete_license(license_type)
    return jsonify({"message": "License deleted"}), 200


@admin_bp.route("/contacts", methods=["GET"])
@require_auth
@require_admin
def get_contacts():
    from repositories.repo_provider import RepoProvider
    page = max(1, int(request.args.get("page", 1)))
    page_size = max(1, min(100, int(request.args.get("page_size", 50))))
    sort_order = (request.args.get("sort_order") or "desc").lower()
    admin_repo = RepoProvider.get_admin_repo()
    messages, total = admin_repo.get_contact_messages(page=page, page_size=page_size, sort_order=sort_order)
    return jsonify({
        "contacts": messages,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
        },
    }), 200


@admin_bp.route("/contacts/<contact_id>", methods=["DELETE"])
@require_auth
@require_admin
def delete_contact(contact_id):
    from repositories.repo_provider import RepoProvider
    if not contact_id or not contact_id.strip():
        return jsonify({"error": "Contact ID is required"}), 400
    admin_repo = RepoProvider.get_admin_repo()
    contact = admin_repo.get_contact_by_id(contact_id.strip())
    if not contact:
        return jsonify({"error": "Contact not found"}), 404
    admin_repo.delete_contact(contact_id.strip())
    return jsonify({"message": "Contact deleted"}), 200


@admin_bp.route("/contacts/<contact_id>/reply", methods=["POST"])
@require_auth
@require_admin
def reply_contact(contact_id):
    from repositories.repo_provider import RepoProvider
    from services.email_service import EmailService
    if not contact_id or not contact_id.strip():
        return jsonify({"error": "Contact ID is required"}), 400
    data = request.json or {}
    body = (data.get("body") or data.get("message") or "").strip()
    if not body:
        return jsonify({"error": "Reply body is required"}), 400
    admin_repo = RepoProvider.get_admin_repo()
    contact = admin_repo.get_contact_by_id(contact_id.strip())
    if not contact:
        return jsonify({"error": "Contact not found"}), 404
    subject = (data.get("subject") or "").strip()
    if not subject:
        user_msg = (contact.get("Message") or "").strip()[:50]
        subject = f"Re: {user_msg}" if user_msg else "Re: Your enquiry – SCM Insights"
    ok = EmailService().send_contact_reply(
        to_email=contact["Email"],
        recipient_name=contact.get("Name") or "there",
        subject=subject,
        body=body,
    )
    if not ok:
        return jsonify({"error": "Failed to send email. Check SMTP configuration."}), 500
    admin_repo.update_contact_status(contact_id.strip(), "REPLIED")
    return jsonify({"message": "Reply sent and status updated to REPLIED"}), 200


@admin_bp.route("/assign-license", methods=["POST"])
@require_auth
@require_admin
def assign_license():
    from repositories.repo_provider import RepoProvider
    data = request.json or {}
    user_id = (data.get("UserId") or data.get("EmailId") or "").strip()
    license_type = (data.get("LicenseType") or "").strip()
    if not user_id or not license_type:
        return jsonify({"error": "UserId and LicenseType are required"}), 400
    user_repo = RepoProvider.get_user_repo()
    if "@" in user_id:
        by_email = user_repo.get_user_by_email(user_id)
        if not by_email:
            return jsonify({"error": "User not found"}), 404
        user_id = by_email.get("UserId") or by_email.get("user_id") or user_id
    else:
        u = user_repo.get_user_by_id(user_id)
        if not u:
            return jsonify({"error": "User not found"}), 404
    admin_repo = RepoProvider.get_admin_repo()
    if not admin_repo.get_license_by_type(license_type):
        return jsonify({"error": "License type not found"}), 404
    admin_repo.assign_license(user_id, license_type)
    return jsonify({"message": "License assigned"}), 200
