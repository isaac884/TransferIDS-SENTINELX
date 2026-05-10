from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np


DEFAULT_MODEL = Path("backend/app/ml/artifacts/transferids_c3.onnx")
DEFAULT_FEATURE_ORDER = Path("backend/app/ml/artifacts/feature_order.json")


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate TransferIDS ONNX production model contract.")
    parser.add_argument("--model", default=str(DEFAULT_MODEL), help="Path to ONNX model artifact.")
    parser.add_argument("--feature-order", default=str(DEFAULT_FEATURE_ORDER), help="Path to feature_order.json.")
    args = parser.parse_args()

    model_path = Path(args.model)
    feature_order_path = Path(args.feature_order)
    if not model_path.exists():
        raise SystemExit(f"MODEL_ARTIFACT_MISSING: {model_path}")
    if not feature_order_path.exists():
        raise SystemExit(f"FEATURE_ORDER_MISSING: {feature_order_path}")

    feature_order = json.loads(feature_order_path.read_text(encoding="utf-8"))
    if not isinstance(feature_order, list) or len(feature_order) != 13 or not all(isinstance(item, str) for item in feature_order):
        raise SystemExit("INVALID_FEATURE_ORDER: feature_order.json must be a list of exactly 13 feature names.")
    metadata_path = model_path.with_suffix(".metadata.json")
    metadata_feature_order = None
    if metadata_path.exists():
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        metadata_feature_order = metadata.get("feature_order")
        if metadata_feature_order and metadata_feature_order != feature_order:
            raise SystemExit("FEATURE_ORDER_MISMATCH: model metadata feature_order does not match feature_order.json.")

    try:
        import onnxruntime as ort
    except Exception as exc:
        raise SystemExit(f"ONNXRUNTIME_UNAVAILABLE: install backend/requirements-model.txt first. Detail: {exc}") from exc

    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    inputs = session.get_inputs()
    if len(inputs) != 1:
        raise SystemExit(f"INVALID_ONNX_INPUT_COUNT: expected exactly 1 input, got {len(inputs)}.")

    input_meta = inputs[0]
    input_shape = list(input_meta.shape)
    last_dim = input_shape[-1] if input_shape else None
    if last_dim not in (13, "13"):
        raise SystemExit(f"INVALID_ONNX_INPUT_SHAPE: expected final dimension 13, got {input_shape}.")

    dtype = _dtype_for_input(input_meta.type)
    sample = np.zeros((1, len(feature_order)), dtype=dtype)
    outputs = session.run(None, {input_meta.name: sample})
    if not outputs:
        raise SystemExit("INVALID_ONNX_OUTPUT: model returned no outputs.")

    print(
        json.dumps(
            {
                "status": "passed",
                "model": str(model_path),
                "input_name": input_meta.name,
                "input_shape": input_shape,
                "feature_count": len(feature_order),
                "feature_order": feature_order,
                "metadata_feature_order_checked": bool(metadata_feature_order),
                "output_shapes": [list(np.asarray(output).shape) for output in outputs],
            },
            indent=2,
        )
    )


def _dtype_for_input(input_type: str):
    if "float16" in input_type:
        return np.float16
    if "double" in input_type or "float64" in input_type:
        return np.float64
    if "int64" in input_type:
        return np.int64
    if "int32" in input_type:
        return np.int32
    return np.float32


if __name__ == "__main__":
    main()
