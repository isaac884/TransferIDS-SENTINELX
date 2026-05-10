from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends

from app.api.response_utils import api_success
from app.config import settings
from app.dependencies import get_current_user


router = APIRouter(dependencies=[Depends(get_current_user)])


class ThresholdUpdate(BaseModel):
    attack_threshold: float = Field(ge=0.0, le=1.0)


@router.get("/thresholds")
def get_thresholds() -> dict:
    data = {
        "attack_threshold": settings.attack_threshold,
        "mode": "runtime",
        "message": "Threshold updates are runtime-only unless persisted to backend/.env by an operator.",
    }
    return api_success(data, **data)


@router.patch("/thresholds")
def update_thresholds(payload: ThresholdUpdate) -> dict:
    object.__setattr__(settings, "attack_threshold", payload.attack_threshold)
    data = {"attack_threshold": settings.attack_threshold, "mode": "runtime"}
    return api_success(data, **data)
