# SCM-INSIGHTS User controller: license, supplier-countries, hscodes (DB or CSV)
import logging
from flask import Blueprint, request, jsonify

from middlewares.auth_middleware import require_auth

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
        total = len(items)
        if hscode_access == "limited":
            total = min(total, hscode_max_rows)
        if sort == "description":
            items.sort(key=lambda x: ((x["name"] or "").lower(), x["code"]))
        elif sort == "type":
            items.sort(key=lambda x: ((x["type"] or "").lower(), x["code"]))
        else:
            items.sort(key=lambda x: x["code"])
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
