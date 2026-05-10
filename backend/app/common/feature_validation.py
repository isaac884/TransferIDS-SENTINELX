from __future__ import annotations

import math
from typing import Any

ALLOWED_METADATA_FIELDS = {
    "agent_id",
    "captured_at",
    "destination_ip",
    "destination_port",
    "event_type",
    "protocol",
    "proto",
    "row_number",
    "source",
    "source_ip",
    "source_port",
    "timestamp",
}

NON_NEGATIVE_FEATURES = {
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
}


def validate_feature_records(
    records: list[dict[str, Any]],
    feature_order: list[str],
    *,
    allowed_metadata_fields: set[str] | None = None,
    enforce_feature_order: bool = True,
) -> tuple[list[dict[str, float]], list[str], list[dict[str, Any]]]:
    allowed_metadata = allowed_metadata_fields or ALLOWED_METADATA_FIELDS
    feature_set = set(feature_order)
    missing: set[str] = set()
    invalid: list[dict[str, Any]] = []
    valid_rows: list[dict[str, float]] = []

    for row_index, record in enumerate(records, start=1):
        row: dict[str, float] = {}
        row_has_error = False
        keys = list(record.keys())
        unknown = [key for key in keys if key not in feature_set and key not in allowed_metadata]
        for feature in unknown:
            row_has_error = True
            invalid.append({"row": row_index, "feature": feature, "value": record.get(feature), "reason": "unsupported_feature"})

        provided_feature_order = [key for key in keys if key in feature_set]
        if enforce_feature_order and len(provided_feature_order) == len(feature_order) and provided_feature_order != feature_order:
            row_has_error = True
            invalid.append(
                {
                    "row": row_index,
                    "feature": "__feature_order__",
                    "value": provided_feature_order,
                    "reason": "feature_order_mismatch",
                    "expected": feature_order,
                }
            )

        for feature in feature_order:
            if feature not in record:
                missing.add(feature)
                row_has_error = True
                continue
            value = record.get(feature)
            try:
                if value is None or str(value).strip() == "":
                    raise ValueError
                numeric_value = float(value)
                if not math.isfinite(numeric_value):
                    raise ValueError("non_finite")
                if feature in NON_NEGATIVE_FEATURES and numeric_value < 0:
                    row_has_error = True
                    invalid.append({"row": row_index, "feature": feature, "value": value, "reason": "negative_not_allowed"})
                    continue
                row[feature] = numeric_value
            except (TypeError, ValueError):
                row_has_error = True
                invalid.append({"row": row_index, "feature": feature, "value": value, "reason": "invalid_numeric_value"})
        if not row_has_error:
            valid_rows.append(row)

    if missing or invalid:
        return [], sorted(missing), invalid
    return valid_rows, [], []
