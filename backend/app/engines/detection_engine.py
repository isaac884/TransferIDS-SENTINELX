from __future__ import annotations

from app.common.feature_schema import CANONICAL_FEATURE_ORDER
from app.common.feature_validation import validate_feature_records
from app.config import resolve_runtime_path, settings
from app.integrations.onnx_runtime_service import OnnxRuntimeService


class DetectionEngine:
    def infer(self, features: dict[str, float]) -> dict:
        model_path = resolve_runtime_path(settings.model_artifact_path)
        if not model_path.exists():
            raise FileNotFoundError("MODEL_ARTIFACT_MISSING")
        valid_rows, missing, invalid = validate_feature_records([features], CANONICAL_FEATURE_ORDER)
        if missing or invalid:
            raise ValueError({"missing_features": missing, "invalid_features": invalid})
        row = valid_rows[0]
        return OnnxRuntimeService(model_path).predict_batch([row], CANONICAL_FEATURE_ORDER)[0]
