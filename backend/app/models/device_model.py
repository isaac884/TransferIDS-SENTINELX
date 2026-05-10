from __future__ import annotations

from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint, func

from app.database import Base


class Device(Base):
    __tablename__ = "devices"
    __table_args__ = (UniqueConstraint("tenant_id", "agent_id", name="uq_devices_tenant_agent"),)

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(64), index=True, default="default")
    agent_id = Column(String(128), index=True)
    display_name = Column(String(255))
    hostname = Column(String(255), nullable=False)
    ip_address = Column(String(64), index=True)
    platform = Column(String(64))
    agent_version = Column(String(64), default="unknown")
    status = Column(String(32), default="enrolled", index=True)
    criticality = Column(String(32), default="medium")
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    last_heartbeat_at = Column(DateTime(timezone=True))
    last_observation_at = Column(DateTime(timezone=True))
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now())
    observations_received = Column(Integer, default=0)
    events_created = Column(Integer, default=0)
