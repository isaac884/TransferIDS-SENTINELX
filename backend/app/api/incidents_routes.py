from __future__ import annotations

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user, get_tenant_id
from app.api.response_utils import api_success
from app.services.event_store import event_store


router = APIRouter(dependencies=[Depends(get_current_user)])


class IncidentStateUpdate(BaseModel):
    status: str


class IncidentNote(BaseModel):
    notes: str
    analyst: str | None = None


@router.get("")
def list_incidents(tenant_id: str = Depends(get_tenant_id)) -> dict:
    incidents = event_store.incidents(tenant_id)
    return api_success({"tenant_id": tenant_id, "incidents": incidents}, tenant_id=tenant_id, incidents=incidents)


@router.post("/from-event/{event_id}")
def create_incident_from_event(event_id: str, tenant_id: str = Depends(get_tenant_id)) -> dict:
    incident = event_store.create_incident_from_event(event_id, tenant_id)
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return api_success({"tenant_id": tenant_id, "incident": incident}, tenant_id=tenant_id, incident=incident)


@router.get("/{incident_id}")
def get_incident(incident_id: str, tenant_id: str = Depends(get_tenant_id)) -> dict:
    incident = event_store.get_incident(incident_id, tenant_id)
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return api_success({"tenant_id": tenant_id, "incident": incident}, tenant_id=tenant_id, incident=incident)


@router.patch("/{incident_id}/state")
def update_incident_state(incident_id: str, payload: IncidentStateUpdate, tenant_id: str = Depends(get_tenant_id)) -> dict:
    try:
        incident = event_store.update_incident_status(incident_id, payload.status, tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return api_success({"tenant_id": tenant_id, "incident": incident}, tenant_id=tenant_id, incident=incident)


@router.post("/{incident_id}/notes")
def add_incident_note(incident_id: str, payload: IncidentNote, tenant_id: str = Depends(get_tenant_id)) -> dict:
    incident = event_store.get_incident(incident_id, tenant_id)
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    review = event_store.add_review(
        {
            "tenant_id": tenant_id,
            "event_id": incident_id,
            "analyst": payload.analyst,
            "verdict": "note",
            "notes": payload.notes,
        }
    )
    return api_success({"tenant_id": tenant_id, "note": review}, tenant_id=tenant_id, note=review)


@router.get("/{incident_id}/timeline")
def incident_timeline(incident_id: str, tenant_id: str = Depends(get_tenant_id)) -> dict:
    incident = event_store.get_incident(incident_id, tenant_id)
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    timeline = event_store.incident_timeline(incident_id, tenant_id)
    return api_success({"tenant_id": tenant_id, "timeline": timeline}, tenant_id=tenant_id, timeline=timeline)
