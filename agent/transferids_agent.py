from __future__ import annotations

import argparse
import csv
import json
import math
import socket
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


FEATURE_ORDER = [
    "flow_duration",
    "total_fwd_pkts",
    "total_bwd_pkts",
    "total_fwd_bytes",
    "total_bwd_bytes",
    "fwd_pkt_len_mean",
    "bwd_pkt_len_mean",
    "fwd_iat_mean",
    "bwd_iat_mean",
    "fwd_iat_std",
    "bwd_iat_std",
    "init_win_fwd",
    "init_win_bwd",
]

METADATA_FIELDS = {
    "source_ip",
    "destination_ip",
    "protocol",
    "timestamp",
    "captured_at",
    "source_port",
    "destination_port",
}


def load_config(path: Path) -> dict[str, Any]:
    config = json.loads(path.read_text(encoding="utf-8"))
    required = ["server_url", "agent_id", "tenant_id", "heartbeat_interval", "observation_file"]
    missing = [key for key in required if key not in config or config[key] in {None, ""}]
    if missing:
        raise ValueError(f"Config is missing required fields: {', '.join(missing)}")
    return config


def request_json(config: dict[str, Any], path: str, payload: dict[str, Any]) -> dict[str, Any]:
    base = str(config["server_url"]).rstrip("/")
    url = f"{base}{path}"
    headers = {
        "Content-Type": "application/json",
        "X-TransferIDS-Tenant": str(config["tenant_id"]),
    }
    token = str(config.get("auth_token") or "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    try:
        with urlopen(request, timeout=int(config.get("timeout_seconds", 15))) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} from {url}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"Could not reach {url}: {exc.reason}") from exc


def send_heartbeat(config: dict[str, Any]) -> dict[str, Any]:
    return request_json(
        config,
        "/agents/heartbeat",
        {
            "agent_id": config["agent_id"],
            "display_name": config.get("display_name"),
            "hostname": config.get("hostname") or socket.gethostname(),
            "ip_address": config.get("ip_address"),
            "platform": config.get("platform") or "python-thin-agent",
            "agent_version": config.get("agent_version") or "0.1.0",
            "status": "alive",
            "timestamp": utc_now(),
        },
    )


def send_observations(config: dict[str, Any], flows: list[dict[str, Any]]) -> dict[str, Any]:
    return request_json(config, "/agents/observations", {"agent_id": config["agent_id"], "flows": flows, "captured_at": utc_now()})


def read_observations(path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    if not path.exists():
        return [], [f"Observation file not found: {path}"]
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return read_csv_observations(path)
    if suffix == ".jsonl":
        rows = [json.loads(line) for line in path.read_text(encoding="utf-8-sig").splitlines() if line.strip()]
        return normalize_records(rows)
    if suffix == ".json":
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
        if isinstance(payload, list):
            return normalize_records(payload)
        if isinstance(payload, dict):
            for key in ("records", "flows", "observations"):
                if isinstance(payload.get(key), list):
                    return normalize_records(payload[key])
            return normalize_records([payload])
    return [], [f"Unsupported observation file type: {suffix}. Use CSV, JSON, or JSONL."]


def read_csv_observations(path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames or []
        provided_feature_order = [field for field in fieldnames if field in FEATURE_ORDER]
        if provided_feature_order != FEATURE_ORDER:
            return [], [f"CSV canonical feature order mismatch. Expected: {', '.join(FEATURE_ORDER)}"]
        return normalize_records([dict(row) for row in reader])


def normalize_records(records: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[str]]:
    flows: list[dict[str, Any]] = []
    errors: list[str] = []
    allowed_fields = set(FEATURE_ORDER) | METADATA_FIELDS | {"features"}
    for index, record in enumerate(records, start=1):
        if not isinstance(record, dict):
            errors.append(f"row {index}: record must be an object")
            continue
        flat = dict(record)
        if isinstance(flat.get("features"), dict):
            features = flat.pop("features")
            flat.update(features)
        unknown = sorted(key for key in flat if key not in allowed_fields)
        if unknown:
            errors.append(f"row {index}: unsupported fields: {', '.join(unknown)}")
            continue
        source_ip = flat.get("source_ip")
        destination_ip = flat.get("destination_ip")
        if not source_ip or not destination_ip:
            errors.append(f"row {index}: source_ip and destination_ip are required")
            continue
        feature_values: dict[str, float] = {}
        for feature in FEATURE_ORDER:
            value = flat.get(feature)
            try:
                numeric = float(value)
                if not math.isfinite(numeric) or numeric < 0:
                    raise ValueError
                feature_values[feature] = numeric
            except (TypeError, ValueError):
                errors.append(f"row {index}: invalid numeric value for {feature}")
                feature_values = {}
                break
        if not feature_values:
            continue
        flows.append(
            {
                "source_ip": str(source_ip),
                "destination_ip": str(destination_ip),
                "protocol": str(flat.get("protocol") or "tcp"),
                "features": feature_values,
            }
        )
    return flows, errors


def retry_queue(config: dict[str, Any], queue_path: Path) -> None:
    if not queue_path.exists():
        return
    retained: list[str] = []
    for line in queue_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        payload = json.loads(line)
        try:
            request_json(config, "/agents/observations", payload)
        except Exception:
            retained.append(json.dumps(payload, separators=(",", ":")))
    if retained:
        queue_path.write_text("\n".join(retained) + "\n", encoding="utf-8")
    else:
        queue_path.unlink()


def enqueue(queue_path: Path, payload: dict[str, Any]) -> None:
    queue_path.parent.mkdir(parents=True, exist_ok=True)
    with queue_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, separators=(",", ":")) + "\n")


def run_once(config: dict[str, Any]) -> int:
    queue_path = Path(config.get("queue_file") or "agent_queue.jsonl")
    retry_queue(config, queue_path)
    send_heartbeat(config)
    flows, errors = read_observations(Path(config["observation_file"]))
    for error in errors:
        print(f"[TransferIDS Agent] validation: {error}")
    if not flows:
        print("[TransferIDS Agent] no valid canonical observations to send")
        return 0
    payload = {"agent_id": config["agent_id"], "flows": flows, "captured_at": utc_now()}
    try:
        response = send_observations(config, flows)
        print(json.dumps(response, indent=2))
    except Exception as exc:
        enqueue(queue_path, payload)
        print(f"[TransferIDS Agent] queued {len(flows)} observation(s): {exc}")
        return 1
    return 0


def utc_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def main() -> int:
    parser = argparse.ArgumentParser(description="TransferIDS SENTINEL-X thin sensor agent")
    parser.add_argument("--config", default="config.json", help="Path to agent JSON config.")
    parser.add_argument("--once", action="store_true", help="Send heartbeat and observations once, then exit.")
    args = parser.parse_args()
    config = load_config(Path(args.config))
    if args.once:
        return run_once(config)
    interval = int(config.get("heartbeat_interval") or 30)
    while True:
        run_once(config)
        time.sleep(max(5, interval))


if __name__ == "__main__":
    raise SystemExit(main())
