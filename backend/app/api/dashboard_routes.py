from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user, get_tenant_id
from app.api.response_utils import api_success
from app.services.agent_registry_service import agent_registry
from app.services.event_store import event_store


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/summary")
def dashboard_summary(tenant_id: str = Depends(get_tenant_id)) -> dict:
    summary = event_store.summary(tenant_id)
    summary["distributed_sensors"] = agent_registry.summary(tenant_id)
    data = {"tenant_id": tenant_id, **summary}
    return api_success(data, **data)
