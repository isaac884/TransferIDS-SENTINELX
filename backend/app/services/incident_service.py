from __future__ import annotations

from app.engines.incident_engine import IncidentEngine


class IncidentService:
    def __init__(self) -> None:
        self.engine = IncidentEngine()

    def correlate(self, event: dict) -> dict:
        key = self.engine.group_key(event.get("source_ip", "unknown"), event.get("destination_ip", "unknown"), event.get("attack_type", "unknown"))
        return {"correlation_key": key, "status": "correlated"}

