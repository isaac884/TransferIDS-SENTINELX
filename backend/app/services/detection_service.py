from __future__ import annotations

from app.engines.detection_engine import DetectionEngine


class DetectionService:
    def __init__(self) -> None:
        self.engine = DetectionEngine()

    def infer(self, features: dict[str, float]) -> dict:
        return self.engine.infer(features)

