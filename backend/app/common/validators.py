from __future__ import annotations

from app.common.feature_schema import CANONICAL_FEATURE_ORDER


def unsupported_features(features: dict[str, float]) -> list[str]:
    allowed = set(CANONICAL_FEATURE_ORDER)
    return sorted(name for name in features if name not in allowed)


def missing_features(features: dict[str, float]) -> list[str]:
    return [name for name in CANONICAL_FEATURE_ORDER if name not in features]

