from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import re
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response, WebSocket
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api import (
    auth_routes,
    agents_routes,
    dashboard_routes,
    detection_routes,
    events_routes,
    incidents_routes,
    intake_routes,
    integrations_routes,
    metrics_routes,
    platform_routes,
    reports_routes,
    response_routes,
    review_routes,
    settings_routes,
    websocket_routes,
)
from app.config import settings
from app.database import initialize_database

APP_RUNTIME_VERSION = "2026-05-09-sentinelx-merged"
FRONTEND_BUILD_ID = "20260509-transferids-web-ui-web3-api"


def _api_prefixes() -> list[str]:
    prefixes = [settings.api_prefix, "/api"]
    normalized: list[str] = []
    for prefix in prefixes:
        clean = "/" + prefix.strip("/")
        if clean not in normalized:
            normalized.append(clean)
    return normalized


def _is_allowed_local_origin(origin: str | None) -> bool:
    if not origin:
        return False
    if origin in settings.cors_origins:
        return True
    return re.match(r"^https?://(localhost|127\.0\.0\.1):(5173|8080)$", origin) is not None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    initialize_database()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
    frontend_root = Path(__file__).resolve().parents[2] / "frontend"

    def health_payload() -> dict:
        return {
            "status": "ok",
            "service": settings.app_name,
            "environment": settings.environment,
            "runtime_version": APP_RUNTIME_VERSION,
            "frontend_build_id": FRONTEND_BUILD_ID,
            "main_file": str(Path(__file__).resolve()),
        }

    @app.middleware("http")
    async def local_frontend_cors_guard(request: Request, call_next):
        origin = request.headers.get("origin")
        if request.method == "OPTIONS" and _is_allowed_local_origin(origin):
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
                    "Access-Control-Allow-Headers": request.headers.get(
                        "access-control-request-headers",
                        "authorization,content-type,x-transferids-tenant",
                    ),
                    "Vary": "Origin",
                },
            )

        response = await call_next(request)
        if request.url.path.endswith((".html", ".js", ".css")) or request.url.path.startswith(("/js/", "/css/", "/assets/")):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        if _is_allowed_local_origin(origin):
            response.headers.setdefault("Access-Control-Allow-Origin", origin)
            response.headers.setdefault("Access-Control-Allow-Credentials", "true")
            response.headers.setdefault("Vary", "Origin")
        return response

    for api_prefix in _api_prefixes():
        app.include_router(auth_routes.router, prefix=f"{api_prefix}/auth", tags=["auth"])
        app.include_router(agents_routes.router, prefix=f"{api_prefix}/agents", tags=["agents"])
        app.include_router(dashboard_routes.router, prefix=f"{api_prefix}/dashboard", tags=["dashboard"])
        app.include_router(detection_routes.router, prefix=f"{api_prefix}/detection", tags=["detection"])
        app.include_router(intake_routes.router, prefix=f"{api_prefix}/intake", tags=["intake"])
        app.include_router(events_routes.router, prefix=f"{api_prefix}/events", tags=["events"])
        app.include_router(incidents_routes.router, prefix=f"{api_prefix}/incidents", tags=["incidents"])
        app.include_router(response_routes.router, prefix=f"{api_prefix}/response", tags=["response"])
        app.include_router(metrics_routes.router, prefix=f"{api_prefix}/metrics", tags=["metrics"])
        app.include_router(platform_routes.router, prefix=f"{api_prefix}/platform", tags=["platform"])
        app.include_router(reports_routes.router, prefix=f"{api_prefix}/reports", tags=["reports"])
        app.include_router(review_routes.router, prefix=f"{api_prefix}/review", tags=["review"])
        app.include_router(settings_routes.router, prefix=f"{api_prefix}/settings", tags=["settings"])
        app.include_router(integrations_routes.router, prefix=f"{api_prefix}/integrations", tags=["integrations"])
        app.include_router(websocket_routes.router, prefix=f"{api_prefix}/ws", tags=["websocket"])

    @app.get("/healthz")
    def healthz() -> dict:
        return health_payload()

    @app.get("/api/health")
    def api_health() -> dict:
        return health_payload()

    @app.websocket("/ws/events")
    async def ws_events(websocket: WebSocket) -> None:
        await websocket_routes.live_stream(websocket)

    @app.get("/runtime-info")
    def runtime_info() -> dict:
        return {
            "service": settings.app_name,
            "runtime_version": APP_RUNTIME_VERSION,
            "frontend_build_id": FRONTEND_BUILD_ID,
            "main_file": str(Path(__file__).resolve()),
            "frontend_root": str(frontend_root),
            "frontend_root_exists": frontend_root.exists(),
            "index_html_exists": (frontend_root / "index.html").exists(),
            "login_html_exists": (frontend_root / "login.html").exists() or (frontend_root / "index.html").exists(),
        }

    if frontend_root.exists():
        for mount_path, directory_name, mount_name in (
            ("/css", "css", "frontend-css"),
            ("/js", "js", "frontend-js"),
            ("/assets", "assets", "frontend-assets"),
        ):
            directory = frontend_root / directory_name
            if directory.exists():
                app.mount(mount_path, StaticFiles(directory=directory), name=mount_name)

        @app.get("/", include_in_schema=False)
        def frontend_index():
            return RedirectResponse(url="/index.html")

        @app.get("/{page_name}", include_in_schema=False)
        def frontend_page(page_name: str):
            if "/" in page_name or "\\" in page_name or page_name.startswith("."):
                raise HTTPException(status_code=404, detail="Not Found")
            page_path = frontend_root / page_name
            if page_name in {"login.html", "register.html"} and not page_path.exists():
                page_path = frontend_root / "index.html"
            allowed_suffixes = {".html", ".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".ico", ".webp"}
            if page_path.suffix.lower() not in allowed_suffixes or not page_path.exists() or not page_path.is_file():
                raise HTTPException(status_code=404, detail="Not Found")
            return FileResponse(page_path)

    return app


app = create_app()
