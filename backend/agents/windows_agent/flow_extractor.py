from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def extract_flows(config: dict[str, Any] | None = None) -> list[dict]:
    """Load canonical flows from a real collector output file.

    This agent intentionally does not synthesize traffic. A packet/flow capture
    collector must write canonical flow records to `canonical_flow_file`; the
    server remains responsible for strict 13-feature validation and inference.
    """

    cfg = config or {}
    flow_file = cfg.get("canonical_flow_file")
    if not flow_file:
        return []

    path = Path(str(flow_file))
    if not path.exists():
        return []

    text = path.read_text(encoding="utf-8-sig").strip()
    if not text:
        return []

    if path.suffix.lower() == ".jsonl":
        return [json.loads(line) for line in text.splitlines() if line.strip()]

    payload = json.loads(text)
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and isinstance(payload.get("flows"), list):
        return payload["flows"]
    return []
