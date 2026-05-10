from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import JSONResponse

from app.common.feature_validation import validate_feature_records
from app.config import resolve_runtime_path, settings
from app.core.event_bus import event_bus
from app.dependencies import get_current_user, get_tenant_id
from app.api.response_utils import api_success
from app.integrations.agent_receiver_service import AgentReceiverService
from app.integrations.onnx_runtime_service import OnnxRuntimeService
from app.integrations.suricata_service import SuricataService
from app.schemas.canonical_ingestion_schema import AgentFlowBatch, AgentHeartbeat, CanonicalFlowBatch, IntakeAck
from app.services.event_store import event_store


router = APIRouter(dependencies=[Depends(get_current_user)])
agent_receiver = AgentReceiverService()


@router.post("/canonical-flows")
def canonical_flows(payload: CanonicalFlowBatch, tenant_id: str = Depends(get_tenant_id)):
    return agent_receiver.receive_flows(AgentFlowBatch(agent_id="canonical-flows", flows=payload.flows), tenant_id)


@router.post("/pcap")
async def upload_pcap(file: UploadFile, tenant_id: str = Depends(get_tenant_id)):
    raw = await file.read()
    if not raw:
        return JSONResponse(
            status_code=400,
            content={"error": "INVALID_PCAP_UPLOAD", "message": "Uploaded PCAP file is empty.", "success": False, "data": None, "metadata": {}},
        )
    return api_success(
        {
            "tenant_id": tenant_id,
            "accepted": 1,
            "rejected": 0,
            "message": "PCAP upload accepted for metadata inspection only. No events are generated until canonical features are extracted.",
            "file": {"filename": file.filename, "size_bytes": len(raw)},
        },
        tenant_id=tenant_id,
        accepted=1,
        rejected=0,
    )


@router.post("/suricata/eve")
async def upload_suricata_eve(file: UploadFile, tenant_id: str = Depends(get_tenant_id)) -> dict:
    raw = await file.read()
    if not raw or not raw.strip():
        return _invalid_schema("Uploaded Suricata EVE file is empty.")
    text = raw.decode("utf-8-sig")
    parser = SuricataService()
    parsed = []
    errors = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        if not line.strip():
            continue
        try:
            parsed.append(parser.parse_eve_line(line))
        except Exception as exc:
            errors.append({"line": line_number, "error": str(exc)})
    data = {
        "tenant_id": tenant_id,
        "records_parsed": len(parsed),
        "parse_errors": errors,
        "canonical_records": sum(1 for item in parsed if parser.has_canonical_features(item)),
        "message": "Suricata EVE parsing is available. Events are generated only when records include canonical 13-feature fields.",
    }
    canonical_records = [parser.to_canonical_record(item) for item in parsed if parser.has_canonical_features(item)]
    if canonical_records:
        return _materialize_detection_records(
            canonical_records,
            _load_feature_order(),
            source=file.filename or "suricata:eve",
            tenant_id=tenant_id,
            source_type="suricata_eve",
        )
    return api_success(data, **data)


@router.get("/jobs/latest")
def latest_ingestion_job(tenant_id: str = Depends(get_tenant_id)) -> dict:
    jobs = event_store.list_ingestion_jobs(tenant_id)
    latest = jobs[-1] if jobs else None
    return api_success({"tenant_id": tenant_id, "job": latest, "empty": latest is None}, tenant_id=tenant_id, job=latest, empty=latest is None)


@router.post("/agent/heartbeat")
def agent_heartbeat(payload: AgentHeartbeat, tenant_id: str = Depends(get_tenant_id)) -> dict:
    return agent_receiver.receive_heartbeat(payload, tenant_id)


@router.post("/agent/flows")
def agent_flows(payload: AgentFlowBatch, tenant_id: str = Depends(get_tenant_id)):
    return agent_receiver.receive_flows(payload, tenant_id)


@router.post("/upload")
async def upload_detection_file(file: UploadFile = File(...), tenant_id: str = Depends(get_tenant_id)):
    filename = file.filename or ""
    suffix = Path(filename).suffix.lower()
    if suffix not in {".csv", ".json"}:
        return _invalid_schema("Unsupported upload type. Only CSV and JSON files are accepted.")

    raw = await file.read()
    if not raw or not raw.strip():
        return _invalid_schema("Uploaded file is empty.")

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return _invalid_schema("Uploaded file must be UTF-8 encoded.")

    try:
        records = _parse_csv(text) if suffix == ".csv" else _parse_json(text)
    except ValueError as exc:
        return _invalid_schema(str(exc))

    if not records:
        return _invalid_schema("Uploaded file contains no records.")

    return _materialize_detection_records(records, _load_feature_order(), source=filename, tenant_id=tenant_id, source_type="upload")


def _materialize_detection_records(
    records: list[dict],
    feature_order: list[str],
    *,
    source: str,
    tenant_id: str,
    source_type: str,
):
    valid_rows, missing_features, invalid_features = _validate_records(records, feature_order)
    if missing_features or invalid_features:
        return JSONResponse(
            status_code=400,
            content={
                "error": "INVALID_FEATURE_SCHEMA",
                "missing_features": missing_features,
                "invalid_features": invalid_features,
                "message": "Uploaded records must include all 13 canonical numeric features.",
            },
        )

    model_path = resolve_runtime_path(settings.model_artifact_path)
    if not model_path.exists():
        return JSONResponse(
            status_code=503,
            content={
                "error": "MODEL_ARTIFACT_MISSING",
                "message": "No production model artifact is available. Inference was not executed.",
            },
        )

    try:
        detections = OnnxRuntimeService(model_path).predict_batch(valid_rows, feature_order)
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={
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
                "source": source,
                "source_type": source_type,
                "row_number": index,
                "source_ip": source_record.get("source_ip"),
                "destination_ip": source_record.get("destination_ip"),
                "features": {name: valid_rows[index - 1][name] for name in feature_order},
                **detection,
            }
        )

    ingestion_job = {
        "job_id": f"job_{uuid4().hex[:12]}",
        "tenant_id": tenant_id,
        "source": source,
        "source_type": source_type,
        "status": "completed",
        "records_processed": len(valid_rows),
        "events_created": len(events),
        "created_at": now,
    }
    event_store.add_many(events, ingestion_job=ingestion_job)
    for event in events:
        event_bus.publish("detection", "detection.materialized", event)
    data = {"status": "accepted", "records_processed": len(valid_rows), "events_created": len(events), "events": events}
    return api_success(data, **data)


def _invalid_schema(message: str) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"error": "INVALID_FEATURE_SCHEMA", "missing_features": [], "invalid_features": [], "message": message},
    )


def _parse_csv(text: str) -> list[dict]:
    reader = csv.DictReader(StringIO(text))
    if not reader.fieldnames:
        raise ValueError("CSV header row is required.")
    return [dict(row) for row in reader]


def _parse_json(text: str) -> list[dict]:
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON: {exc.msg}") from exc
    if isinstance(payload, list):
        return [_normalize_json_record(record) for record in payload]
    if isinstance(payload, dict):
        for key in ("records", "flows", "events"):
            if isinstance(payload.get(key), list):
                return [_normalize_json_record(record) for record in payload[key]]
        return [_normalize_json_record(payload)]
    raise ValueError("JSON upload must be an object, a list of objects, or an object with records/flows/events.")


def _normalize_json_record(record) -> dict:
    if not isinstance(record, dict):
        raise ValueError("Every JSON record must be an object.")
    if isinstance(record.get("features"), dict):
        merged = dict(record)
        features = merged.pop("features")
        merged.update(features)
        return merged
    return record


def _load_feature_order() -> list[str]:
    feature_order_path = Path(__file__).resolve().parents[1] / "ml" / "artifacts" / "feature_order.json"
    return json.loads(feature_order_path.read_text(encoding="utf-8"))


def _validate_records(records: list[dict], feature_order: list[str]) -> tuple[list[dict[str, float]], list[str], list[dict]]:
    return validate_feature_records(records, feature_order)
