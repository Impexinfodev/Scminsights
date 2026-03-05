# Public endpoints (no auth) - e.g. list plans for pricing page
from flask import Blueprint, jsonify

public_bp = Blueprint("public", __name__, url_prefix="/api")


def _plan_response(lic_type, info):
    """Same shape as admin license response for plans listing."""
    if not info:
        info = {}
    if "Directory" in info or "LicenseName" in info:
        directory = info.get("Directory") or {}
        if not isinstance(directory, dict):
            directory = {}
        dir_access = directory.get("Access", "limited")
        dir_max_rows = directory.get("MaxRows")
        if dir_access == "limited" and (dir_max_rows is None or dir_max_rows == 0):
            dir_max_rows = 10  # default trial directory rows
        directory = {
            "Access": dir_access,
            "MaxRows": dir_max_rows if dir_access == "limited" else directory.get("MaxRows"),
            "MaxRowsPerSearch": directory.get("MaxRowsPerSearch", 5),
        }
        buyers = info.get("Buyers") or {"Access": "custom", "MaxSearchesPerPeriod": 0, "MaxRowsPerSearch": 0}
        suppliers = info.get("Suppliers") or {"Access": "custom", "MaxSearchesPerPeriod": 0, "MaxRowsPerSearch": 0}
        hscode = info.get("HsCode") or {"Access": "full", "MaxRows": 99999, "MaxRowsPerSearch": 100}
        if not isinstance(hscode, dict):
            hscode = {"Access": "full", "MaxRows": 99999, "MaxRowsPerSearch": 100}
        dir_full = (directory.get("Access") == "full")
        buyers_full = (buyers.get("Access") if isinstance(buyers, dict) else None) == "full"
        suppliers_full = (suppliers.get("Access") if isinstance(suppliers, dict) else None) == "full"
        is_top_plan = dir_full and buyers_full and suppliers_full
        return {
            "LicenseType": lic_type,
            "LicenseName": info.get("LicenseName", lic_type),
            "Price": info.get("Price", 0),
            "PriceINR": info.get("PriceINR"),
            "PriceUSD": info.get("PriceUSD"),
            "ShortDescription": info.get("ShortDescription", ""),
            "Directory": directory,
            "Buyers": buyers,
            "Suppliers": suppliers,
            "HsCode": hscode,
            "Validity": info.get("Validity", "Year"),
            "ValidityDays": info.get("ValidityDays", 365),
            "IsTopPlan": is_top_plan,
        }
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
        "HsCode": {"Access": "full", "MaxRows": 99999, "MaxRowsPerSearch": 100},
        "Validity": info.get("Validity", info.get("Period", "Year")),
        "ValidityDays": info.get("ValidityDays", 365),
        "IsTopPlan": False,
    }


@public_bp.route("/health", methods=["GET"])
def health():
    """Public API health check (DB connectivity)."""
    try:
        from repositories.repo_provider import RepoProvider
        admin_repo = RepoProvider.get_admin_repo()
        ok = admin_repo.health_check() if hasattr(admin_repo, "health_check") else True
        return jsonify({"status": "ok" if ok else "degraded", "database": "connected" if ok else "error"}), 200
    except Exception:
        return jsonify({"status": "error", "database": "error"}), 503


@public_bp.route("/plans", methods=["GET"])
def get_plans():
    """List all plans for public pricing page (no auth required)."""
    from repositories.repo_provider import RepoProvider
    admin_repo = RepoProvider.get_admin_repo()
    all_licenses = admin_repo.get_all_licenses()
    plans = [_plan_response(lic.get("LicenseType", ""), lic.get("LicenseInfo")) for lic in all_licenses]
    return jsonify(plans), 200
