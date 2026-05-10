from __future__ import annotations

from pydantic import BaseModel


class MetricsSummary(BaseModel):
    raw_observations: int = 0
    materialized_events: int = 0
    incidents: int = 0

