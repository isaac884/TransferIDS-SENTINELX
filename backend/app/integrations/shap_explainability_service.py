from __future__ import annotations


def runtime_status() -> dict:
    try:
        import shap  # noqa: F401

        return {"available": True}
    except Exception as exc:
        return {"available": False, "reason": str(exc)}


class ShapExplainabilityService:
    def explain(self, features: dict[str, float]) -> dict:
        ranked = sorted(features.items(), key=lambda item: abs(float(item[1] or 0.0)), reverse=True)
        return {
            "mode": "fallback_feature_magnitude",
            "note": "This is not a full SHAP attribution payload unless a configured SHAP explainer is available.",
            "top_features": [{"feature": name, "influence": float(value or 0.0)} for name, value in ranked[:5]],
        }
