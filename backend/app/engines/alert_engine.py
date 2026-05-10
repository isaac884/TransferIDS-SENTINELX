from __future__ import annotations

from app.common.attack_taxonomy import normalize_verdict


class AlertEngine:
    def should_alert(self, verdict: str, risk_score: float) -> bool:
        normalized = normalize_verdict(verdict)
        return normalized in {"attack", "uncertain"} or risk_score >= 55.0
