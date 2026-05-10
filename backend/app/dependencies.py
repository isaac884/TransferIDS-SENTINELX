from __future__ import annotations

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.config import settings
from app.core.auth import decode_access_token
from app.database import get_session
from app.services.user_service import get_user_by_username


DbSession = Annotated[Session, Depends(get_session)]


def get_tenant_id(x_transferids_tenant: Annotated[str | None, Header()] = None) -> str:
    if x_transferids_tenant:
        return x_transferids_tenant
    if settings.tenant_isolation_mode.lower() in {"required", "strict", "multi"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing X-TransferIDS-Tenant header")
    return settings.default_tenant_id


def get_current_user(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    db: Session = Depends(get_session),
) -> dict:
    if not authorization:
        if not settings.auth_required:
            if settings.environment.lower() in {"development", "dev", "local", "test"}:
                return {"username": "local-analyst", "tenant_id": settings.default_tenant_id, "roles": ["admin", "analyst"]}
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")

    try:
        claims = decode_access_token(token)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

    username = claims.get("sub")
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    user = get_user_by_username(db, str(username))
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is inactive or unavailable")

    return {"username": user.username, "tenant_id": user.tenant_id, "roles": [user.role]}


def require_roles(*allowed_roles: str) -> Callable[[dict], dict]:
    def _guard(user: Annotated[dict, Depends(get_current_user)]) -> dict:
        roles = set(user.get("roles", []))
        if allowed_roles and not roles.intersection(allowed_roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return _guard
