# SCM-INSIGHTS User controller: license, supplier-countries, hscodes (DB or CSV)
import re
import io
import csv
import json
import logging
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, Response

from middlewares.auth_middleware import require_auth

# GSTIN format: 2-digit state code + 10-char PAN + 1 entity digit + 1 char + Z + 1 check char
_GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")

logger = logging.getLogger(__name__)
from repositories.repo_provider import RepoProvider
from utils.constants import SUPPLIER_COUNTRIES
from utils.hsn_data import get_gst_hsn_codes

user_bp = Blueprint("user", __name__)


def _serialize_license(license_info):
    """Ensure LicenseValidTill is ISO string and all keys are JSON-serializable."""
    if not license_info or not isinstance(license_info, dict):
        return license_info
    out = dict(license_info)
    lt = out.get("LicenseValidTill")
    if lt is not None and hasattr(lt, "isoformat"):
        out["LicenseValidTill"] = lt.isoformat()
    return out


@user_bp.route("/api/profile", methods=["GET"])
@require_auth
def get_profile():
    try:
        user_repo = RepoProvider.get_user_repo()
        user = user_repo.get_user_by_id(request.user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({
            "name": user.get("Name") or "",
            "email": user.get("EmailId") or "",
            "companyName": user.get("CompanyName") or "",
            "phoneNumber": user.get("PhoneNumber") or "",
            "phoneCountryCode": user.get("PhoneNumberCountryCode") or "+91",
            "gstin": user.get("Gst") or "",
        }), 200
    except Exception as e:
        logger.error("get_profile failed: %s", type(e).__name__, exc_info=False)
        return jsonify({"error": "Failed to fetch profile"}), 500


@user_bp.route("/api/profile", methods=["PUT"])
@require_auth
def update_profile():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    company_name = (data.get("companyName") or "").strip()
    phone_number = (data.get("phoneNumber") or "").strip()
    phone_country_code = (data.get("phoneCountryCode") or "+91").strip()
    gstin = (data.get("gstin") or "").strip().upper()

    if name and len(name) > 200:
        return jsonify({"error": "Name too long"}), 400
    if company_name and len(company_name) > 300:
        return jsonify({"error": "Company name too long"}), 400
    if gstin and not _GSTIN_RE.match(gstin):
        return jsonify({"error": "Invalid GSTIN format"}), 400

    try:
        user_repo = RepoProvider.get_user_repo()
        updated = user_repo.update_profile(
            request.user_id,
            name=name or None,
            company_name=company_name or None,
            phone_number=phone_number or None,
            phone_country_code=phone_country_code or None,
            gst=gstin if gstin is not None else None,
        )
        if not updated:
            return jsonify({"error": "No fields to update"}), 400
        return jsonify({"message": "Profile updated successfully"}), 200
    except Exception as e:
        logger.error("update_profile failed: %s", type(e).__name__, exc_info=False)
        return jsonify({"error": "Failed to update profile"}), 500


@user_bp.route("/userLicenseInfo", methods=["GET"])
@require_auth
def get_user_license_info():
    try:
        user_id = request.user_id
        user_repo = RepoProvider.get_user_repo()
        license_info = user_repo.get_license_by_user_id(user_id)
        if not license_info:
            license_info = {
                "LicenseType": "TRIAL",
                "NumberOfRowsPerPeriod": 10,
                "DirectoryRowsPerSearch": 5,
                "Period": "Month",
                "IsSimsAccess": False,
                "LicenseValidTill": None,
            }
        return jsonify(_serialize_license(license_info)), 200
    except Exception as e:
        logger.error("get_user_license_info failed: %s", type(e).__name__, exc_info=False)
        return jsonify(_serialize_license({
            "LicenseType": "TRIAL",
            "NumberOfRowsPerPeriod": 10,
            "DirectoryRowsPerSearch": 5,
            "Period": "Month",
            "IsSimsAccess": False,
            "LicenseValidTill": None,
        })), 200


@user_bp.route("/supplier-countries", methods=["GET"])
@require_auth
def get_supplier_countries():
    return jsonify(SUPPLIER_COUNTRIES), 200


@user_bp.route("/hscodes-descriptions", methods=["GET"])
@require_auth
def get_hscodes_descriptions():
    """
    Return HS codes with tax rates. Supports pagination for HS Code page.
    Plan-based: HsCodeAccess full = no cap; limited = cap by MaxRows/MaxRowsPerSearch; none = no access.
    """
    page = request.args.get("page", type=int)
    page_size = request.args.get("page_size", type=int)
    search = (request.args.get("search") or "").strip()
    sort = (request.args.get("sort") or "code").lower()

    try:
        user_repo = RepoProvider.get_user_repo()
        license_info = user_repo.get_license_by_user_id(request.user_id) or {}
    except Exception:
        license_info = {}
    hscode_access = license_info.get("HsCodeAccess") or "full"
    hscode_max_rows = int(license_info.get("HsCodeMaxRows") or 99999)
    hscode_rows_per_search = int(license_info.get("HsCodeMaxRowsPerSearch") or 100)

    if hscode_access == "none" or hscode_max_rows <= 0:
        if page is not None and page_size is not None:
            return jsonify({"data": [], "total": 0}), 200
        return jsonify({}), 200

    try:
        gst_codes = get_gst_hsn_codes()
    except Exception as e:
        logger.warning("get_gst_hsn_codes failed, falling back to DB: %s", e, exc_info=False)
        gst_codes = {}
    if page is not None and page_size is not None and page >= 1 and page_size >= 1 and gst_codes:
        page_size = min(page_size, 200)
        if hscode_access == "limited":
            page_size = min(page_size, max(1, hscode_rows_per_search))
        items = []
        for code, obj in gst_codes.items():
            if not code:
                continue
            name = (obj.get("name") or obj.get("description") or "").strip()
            items.append({
                "code": code,
                "name": name,
                "type": (obj.get("type") or "").strip(),
                "tax_rate": (obj.get("tax_rate") or "").strip(),
                "cgst_rate": (obj.get("cgst_rate") or "").strip(),
                "sgst_rate": (obj.get("sgst_rate") or "").strip(),
            })
        if search:
            q = search.lower()
            if q.isdigit():
                items = [x for x in items if x["code"].startswith(q)]
            else:
                items = [
                    x for x in items
                    if q in x["code"].lower() or q in (x["name"] or "").lower()
                ]
        if sort == "description":
            items.sort(key=lambda x: ((x["name"] or "").lower(), x["code"]))
        elif sort == "type":
            items.sort(key=lambda x: ((x["type"] or "").lower(), x["code"]))
        else:
            items.sort(key=lambda x: x["code"])

        # MT-01 FIX: For limited plans, hard-cap the dataset BEFORE slicing so that
        # iterating pages cannot retrieve more than hscode_max_rows total rows.
        if hscode_access == "limited":
            items = items[:hscode_max_rows]

        total = len(items)
        start = (page - 1) * page_size
        page_data = items[start : start + page_size]
        return jsonify({"data": page_data, "total": total}), 200

    if gst_codes:
        return jsonify(gst_codes), 200

    try:
        admin_repo = RepoProvider.get_admin_repo()
        rows = admin_repo.get_all_hscodes()
        data = {r["code"]: r.get("description") or "" for r in rows if r.get("code")}
        return jsonify(data), 200
    except Exception as e:
        logger.error("get_hscodes_descriptions failed: %s", type(e).__name__, exc_info=False)
        return jsonify({}), 200


# ── DPDP Act 2023 — User Rights Endpoints ────────────────────────────────────

@user_bp.route("/api/user/payment-history", methods=["GET"])
@require_auth
def payment_history():
    """Return the authenticated user's payment history."""
    user_repo = RepoProvider.get_user_repo()
    try:
        if not hasattr(user_repo, "get_user_payment_history"):
            return jsonify({"payments": []}), 200
        payments = user_repo.get_user_payment_history(request.user_id)
        return jsonify({"payments": payments}), 200
    except Exception as e:
        logger.error("payment_history failed: %s", type(e).__name__, exc_info=False)
        return jsonify({"error": "Failed to load payment history"}), 500


@user_bp.route("/api/user/data-export", methods=["GET"])
@require_auth
def data_export():
    """
    DPDP §11 — Right to Access / Data Portability.
    Returns all personal data held for the requesting user.
    ?format=json (default) or ?format=csv
    """
    fmt = (request.args.get("format") or "json").strip().lower()
    user_repo = RepoProvider.get_user_repo()
    try:
        user = user_repo.get_user_by_id(request.user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        payments = []
        if hasattr(user_repo, "get_user_payment_history"):
            try:
                payments = user_repo.get_user_payment_history(request.user_id)
            except Exception:
                pass
        valid_till = user.get("LicenseValidTill")
        if valid_till and hasattr(valid_till, "isoformat"):
            valid_till = valid_till.isoformat()
        export = {
            "export_generated_at": datetime.now(timezone.utc).isoformat(),
            "notice": "This export contains all personal data held by SCM Insights (Aashita Technosoft Pvt. Ltd.) as required under DPDP Act 2023.",
            "personal_data": {
                "name": user.get("Name") or "",
                "email": user.get("EmailId") or "",
                "phone": user.get("PhoneNumber") or "",
                "company": user.get("CompanyName") or "",
                "gst": user.get("Gst") or "",
                "license_type": user.get("LicenseType") or "",
                "license_valid_till": valid_till,
                "account_active": user.get("ActivationStatus"),
                "role": user.get("Role") or "USER",
            },
            "payment_history": payments,
        }
        if fmt == "csv":
            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow(["Section", "Field", "Value"])
            for k, v in export["personal_data"].items():
                writer.writerow(["personal_data", k, v if v is not None else ""])
            writer.writerow([])
            writer.writerow(["payment_history", "order_id", "plan", "amount_inr", "currency", "status", "date", "invoice_number"])
            for p in export["payment_history"]:
                writer.writerow([
                    "payment_history",
                    p.get("order_id", ""),
                    p.get("plan", ""),
                    p.get("amount_inr", ""),
                    p.get("currency", ""),
                    p.get("status", ""),
                    p.get("date", ""),
                    p.get("invoice_number", ""),
                ])
            # UX-01 FIX: Include date in filename so users can distinguish multiple exports.
        export_date = datetime.now(timezone.utc).strftime("%Y%m%d")
        return Response(
                buf.getvalue(),
                mimetype="text/csv",
                headers={"Content-Disposition": f"attachment; filename=my_data_export_{export_date}.csv"},
            )
        return jsonify(export), 200
    except Exception as e:
        logger.error("data_export failed: %s", type(e).__name__, exc_info=False)
        return jsonify({"error": "Failed to generate data export"}), 500


@user_bp.route("/api/user/delete-account", methods=["POST"])
@require_auth
def delete_account():
    """
    DPDP §12 — Right to Erasure / Consent Withdrawal.
    Verifies password, then schedules account deletion 30 days out (cooling-off period).
    Actual deletion is executed by the weekly cleanup job after the cooling-off expires.
    """
    from services.auth_service import AuthService
    data = request.get_json(silent=True) or {}
    password = (data.get("password") or "").strip()
    if not password:
        return jsonify({"error": "Password is required to confirm account deletion"}), 400
    user_repo = RepoProvider.get_user_repo()
    try:
        user = user_repo.get_user_by_id(request.user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        # CQ-08 FIX: Use AuthService.verify_password instead of calling bcrypt directly,
        # keeping bcrypt usage centralised in one place.
        if not AuthService.verify_password(password, user.get("HashPassword") or ""):
            return jsonify({"error": "Incorrect password"}), 401
        # Schedule deletion 30 days out (DPDP §12 cooling-off)
        scheduled_at = user_repo.schedule_account_deletion(request.user_id)
        logger.info("Account deletion scheduled for user_id=%s at %s", request.user_id[:8] + "***", scheduled_at)
        return jsonify({
            "message": "Your account deletion has been scheduled. Your account will be permanently deleted in 30 days. You can cancel this within the cooling-off period by logging in.",
            "deletion_scheduled_at": scheduled_at,
        }), 200
    except Exception as e:
        logger.error("delete_account failed: %s", type(e).__name__, exc_info=False)
        return jsonify({"error": "Failed to schedule account deletion. Please try again or contact support@scminsights.ai"}), 500


@user_bp.route("/api/user/cancel-deletion", methods=["POST"])
@require_auth
def cancel_deletion():
    """Cancel a previously scheduled account deletion within the 30-day cooling-off period."""
    user_repo = RepoProvider.get_user_repo()
    try:
        ts = user_repo.get_deletion_scheduled_at(request.user_id)
        if not ts:
            return jsonify({"error": "No pending account deletion found."}), 400
        user_repo.cancel_account_deletion(request.user_id)
        logger.info("Account deletion cancelled for user_id=%s", request.user_id[:8] + "***")
        return jsonify({"message": "Account deletion cancelled. Your account is safe."}), 200
    except Exception as e:
        logger.error("cancel_deletion failed: %s", type(e).__name__, exc_info=False)
        return jsonify({"error": "Failed to cancel deletion. Please try again or contact support@scminsights.ai"}), 500


@user_bp.route("/api/user/deletion-status", methods=["GET"])
@require_auth
def deletion_status():
    """Return the scheduled deletion timestamp for the authenticated user, or null."""
    user_repo = RepoProvider.get_user_repo()
    try:
        ts = user_repo.get_deletion_scheduled_at(request.user_id)
        return jsonify({"deletion_scheduled_at": ts}), 200
    except Exception as e:
        logger.error("deletion_status failed: %s", type(e).__name__, exc_info=False)
        return jsonify({"error": "Failed to check deletion status."}), 500
