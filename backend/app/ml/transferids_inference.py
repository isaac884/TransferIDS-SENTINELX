from __future__ import annotations

from app.engines.detection_engine import DetectionEngine


class TransferIDSInference:
    def __init__(self) -> None:
        self.engine = DetectionEngine()

    def predict(self, features: dict[str, float]) -> dict:
        return self.engine.infer(features)

