from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import settings
from app.core.auth import create_access_token
from app.database import get_session
from app.dependencies import get_current_user
from app.schemas.auth_schema import LoginRequest, RegisterRequest, TokenResponse
from app.services.user_service import authenticate_user, create_user


router = APIRouter()


def _token_response_for_user(user) -> TokenResponse:
    token = create_access_token(
        {
            "sub": user.username,
            "tenant_id": user.tenant_id,
            "roles": [user.role],
        }
    )
    return TokenResponse(access_token=token, username=user.username, role=user.role, tenant_id=user.tenant_id)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db=Depends(get_session)) -> TokenResponse:
    user = authenticate_user(db, payload.username, payload.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    return _token_response_for_user(user)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db=Depends(get_session)) -> TokenResponse:
    if not settings.allow_self_registration:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Self registration is disabled")
    try:
        user = create_user(db, payload.username, payload.password, role="analyst")
    except ValueError as exc:
        if str(exc) == "USERNAME_ALREADY_EXISTS":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists") from exc
        if str(exc) == "INVALID_PASSWORD_POLICY":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password does not meet policy") from exc
        raise
    return _token_response_for_user(user)


@router.get("/me")
def me(user: dict = Depends(get_current_user)) -> dict:
    return user
