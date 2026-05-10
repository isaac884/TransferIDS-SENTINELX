from __future__ import annotations

from pydantic import BaseModel


class ResponseActionRequest(BaseModel):
    incident_id: str
    action: str
    dry_run: bool = True

