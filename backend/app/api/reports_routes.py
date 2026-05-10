from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.response_utils import api_success
from app.dependencies import get_current_user, get_tenant_id
from app.services.event_store import event_store


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/incidents/{incident_id}")
def incident_report(incident_id: str, tenant_id: str = Depends(get_tenant_id)) -> dict:
    report = _build_report(incident_id, tenant_id)
    return api_success({"tenant_id": tenant_id, "report": report}, tenant_id=tenant_id, report=report)


@router.get("/incidents/{incident_id}/export", response_model=None)
def export_incident_report(incident_id: str, tenant_id: str = Depends(get_tenant_id), format: str = "json"):
    report = _build_report(incident_id, tenant_id)
    if format == "html":
        html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>{incident_id} Report</title></head>
<body><h1>TransferIDS Incident Report</h1><pre>{json.dumps(report, indent=2)}</pre></body></html>"""
        return Response(content=html, media_type="text/html")
    return api_success({"tenant_id": tenant_id, "report": report}, tenant_id=tenant_id, report=report)


def _build_report(incident_id: str, tenant_id: str) -> dict:
    incident = event_store.get_incident(incident_id, tenant_id)
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    event = event_store.get_event(str(incident.get("event_id") or ""), tenant_id)
    reviews = [
        review
        for review in event_store.list_reviews(tenant_id)
        if review.get("event_id") in {incident_id, incident.get("event_id")}
    ]
    return {
        "incident": incident,
        "source_event": event,
        "timeline": event_store.incident_timeline(incident_id, tenant_id),
        "analyst_reviews": reviews,
        "evidence_summary": {
            "model_verdict": event.get("verdict") if event else None,
            "confidence": event.get("confidence") if event else None,
            "severity": incident.get("severity"),
            "source": event.get("source") if event else None,
        },
    }
