from __future__ import annotations

import json
from typing import Any

from app.common.feature_schema import CANONICAL_FEATURE_ORDER


class SuricataService:
    def parse_eve_line(self, line: str) -> dict:
        event = json.loads(line)
        if not isinstance(event, dict):
            raise ValueError("Suricata EVE line must be a JSON object")
        alert = event.get("alert") if isinstance(event.get("alert"), dict) else {}
        flow = event.get("flow") if isinstance(event.get("flow"), dict) else {}
        return {
            "raw": event,
            "timestamp": event.get("timestamp"),
            "event_type": event.get("event_type"),
            "source_ip": event.get("src_ip"),
            "destination_ip": event.get("dest_ip"),
            "source_port": event.get("src_port"),
            "destination_port": event.get("dest_port"),
            "proto": event.get("proto"),
            "alert_signature": alert.get("signature"),
            "alert_category": alert.get("category"),
            "alert_severity": alert.get("severity"),
            "flow_pkts_toserver": flow.get("pkts_toserver"),
            "flow_pkts_toclient": flow.get("pkts_toclient"),
            "flow_bytes_toserver": flow.get("bytes_toserver"),
            "flow_bytes_toclient": flow.get("bytes_toclient"),
            **self._canonical_candidate(event),
        }

    def has_canonical_features(self, event: dict[str, Any]) -> bool:
        candidate = self._canonical_candidate(event.get("raw") if "raw" in event else event)
        return all(feature in candidate for feature in CANONICAL_FEATURE_ORDER)

    def to_canonical_record(self, event: dict[str, Any]) -> dict[str, Any]:
        raw = event.get("raw") if "raw" in event else event
        candidate = self._canonical_candidate(raw)
        return {
            **candidate,
            "source_ip": event.get("source_ip") or raw.get("src_ip"),
            "destination_ip": event.get("destination_ip") or raw.get("dest_ip"),
            "source_port": event.get("source_port") or raw.get("src_port"),
            "destination_port": event.get("destination_port") or raw.get("dest_port"),
            "protocol": event.get("proto") or raw.get("proto"),
            "timestamp": event.get("timestamp") or raw.get("timestamp"),
            "event_type": event.get("event_type") or raw.get("event_type"),
        }

    def _canonical_candidate(self, event: dict[str, Any]) -> dict[str, Any]:
        features = event.get("features") if isinstance(event.get("features"), dict) else event
        return {feature: features[feature] for feature in CANONICAL_FEATURE_ORDER if feature in features}
