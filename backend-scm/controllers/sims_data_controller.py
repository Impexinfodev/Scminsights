# SCM-INSIGHTS SIMS directory API (same path and response shape as main backend)
# Serves Buyers Directory from SimsDirectory table; no auth required on endpoint.
from flask import Blueprint, request, jsonify

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
def list_sims_data():
    """
    Get paginated SIMS directory data with optional search.
    Same query params and response shape as main backend (backend/modules/routes/sims_data.py).
    """
    try:
        from repositories.repo_provider import RepoProvider
        admin_repo = RepoProvider.get_admin_repo()
    except Exception as e:
        print(f"sims_data list_sims_data repo error: {e}")
        return jsonify({"success": False, "error": "Failed to fetch directory data."}), 500

    page = _safe_int(request.args.get("page"), 1)
    limit = _safe_int(request.args.get("limit"), 50, 1, 100)
    search_term = (request.args.get("search") or "").strip()

    try:
        data, total_items = admin_repo.get_sims_directory_page(
            page=page, limit=limit, search_term=search_term
        )
    except Exception as e:
        print(f"sims_data get_sims_directory_page error: {e}")
        return jsonify({"success": False, "error": "Failed to fetch directory data."}), 500

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
def search_sims_data():
    """Alias for list endpoint (same as main backend)."""
    return list_sims_data()
