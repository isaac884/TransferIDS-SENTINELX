from __future__ import annotations


class SeverityEngine:
    def classify(self, risk_score: float) -> str:
        if risk_score >= 90:
            return "critical"
        if risk_score >= 70:
            return "high"
        if risk_score >= 40:
            return "medium"
        return "low"

