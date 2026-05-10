from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class CanonicalFlow(BaseModel):
    source_ip: str
    destination_ip: str
    protocol: str = "tcp"
    features: dict[str, Any] = Field(default_factory=dict)


class CanonicalFlowBatch(BaseModel):
    flows: list[CanonicalFlow]


class IntakeAck(BaseModel):
    tenant_id: str
    accepted: int
    rejected: int


class AgentHeartbeat(BaseModel):
    agent_id: str
    status: str = "alive"
    timestamp: str | None = None
    display_name: str | None = None
    hostname: str | None = None
    ip_address: str | None = None
    platform: str | None = None
    agent_version: str | None = None


class AgentFlowBatch(BaseModel):
    agent_id: str
    flows: list[CanonicalFlow]
    captured_at: str | None = None
