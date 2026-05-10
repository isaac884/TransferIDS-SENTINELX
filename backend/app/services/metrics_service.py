from __future__ import annotations


class MetricsService:
    def summary(self) -> dict:
        return {"raw_observations": 0, "materialized_events": 0, "incidents": 0}

