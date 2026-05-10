from __future__ import annotations

from functools import lru_cache
from time import monotonic

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import inspect, text
from sqlalchemy.pool import StaticPool

from app.config import settings


def _engine_kwargs(database_url: str) -> dict:
    url = make_url(database_url)
    if url.drivername.startswith("sqlite"):
        kwargs: dict[str, object] = {"connect_args": {"check_same_thread": False}}
        if url.database in {None, "", ":memory:"}:
            kwargs["poolclass"] = StaticPool
        return kwargs
    return {"pool_pre_ping": True}


engine = create_engine(settings.database_url, **_engine_kwargs(settings.database_url))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

_database_state: dict[str, object] = {
    "initialized": False,
    "available": False,
    "error": None,
    "last_checked_at": 0.0,
}


def get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@lru_cache(maxsize=1)
def import_models() -> bool:
    """Import ORM models so Base.metadata contains all tables."""

    import app.models.alert_model  # noqa: F401
    import app.models.device_model  # noqa: F401
    import app.models.event_model  # noqa: F401
    import app.models.incident_model  # noqa: F401
    import app.models.ingestion_model  # noqa: F401
    import app.models.metrics_model  # noqa: F401
    import app.models.review_model  # noqa: F401
    import app.models.user_model  # noqa: F401

    return True


def initialize_database(force: bool = False) -> dict[str, object]:
    if _database_state["initialized"] and _database_state["available"] and not force:
        return database_status(connect=False)
    if _database_state["initialized"] and not force:
        last_checked_at = float(_database_state.get("last_checked_at") or 0.0)
        if monotonic() - last_checked_at < 5.0:
            return database_status(connect=False)

    import_models()
    try:
        _database_state["last_checked_at"] = monotonic()
        Base.metadata.create_all(bind=engine)
        ensure_schema_compatibility()
        _database_state.update({"initialized": True, "available": True, "error": None})
        ensure_bootstrap_users()
    except SQLAlchemyError as exc:
        _database_state.update({"initialized": True, "available": False, "error": str(exc)})
        if settings.database_required:
            raise
    return database_status(connect=False)


def ensure_schema_compatibility() -> None:
    """Apply additive runtime-safe columns for local MVP databases."""

    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    if "events" not in table_names:
        return
    event_columns = {column["name"] for column in inspector.get_columns("events")}
    missing_event_columns = {
        "agent_id": "VARCHAR(128)",
        "classification_scope": "VARCHAR(64)",
        "attack_family": "VARCHAR(128)",
        "attack_family_source": "VARCHAR(128)",
    }
    with engine.begin() as connection:
        for column_name, column_type in missing_event_columns.items():
            if column_name not in event_columns:
                connection.execute(text(f"ALTER TABLE events ADD COLUMN {column_name} {column_type}"))
        if "devices" in table_names:
            device_columns = {column["name"] for column in inspector.get_columns("devices")}
            missing_device_columns = {
                "agent_id": "VARCHAR(128)",
                "display_name": "VARCHAR(255)",
                "platform": "VARCHAR(64)",
                "agent_version": "VARCHAR(64)",
                "status": "VARCHAR(32)",
                "enrolled_at": "TIMESTAMP",
                "last_heartbeat_at": "TIMESTAMP",
                "last_observation_at": "TIMESTAMP",
                "observations_received": "INTEGER",
                "events_created": "INTEGER",
            }
            for column_name, column_type in missing_device_columns.items():
                if column_name not in device_columns:
                    connection.execute(text(f"ALTER TABLE devices ADD COLUMN {column_name} {column_type}"))


def ensure_bootstrap_users() -> None:
    try:
        from app.services.user_service import ensure_bootstrap_admin

        ensure_bootstrap_admin()
    except Exception:
        if settings.database_required:
            raise


def is_database_available() -> bool:
    if not _database_state["initialized"] or not _database_state["available"]:
        initialize_database()
    return bool(_database_state["available"])


def database_status(connect: bool = True) -> dict[str, object]:
    if connect and (not _database_state["initialized"] or not _database_state["available"]):
        initialize_database()

    url = make_url(settings.database_url)
    return {
        "available": bool(_database_state["available"]),
        "initialized": bool(_database_state["initialized"]),
        "dialect": url.get_backend_name(),
        "driver": url.get_driver_name(),
        "database": url.database,
        "required": settings.database_required,
        "error": _database_state["error"],
        "tables": sorted(Base.metadata.tables.keys()) if _database_state["available"] else [],
    }
