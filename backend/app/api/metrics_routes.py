from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user, get_tenant_id
from app.api.response_utils import api_success
from app.common.feature_schema import CANONICAL_FEATURE_ORDER, FEATURE_SCHEMA_VERSION
from app.config import resolve_runtime_path, settings
from app.services.agent_registry_service import agent_registry
from app.services.event_store import event_store


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/summary")
def metrics_summary(tenant_id: str = Depends(get_tenant_id)) -> dict:
    summary = event_store.summary(tenant_id)
    data = {
        "tenant_id": tenant_id,
        "raw_observations": summary["event_count"],
        "materialized_events": summary["event_count"],
        "incidents": len(event_store.incidents(tenant_id)),
        "confirmed_attacks": summary["confirmed_attacks"],
        "false_positives": summary["false_positives"],
        "high_severity_events": summary["high_severity_events"],
        "detection_integrity": _detection_integrity(tenant_id),
    }
    return api_success(data, **data)


@router.get("/detection-integrity")
def detection_integrity(tenant_id: str = Depends(get_tenant_id)) -> dict:
    data = _detection_integrity(tenant_id)
    return api_success(data, **data)


@router.get("/attack-distribution")
def attack_distribution(tenant_id: str = Depends(get_tenant_id)) -> dict:
    events = event_store.list_events(tenant_id)
    distribution: dict[str, int] = {}
    for event in events:
        family = str(event.get("attack_family") or event.get("verdict") or "unknown")
        distribution[family] = distribution.get(family, 0) + 1
    return api_success({"tenant_id": tenant_id, "distribution": distribution}, tenant_id=tenant_id, distribution=distribution)


@router.get("/confidence")
def confidence_metrics(tenant_id: str = Depends(get_tenant_id)) -> dict:
    events = event_store.list_events(tenant_id)
    confidences = [float(event.get("confidence") or 0.0) for event in events]
    data = {
        "tenant_id": tenant_id,
        "count": len(confidences),
        "average_confidence": sum(confidences) / len(confidences) if confidences else 0.0,
        "min_confidence": min(confidences) if confidences else 0.0,
        "max_confidence": max(confidences) if confidences else 0.0,
        "confidence_distribution": _bucket_confidence(confidences),
    }
    return api_success(data, **data)


@router.get("/drift")
def drift_metrics(tenant_id: str = Depends(get_tenant_id)) -> dict:
    events = event_store.list_events(tenant_id)
    data = {
        "tenant_id": tenant_id,
        "available": False,
        "message": "No real drift monitor is connected. Drift metrics are unavailable instead of mocked.",
        "events_observed": len(events),
    }
    return api_success(data, **data)


@router.get("/stage-comparison")
def stage_comparison(tenant_id: str = Depends(get_tenant_id)) -> dict:
    events = event_store.list_events(tenant_id)
    data = {
        "tenant_id": tenant_id,
        "available": False,
        "message": "No persisted C1/C3/C3-2 experiment metrics are available in this runtime.",
        "events_observed": len(events),
    }
    return api_success(data, **data)


def _bucket_confidence(confidences: list[float]) -> dict[str, int]:
    buckets = {"0.00-0.49": 0, "0.50-0.69": 0, "0.70-0.89": 0, "0.90-1.00": 0}
    for value in confidences:
        if value < 0.5:
            buckets["0.00-0.49"] += 1
        elif value < 0.7:
            buckets["0.50-0.69"] += 1
        elif value < 0.9:
            buckets["0.70-0.89"] += 1
        else:
            buckets["0.90-1.00"] += 1
    return buckets


def _detection_integrity(tenant_id: str) -> dict:
    events = event_store.list_events(tenant_id)
    jobs = event_store.list_ingestion_jobs(tenant_id)
    model_path = resolve_runtime_path(settings.model_artifact_path)
    source_distribution: dict[str, int] = {}
    for event in events:
        source_type = str(event.get("source_type") or event.get("source") or "unknown")
        source_distribution[source_type] = source_distribution.get(source_type, 0) + 1
    return {
        "tenant_id": tenant_id,
        "model_available": model_path.exists(),
        "model_path": str(model_path),
        "schema_version": FEATURE_SCHEMA_VERSION,
        "required_features": CANONICAL_FEATURE_ORDER,
        "feature_count": len(CANONICAL_FEATURE_ORDER),
        "events_materialized": len(events),
        "latest_ingestion_job": jobs[-1] if jobs else None,
        "source_distribution": source_distribution,
        "registered_agents": len(agent_registry.list(tenant_id)),
        "hard_validation": {
            "missing_features": "reject",
            "unsupported_features": "reject",
            "non_numeric": "reject",
            "nan_or_infinity": "reject",
            "feature_order": "reject",
        },
    }
