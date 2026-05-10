from __future__ import annotations

from app.core.event_bus import event_bus


class EventService:
    def publish_detection(self, payload: dict) -> dict:
        return event_bus.publish("detection", "detection.materialized", payload)

