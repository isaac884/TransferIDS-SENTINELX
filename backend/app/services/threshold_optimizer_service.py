from __future__ import annotations


class ThresholdOptimizerService:
    def current_profile(self) -> dict:
        return {"materialization_threshold": 0.70, "confirmation_threshold": 0.85, "mode": "shadow"}

