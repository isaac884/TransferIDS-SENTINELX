from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.response_utils import api_success
from app.dependencies import get_current_user, get_tenant_id
from app.integrations.agent_receiver_service import AgentReceiverService
from app.schemas.canonical_ingestion_schema import AgentFlowBatch, AgentHeartbeat
from app.services.agent_registry_service import agent_registry


router = APIRouter(dependencies=[Depends(get_current_user)])
agent_receiver = AgentReceiverService()


class AgentEnrollRequest(BaseModel):
    agent_id: str | None = Field(default=None, max_length=128)
    display_name: str | None = Field(default=None, max_length=255)
    hostname: str | None = Field(default=None, max_length=255)
    ip_address: str | None = Field(default=None, max_length=64)
    platform: str | None = Field(default=None, max_length=64)
    agent_version: str | None = Field(default=None, max_length=64)
    capabilities: list[str] = Field(default_factory=list)


@router.post("/enroll")
def enroll_agent(payload: AgentEnrollRequest, tenant_id: str = Depends(get_tenant_id)) -> dict[str, Any]:
    agent = agent_registry.enroll(payload.model_dump(), tenant_id)
    data = {
        "tenant_id": tenant_id,
        "agent": agent,
        "endpoints": {
            "heartbeat": "/api/agents/heartbeat",
            "observations": "/api/agents/observations",
        },
    }
    return api_success(data, **data)


@router.post("/heartbeat")
def agent_heartbeat(payload: AgentHeartbeat, tenant_id: str = Depends(get_tenant_id)) -> dict[str, Any]:
    ack = agent_receiver.receive_heartbeat(payload, tenant_id)
    agent = agent_registry.get(payload.agent_id, tenant_id)
    data = {"tenant_id": tenant_id, "agent": agent, **ack}
    return api_success(data, **data)


@router.post("/observations")
def agent_observations(payload: AgentFlowBatch, tenant_id: str = Depends(get_tenant_id)):
    return agent_receiver.receive_flows(payload, tenant_id)


@router.get("/summary")
def agents_summary(tenant_id: str = Depends(get_tenant_id)) -> dict[str, Any]:
    summary = agent_registry.summary(tenant_id)
    data = {"tenant_id": tenant_id, **summary}
    return api_success(data, **data)


@router.get("/{agent_id}/status")
def agent_status(agent_id: str, tenant_id: str = Depends(get_tenant_id)) -> dict[str, Any]:
    agent = agent_registry.get(agent_id, tenant_id)
    if agent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    data = {"tenant_id": tenant_id, "agent": agent}
    return api_success(data, **data)


@router.get("")
def list_agents(tenant_id: str = Depends(get_tenant_id)) -> dict[str, Any]:
    agents = agent_registry.list(tenant_id)
    data = {"tenant_id": tenant_id, "agents": agents, "items": agents, "count": len(agents)}
    return api_success(data, **data)
