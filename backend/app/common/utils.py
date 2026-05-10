from __future__ import annotations

import math
from datetime import datetime, timezone


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return lower
    if not math.isfinite(numeric):
        return lower
    return max(lower, min(upper, numeric))
