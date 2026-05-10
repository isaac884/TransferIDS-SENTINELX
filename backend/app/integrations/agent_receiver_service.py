from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi.responses import JSONResponse

from app.api.response_utils import api_success
from app.common.feature_schema import CANONICAL_FEATURE_ORDER
from app.common.feature_validation import validate_feature_records
from app.config import resolve_runtime_path, settings
from app.integrations.onnx_runtime_service import OnnxRuntimeService
from app.schemas.canonical_ingestion_schema import AgentFlowBatch, AgentHeartbeat
from app.services.agent_registry_service import agent_registry
from app.services.event_store import event_store
from app.core.event_bus import event_bus


class AgentReceiverService:
    def receive_heartbeat(self, payload: AgentHeartbeat, tenant_id: str) -> dict:
        agent = agent_registry.heartbeat(payload.model_dump(), tenant_id)
        return {
            "tenant_id": tenant_id,
            "agent_id": payload.agent_id,
            "status": "alive",
            "agent": agent,
            "received_at": datetime.now(timezone.utc).isoformat(),
        }

    def receive_flows(self, payload: AgentFlowBatch, tenant_id: str):
        if not payload.flows:
            return _invalid_schema("Agent flow batch is empty.")

        records = []
        for flow in payload.flows:
            record = dict(flow.features)
            record["source_ip"] = flow.source_ip
            record["destination_ip"] = flow.destination_ip
            records.append(record)

        valid_rows, missing_features, invalid_features = validate_feature_records(records, CANONICAL_FEATURE_ORDER)
        if missing_features or invalid_features:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "data": None,
                    "error": "INVALID_FEATURE_SCHEMA",
                    "missing_features": missing_features,
                    "invalid_features": invalid_features,
                    "message": "Agent flows must include all 13 canonical numeric features.",
                },
            )

        model_path = resolve_runtime_path(settings.model_artifact_path)
        if not model_path.exists():
            return JSONResponse(
                status_code=503,
                content={
                    "success": False,
                    "data": None,
                    "error": "MODEL_ARTIFACT_MISSING",
                    "message": "No production model artifact is available. Inference was not executed.",
                },
            )

        try:
            detections = OnnxRuntimeService(model_path).predict_batch(valid_rows, CANONICAL_FEATURE_ORDER)
        except Exception as exc:
            return JSONResponse(
                status_code=503,
                content={
                    "success": False,
                    "data": None,
                    "error": "MODEL_RUNTIME_ERROR",
                    "message": f"Production model inference failed. No events were stored. Detail: {exc}",
                },
            )

        now = datetime.now(timezone.utc).isoformat()
        events = []
        for index, detection in enumerate(detections, start=1):
            source_record = records[index - 1]
            events.append(
                {
                    "id": f"evt_{uuid4().hex[:12]}",
                    "tenant_id": tenant_id,
                    "timestamp": now,
                    "source": f"agent:{payload.agent_id}",
                    "row_number": index,
                    "source_ip": source_record.get("source_ip"),
                    "destination_ip": source_record.get("destination_ip"),
                    "features": {name: valid_rows[index - 1][name] for name in CANONICAL_FEATURE_ORDER},
                    "agent_id": payload.agent_id,
                    **detection,
                }
            )

        ingestion_job = {
            "job_id": f"job_{uuid4().hex[:12]}",
            "tenant_id": tenant_id,
            "source": f"agent:{payload.agent_id}",
            "status": "completed",
            "records_processed": len(valid_rows),
            "events_created": len(events),
            "created_at": now,
        }
        event_store.add_many(events, ingestion_job=ingestion_job)
        agent_registry.observations(payload.agent_id, tenant_id, len(valid_rows), events_created=len(events))
        for event in events:
            event_bus.publish("detection", "detection.materialized", event)
        data = {
            "status": "accepted",
            "tenant_id": tenant_id,
            "agent_id": payload.agent_id,
            "records_processed": len(valid_rows),
            "events_created": len(events),
            "events": events,
        }
        return api_success(data, **data)


def _invalid_schema(message: str) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "data": None,
            "error": "INVALID_FEATURE_SCHEMA",
            "missing_features": [],
            "invalid_features": [],
            "message": message,
        },
    )
