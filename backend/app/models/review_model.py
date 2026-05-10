from __future__ import annotations

from sqlalchemy import Column, DateTime, Integer, String, Text, func

from app.database import Base


class ReviewRecord(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(64), index=True, default="default")
    event_id = Column(String(64), index=True)
    analyst = Column(String(128))
    verdict = Column(String(64), index=True)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
