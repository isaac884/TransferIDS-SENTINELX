from __future__ import annotations

from sqlalchemy import Column, DateTime, Integer, String, func

from app.database import Base


class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(64), index=True, default="default")
    job_id = Column(String(64), unique=True, index=True, nullable=False)
    source_reference = Column(String(255), nullable=False)
    status = Column(String(32), index=True, nullable=False)
    records_processed = Column(Integer, default=0)
    events_created = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
