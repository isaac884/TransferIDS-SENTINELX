from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _load_env_files() -> None:
    try:
        from dotenv import load_dotenv
    except Exception:
        return

    backend_root = Path(__file__).resolve().parents[1]
    project_root = backend_root.parent
    for env_path in (project_root / ".env", backend_root / ".env"):
        if env_path.exists():
            load_dotenv(env_path, override=False)


_load_env_files()


BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent


def resolve_runtime_path(value: str | os.PathLike[str]) -> Path:
    """Resolve runtime paths from Windows, WSL, project-root, or backend-root contexts."""

    raw = str(value)
    path = Path(raw)
    if path.is_absolute() and path.exists():
        return path
    if len(raw) >= 3 and raw[1:3] in {":/", ":\\"}:
        drive = raw[0].lower()
        rest = raw[3:].replace("\\", "/")
        wsl_path = Path("/mnt") / drive / rest
        if wsl_path.exists():
            return wsl_path
    candidates = [
        PROJECT_ROOT / path,
        BACKEND_ROOT / path,
    ]
    if path.parts and path.parts[0] == "backend":
        candidates.append(PROJECT_ROOT / path)
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return path


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "TransferIDS SENTINEL-X")
    environment: str = os.getenv("APP_ENV", "development")
    api_prefix: str = os.getenv("API_PREFIX", "/api/v1")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://transferids:transferids@127.0.0.1:5432/transferids",
    )
    database_required: bool = os.getenv("DATABASE_REQUIRED", "false").lower() in {"1", "true", "yes", "on"}
    jwt_secret: str = os.getenv("JWT_SECRET", "change-me-before-production")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_minutes: int = int(os.getenv("ACCESS_TOKEN_MINUTES", "120"))
    auth_required: bool = os.getenv("AUTH_REQUIRED", "false").lower() in {"1", "true", "yes", "on"}
    allow_self_registration: bool = os.getenv("ALLOW_SELF_REGISTRATION", "true").lower() in {"1", "true", "yes", "on"}
    bootstrap_admin_username: str = os.getenv("BOOTSTRAP_ADMIN_USERNAME", "admin")
    bootstrap_admin_password: str = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "")
    bootstrap_admin_role: str = os.getenv("BOOTSTRAP_ADMIN_ROLE", "admin")
    bootstrap_admin_reset_password: bool = os.getenv("BOOTSTRAP_ADMIN_RESET_PASSWORD", "false").lower() in {"1", "true", "yes", "on"}
    cors_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080,http://localhost:8010,http://127.0.0.1:8010",
        ).split(",")
        if origin.strip()
    )
    tenant_isolation_mode: str = os.getenv("TENANT_ISOLATION_MODE", "single")
    default_tenant_id: str = os.getenv("DEFAULT_TENANT_ID", "default")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    model_artifact_path: str = os.getenv(
        "MODEL_ARTIFACT_PATH",
        "backend/app/ml/artifacts/transferids_c3.onnx",
    )
    model_metadata_path: str = os.getenv(
        "MODEL_METADATA_PATH",
        "backend/app/ml/artifacts/transferids_c3.metadata.json",
    )
    attack_threshold: float = float(os.getenv("ATTACK_THRESHOLD", "0.5"))

    def __post_init__(self) -> None:
        if self.environment.lower() in {"production", "prod"} and self.jwt_secret == "change-me-before-production":
            raise RuntimeError("JWT_SECRET must be set in production.")


settings = Settings()
