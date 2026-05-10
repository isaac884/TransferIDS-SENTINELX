from __future__ import annotations

from pathlib import Path


class ModelLoader:
    def resolve(self, model_name: str) -> Path:
        artifacts_root = (Path(__file__).parent / "artifacts").resolve()
        candidate = (artifacts_root / model_name).resolve()
        if artifacts_root not in candidate.parents and candidate != artifacts_root:
            raise ValueError("Model artifact path escapes artifacts directory")
        if candidate.suffix not in {".onnx", ".json", ".pkl"}:
            raise ValueError("Unsupported model artifact type")
        return candidate
