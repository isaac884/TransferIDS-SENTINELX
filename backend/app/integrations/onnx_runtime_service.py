from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np

from app.common.attack_taxonomy import binary_attack_taxonomy
from app.common.utils import clamp
from app.config import resolve_runtime_path, settings
from app.engines.severity_engine import SeverityEngine


def runtime_status() -> dict:
    try:
        import onnxruntime as ort

        return {"available": True, "providers": ort.get_available_providers()}
    except Exception as exc:
        return {"available": False, "reason": str(exc)}


class OnnxRuntimeService:
    def __init__(self, model_path: str | Path) -> None:
        self.model_path = Path(model_path)
        self.session = None
        self.metadata = _load_metadata(self.model_path)

    def load(self) -> None:
        import onnxruntime as ort

        if not self.model_path.exists():
            raise FileNotFoundError(self.model_path)
        self.session = ort.InferenceSession(str(self.model_path), providers=["CPUExecutionProvider"])

    def predict_batch(self, rows: list[dict[str, float]], feature_order: list[str]) -> list[dict[str, Any]]:
        if not self.session:
            self.load()
        if not self.session:
            raise RuntimeError("ONNX session is not initialized")

        matrix = np.asarray([[float(row[name]) for name in feature_order] for row in rows], dtype=np.float32)
        input_name = self.session.get_inputs()[0].name
        outputs = self.session.run(None, {input_name: matrix})
        attack_scores = _extract_attack_scores(outputs)
        events: list[dict[str, Any]] = []
        for score in attack_scores:
            confidence = clamp(float(score))
            verdict = "attack" if confidence >= settings.attack_threshold else "benign"
            risk_score = round(confidence * 100, 2)
            severity = SeverityEngine().classify(risk_score)
            events.append(
                {
                    "verdict": verdict,
                    **binary_attack_taxonomy(verdict),
                    "confidence": confidence,
                    "threshold": settings.attack_threshold,
                    "severity": severity,
                    "risk_score": risk_score,
                    "model_name": self.metadata.get("model_name") or self.model_path.stem,
                    "model_version": self.metadata.get("model_version") or str(self.metadata.get("onnx_sha256") or "onnx")[:12],
                    "dataset_origin": self.metadata.get("dataset_origin")
                    or f"{self.metadata.get('source_dataset', 'CICIDS2017')}_{self.metadata.get('target_dataset', 'UNSW-NB15')}",
                }
            )
        return events


def _load_metadata(model_path: Path) -> dict[str, Any]:
    candidates = [
        resolve_runtime_path(settings.model_metadata_path),
        model_path.with_suffix(".metadata.json"),
    ]
    for candidate in candidates:
        if not candidate.is_absolute():
            candidate = Path.cwd() / candidate
        try:
            if candidate.exists():
                return json.loads(candidate.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
    return {}


def _extract_attack_scores(outputs: list[Any]) -> list[float]:
    if not outputs:
        raise ValueError("ONNX model returned no outputs")

    primary = np.asarray(outputs[-1])
    if primary.ndim == 2 and primary.shape[1] >= 2:
        scores = _softmax_if_needed(primary)[:, 1]
        return [float(score) for score in scores]
    if primary.ndim == 2 and primary.shape[1] == 1:
        return [float(score) for score in primary[:, 0]]
    if primary.ndim == 1:
        return [float(score) for score in primary]
    raise ValueError(f"Unsupported ONNX output shape: {primary.shape}")


def _softmax_if_needed(values: np.ndarray) -> np.ndarray:
    if np.all((values >= 0.0) & (values <= 1.0)):
        row_sums = values.sum(axis=1)
        if np.allclose(row_sums, 1.0, atol=1e-3):
            return values
    shifted = values - values.max(axis=1, keepdims=True)
    exp = np.exp(shifted)
    return exp / exp.sum(axis=1, keepdims=True)
