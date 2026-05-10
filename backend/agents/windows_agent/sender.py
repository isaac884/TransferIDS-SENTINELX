from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from urllib import error, request


CONFIG_PATH = Path(__file__).with_name("config.yaml")


def load_config(path: str | Path | None = None) -> dict[str, Any]:
    config_path = Path(path) if path else CONFIG_PATH
    config: dict[str, Any] = {}
    if not config_path.exists():
        return config
    for line in config_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or ":" not in stripped:
            continue
        key, value = stripped.split(":", 1)
        config[key.strip()] = value.strip().strip('"').strip("'")
    return config


def send_payload(path: str, payload: dict, config: dict[str, Any] | None = None) -> dict:
    cfg = config or load_config()
    server_url = str(cfg.get("server_url", "http://127.0.0.1:8000")).rstrip("/")
    timeout = float(cfg.get("request_timeout_seconds", 10))
    url = f"{server_url}{path}"
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "X-TransferIDS-Tenant": str(cfg.get("tenant_id", "default")),
    }
    if cfg.get("agent_token"):
        headers["Authorization"] = f"Bearer {cfg['agent_token']}"

    req = request.Request(url, data=body, headers=headers, method="POST")
    try:
        with request.urlopen(req, timeout=timeout) as response:
            response_body = response.read().decode("utf-8")
            return {
                "path": path,
                "sent": True,
                "status_code": response.status,
                "response": json.loads(response_body) if response_body else {},
            }
    except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        _buffer_payload(path, payload, cfg, str(exc))
        return {"path": path, "sent": False, "reason": str(exc)}


def flush_buffer(config: dict[str, Any] | None = None) -> dict[str, int]:
    cfg = config or load_config()
    buffer_path = Path(str(cfg.get("buffer_path", "./agent_buffer.jsonl")))
    if not buffer_path.exists():
        return {"attempted": 0, "sent": 0, "remaining": 0}

    entries = [json.loads(line) for line in buffer_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    buffer_path.unlink()
    sent = 0
    remaining = []
    for entry in entries:
        result = send_payload(entry["path"], entry["payload"], cfg)
        if result.get("sent"):
            sent += 1
        else:
            remaining.append(entry)
    if remaining:
        with buffer_path.open("a", encoding="utf-8") as handle:
            for entry in remaining:
                handle.write(json.dumps(entry) + "\n")
    return {"attempted": len(entries), "sent": sent, "remaining": len(remaining)}


def _buffer_payload(path: str, payload: dict, config: dict[str, Any], reason: str) -> None:
    buffer_path = Path(str(config.get("buffer_path", "./agent_buffer.jsonl")))
    buffer_path.parent.mkdir(parents=True, exist_ok=True)
    with buffer_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps({"path": path, "payload": payload, "reason": reason}) + "\n")
