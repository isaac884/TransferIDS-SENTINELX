from __future__ import annotations

from pydantic import BaseModel


class IncidentOut(BaseModel):
    id: str
    title: str
    priority: str
    status: str
    risk_score: float

