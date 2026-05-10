from __future__ import annotations

from pydantic import BaseModel, Field


class DetectionRequest(BaseModel):
    features: dict[str, float] = Field(default_factory=dict)


class DetectionResponse(BaseModel):
    tenant_id: str
    verdict: str
    confidence: float
    severity: str
    risk_score: float
    threshold: float | None = None
    attack_family: str | None = None
    classification_scope: str | None = None
    attack_family_source: str | None = None
    model_name: str | None = None
    model_version: str | None = None
    dataset_origin: str | None = None
