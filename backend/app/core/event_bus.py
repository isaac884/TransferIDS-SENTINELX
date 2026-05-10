from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


class EventBus:
    """In-memory event fanout for local runtime notifications.

    This bus is not persistent storage. Database events remain the source of
    truth; the bus only gives active browser sessions a recent live signal.
    """

    def __init__(self, maxlen: int = 500) -> None:
        self._events: dict[str, deque[dict[str, Any]]] = defaultdict(lambda: deque(maxlen=maxlen))

    def publish(self, channel: str, event_type: str, payload: dict[str, Any]) -> dict[str, Any]:
        event = {
            "event_id": str(payload.get("event_id") or uuid4()),
            "channel": channel,
            "event_type": event_type,
            "tenant_id": payload.get("tenant_id"),
            "payload": payload,
            "published_at": datetime.now(timezone.utc).isoformat(),
        }
        self._events[channel].appendleft(event)
        return event

    def recent(self, channel: str, limit: int = 50) -> list[dict[str, Any]]:
        safe_limit = max(1, min(int(limit or 50), 200))
        return list(self._events[channel])[:safe_limit]


event_bus = EventBus()
