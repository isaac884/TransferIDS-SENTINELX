from __future__ import annotations

from app.common.canonical_mapper import map_to_canonical


class PreprocessingPipeline:
    def transform(self, features: dict[str, float]) -> list[float]:
        return map_to_canonical(features)

