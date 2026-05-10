from __future__ import annotations

import csv
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.config import settings
from app.dependencies import get_current_user, get_tenant_id
from app.api.response_utils import api_success
from app.services.event_store import event_store


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("")
def list_events(
    tenant_id: str = Depends(get_tenant_id),
    verdict: str | None = None,
    severity: str | None = None,
    source_ip: str | None = None,
    destination_ip: str | None = None,
    source: str | None = None,
    limit: int = Query(default=100, ge=1, le=1000),
) -> dict:
    events = _filter_events(event_store.list_events(tenant_id), verdict, severity, source_ip, destination_ip, source)
    events = list(reversed(events))[:limit]
    return api_success({"tenant_id": tenant_id, "events": events, "count": len(events)}, tenant_id=tenant_id, events=events, count=len(events))


@router.get("/export", response_model=None)
def export_events(
    tenant_id: str = Depends(get_tenant_id),
    format: str = Query(default="json", pattern="^(json|csv)$"),
    verdict: str | None = None,
    severity: str | None = None,
):
    events = _filter_events(event_store.list_events(tenant_id), verdict, severity, None, None, None)
    if format == "json":
        return api_success({"tenant_id": tenant_id, "events": events}, tenant_id=tenant_id, events=events)
    output = StringIO()
    fields = ["id", "timestamp", "source", "source_ip", "destination_ip", "verdict", "severity", "confidence", "risk_score", "model_name", "model_version"]
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    for event in events:
        writer.writerow({field: event.get(field, "") for field in fields})
    return Response(content=output.getvalue(), media_type="text/csv")


@router.get("/{event_id}")
def get_event(event_id: str, tenant_id: str = Depends(get_tenant_id)) -> dict:
    event = event_store.get_event(event_id, tenant_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return api_success({"tenant_id": tenant_id, "event": event}, tenant_id=tenant_id, event=event)


@router.delete("/clear-dev-only")
def clear_events_dev_only(tenant_id: str = Depends(get_tenant_id)) -> dict:
    if settings.environment.lower() != "development":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="clear-dev-only is disabled outside development")
    deleted = event_store.clear(tenant_id)
    return api_success({"tenant_id": tenant_id, "deleted": deleted}, tenant_id=tenant_id, deleted=deleted)


def _filter_events(
    events: list[dict],
    verdict: str | None,
    severity: str | None,
    source_ip: str | None,
    destination_ip: str | None,
    source: str | None,
) -> list[dict]:
    filtered = events
    if verdict:
        filtered = [event for event in filtered if event.get("verdict") == verdict]
    if severity:
        filtered = [event for event in filtered if event.get("severity") == severity]
    if source_ip:
        filtered = [event for event in filtered if event.get("source_ip") == source_ip]
    if destination_ip:
        filtered = [event for event in filtered if event.get("destination_ip") == destination_ip]
    if source:
        filtered = [event for event in filtered if source.lower() in str(event.get("source") or "").lower()]
    return filtered
