from __future__ import annotations

from typing import Any


class ExplanationService:
    """Analyst-readable explanation layer for binary TransferIDS events."""

    def explain_event(self, event: dict[str, Any], shap_payload: dict[str, Any] | None = None) -> dict[str, Any]:
        features = event.get("features") or {}
        ranked = sorted(features.items(), key=lambda item: abs(_number(item[1])), reverse=True)[:5]
        observations = [self._feature_sentence(name, _number(value)) for name, value in ranked]
        verdict = str(event.get("verdict") or "unknown")
        severity = str(event.get("severity") or "low")
        confidence = _number(event.get("confidence"))
        return {
            "mode": "analyst_readable_explanation",
            "verdict": verdict,
            "attack_family": event.get("attack_family"),
            "classification_scope": event.get("classification_scope") or "binary",
            "confidence": confidence,
            "severity": severity,
            "summary": self._summary(verdict, severity, confidence),
            "why": observations,
            "top_features": [{"feature": name, "value": _number(value)} for name, value in ranked],
            "recommended_actions": self._recommended_actions(verdict, severity),
            "evidence_trace": {
                "event_id": event.get("id") or event.get("event_id"),
                "source": event.get("source"),
                "row_number": event.get("row_number"),
                "model_name": event.get("model_name"),
                "model_version": event.get("model_version"),
                "dataset_origin": event.get("dataset_origin"),
            },
            "shap": shap_payload,
        }

    def _summary(self, verdict: str, severity: str, confidence: float) -> str:
        if verdict == "attack":
            return f"The binary IDS model classified this flow as attack with {confidence:.2f} confidence and {severity} severity."
        if verdict == "benign":
            return f"The binary IDS model classified this flow as benign with {confidence:.2f} confidence."
        return "The model output is uncertain and should be reviewed before operational action."

    def _recommended_actions(self, verdict: str, severity: str) -> list[str]:
        if verdict != "attack":
            return ["Keep the event in the ledger", "Review only if repeated across multiple sources"]
        actions = ["Review source and destination context", "Check related events from the same source"]
        if severity in {"high", "critical"}:
            actions.extend(["Open or update an incident", "Prepare containment only after analyst approval"])
        return actions

    def _feature_sentence(self, name: str, value: float) -> str:
        if "pkt" in name or "bytes" in name:
            return f"{name} contributed a traffic-volume signal with value {value:g}."
        if "iat" in name:
            return f"{name} contributed a timing-pattern signal with value {value:g}."
        if "duration" in name:
            return f"{name} contributed a flow-duration signal with value {value:g}."
        if "win" in name:
            return f"{name} contributed a TCP-window signal with value {value:g}."
        return f"{name} contributed value {value:g}."


def _number(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0
