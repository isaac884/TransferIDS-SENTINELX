from __future__ import annotations

from pydantic import BaseModel


class ReviewDecision(BaseModel):
    event_id: str
    verdict: str
    notes: str | None = None

