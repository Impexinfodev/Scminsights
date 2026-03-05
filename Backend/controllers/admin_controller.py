# SCM-INSIGHTS Admin Controller - users and overview only
from flask import Blueprint, request, jsonify
from middlewares.auth_middleware import require_auth, require_admin
from utils.helpers import validate_pagination_params

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def _users_query_params():
    """Parse sort_by, sort_order, status filter for users list."""
    sort_by = (request.args.get("sort_by") or "").strip().lower() or None
    if sort_by and sort_by not in ("email", "name", "status"):
        sort_by = None
    sort_order = (request.args.get("sort_order") or "desc").strip().lower()
    if sort_order not in ("asc", "desc"):
        sort_order = "desc"
    status_param = (request.args.get("status") or "").strip().lower()
    activation_status = None
    if status_param == "active":
        activation_status = True
    elif status_param == "inactive":
        activation_status = False
    return sort_by, sort_order, activation_status


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
    sort_by, sort_order, activation_status = _users_query_params()
    admin_repo = RepoProvider.get_admin_repo()
    users, total = admin_repo.get_all_users(
        sort_order=sort_order,
        search_term=search_term,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        activation_status=activation_status,
    )
    return jsonify({
        "users": users,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_users": total,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
        },
    }), 200


@admin_bp.route("/users/export", methods=["GET"])
@require_auth
@require_admin
def export_users():
    from repositories.repo_provider import RepoProvider
    from flask import Response
    import csv
    import io
    search_term = (request.args.get("search") or "").strip() or None
    sort_by, sort_order, activation_status = _users_query_params()
    admin_repo = RepoProvider.get_admin_repo()
    users, _ = admin_repo.get_all_users(
        sort_order=sort_order,
        search_term=search_term,
        page=1,
        page_size=10000,
        sort_by=sort_by,
        activation_status=activation_status,
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Email", "Name", "Company", "Status", "License", "User Id"])
    for u in users:
        writer.writerow([
            u.get("EmailId") or u.get("UserId") or "",
            u.get("Name") or "",
            u.get("Company") or "",
            "Active" if u.get("ActivationStatus") else "Inactive",
            u.get("LicenseType") or "",
            u.get("UserId") or "",
        ])
    return Response(
        buf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=users.csv"},
    )


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
    """Overview tab: stats for admin dashboard including revenue, today active, API health."""
    from repositories.repo_provider import RepoProvider
    admin_repo = RepoProvider.get_admin_repo()
    total_users, active_users = admin_repo.get_users_overview_counts()
    today_active = 0
    revenue_total_paise = 0
    revenue_by_month = []
    api_health = False
    if hasattr(admin_repo, "get_today_active_count"):
        try:
            today_active = admin_repo.get_today_active_count()
        except Exception:
            pass
    if hasattr(admin_repo, "get_revenue_stats"):
        try:
            revenue_total_paise, revenue_by_month = admin_repo.get_revenue_stats(months=6)
        except Exception:
            pass
    if hasattr(admin_repo, "health_check"):
        try:
            api_health = admin_repo.health_check()
        except Exception:
            pass
    return jsonify({
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "today_active_users": today_active,
        "revenue_total_paise": revenue_total_paise,
        "revenue_by_month": revenue_by_month,
        "api_health": bool(api_health),
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
            "HsCode": info.get("HsCode") or {"Access": "full", "MaxRows": 99999, "MaxRowsPerSearch": 100},
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
        "HsCode": info.get("HsCode") or {"Access": "full", "MaxRows": 99999, "MaxRowsPerSearch": 100},
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


@admin_bp.route("/licenses/stats", methods=["GET"])
@require_auth
@require_admin
def get_license_stats():
    """Returns total users and user count per license type for admin stats cards."""
    from repositories.repo_provider import RepoProvider
    admin_repo = RepoProvider.get_admin_repo()
    if not hasattr(admin_repo, "get_license_user_counts"):
        return jsonify({"total_users": 0, "by_license": []}), 200
    total, by_license = admin_repo.get_license_user_counts()
    all_licenses = admin_repo.get_all_licenses()
    name_map = {}
    for lic in all_licenses:
        lt = lic.get("LicenseType", "")
        info = lic.get("LicenseInfo") or {}
        name_map[lt] = info.get("LicenseName", lt)
    result = [
        {"license_type": b["license_type"], "license_name": name_map.get(b["license_type"], b["license_type"]), "count": b["count"]}
        for b in by_license
    ]
    return jsonify({"total_users": total, "by_license": result}), 200


def _normalize_license_payload(data):
    """Ensure Directory, Buyers, Suppliers, HsCode exist with Access and optional limits."""
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
    # HsCode: full | limited | custom (same shape as Directory for row caps)
    hscode = out.get("HsCode")
    if not isinstance(hscode, dict):
        hscode = {"Access": "full", "MaxRows": 99999, "MaxRowsPerSearch": 100}
    else:
        hscode.setdefault("Access", "full")
        hscode.setdefault("MaxRows", 99999)
        hscode.setdefault("MaxRowsPerSearch", 100)
    out["HsCode"] = hscode
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


@admin_bp.route("/transactions", methods=["GET"])
@require_auth
@require_admin
def get_transactions():
    from repositories.repo_provider import RepoProvider
    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("page_size", 50, type=int)
    sort_order = (request.args.get("sort_order") or "desc").strip().lower()
    status = request.args.get("status", "").strip() or None
    user_id = request.args.get("user_id", "").strip() or None
    from_date = request.args.get("from_date", "").strip() or None
    to_date = request.args.get("to_date", "").strip() or None
    website = request.args.get("website", "").strip() or None
    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    admin_repo = RepoProvider.get_admin_repo()
    rows, total = admin_repo.get_transactions(
        page=page,
        page_size=page_size,
        sort_order=sort_order,
        status=status,
        user_id=user_id,
        from_date=from_date,
        to_date=to_date,
        website=website,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    return jsonify({
        "transactions": rows,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        },
    }), 200


@admin_bp.route("/transactions/export", methods=["GET"])
@require_auth
@require_admin
def export_transactions():
    from repositories.repo_provider import RepoProvider
    from flask import Response
    import csv
    import io
    status = request.args.get("status", "").strip() or None
    user_id = request.args.get("user_id", "").strip() or None
    from_date = request.args.get("from_date", "").strip() or None
    to_date = request.args.get("to_date", "").strip() or None
    website = request.args.get("website", "").strip() or None
    admin_repo = RepoProvider.get_admin_repo()
    rows, _ = admin_repo.get_transactions(
        page=1,
        page_size=10000,
        sort_order="desc",
        status=status,
        user_id=user_id,
        from_date=from_date,
        to_date=to_date,
        website=website,
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "Id", "Date", "Order ID", "Payment ID", "User ID", "Email", "Plan", "Amount (₹)", "Currency", "Status", "Website", "Created At", "Updated At",
    ])
    for r in rows:
        amount_rupees = (r.get("AmountPaise") or 0) / 100
        writer.writerow([
            r.get("Id"),
            r.get("CreatedAt", "")[:10],
            r.get("RazorpayOrderId"),
            r.get("RazorpayPaymentId"),
            r.get("UserId"),
            r.get("EmailId"),
            r.get("LicenseType"),
            f"{amount_rupees:.2f}",
            r.get("Currency"),
            r.get("Status"),
            r.get("SourceWebsite") or "",
            r.get("CreatedAt"),
            r.get("UpdatedAt"),
        ])
    return Response(
        buf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"},
    )
