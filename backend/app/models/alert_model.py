from __future__ import annotations

from sqlalchemy import Column, DateTime, Float, Integer, String, func

from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(64), index=True, default="default")
    event_id = Column(Integer, index=True)
    severity = Column(String(32), index=True)
    risk_score = Column(Float, default=0.0)
    status = Column(String(32), default="open")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

