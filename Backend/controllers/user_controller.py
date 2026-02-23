# SCM-INSIGHTS User controller: license, supplier-countries, hscodes (DB-backed)
import logging
from flask import Blueprint, request, jsonify

from middlewares.auth_middleware import require_auth

logger = logging.getLogger(__name__)
from repositories.repo_provider import RepoProvider
from utils.constants import SUPPLIER_COUNTRIES

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
    Return HS codes and descriptions from DB (HSCodeDescription table).
    Same shape as before: { "code": "description", ... }. Run tools/seed_hscodes.py to populate.
    """
    try:
        admin_repo = RepoProvider.get_admin_repo()
        rows = admin_repo.get_all_hscodes()
        data = {r["code"]: r["description"] for r in rows if r.get("code")}
        return jsonify(data), 200
    except Exception as e:
        logger.error("get_hscodes_descriptions failed: %s", type(e).__name__, exc_info=False)
        return jsonify({}), 200
