from __future__ import annotations

from app.common.feature_schema import CANONICAL_FEATURE_ORDER, FEATURE_SCHEMA_VERSION


def map_to_canonical(features: dict[str, float]) -> list[float]:
    missing = [name for name in CANONICAL_FEATURE_ORDER if name not in features]
    if missing:
        raise ValueError(f"Missing canonical features for {FEATURE_SCHEMA_VERSION}: {', '.join(missing)}")
    return [float(features[name]) for name in CANONICAL_FEATURE_ORDER]
