from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def api_success(data: Any, **compat: Any) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "error": None,
        "metadata": {"timestamp": datetime.now(timezone.utc).isoformat(), "source": "backend"},
        **compat,
    }


def api_error(code: str, message: str, details: dict[str, Any] | None = None, **compat: Any) -> dict[str, Any]:
    return {
        "success": False,
        "data": None,
        "error": {"code": code, "message": message, "details": details or {}},
        "metadata": {"timestamp": datetime.now(timezone.utc).isoformat(), "source": "backend"},
        **compat,
    }
