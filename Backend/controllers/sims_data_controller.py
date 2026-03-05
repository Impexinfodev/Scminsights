# SCM-INSIGHTS SIMS directory API – plan-based access (Directory full/limited).
# Requires auth. DIRECTORY/BUNDLE = full directory; TRIAL/TRADE = limited (10 rows, 5 per search).
import logging
from flask import Blueprint, request, jsonify

from middlewares.auth_middleware import require_auth

logger = logging.getLogger(__name__)
sims_data_bp = Blueprint("sims_data", __name__, url_prefix="/api/sims-data")


def _safe_int(value, default=1, min_val=1, max_val=100):
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    n = max(min_val, n)
    if max_val is not None:
        n = min(n, max_val)
    return n


@sims_data_bp.route("", methods=["GET"])
@require_auth
def list_sims_data():
    """
    Get paginated SIMS directory data. Plan-based: full (DIRECTORY/BUNDLE) or limited (TRIAL/TRADE).
    """
    try:
        from repositories.repo_provider import RepoProvider
        admin_repo = RepoProvider.get_admin_repo()
        user_repo = RepoProvider.get_user_repo()
    except Exception as e:
        logger.error("sims_data repo error: %s", type(e).__name__, exc_info=False)
        return jsonify({"success": False, "error": "Failed to fetch directory data."}), 500

    license_info = user_repo.get_license_by_user_id(request.user_id)
    is_full = license_info.get("IsSimsAccess") is True
    max_rows = int(license_info.get("NumberOfRowsPerPeriod") or 10)
    rows_per_search = int(license_info.get("DirectoryRowsPerSearch") or 5)

    page = _safe_int(request.args.get("page"), 1)
    limit = _safe_int(request.args.get("limit"), 50, 1, 100)
    search_term = (request.args.get("search") or "").strip()

    if not is_full:
        limit = min(limit, rows_per_search)

    try:
        data, total_items = admin_repo.get_sims_directory_page(
            page=page, limit=limit, search_term=search_term
        )
    except Exception as e:
        logger.error("sims_data get_sims_directory_page failed: %s", type(e).__name__, exc_info=False)
        return jsonify({"success": False, "error": "Failed to fetch directory data."}), 500

    if not is_full:
        total_cap = max_rows
        total_items = min(total_items, total_cap)
        data = data[:limit]

    total_pages = (total_items + limit - 1) // limit if limit else 0
    response = {
        "success": True,
        "data": data,
        "meta": {
            "page": page,
            "limit": limit,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        },
    }
    if search_term:
        response["meta"]["search_term"] = search_term
    return jsonify(response), 200


@sims_data_bp.route("/search", methods=["GET"])
@require_auth
def search_sims_data():
    """Alias for list endpoint."""
    return list_sims_data()
