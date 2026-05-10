from __future__ import annotations

from sqlalchemy import Column, DateTime, Float, Integer, JSON, String, func

from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(64), index=True, default="default")
    event_id = Column(String(64), unique=True, index=True, nullable=False)
    source_reference = Column(String(255))
    agent_id = Column(String(128), index=True)
    row_number = Column(Integer)
    source_ip = Column(String(64), index=True)
    destination_ip = Column(String(64), index=True)
    verdict = Column(String(64), index=True)
    classification_scope = Column(String(64), default="binary")
    attack_family = Column(String(128))
    attack_family_source = Column(String(128))
    confidence = Column(Float, default=0.0)
    threshold = Column(Float, default=0.0)
    severity = Column(String(32), index=True, default="low")
    risk_score = Column(Float, default=0.0)
    model_name = Column(String(128))
    model_version = Column(String(128))
    dataset_origin = Column(String(128))
    features = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
