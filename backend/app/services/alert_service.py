from __future__ import annotations

from app.engines.alert_engine import AlertEngine


class AlertService:
    def __init__(self) -> None:
        self.engine = AlertEngine()

    def materialize(self, detection: dict) -> dict | None:
        if not self.engine.should_alert(detection.get("verdict", ""), float(detection.get("risk_score", 0.0))):
            return None
        return {"severity": detection.get("severity", "medium"), "risk_score": detection.get("risk_score", 0.0)}

