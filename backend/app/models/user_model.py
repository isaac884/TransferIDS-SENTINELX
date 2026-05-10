from __future__ import annotations

from sqlalchemy import Boolean, Column, Integer, String

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(64), index=True, default="default")
    username = Column(String(128), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), default="analyst")
    is_active = Column(Boolean, default=True)

