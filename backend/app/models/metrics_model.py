from __future__ import annotations

from sqlalchemy import Column, Date, DateTime, Float, Integer, String, func

from app.database import Base


class DailyMetric(Base):
    __tablename__ = "daily_metrics"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(64), index=True, default="default")
    metric_date = Column(Date, index=True)
    raw_observations = Column(Integer, default=0)
    materialized_events = Column(Integer, default=0)
    false_positive_rate = Column(Float, default=0.0)


class Metric(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(64), index=True, default="default")
    metric_name = Column(String(128), index=True, nullable=False)
    metric_value = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
