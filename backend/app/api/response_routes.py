from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user, get_tenant_id
from app.api.response_utils import api_success
from app.engines.response_engine import ResponseEngine
from app.schemas.response_schema import ResponseActionRequest
from app.services.event_store import event_store


router = APIRouter(dependencies=[Depends(get_current_user)])
response_engine = ResponseEngine()


@router.post("/actions")
def create_response_action(payload: ResponseActionRequest, tenant_id: str = Depends(get_tenant_id)) -> dict:
    data = {"tenant_id": tenant_id, "status": "queued", "action": payload.action, "dry_run": payload.dry_run}
    return api_success(data, **data)


@router.get("/recommendations/{incident_id}")
def response_recommendations(incident_id: str, tenant_id: str = Depends(get_tenant_id)) -> dict:
    incident = event_store.get_incident(incident_id, tenant_id)
    if incident is None:
        data = {"tenant_id": tenant_id, "incident_id": incident_id, "available": False, "recommendations": [], "message": "Incident not found."}
        return api_success(data, **data)
    recommendations = response_engine.recommend(str(incident.get("severity") or "low"))
    data = {
        "tenant_id": tenant_id,
        "incident_id": incident_id,
        "available": True,
        "recommendations": recommendations,
        "containment_checklist": [
            {"action": action, "status": "pending", "requires_human_approval": True}
            for action in recommendations
        ],
    }
    return api_success(data, **data)
