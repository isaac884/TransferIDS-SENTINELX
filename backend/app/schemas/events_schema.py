from __future__ import annotations

from pydantic import BaseModel


class EventOut(BaseModel):
    id: str
    source_ip: str
    destination_ip: str
    verdict: str
    confidence: float

