from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Any
from uuid import uuid4


class AgentRegistryService:
    """Distributed sensor enrollment and heartbeat registry.

    The registry is DB-backed when the configured database is available and
    falls back to local memory only when the database is unavailable. It stores
    sensor state only; it never generates security events.
    """

    def __init__(self) -> None:
        self._agents: dict[str, dict[str, Any]] = {}
        self._lock = Lock()

    def enroll(self, payload: dict[str, Any], tenant_id: str) -> dict[str, Any]:
        now = _now_dt()
        agent_id = str(payload.get("agent_id") or f"agent_{uuid4().hex[:10]}")
        hostname = str(payload.get("hostname") or agent_id)
        record = {
            "tenant_id": tenant_id,
            "agent_id": agent_id,
            "display_name": payload.get("display_name") or hostname,
            "hostname": hostname,
            "ip_address": payload.get("ip_address"),
            "platform": payload.get("platform") or "unknown",
            "agent_version": payload.get("agent_version") or "unknown",
            "status": "enrolled",
            "enrolled_at": _iso(now),
            "last_heartbeat_at": None,
            "last_observation_at": None,
            "last_seen_at": _iso(now),
            "observations_received": 0,
            "events_created": 0,
        }
        persisted = self._upsert_device(record)
        if persisted is not None:
            record = persisted
        with self._lock:
            existing = self._agents.get(agent_id, {})
            self._agents[agent_id] = {**existing, **record}
            return dict(self._agents[agent_id])

    def heartbeat(self, payload: dict[str, Any], tenant_id: str) -> dict[str, Any]:
        now = _now_dt()
        agent_id = str(payload.get("agent_id"))
        with self._lock:
            current = self._agents.get(
                agent_id,
                {
                    "tenant_id": tenant_id,
                    "agent_id": agent_id,
                    "display_name": payload.get("display_name") or payload.get("hostname") or agent_id,
                    "hostname": payload.get("hostname") or agent_id,
                    "ip_address": payload.get("ip_address"),
                    "platform": payload.get("platform") or "unknown",
                    "agent_version": payload.get("agent_version") or "unknown",
                    "status": "alive",
                    "enrolled_at": _iso(now),
                    "observations_received": 0,
                    "events_created": 0,
                },
            )
            current.update(
                {
                    "tenant_id": tenant_id,
                    "agent_id": agent_id,
                    "display_name": payload.get("display_name") or current.get("display_name") or payload.get("hostname") or agent_id,
                    "hostname": payload.get("hostname") or current.get("hostname"),
                    "ip_address": payload.get("ip_address") or current.get("ip_address"),
                    "platform": payload.get("platform") or current.get("platform") or "unknown",
                    "agent_version": payload.get("agent_version") or current.get("agent_version") or "unknown",
                    "status": payload.get("status") or "alive",
                    "last_heartbeat_at": payload.get("timestamp") or _iso(now),
                    "last_seen_at": payload.get("timestamp") or _iso(now),
                }
            )
            persisted = self._upsert_device(current)
            if persisted is not None:
                current.update(persisted)
            self._agents[agent_id] = current
            return dict(current)

    def observations(self, agent_id: str, tenant_id: str, count: int, events_created: int = 0) -> dict[str, Any]:
        now = _now_dt()
        with self._lock:
            current = self._agents.get(
                agent_id,
                {
                    "tenant_id": tenant_id,
                    "agent_id": agent_id,
                    "display_name": agent_id,
                    "hostname": agent_id,
                    "platform": "unknown",
                    "agent_version": "unknown",
                    "status": "active",
                    "enrolled_at": _iso(now),
                    "observations_received": 0,
                    "events_created": 0,
                },
            )
            current["tenant_id"] = tenant_id
            current["status"] = "active"
            current["last_observation_at"] = _iso(now)
            current["last_seen_at"] = _iso(now)
            current["observations_received"] = int(current.get("observations_received") or 0) + count
            current["events_created"] = int(current.get("events_created") or 0) + events_created
            persisted = self._upsert_device(current)
            if persisted is not None:
                current.update(persisted)
            self._agents[agent_id] = current
            return dict(current)

    def get(self, agent_id: str, tenant_id: str | None = None) -> dict[str, Any] | None:
        persisted = self._load_device(agent_id, tenant_id)
        if persisted is not None:
            with self._lock:
                self._agents[agent_id] = persisted
            return persisted
        with self._lock:
            record = self._agents.get(agent_id)
            if record is None:
                return None
            if tenant_id is not None and record.get("tenant_id") != tenant_id:
                return None
            return dict(record)

    def list(self, tenant_id: str | None = None) -> list[dict[str, Any]]:
        persisted = self._list_devices(tenant_id)
        if persisted is not None:
            with self._lock:
                for record in persisted:
                    self._agents[str(record.get("agent_id"))] = record
            return persisted
        with self._lock:
            records = [dict(value) for value in self._agents.values()]
        if tenant_id is None:
            return records
        return [record for record in records if record.get("tenant_id") == tenant_id]

    def summary(self, tenant_id: str | None = None) -> dict[str, Any]:
        agents = self.list(tenant_id)
        online_statuses = {"alive", "active", "observed", "enrolled"}
        online_agents = [agent for agent in agents if str(agent.get("status") or "").lower() in online_statuses]
        last_seen = sorted(
            [str(agent.get("last_seen_at") or "") for agent in agents if agent.get("last_seen_at")],
            reverse=True,
        )
        return {
            "tenant_id": tenant_id,
            "total_agents": len(agents),
            "online_agents": len(online_agents),
            "offline_agents": max(0, len(agents) - len(online_agents)),
            "observations_received": sum(int(agent.get("observations_received") or 0) for agent in agents),
            "events_created": sum(int(agent.get("events_created") or 0) for agent in agents),
            "last_seen_at": last_seen[0] if last_seen else None,
            "agents": agents,
            "empty": len(agents) == 0,
        }

    def _database_available(self) -> bool:
        try:
            from app.database import is_database_available

            return is_database_available()
        except Exception:
            return False

    def _upsert_device(self, record: dict[str, Any]) -> dict[str, Any] | None:
        if not self._database_available():
            return None
        try:
            from app.database import SessionLocal
            from app.models.device_model import Device

            db = SessionLocal()
            try:
                agent_id = str(record.get("agent_id") or "")
                tenant_id = str(record.get("tenant_id") or "default")
                device = db.query(Device).filter(Device.tenant_id == tenant_id, Device.agent_id == agent_id).first()
                if device is None:
                    device = Device(tenant_id=tenant_id, agent_id=agent_id, hostname=str(record.get("hostname") or agent_id))
                    db.add(device)
                _apply_device_record(device, record)
                db.commit()
                db.refresh(device)
                return _device_to_record(device)
            except Exception:
                db.rollback()
                return None
            finally:
                db.close()
        except Exception:
            return None

    def _load_device(self, agent_id: str, tenant_id: str | None = None) -> dict[str, Any] | None:
        if not self._database_available():
            return None
        try:
            from app.database import SessionLocal
            from app.models.device_model import Device

            db = SessionLocal()
            try:
                query = db.query(Device).filter(Device.agent_id == agent_id)
                if tenant_id is not None:
                    query = query.filter(Device.tenant_id == tenant_id)
                row = query.first()
                return _device_to_record(row) if row is not None else None
            finally:
                db.close()
        except Exception:
            return None

    def _list_devices(self, tenant_id: str | None = None) -> list[dict[str, Any]] | None:
        if not self._database_available():
            return None
        try:
            from app.database import SessionLocal
            from app.models.device_model import Device

            db = SessionLocal()
            try:
                query = db.query(Device).filter(Device.agent_id.isnot(None))
                if tenant_id is not None:
                    query = query.filter(Device.tenant_id == tenant_id)
                rows = query.order_by(Device.id.asc()).all()
                records = [_device_to_record(row) for row in rows]
                return sorted(records, key=lambda item: str(item.get("last_seen_at") or ""), reverse=True)
            finally:
                db.close()
        except Exception:
            return None


def _now_dt() -> datetime:
    return datetime.now(timezone.utc)


def _iso(value: Any) -> str | None:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat()
    if isinstance(value, str) and value.strip():
        return value
    return None


def _parse_dt(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value.strip():
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _apply_device_record(device: Any, record: dict[str, Any]) -> None:
    agent_id = str(record.get("agent_id") or device.agent_id or "")
    device.tenant_id = str(record.get("tenant_id") or device.tenant_id or "default")
    device.agent_id = agent_id
    device.display_name = record.get("display_name") or device.display_name or record.get("hostname") or agent_id
    device.hostname = str(record.get("hostname") or device.hostname or agent_id)
    device.ip_address = record.get("ip_address") or device.ip_address
    device.platform = record.get("platform") or device.platform or "unknown"
    device.agent_version = record.get("agent_version") or device.agent_version or "unknown"
    device.status = str(record.get("status") or device.status or "enrolled")
    device.enrolled_at = _parse_dt(record.get("enrolled_at")) or device.enrolled_at or _now_dt()
    device.last_heartbeat_at = _parse_dt(record.get("last_heartbeat_at")) or device.last_heartbeat_at
    device.last_observation_at = _parse_dt(record.get("last_observation_at")) or device.last_observation_at
    device.last_seen_at = _parse_dt(record.get("last_seen_at")) or device.last_observation_at or device.last_heartbeat_at or _now_dt()
    device.observations_received = int(record.get("observations_received") or device.observations_received or 0)
    device.events_created = int(record.get("events_created") or device.events_created or 0)


def _device_to_record(device: Any) -> dict[str, Any]:
    return {
        "tenant_id": device.tenant_id,
        "agent_id": device.agent_id,
        "display_name": device.display_name or device.hostname or device.agent_id,
        "hostname": device.hostname,
        "ip_address": device.ip_address,
        "platform": device.platform or "unknown",
        "agent_version": device.agent_version or "unknown",
        "status": device.status or "unknown",
        "enrolled_at": _iso(device.enrolled_at),
        "last_heartbeat_at": _iso(device.last_heartbeat_at),
        "last_observation_at": _iso(device.last_observation_at),
        "last_seen_at": _iso(device.last_seen_at or device.last_observation_at or device.last_heartbeat_at),
        "observations_received": int(device.observations_received or 0),
        "events_created": int(device.events_created or 0),
    }


agent_registry = AgentRegistryService()
