# SCM-INSIGHTS Trade API — DB-backed; matches trade-api-contracts.md
from flask import Blueprint, request, jsonify
import logging

from extensions import limiter
from repositories.trade_repository import (
    get_top_traders,
    get_available_years,
    get_summary_stats,
)

logger = logging.getLogger(__name__)
trade_bp = Blueprint("trade", __name__, url_prefix="/api/trade")

VALID_TRADE_TYPES = frozenset({"importer", "exporter"})

ERROR_MESSAGES = {
    "MISSING_TRADE_TYPE": "trade_type is required",
    "INVALID_TRADE_TYPE": "trade_type must be 'importer' or 'exporter'",
    "MISSING_HS_CODE": "hs_code is required",
    "INVALID_HS_CODE": "hs_code must be 2-10 digits",
    "INVALID_YEAR": "year must be an integer",
}


def _validate_trade_type(value):
    if value is None or (isinstance(value, str) and not value.strip()):
        return None, "MISSING_TRADE_TYPE"
    v = str(value).strip().lower()
    if v not in VALID_TRADE_TYPES:
        return None, "INVALID_TRADE_TYPE"
    return v, None


def _validate_hs_code(value):
    if value is None or (isinstance(value, str) and not value.strip()):
        return None, "MISSING_HS_CODE"
    s = str(value).strip()
    if len(s) < 2 or len(s) > 10 or not s.isdigit():
        return None, "INVALID_HS_CODE"
    return s[:10], None


def _validate_year(value):
    if value is None or value == "":
        return None, None
    try:
        return int(value), None
    except (TypeError, ValueError):
        return None, "INVALID_YEAR"


def _safe_int(value, default, min_val=1, max_val=None):
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    n = max(min_val, n)
    if max_val is not None:
        n = min(n, max_val)
    return n


def _err(code):
    return jsonify({"error": ERROR_MESSAGES[code], "code": code}), 400


def _server_error(e):
    logger.exception("Trade API error: %s", e)
    return (
        jsonify({
            "success": False,
            "error": "Failed to fetch trade data. Please try again later.",
        }),
        500,
    )


@trade_bp.route("/years", methods=["GET"])
def get_trade_years():
    trade_type, code = _validate_trade_type(request.args.get("trade_type"))
    if code:
        return _err(code)
    hs_code, code = _validate_hs_code(request.args.get("hs_code"))
    if code:
        return _err(code)
    try:
        years = get_available_years(trade_type, hs_code)
        return jsonify({"success": True, "data": years}), 200
    except Exception as e:
        return _server_error(e)


@trade_bp.route("/top", methods=["GET"])
@limiter.limit("60 per minute")
def get_trade_top():
    trade_type, code = _validate_trade_type(request.args.get("trade_type"))
    if code:
        return _err(code)
    hs_code, code = _validate_hs_code(request.args.get("hs_code"))
    if code:
        return _err(code)
    year, code = _validate_year(request.args.get("year"))
    if code:
        return _err(code)
    page = _safe_int(request.args.get("page"), 1, 1)
    page_size = _safe_int(request.args.get("page_size"), 25, 1, 100)
    country = (request.args.get("country") or "").strip() or None
    sort_by = (request.args.get("sort_by") or "frequency").strip().lower()
    sort_order = (request.args.get("sort_order") or "desc").strip().lower()

    try:
        result = get_top_traders(
            trade_type=trade_type,
            hs_code_prefix=hs_code,
            sort_by=sort_by,
            sort_order=sort_order,
            year=year,
            country=country,
            page=page,
            page_size=page_size,
        )
        return jsonify({"success": True, **result}), 200
    except Exception as e:
        return _server_error(e)


@trade_bp.route("/summary", methods=["GET"])
def get_trade_summary():
    trade_type, code = _validate_trade_type(request.args.get("trade_type"))
    if code:
        return _err(code)
    hs_code, code = _validate_hs_code(request.args.get("hs_code"))
    if code:
        return _err(code)
    year, code = _validate_year(request.args.get("year"))
    if code:
        return _err(code)
    try:
        data = get_summary_stats(trade_type, hs_code, year=year)
        return jsonify({"success": True, "data": data}), 200
    except Exception as e:
        return _server_error(e)
