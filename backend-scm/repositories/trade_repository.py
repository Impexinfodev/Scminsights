# ===========================================
# SCM-INSIGHTS Trade Repository
# ===========================================
# Reads from trade_company_report in the same DB as SCM (POSTGRES_*).
# Table schema: trade_type, hs_code, year, enterprise, data_country,
# frequency, total_price, total_quantity, total_weight,
# total_container_quantity, percentage.

from typing import Optional, List, Dict, Any

from psycopg_pool import ConnectionPool

SORTABLE_COLUMNS = frozenset({
    "frequency",
    "total_price",
    "total_quantity",
    "total_weight",
    "total_container_quantity",
    "percentage",
})

OUTPUT_COLUMNS = [
    "enterprise",
    "data_country",
    "frequency",
    "total_price",
    "total_quantity",
    "total_weight",
    "total_container_quantity",
    "percentage",
]

_pool: Optional[ConnectionPool] = None


def _get_pool() -> ConnectionPool:
    global _pool
    if _pool is not None:
        return _pool
    from config import POSTGRES_CONFIG
    c = POSTGRES_CONFIG
    conninfo = (
        f"host={c['host']} port={c['port']} dbname={c['database']} "
        f"user={c['user']} password={c['password']}"
    )
    _pool = ConnectionPool(conninfo, min_size=1, max_size=10)
    return _pool


def _safe_int(value: Any, default: int, min_val: int = 1, max_val: Optional[int] = None) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    n = max(min_val, n)
    if max_val is not None:
        n = min(n, max_val)
    return n


def _safe_sort(column: str) -> str:
    return column if column in SORTABLE_COLUMNS else "frequency"


def _safe_order(order: str) -> str:
    return "ASC" if str(order).lower() == "asc" else "DESC"


def _row_to_item(row: tuple) -> Dict[str, Any]:
    return {
        "enterprise": row[0] or "",
        "data_country": row[1] or "",
        "frequency": float(row[2]) if row[2] is not None else 0.0,
        "total_price": float(row[3]) if row[3] is not None else 0.0,
        "total_quantity": float(row[4]) if row[4] is not None else 0.0,
        "total_weight": float(row[5]) if row[5] is not None else 0.0,
        "total_container_quantity": float(row[6]) if row[6] is not None else 0.0,
        "percentage": float(row[7]) if row[7] is not None else 0.0,
    }


def get_top_traders(
    trade_type: str,
    hs_code_prefix: str,
    sort_by: str = "frequency",
    sort_order: str = "desc",
    year: Optional[int] = None,
    country: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
) -> Dict[str, Any]:
    """
    Paginated, sorted list of top traders.
    With year: filter by year. Without year: aggregate across all years (GROUP BY enterprise, data_country).
    """
    sort_col = _safe_sort(sort_by)
    direction = _safe_order(sort_order)
    page = _safe_int(page, 1, 1)
    page_size = _safe_int(page_size, 25, 1, 100)
    offset = (page - 1) * page_size

    conditions = ["trade_type = %s", "hs_code LIKE %s"]
    params: List[Any] = [trade_type, f"{hs_code_prefix}%"]
    if year is not None:
        conditions.append("year = %s")
        params.append(year)
    if country:
        conditions.append("LOWER(data_country) LIKE LOWER(%s)")
        params.append(f"%{country}%")
    where = " AND ".join(conditions)

    pool = _get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            if year is not None:
                cur.execute(
                    f"SELECT COUNT(*) FROM trade_company_report WHERE {where}",
                    tuple(params),
                )
                total_items = cur.fetchone()[0]
                cols = ", ".join(OUTPUT_COLUMNS)
                cur.execute(
                    f"SELECT {cols} FROM trade_company_report "
                    f"WHERE {where} ORDER BY {sort_col} {direction} "
                    f"LIMIT %s OFFSET %s",
                    tuple(params + [page_size, offset]),
                )
            else:
                cur.execute(
                    "SELECT COUNT(*) FROM ("
                    "  SELECT 1 FROM trade_company_report "
                    f"  WHERE {where} GROUP BY enterprise, data_country"
                    ") AS sub",
                    tuple(params),
                )
                total_items = cur.fetchone()[0]
                agg = (
                    "enterprise, data_country, "
                    "SUM(frequency) AS frequency, SUM(total_price) AS total_price, "
                    "SUM(total_quantity) AS total_quantity, SUM(total_weight) AS total_weight, "
                    "SUM(total_container_quantity) AS total_container_quantity, "
                    "SUM(percentage) AS percentage"
                )
                cur.execute(
                    f"SELECT {agg} FROM trade_company_report "
                    f"WHERE {where} GROUP BY enterprise, data_country "
                    f"ORDER BY {sort_col} {direction} LIMIT %s OFFSET %s",
                    tuple(params + [page_size, offset]),
                )
            rows = cur.fetchall()

    data = [_row_to_item(r) for r in rows]
    total_pages = (total_items + page_size - 1) // page_size if page_size else 0

    return {
        "data": data,
        "meta": {
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
            "filters": {
                "trade_type": trade_type,
                "hs_code_prefix": hs_code_prefix,
                "sort_by": sort_col,
                "sort_order": direction.lower(),
                "year": year,
                "country": country or None,
            },
        },
    }


def get_available_years(trade_type: str, hs_code_prefix: str) -> List[int]:
    """Distinct years for trade_type and hs_code prefix, sorted ascending."""
    pool = _get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT DISTINCT year FROM trade_company_report "
                "WHERE trade_type = %s AND hs_code LIKE %s ORDER BY year",
                (trade_type, f"{hs_code_prefix}%"),
            )
            return [int(r[0]) for r in cur.fetchall()]


def get_summary_stats(
    trade_type: str,
    hs_code_prefix: str,
    year: Optional[int] = None,
) -> Dict[str, Any]:
    """Aggregate stats: total_enterprises, total_value, total_quantity, total_weight."""
    conditions = ["trade_type = %s", "hs_code LIKE %s"]
    params: List[Any] = [trade_type, f"{hs_code_prefix}%"]
    if year is not None:
        conditions.append("year = %s")
        params.append(year)
    where = " AND ".join(conditions)

    pool = _get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT "
                "  COUNT(DISTINCT enterprise), "
                "  COALESCE(SUM(total_price), 0), "
                "  COALESCE(SUM(total_quantity), 0), "
                "  COALESCE(SUM(total_weight), 0) "
                f"FROM trade_company_report WHERE {where}",
                tuple(params),
            )
            row = cur.fetchone()

    return {
        "total_enterprises": int(row[0]) if row and row[0] is not None else 0,
        "total_value": float(row[1]) if row and row[1] is not None else 0.0,
        "total_quantity": float(row[2]) if row and row[2] is not None else 0.0,
        "total_weight": float(row[3]) if row and row[3] is not None else 0.0,
    }
