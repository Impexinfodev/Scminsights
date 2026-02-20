import re
from typing import Any, Tuple


def is_valid_email(email: str) -> bool:
    if not email:
        return False
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))


def validate_pagination_params(
    page: Any,
    page_size: Any,
    sort_order: Any = "desc",
    min_page_size: int = 1,
    max_page_size: int = 500,
) -> Tuple[bool, int, int, str]:
    try:
        page = int(page) if page else 1
        page_size = int(page_size) if page_size else 50
    except (TypeError, ValueError):
        return False, 1, 50, "desc"
    if page < 1:
        return False, 1, 50, "desc"
    if page_size < min_page_size or page_size > max_page_size:
        return False, 1, 50, "desc"
    sort_order = str(sort_order).lower() if sort_order else "desc"
    if sort_order not in ("asc", "desc"):
        return False, 1, 50, "desc"
    return True, page, page_size, sort_order
