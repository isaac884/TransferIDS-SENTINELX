from __future__ import annotations

from sqlalchemy import Column, DateTime, Float, Integer, String, func

from app.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(64), index=True, default="default")
    incident_id = Column(String(64), unique=True, index=True, nullable=False)
    source_event_id = Column(String(64), index=True)
    title = Column(String(255), nullable=False)
    priority = Column(String(16), index=True, default="P3")
    status = Column(String(32), default="New")
    severity = Column(String(32), index=True, default="low")
    confidence = Column(Float, default=0.0)
    risk_score = Column(Float, default=0.0)
    assignee = Column(String(128))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
