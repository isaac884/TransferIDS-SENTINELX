from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.common.attack_taxonomy import load_attack_taxonomy
from app.config import resolve_runtime_path, settings
from app.dependencies import get_current_user, get_tenant_id
from app.engines.detection_engine import DetectionEngine
from app.api.response_utils import api_success
from app.integrations.shap_explainability_service import ShapExplainabilityService, runtime_status as shap_runtime_status
from app.schemas.detection_schema import DetectionRequest, DetectionResponse
from app.services.explanation_service import ExplanationService
from app.services.event_store import event_store


router = APIRouter(dependencies=[Depends(get_current_user)])
engine = DetectionEngine()


@router.post("/infer", response_model=DetectionResponse)
def infer(payload: DetectionRequest, tenant_id: str = Depends(get_tenant_id)) -> DetectionResponse:
    return _run_detection(payload, tenant_id)


@router.post("/run", response_model=DetectionResponse)
def run_detection(payload: DetectionRequest, tenant_id: str = Depends(get_tenant_id)) -> DetectionResponse:
    return _run_detection(payload, tenant_id)


@router.get("/model/status")
def detection_model_status() -> dict:
    model_path = resolve_runtime_path(settings.model_artifact_path)
    metadata_path = resolve_runtime_path(settings.model_metadata_path)
    feature_order_path = Path(__file__).resolve().parents[1] / "ml" / "artifacts" / "feature_order.json"
    data = {
        "available": model_path.exists(),
        "model_path": str(model_path),
        "metadata_available": metadata_path.exists(),
        "feature_order_available": feature_order_path.exists(),
        "threshold": settings.attack_threshold,
        "metadata": json.loads(metadata_path.read_text(encoding="utf-8")) if metadata_path.exists() else None,
        "feature_order": json.loads(feature_order_path.read_text(encoding="utf-8")) if feature_order_path.exists() else [],
    }
    return api_success(data, **data)


@router.get("/taxonomy")
def detection_taxonomy() -> dict:
    taxonomy = load_attack_taxonomy()
    data = {
        "available": bool(taxonomy.get("families")),
        "taxonomy": taxonomy,
        "prediction_scope": "binary_model_only",
        "message": "Taxonomy is a harmonization reference. The deployed ONNX artifact does not produce validated multiclass attack-family predictions.",
    }
    return api_success(data, **data)


@router.get("/explain/{event_id}")
def explain_detection(event_id: str, tenant_id: str = Depends(get_tenant_id)) -> dict:
    event = event_store.get_event(event_id, tenant_id)
    if event is None:
        return JSONResponse(status_code=404, content={"success": False, "data": None, "error": {"code": "EVENT_NOT_FOUND", "message": "Event not found", "details": {"event_id": event_id}}, "metadata": {}})
    shap_status = shap_runtime_status()
    shap_payload = ShapExplainabilityService().explain(event.get("features") or {}) if shap_status.get("available") else None
    explanation = ExplanationService().explain_event(event, shap_payload=shap_payload)
    data = {
        "event_id": event_id,
        "available": True,
        "explanation": explanation,
        "shap_available": bool(shap_status.get("available")),
        "shap_status": shap_status,
    }
    return api_success(data, **data)


def _run_detection(payload: DetectionRequest, tenant_id: str):
    if not payload.features:
        return JSONResponse(
            status_code=400,
            content={
                "error": "INVALID_FEATURE_SCHEMA",
                "missing_features": [],
                "invalid_features": [],
                "message": "Detection request must include non-empty features.",
            },
        )
    try:
        result = engine.infer(payload.features)
    except FileNotFoundError:
        return JSONResponse(
            status_code=503,
            content={
                "error": "MODEL_ARTIFACT_MISSING",
                "message": "No production model artifact is available. Inference was not executed.",
            },
        )
    except ValueError as exc:
        details = exc.args[0] if exc.args and isinstance(exc.args[0], dict) else {}
        return JSONResponse(
            status_code=400,
            content={
                "error": "INVALID_FEATURE_SCHEMA",
                "missing_features": details.get("missing_features", []),
                "invalid_features": details.get("invalid_features", []),
                "message": "Detection request must include all 13 canonical numeric features.",
            },
        )
    return DetectionResponse(tenant_id=tenant_id, **result)
