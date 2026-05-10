from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse

from app.config import resolve_runtime_path, settings
from app.database import database_status
from app.dependencies import get_current_user
from app.api.response_utils import api_success
from app.integrations.onnx_runtime_service import runtime_status as onnx_runtime_status
from app.integrations.shap_explainability_service import runtime_status as shap_runtime_status


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/health")
def integrations_health() -> dict:
    data = _integration_status()
    return api_success(data, **data)


@router.get("/status")
def integrations_status() -> dict:
    data = _integration_status()
    return api_success(data, **data)


@router.get("/database-status")
def get_database_status() -> dict:
    status = database_status()
    return api_success(status, **status)


@router.get("/model-status")
def model_status() -> dict:
    model_path = resolve_runtime_path(settings.model_artifact_path)
    metadata_path = resolve_runtime_path(settings.model_metadata_path)
    feature_order_path = Path(__file__).resolve().parents[1] / "ml" / "artifacts" / "feature_order.json"
    status = {
        "available": model_path.exists(),
        "model_path": str(model_path),
        "metadata_path": str(metadata_path),
        "metadata_available": metadata_path.exists(),
        "feature_order_path": str(feature_order_path),
        "feature_order_available": feature_order_path.exists(),
        "threshold": settings.attack_threshold,
    }
    if metadata_path.exists():
        status["metadata"] = json.loads(metadata_path.read_text(encoding="utf-8"))
    if feature_order_path.exists():
        status["feature_order"] = json.loads(feature_order_path.read_text(encoding="utf-8"))
    return api_success(status, **status)


@router.get("/agent/download", response_class=PlainTextResponse)
def agent_config_download() -> str:
    return "\n".join(
        [
            "{",
            '  "server_url": "http://127.0.0.1:8010/api",',
            '  "agent_id": "replace-with-real-agent-id",',
            '  "tenant_id": "default",',
            '  "heartbeat_interval": 30,',
            '  "observation_file": "path/to/canonical_flows.jsonl",',
            '  "queue_file": "queue/agent_queue.jsonl",',
            '  "auth_token": ""',
            "}",
        ]
    )


def _integration_status() -> dict:
    model_path = resolve_runtime_path(settings.model_artifact_path)
    return {
        "upload": {"available": True, "status": "ready", "source": "/api/v1/intake/upload"},
        "pcap_parser": {"available": True, "status": "metadata_only", "source": "/api/v1/intake/pcap"},
        "suricata_eve": {"available": True, "status": "parser_and_canonical_materialization", "source": "/api/v1/intake/suricata/eve"},
        "windows_agent": {"available": True, "status": "receiver_ready", "source": "/api/v1/agents/observations"},
        "onnx_model": {"available": model_path.exists(), "path": str(model_path)},
        "database": database_status(),
        "websocket": {"available": True, "status": "event_bus_recent_channel", "source": "/api/v1/ws/live"},
        "shap": shap_runtime_status(),
    }
