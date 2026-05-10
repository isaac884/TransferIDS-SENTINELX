from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from threading import Lock
from typing import Any


class EventStore:
    """Real uploaded inference result store with database-first persistence.

    The in-memory lists are only a runtime fallback when the configured database
    is unavailable. No sample, synthetic, or inferred-without-model rows are ever
    created here.
    """

    def __init__(self) -> None:
        self._events: list[dict[str, Any]] = []
        self._ingestion_jobs: list[dict[str, Any]] = []
        self._reviews: list[dict[str, Any]] = []
        self._lock = Lock()

    def add_many(self, events: list[dict[str, Any]], ingestion_job: dict[str, Any] | None = None) -> None:
        if not events and ingestion_job is None:
            return
        with self._lock:
            self._events.extend(events)
            if ingestion_job is not None:
                self._ingestion_jobs.append(ingestion_job)
        self._persist_add_many(events, ingestion_job)

    def list_events(self, tenant_id: str | None = None) -> list[dict[str, Any]]:
        db_events = self._db_list_events(tenant_id)
        if db_events is not None:
            return db_events
        with self._lock:
            events = list(self._events)
        if tenant_id is None:
            return events
        return [event for event in events if event.get("tenant_id") == tenant_id]

    def get_event(self, event_id: str, tenant_id: str | None = None) -> dict[str, Any] | None:
        for event in self.list_events(tenant_id):
            if event.get("id") == event_id:
                return event
        return None

    def clear(self, tenant_id: str | None = None) -> int:
        db_deleted = self._db_clear(tenant_id)
        with self._lock:
            if tenant_id is None:
                count = len(self._events)
                self._events.clear()
                self._ingestion_jobs.clear()
                self._reviews.clear()
                return db_deleted if db_deleted is not None else count
            before = len(self._events)
            self._events = [event for event in self._events if event.get("tenant_id") != tenant_id]
            self._ingestion_jobs = [job for job in self._ingestion_jobs if job.get("tenant_id") != tenant_id]
            self._reviews = [review for review in self._reviews if review.get("tenant_id") != tenant_id]
            memory_deleted = before - len(self._events)
            return db_deleted if db_deleted is not None else memory_deleted

    def summary(self, tenant_id: str | None = None) -> dict[str, Any]:
        events = self.list_events(tenant_id)
        severity_distribution = dict(Counter(str(event.get("severity", "unknown")) for event in events))
        latest = events[-1] if events else None
        recent_alerts = list(reversed(events[-10:]))
        confirmed_attacks = sum(1 for event in events if event.get("verdict") == "attack")
        false_positives = sum(1 for review in self.list_reviews(tenant_id) if review.get("verdict") == "false_positive")
        high_severity_events = sum(1 for event in events if event.get("severity") in {"high", "critical"})
        ingestion_jobs = self.list_ingestion_jobs(tenant_id)
        return {
            "event_count": len(events),
            "confirmed_attacks": confirmed_attacks,
            "false_positives": false_positives,
            "high_severity_events": high_severity_events,
            "severity_distribution": severity_distribution,
            "latest_detection_result": latest,
            "recent_alerts": recent_alerts,
            "model_status": "available" if events else "unavailable_until_model_verified",
            "ingestion_status": "ready" if not ingestion_jobs else ingestion_jobs[-1].get("status", "unknown"),
            "empty": len(events) == 0,
        }

    def incidents(self, tenant_id: str | None = None) -> list[dict[str, Any]]:
        db_incidents = self._db_incidents(tenant_id)
        if db_incidents is not None:
            return db_incidents
        events = self.list_events(tenant_id)
        incidents: list[dict[str, Any]] = []
        for event in events:
            if event.get("verdict") != "attack":
                continue
            incidents.append(
                {
                    "incident_id": f"inc_{event['id'].replace('evt_', '')}",
                    "tenant_id": event.get("tenant_id"),
                    "event_id": event.get("id"),
                    "title": f"Attack event from {event.get('source', 'uploaded file')}",
                    "status": event.get("incident_status", "New"),
                    "allowed_statuses": ["New", "Under Review", "Investigating", "Contained", "Resolved", "False Positive"],
                    "severity": event.get("severity"),
                    "confidence": event.get("confidence"),
                    "created_at": event.get("timestamp"),
                }
            )
        return incidents

    def get_incident(self, incident_id: str, tenant_id: str | None = None) -> dict[str, Any] | None:
        for incident in self.incidents(tenant_id):
            if incident.get("incident_id") == incident_id:
                return incident
        return None

    def create_incident_from_event(self, event_id: str, tenant_id: str | None = None) -> dict[str, Any] | None:
        event = self.get_event(event_id, tenant_id)
        if event is None:
            return None
        existing = self.get_incident(f"inc_{event_id.replace('evt_', '')}", tenant_id)
        if existing is not None:
            return existing

        incident = {
            "incident_id": f"inc_{event_id.replace('evt_', '')}",
            "tenant_id": event.get("tenant_id") or tenant_id or "default",
            "event_id": event_id,
            "title": f"Investigation from event {event_id}",
            "status": "New",
            "allowed_statuses": ["New", "Under Review", "Investigating", "Contained", "Resolved", "False Positive"],
            "severity": event.get("severity") or "low",
            "confidence": float(event.get("confidence") or 0.0),
            "risk_score": float(event.get("risk_score") or 0.0),
            "created_at": event.get("timestamp"),
        }
        self._persist_incident(incident)
        return self.get_incident(incident["incident_id"], tenant_id) or incident

    def update_incident_status(self, incident_id: str, status: str, tenant_id: str | None = None) -> dict[str, Any] | None:
        allowed_statuses = ["New", "Under Review", "Investigating", "Contained", "Resolved", "False Positive"]
        if status not in allowed_statuses:
            raise ValueError("INVALID_INCIDENT_STATUS")
        updated = self._db_update_incident_status(incident_id, status, tenant_id)
        if updated is not None:
            return updated
        with self._lock:
            for event in self._events:
                expected = f"inc_{str(event.get('id', '')).replace('evt_', '')}"
                if expected == incident_id and (tenant_id is None or event.get("tenant_id") == tenant_id):
                    event["incident_status"] = status
                    return self.get_incident(incident_id, tenant_id)
        return None

    def list_ingestion_jobs(self, tenant_id: str | None = None) -> list[dict[str, Any]]:
        db_jobs = self._db_list_ingestion_jobs(tenant_id)
        if db_jobs is not None:
            return db_jobs
        with self._lock:
            jobs = list(self._ingestion_jobs)
        if tenant_id is None:
            return jobs
        return [job for job in jobs if job.get("tenant_id") == tenant_id]

    def add_review(self, review: dict[str, Any]) -> dict[str, Any]:
        payload = {**review, "created_at": datetime.now(timezone.utc).isoformat()}
        with self._lock:
            self._reviews.append(payload)
        self._persist_review(payload)
        return payload

    def incident_timeline(self, incident_id: str, tenant_id: str | None = None) -> list[dict[str, Any]]:
        incident = self.get_incident(incident_id, tenant_id)
        if incident is None:
            return []
        event = self.get_event(str(incident.get("event_id") or ""), tenant_id)
        reviews = [
            review
            for review in self.list_reviews(tenant_id)
            if review.get("event_id") in {incident_id, incident.get("event_id")}
        ]
        timeline: list[dict[str, Any]] = []
        if event is not None:
            timeline.append(
                {
                    "type": "event_materialized",
                    "timestamp": event.get("timestamp"),
                    "title": f"Detection event {event.get('id')}",
                    "details": {
                        "verdict": event.get("verdict"),
                        "severity": event.get("severity"),
                        "confidence": event.get("confidence"),
                    },
                }
            )
        timeline.append(
            {
                "type": "incident_opened",
                "timestamp": incident.get("created_at"),
                "title": f"Incident {incident_id} opened",
                "details": {"status": incident.get("status"), "severity": incident.get("severity")},
            }
        )
        for review in reviews:
            timeline.append(
                {
                    "type": "analyst_review",
                    "timestamp": review.get("created_at"),
                    "title": review.get("verdict") or "Analyst note",
                    "details": {"notes": review.get("notes"), "analyst": review.get("analyst")},
                }
            )
        return timeline

    def list_reviews(self, tenant_id: str | None = None) -> list[dict[str, Any]]:
        db_reviews = self._db_list_reviews(tenant_id)
        if db_reviews is not None:
            return db_reviews
        with self._lock:
            reviews = list(self._reviews)
        if tenant_id is None:
            return reviews
        return [review for review in reviews if review.get("tenant_id") == tenant_id]

    def _database_available(self) -> bool:
        try:
            from app.database import is_database_available

            return is_database_available()
        except Exception:
            return False

    def _persist_add_many(self, events: list[dict[str, Any]], ingestion_job: dict[str, Any] | None) -> None:
        if not self._database_available():
            return
        try:
            from app.database import SessionLocal
            from app.models.event_model import Event
            from app.models.incident_model import Incident
            from app.models.ingestion_model import IngestionJob

            db = SessionLocal()
            try:
                for event in events:
                    db.add(
                        Event(
                            tenant_id=str(event.get("tenant_id") or "default"),
                            event_id=str(event.get("id")),
                            source_reference=event.get("source"),
                            agent_id=event.get("agent_id"),
                            row_number=event.get("row_number"),
                            source_ip=event.get("source_ip"),
                            destination_ip=event.get("destination_ip"),
                            verdict=event.get("verdict"),
                            classification_scope=event.get("classification_scope"),
                            attack_family=event.get("attack_family"),
                            attack_family_source=event.get("attack_family_source"),
                            confidence=float(event.get("confidence") or 0.0),
                            threshold=float(event.get("threshold") or 0.0),
                            severity=str(event.get("severity") or "low"),
                            risk_score=float(event.get("risk_score") or 0.0),
                            model_name=event.get("model_name"),
                            model_version=event.get("model_version"),
                            dataset_origin=event.get("dataset_origin"),
                            features=event.get("features") or {},
                            created_at=_parse_datetime(event.get("timestamp")),
                        )
                    )
                    if event.get("verdict") == "attack":
                        incident_id = f"inc_{str(event.get('id', '')).replace('evt_', '')}"
                        db.add(
                            Incident(
                                tenant_id=str(event.get("tenant_id") or "default"),
                                incident_id=incident_id,
                                source_event_id=str(event.get("id")),
                                title=f"Attack event from {event.get('source', 'uploaded file')}",
                                priority=_priority_from_severity(str(event.get("severity") or "low")),
                                status="New",
                                severity=str(event.get("severity") or "low"),
                                confidence=float(event.get("confidence") or 0.0),
                                risk_score=float(event.get("risk_score") or 0.0),
                                created_at=_parse_datetime(event.get("timestamp")),
                                updated_at=_parse_datetime(event.get("timestamp")),
                            )
                        )
                if ingestion_job is not None:
                    db.add(
                        IngestionJob(
                            tenant_id=str(ingestion_job.get("tenant_id") or "default"),
                            job_id=str(ingestion_job.get("job_id")),
                            source_reference=str(ingestion_job.get("source") or "uploaded file"),
                            status=str(ingestion_job.get("status") or "completed"),
                            records_processed=int(ingestion_job.get("records_processed") or 0),
                            events_created=int(ingestion_job.get("events_created") or 0),
                            created_at=_parse_datetime(ingestion_job.get("created_at")),
                        )
                    )
                db.commit()
            except Exception:
                db.rollback()
            finally:
                db.close()
        except Exception:
            return

    def _persist_review(self, review: dict[str, Any]) -> None:
        if not self._database_available():
            return
        try:
            from app.database import SessionLocal
            from app.models.review_model import ReviewRecord

            db = SessionLocal()
            try:
                db.add(
                    ReviewRecord(
                        tenant_id=str(review.get("tenant_id") or "default"),
                        event_id=str(review.get("event_id") or ""),
                        analyst=review.get("analyst"),
                        verdict=str(review.get("verdict") or "unknown"),
                        notes=review.get("notes"),
                        created_at=_parse_datetime(review.get("created_at")),
                    )
                )
                db.commit()
            except Exception:
                db.rollback()
            finally:
                db.close()
        except Exception:
            return

    def _persist_incident(self, incident: dict[str, Any]) -> None:
        if not self._database_available():
            return
        try:
            from app.database import SessionLocal
            from app.models.incident_model import Incident

            db = SessionLocal()
            try:
                db.add(
                    Incident(
                        tenant_id=str(incident.get("tenant_id") or "default"),
                        incident_id=str(incident.get("incident_id")),
                        source_event_id=str(incident.get("event_id") or ""),
                        title=str(incident.get("title") or "Investigation"),
                        priority=_priority_from_severity(str(incident.get("severity") or "low")),
                        status=str(incident.get("status") or "New"),
                        severity=str(incident.get("severity") or "low"),
                        confidence=float(incident.get("confidence") or 0.0),
                        risk_score=float(incident.get("risk_score") or 0.0),
                        created_at=_parse_datetime(incident.get("created_at")),
                        updated_at=datetime.now(timezone.utc),
                    )
                )
                db.commit()
            except Exception:
                db.rollback()
            finally:
                db.close()
        except Exception:
            return

    def _db_update_incident_status(self, incident_id: str, status: str, tenant_id: str | None) -> dict[str, Any] | None:
        if not self._database_available():
            return None
        try:
            from app.database import SessionLocal
            from app.models.incident_model import Incident

            db = SessionLocal()
            try:
                query = db.query(Incident).filter(Incident.incident_id == incident_id)
                if tenant_id is not None:
                    query = query.filter(Incident.tenant_id == tenant_id)
                row = query.one_or_none()
                if row is None:
                    return None
                row.status = status
                row.updated_at = datetime.now(timezone.utc)
                db.commit()
                db.refresh(row)
                return _incident_to_dict(row)
            except Exception:
                db.rollback()
                return None
            finally:
                db.close()
        except Exception:
            return None

    def _db_list_events(self, tenant_id: str | None) -> list[dict[str, Any]] | None:
        if not self._database_available():
            return None
        try:
            from app.database import SessionLocal
            from app.models.event_model import Event

            db = SessionLocal()
            try:
                query = db.query(Event)
                if tenant_id is not None:
                    query = query.filter(Event.tenant_id == tenant_id)
                rows = query.order_by(Event.id.asc()).all()
                return [_event_to_dict(row) for row in rows]
            finally:
                db.close()
        except Exception:
            return None

    def _db_list_ingestion_jobs(self, tenant_id: str | None) -> list[dict[str, Any]] | None:
        if not self._database_available():
            return None
        try:
            from app.database import SessionLocal
            from app.models.ingestion_model import IngestionJob

            db = SessionLocal()
            try:
                query = db.query(IngestionJob)
                if tenant_id is not None:
                    query = query.filter(IngestionJob.tenant_id == tenant_id)
                rows = query.order_by(IngestionJob.id.asc()).all()
                return [_job_to_dict(row) for row in rows]
            finally:
                db.close()
        except Exception:
            return None

    def _db_list_reviews(self, tenant_id: str | None) -> list[dict[str, Any]] | None:
        if not self._database_available():
            return None
        try:
            from app.database import SessionLocal
            from app.models.review_model import ReviewRecord

            db = SessionLocal()
            try:
                query = db.query(ReviewRecord)
                if tenant_id is not None:
                    query = query.filter(ReviewRecord.tenant_id == tenant_id)
                rows = query.order_by(ReviewRecord.id.asc()).all()
                return [_review_to_dict(row) for row in rows]
            finally:
                db.close()
        except Exception:
            return None

    def _db_incidents(self, tenant_id: str | None) -> list[dict[str, Any]] | None:
        if not self._database_available():
            return None
        try:
            from app.database import SessionLocal
            from app.models.incident_model import Incident

            db = SessionLocal()
            try:
                query = db.query(Incident)
                if tenant_id is not None:
                    query = query.filter(Incident.tenant_id == tenant_id)
                rows = query.order_by(Incident.id.asc()).all()
                return [_incident_to_dict(row) for row in rows]
            finally:
                db.close()
        except Exception:
            return None

    def _db_clear(self, tenant_id: str | None) -> int | None:
        if not self._database_available():
            return None
        try:
            from app.database import SessionLocal
            from app.models.event_model import Event
            from app.models.incident_model import Incident
            from app.models.ingestion_model import IngestionJob
            from app.models.review_model import ReviewRecord

            db = SessionLocal()
            try:
                event_query = db.query(Event)
                incident_query = db.query(Incident)
                job_query = db.query(IngestionJob)
                review_query = db.query(ReviewRecord)
                if tenant_id is not None:
                    event_query = event_query.filter(Event.tenant_id == tenant_id)
                    incident_query = incident_query.filter(Incident.tenant_id == tenant_id)
                    job_query = job_query.filter(IngestionJob.tenant_id == tenant_id)
                    review_query = review_query.filter(ReviewRecord.tenant_id == tenant_id)
                deleted = event_query.count()
                review_query.delete(synchronize_session=False)
                incident_query.delete(synchronize_session=False)
                job_query.delete(synchronize_session=False)
                event_query.delete(synchronize_session=False)
                db.commit()
                return deleted
            except Exception:
                db.rollback()
                return None
            finally:
                db.close()
        except Exception:
            return None


event_store = EventStore()


def _parse_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value.strip():
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _iso(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    return None


def _event_to_dict(row: Any) -> dict[str, Any]:
    return {
        "id": row.event_id,
        "tenant_id": row.tenant_id,
        "timestamp": _iso(row.created_at),
        "source": row.source_reference,
        "agent_id": row.agent_id,
        "row_number": row.row_number,
        "source_ip": row.source_ip,
        "destination_ip": row.destination_ip,
        "verdict": row.verdict,
        "classification_scope": row.classification_scope,
        "attack_family": row.attack_family,
        "attack_family_source": row.attack_family_source,
        "confidence": row.confidence or 0.0,
        "threshold": row.threshold or 0.0,
        "severity": row.severity,
        "risk_score": row.risk_score or 0.0,
        "model_name": row.model_name,
        "model_version": row.model_version,
        "dataset_origin": row.dataset_origin,
        "features": row.features or {},
    }


def _job_to_dict(row: Any) -> dict[str, Any]:
    return {
        "job_id": row.job_id,
        "tenant_id": row.tenant_id,
        "source": row.source_reference,
        "status": row.status,
        "records_processed": row.records_processed,
        "events_created": row.events_created,
        "created_at": _iso(row.created_at),
    }


def _review_to_dict(row: Any) -> dict[str, Any]:
    return {
        "tenant_id": row.tenant_id,
        "event_id": row.event_id,
        "analyst": row.analyst,
        "verdict": row.verdict,
        "notes": row.notes,
        "created_at": _iso(row.created_at),
    }


def _incident_to_dict(row: Any) -> dict[str, Any]:
    return {
        "incident_id": row.incident_id,
        "tenant_id": row.tenant_id,
        "event_id": row.source_event_id,
        "title": row.title,
        "status": row.status,
        "allowed_statuses": ["New", "Under Review", "Investigating", "Contained", "Resolved", "False Positive"],
        "severity": row.severity,
        "confidence": row.confidence,
        "risk_score": row.risk_score,
        "created_at": _iso(row.created_at),
    }


def _priority_from_severity(severity: str) -> str:
    if severity == "critical":
        return "P1"
    if severity == "high":
        return "P2"
    if severity == "medium":
        return "P3"
    return "P4"
