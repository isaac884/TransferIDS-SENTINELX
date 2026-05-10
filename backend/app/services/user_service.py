from __future__ import annotations

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import hash_password, password_policy_error, verify_password
from app.database import SessionLocal, is_database_available
from app.models.user_model import User


def get_user_by_username(db: Session, username: str) -> User | None:
    normalized_username = username.strip().lower()
    return db.query(User).filter(User.username == normalized_username).one_or_none()


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = get_user_by_username(db, username)
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_user(
    db: Session,
    username: str,
    password: str,
    tenant_id: str | None = None,
    role: str = "analyst",
) -> User:
    normalized_username = username.strip().lower()
    policy_error = password_policy_error(password)
    if policy_error:
        raise ValueError("INVALID_PASSWORD_POLICY")
    if get_user_by_username(db, normalized_username) is not None:
        raise ValueError("USERNAME_ALREADY_EXISTS")

    user = User(
        tenant_id=tenant_id or settings.default_tenant_id,
        username=normalized_username,
        password_hash=hash_password(password),
        role=role,
        is_active=True,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ValueError("USERNAME_ALREADY_EXISTS") from exc
    db.refresh(user)
    return user


def ensure_bootstrap_admin() -> dict:
    if not settings.bootstrap_admin_password:
        return {"created": False, "reason": "BOOTSTRAP_ADMIN_PASSWORD not configured"}
    if not is_database_available():
        return {"created": False, "reason": "database unavailable"}

    db = SessionLocal()
    try:
        bootstrap_username = settings.bootstrap_admin_username.strip().lower()
        existing = get_user_by_username(db, bootstrap_username)
        if existing is not None:
            if settings.bootstrap_admin_reset_password:
                existing.password_hash = hash_password(settings.bootstrap_admin_password)
                existing.role = settings.bootstrap_admin_role
                existing.is_active = True
                db.commit()
                return {"created": False, "updated": True, "username": existing.username}
            return {"created": False, "username": existing.username, "reason": "already exists"}
        user = User(
            tenant_id=settings.default_tenant_id,
            username=bootstrap_username,
            password_hash=hash_password(settings.bootstrap_admin_password),
            role=settings.bootstrap_admin_role,
            is_active=True,
        )
        db.add(user)
        db.commit()
        return {"created": True, "username": user.username}
    except SQLAlchemyError:
        db.rollback()
        raise
    finally:
        db.close()
