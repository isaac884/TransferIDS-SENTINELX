from io import BytesIO

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.event_store import event_store


client = TestClient(app)
_AUTH_HEADERS: dict[str, str] | None = None


def auth_headers() -> dict[str, str]:
    global _AUTH_HEADERS
    if _AUTH_HEADERS is not None:
        return _AUTH_HEADERS
    from app.config import settings
    from app.database import initialize_database

    initialize_database(force=True)
    response = client.post(
        "/api/auth/login",
        json={"username": settings.bootstrap_admin_username, "password": settings.bootstrap_admin_password},
    )
    assert response.status_code == 200, response.text
    _AUTH_HEADERS = {"Authorization": f"Bearer {response.json()['access_token']}"}
    return _AUTH_HEADERS


def test_fresh_backend_starts_with_zero_events():
    event_store.clear()
    response = client.get("/api/events", headers=auth_headers())
    assert response.status_code == 200
    assert response.json()["events"] == []

    summary = client.get("/api/dashboard/summary", headers=auth_headers()).json()
    assert summary["event_count"] == 0
    assert summary["empty"] is True


def test_invalid_csv_returns_invalid_feature_schema():
    event_store.clear()
    response = client.post(
        "/api/intake/upload",
        headers=auth_headers(),
        files={"file": ("invalid.csv", BytesIO(b"duration,protocol\n1,6\n"), "text/csv")},
    )
    assert response.status_code == 400
    assert response.json()["error"] == "INVALID_FEATURE_SCHEMA"
    assert event_store.list_events() == []


def test_invalid_json_returns_invalid_feature_schema():
    event_store.clear()
    response = client.post(
        "/api/intake/upload",
        headers=auth_headers(),
        files={"file": ("invalid.json", BytesIO(b'{"duration": 1, "protocol": "tcp"}'), "application/json")},
    )
    assert response.status_code == 400
    assert response.json()["error"] == "INVALID_FEATURE_SCHEMA"
    assert event_store.list_events() == []


def test_empty_file_returns_validation_error():
    response = client.post("/api/intake/upload", headers=auth_headers(), files={"file": ("empty.csv", BytesIO(b""), "text/csv")})
    assert response.status_code == 400
    assert response.json()["error"] == "INVALID_FEATURE_SCHEMA"


def test_unsupported_file_type_returns_validation_error():
    response = client.post("/api/intake/upload", headers=auth_headers(), files={"file": ("flow.txt", BytesIO(b"not accepted"), "text/plain")})
    assert response.status_code == 400
    assert response.json()["error"] == "INVALID_FEATURE_SCHEMA"


def test_nan_and_extra_feature_are_rejected():
    event_store.clear()
    headers = "flow_duration,total_fwd_pkts,total_bwd_pkts,total_fwd_bytes,total_bwd_bytes,fwd_pkt_len_mean,bwd_pkt_len_mean,fwd_iat_mean,bwd_iat_mean,fwd_iat_std,bwd_iat_std,init_win_fwd,init_win_bwd,unexpected_feature\n"
    row = "NaN,10,8,5000,4200,500,525,0.1,0.2,0.01,0.02,8192,8192,1\n"
    response = client.post(
        "/api/intake/upload",
        headers=auth_headers(),
        files={"file": ("bad.csv", BytesIO((headers + row).encode()), "text/csv")},
    )
    assert response.status_code == 400
    payload = response.json()
    assert payload["error"] == "INVALID_FEATURE_SCHEMA"
    assert any(item["reason"] == "unsupported_feature" for item in payload["invalid_features"])
    assert any(item["reason"] == "invalid_numeric_value" for item in payload["invalid_features"])
    assert event_store.list_events() == []


def test_wrong_feature_order_is_rejected():
    event_store.clear()
    headers = "total_fwd_pkts,flow_duration,total_bwd_pkts,total_fwd_bytes,total_bwd_bytes,fwd_pkt_len_mean,bwd_pkt_len_mean,fwd_iat_mean,bwd_iat_mean,fwd_iat_std,bwd_iat_std,init_win_fwd,init_win_bwd\n"
    row = "10,1,8,5000,4200,500,525,0.1,0.2,0.01,0.02,8192,8192\n"
    response = client.post(
        "/api/intake/upload",
        headers=auth_headers(),
        files={"file": ("wrong-order.csv", BytesIO((headers + row).encode()), "text/csv")},
    )
    assert response.status_code == 400
    payload = response.json()
    assert payload["error"] == "INVALID_FEATURE_SCHEMA"
    assert any(item["reason"] == "feature_order_mismatch" for item in payload["invalid_features"])
    assert event_store.list_events() == []


def test_valid_upload_without_model_returns_503_and_stores_nothing():
    from app.config import settings

    event_store.clear()
    original_model_path = settings.model_artifact_path
    headers = "flow_duration,total_fwd_pkts,total_bwd_pkts,total_fwd_bytes,total_bwd_bytes,fwd_pkt_len_mean,bwd_pkt_len_mean,fwd_iat_mean,bwd_iat_mean,fwd_iat_std,bwd_iat_std,init_win_fwd,init_win_bwd\n"
    row = "1,10,8,5000,4200,500,525,0.1,0.2,0.01,0.02,8192,8192\n"
    try:
        object.__setattr__(settings, "model_artifact_path", "backend/app/ml/artifacts/__missing_for_test__.onnx")
        response = client.post(
            "/api/intake/upload",
            headers=auth_headers(),
            files={"file": ("valid.csv", BytesIO((headers + row).encode()), "text/csv")},
        )
        assert response.status_code == 503
        assert response.json()["error"] == "MODEL_ARTIFACT_MISSING"
        assert event_store.list_events() == []
    finally:
        object.__setattr__(settings, "model_artifact_path", original_model_path)


def test_valid_upload_with_model_creates_event_and_dashboard_summary():
    from app.config import resolve_runtime_path, settings

    pytest.importorskip("onnxruntime")
    if not resolve_runtime_path(settings.model_artifact_path).exists():
        pytest.skip("production ONNX artifact is unavailable")

    event_store.clear()
    headers = "flow_duration,total_fwd_pkts,total_bwd_pkts,total_fwd_bytes,total_bwd_bytes,fwd_pkt_len_mean,bwd_pkt_len_mean,fwd_iat_mean,bwd_iat_mean,fwd_iat_std,bwd_iat_std,init_win_fwd,init_win_bwd\n"
    row = "1,10,8,5000,4200,500,525,0.1,0.2,0.01,0.02,8192,8192\n"
    response = client.post(
        "/api/intake/upload",
        headers=auth_headers(),
        files={"file": ("valid.csv", BytesIO((headers + row).encode()), "text/csv")},
    )
    assert response.status_code in {200, 201}, response.text
    body = response.json()
    assert body["status"] == "accepted"
    assert body["events_created"] == 1
    assert len(event_store.list_events()) == 1

    summary = client.get("/api/dashboard/summary", headers=auth_headers()).json()
    assert summary["event_count"] == 1
    assert summary["empty"] is False
    event_store.clear()


def test_agent_heartbeat_returns_alive_status():
    response = client.post(
        "/api/intake/agent/heartbeat",
        headers=auth_headers(),
        json={"agent_id": "endpoint-test", "status": "alive"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["agent_id"] == "endpoint-test"
    assert body["status"] == "alive"


def test_agents_api_enroll_heartbeat_and_status():
    headers = auth_headers()
    enroll = client.post(
        "/api/agents/enroll",
        headers=headers,
        json={
            "agent_id": "endpoint-test-2",
            "display_name": "Endpoint Test 2",
            "hostname": "host-a",
            "ip_address": "10.0.0.2",
            "platform": "windows",
            "agent_version": "0.1.0",
        },
    )
    assert enroll.status_code == 200
    assert enroll.json()["agent"]["agent_id"] == "endpoint-test-2"
    heartbeat = client.post(
        "/api/agents/heartbeat",
        headers=headers,
        json={"agent_id": "endpoint-test-2", "status": "alive", "hostname": "host-a"},
    )
    assert heartbeat.status_code == 200
    status_response = client.get("/api/agents/endpoint-test-2/status", headers=headers)
    assert status_response.status_code == 200
    assert status_response.json()["agent"]["status"] == "alive"
    summary_response = client.get("/api/agents/summary", headers=headers)
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["total_agents"] >= 1
    assert "events_created" in summary


def test_agents_observations_create_agent_sourced_events_when_model_exists():
    from app.config import resolve_runtime_path, settings

    pytest.importorskip("onnxruntime")
    if not resolve_runtime_path(settings.model_artifact_path).exists():
        pytest.skip("production ONNX artifact is unavailable")

    event_store.clear()
    headers = auth_headers()
    features = {
        "flow_duration": 1,
        "total_fwd_pkts": 10,
        "total_bwd_pkts": 8,
        "total_fwd_bytes": 5000,
        "total_bwd_bytes": 4200,
        "fwd_pkt_len_mean": 500,
        "bwd_pkt_len_mean": 525,
        "fwd_iat_mean": 0.1,
        "bwd_iat_mean": 0.2,
        "fwd_iat_std": 0.01,
        "bwd_iat_std": 0.02,
        "init_win_fwd": 8192,
        "init_win_bwd": 8192,
    }
    response = client.post(
        "/api/agents/observations",
        headers=headers,
        json={
            "agent_id": "endpoint-distributed-test",
            "flows": [{"source_ip": "10.0.0.10", "destination_ip": "10.0.0.20", "protocol": "tcp", "features": features}],
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["status"] == "accepted"
    assert payload["events_created"] == 1
    events = event_store.list_events()
    assert events[0]["source"] == "agent:endpoint-distributed-test"
    assert events[0]["agent_id"] == "endpoint-distributed-test"

    summary = client.get("/api/agents/summary", headers=headers).json()
    agent = next(item for item in summary["agents"] if item["agent_id"] == "endpoint-distributed-test")
    assert agent["observations_received"] >= 1
    assert agent["events_created"] >= 1
    event_store.clear()


def test_suricata_eve_without_canonical_features_parses_but_creates_no_events():
    event_store.clear()
    eve = b'{"timestamp":"2026-05-10T00:00:00Z","event_type":"alert","src_ip":"1.1.1.1","dest_ip":"10.0.0.1","proto":"TCP","alert":{"signature":"test","category":"Attempted Information Leak","severity":2}}\n'
    response = client.post(
        "/api/intake/suricata/eve",
        headers=auth_headers(),
        files={"file": ("eve.json", BytesIO(eve), "application/json")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["records_parsed"] == 1
    assert payload["canonical_records"] == 0
    assert event_store.list_events() == []


def test_attack_taxonomy_endpoint_is_reference_only():
    response = client.get("/api/detection/taxonomy", headers=auth_headers())
    assert response.status_code == 200
    payload = response.json()
    assert payload["available"] is True
    assert payload["prediction_scope"] == "binary_model_only"
    assert "families" in payload["taxonomy"]


def test_agent_flow_invalid_features_returns_invalid_schema():
    event_store.clear()
    response = client.post(
        "/api/intake/agent/flows",
        headers=auth_headers(),
        json={
            "agent_id": "endpoint-test",
            "flows": [
                {
                    "source_ip": "10.0.0.10",
                    "destination_ip": "10.0.0.20",
                    "features": {"flow_duration": "bad"},
                }
            ],
        },
    )
    assert response.status_code == 400
    assert response.json()["error"] == "INVALID_FEATURE_SCHEMA"
    assert event_store.list_events() == []


def test_agent_flow_without_model_returns_503_and_stores_nothing():
    from app.config import settings

    event_store.clear()
    original_model_path = settings.model_artifact_path
    features = {
        "flow_duration": 1,
        "total_fwd_pkts": 10,
        "total_bwd_pkts": 8,
        "total_fwd_bytes": 5000,
        "total_bwd_bytes": 4200,
        "fwd_pkt_len_mean": 500,
        "bwd_pkt_len_mean": 525,
        "fwd_iat_mean": 0.1,
        "bwd_iat_mean": 0.2,
        "fwd_iat_std": 0.01,
        "bwd_iat_std": 0.02,
        "init_win_fwd": 8192,
        "init_win_bwd": 8192,
    }
    try:
        object.__setattr__(settings, "model_artifact_path", "backend/app/ml/artifacts/__missing_for_agent_test__.onnx")
        response = client.post(
            "/api/intake/agent/flows",
            headers=auth_headers(),
            json={
                "agent_id": "endpoint-test",
                "flows": [{"source_ip": "10.0.0.10", "destination_ip": "10.0.0.20", "features": features}],
            },
        )
        assert response.status_code == 503
        assert response.json()["error"] == "MODEL_ARTIFACT_MISSING"
        assert event_store.list_events() == []
    finally:
        object.__setattr__(settings, "model_artifact_path", original_model_path)


def test_detection_run_rejects_empty_features():
    response = client.post("/api/detection/run", headers=auth_headers(), json={"features": {}})
    assert response.status_code == 400
    assert response.json()["error"] == "INVALID_FEATURE_SCHEMA"


def test_incidents_and_metrics_are_derived_from_events_only():
    event_store.clear()
    assert client.get("/api/incidents", headers=auth_headers()).json()["incidents"] == []
    metrics = client.get("/api/metrics/summary", headers=auth_headers()).json()
    assert metrics["raw_observations"] == 0
    assert metrics["materialized_events"] == 0
    assert metrics["incidents"] == 0


def test_model_status_reports_missing_model_without_creating_events():
    event_store.clear()
    response = client.get("/api/integrations/model-status", headers=auth_headers())
    assert response.status_code == 200
    assert "available" in response.json()
    assert event_store.list_events() == []


def test_empty_runtime_endpoints_return_contract_without_mock_data():
    event_store.clear()
    headers = auth_headers()
    endpoints = [
        "/api/dashboard/summary",
        "/api/events?limit=5",
        "/api/incidents",
        "/api/metrics/attack-distribution",
        "/api/metrics/confidence",
        "/api/metrics/drift",
        "/api/metrics/stage-comparison",
        "/api/integrations/status",
        "/api/platform/geoip/status",
        "/api/platform/endpoint-agent/runtime",
        "/api/platform/suricata-sensor/status",
        "/api/intake/jobs/latest",
        "/api/settings/thresholds",
        "/api/detection/model/status",
        "/api/metrics/detection-integrity",
        "/api/agents",
        "/api/agents/summary",
    ]
    for endpoint in endpoints:
        response = client.get(endpoint, headers=headers)
        assert response.status_code == 200, endpoint
        payload = response.json()
        assert payload["success"] is True, endpoint
        assert "data" in payload, endpoint
        assert payload["error"] is None, endpoint
        assert "metadata" in payload, endpoint


def test_platform_sensor_control_is_explicitly_unavailable_without_fake_process():
    response = client.post("/api/platform/suricata-sensor/start", headers=auth_headers())
    assert response.status_code == 503
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "SENSOR_CONTROL_UNAVAILABLE"
    assert payload["error"]["details"]["control_available"] is False


def test_events_export_and_missing_detail_do_not_create_data():
    event_store.clear()
    headers = auth_headers()
    exported = client.get("/api/events/export?format=csv", headers=headers)
    assert exported.status_code == 200
    assert "verdict" in exported.text.lower()
    missing = client.get("/api/events/evt_missing", headers=headers)
    assert missing.status_code == 404
    assert event_store.list_events() == []


def test_runtime_threshold_patch_is_available():
    from app.config import settings

    original = settings.attack_threshold
    try:
        response = client.patch("/api/settings/thresholds", headers=auth_headers(), json={"attack_threshold": 0.66})
        assert response.status_code == 200
        assert response.json()["attack_threshold"] == 0.66
    finally:
        object.__setattr__(settings, "attack_threshold", original)


def test_clear_endpoint_is_development_only():
    from app.config import settings

    original = settings.environment
    try:
        object.__setattr__(settings, "environment", "production")
        blocked = client.delete("/api/events/clear-dev-only", headers=auth_headers())
        assert blocked.status_code == 403

        object.__setattr__(settings, "environment", "development")
        allowed = client.delete("/api/events/clear-dev-only", headers=auth_headers())
        assert allowed.status_code == 200
    finally:
        object.__setattr__(settings, "environment", original)
