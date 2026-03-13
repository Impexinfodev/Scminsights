# OBS-03: Structured security audit logger
# =========================================
# All security-relevant events (auth, payment, account changes) are emitted
# via `audit_event()` to a dedicated "audit" logger.  In production the root
# logging config (app.py) writes all loggers ≥ INFO to the rotating file, so
# audit events are automatically co-located with app logs and can be filtered
# with:   grep '"audit":true' logs/app.log
#
# Every entry is a single JSON line for easy ingestion into log aggregators
# (CloudWatch Logs Insights, Loki, etc.).

import json
import logging
from datetime import datetime, timezone
from flask import g, request

_audit_logger = logging.getLogger("audit")


def audit_event(
    event: str,
    *,
    user_id: str = "",
    ip: str = "",
    outcome: str = "ok",
    **extra,
) -> None:
    """
    Emit one structured audit log line.

    Parameters
    ----------
    event   : short snake_case name, e.g. "login_success", "payment_verified"
    user_id : masked to first 8 chars + *** automatically
    ip      : remote IP; auto-populated from request context if omitted
    outcome : "ok" | "fail" | "warn"
    extra   : arbitrary key=value pairs (strings/ints only — no PII)
    """
    if not ip:
        try:
            # Respect X-Forwarded-For if behind a trusted proxy
            forwarded = request.headers.get("X-Forwarded-For", "")
            ip = forwarded.split(",")[0].strip() if forwarded else (request.remote_addr or "")
        except RuntimeError:
            ip = ""

    request_id = ""
    try:
        request_id = getattr(g, "request_id", "") or ""
    except RuntimeError:
        pass

    # Mask user_id: only keep first 8 characters + *** to avoid PII in logs
    masked_uid = (user_id[:8] + "***") if len(user_id) > 8 else user_id

    record = {
        "audit": True,
        "ts": datetime.now(timezone.utc).isoformat(),
        "event": event,
        "outcome": outcome,
        "user_id": masked_uid,
        "ip": ip,
        "request_id": request_id,
    }
    record.update(extra)

    _audit_logger.info(json.dumps(record, default=str))
