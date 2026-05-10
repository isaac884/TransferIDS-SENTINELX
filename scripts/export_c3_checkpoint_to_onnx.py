from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys


DEFAULT_FEATURES = [
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
]


class _ProbabilityWrapper:
    def __new__(cls, model):
        import torch

        class ProbabilityWrapper(torch.nn.Module):
            def __init__(self, wrapped_model):
                super().__init__()
                self.wrapped_model = wrapped_model

            def forward(self, features):
                output = self.wrapped_model(features)
                logits = output[1] if isinstance(output, tuple) else output
                return torch.softmax(logits, dim=1)

        return ProbabilityWrapper(model)


def _web3_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _transferids_root(web_root: Path) -> Path:
    return web_root.parent


def _default_checkpoint(root: Path) -> Path:
    return (
        root
        / "results"
        / "C3-2 outputs"
        / "cicids2017_to_unsw_nb15"
        / "binary"
        / "full_icdif"
        / "C3_2_cicids2017_to_unsw_nb15_binary_full_icdif_tab_transformer_full_model_r0p7_lr3e-05_e30_class_balanced_checkpoint.pt"
    )


def _load_schema_num_classes(root: Path, source: str, target: str, task: str) -> int:
    schema_path = root / "artifacts" / "feature_engineering" / f"{source}_to_{target}" / task / "schema.json"
    if not schema_path.exists():
        return 2
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    id_to_class = schema.get("id_to_class", {}) or {}
    return max((int(key) for key in id_to_class.keys()), default=1) + 1


def _sha256_file(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _safe_relative(path: Path, root: Path) -> str:
    try:
        return path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return str(path)


def export_checkpoint_to_onnx(
    *,
    checkpoint_path: Path,
    output_path: Path,
    transferids_root: Path,
    input_dim: int,
    num_classes: int | None,
    opset: int,
) -> None:
    if input_dim != len(DEFAULT_FEATURES):
        raise ValueError(f"TransferIDS web3 expects {len(DEFAULT_FEATURES)} features, got input_dim={input_dim}")
    if str(transferids_root) not in sys.path:
        sys.path.insert(0, str(transferids_root))

    import torch
    from model.c3_icdif import backbone as c3_backbone
    from model.c3_icdif import base as c3_base

    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    metadata = checkpoint.get("metadata", {}) or {}
    backbone_name = str(metadata.get("backbone") or "mlp").strip().lower()
    source = str(metadata.get("source_dataset") or "cicids2017")
    target = str(metadata.get("target_dataset") or "unsw_nb15")
    task = str(metadata.get("task") or "binary")
    resolved_num_classes = int(num_classes or _load_schema_num_classes(transferids_root, source, target, task))
    backbone_cfg = dict(metadata.get("backbone_cfg") or {})
    if not backbone_cfg:
        backbone_cfg = c3_base.get_c3_backbone_config(backbone_name=backbone_name, data_root=str(transferids_root))

    model = c3_backbone.build_backbone(
        input_dim=int(input_dim),
        num_classes=resolved_num_classes,
        backbone_cfg=backbone_cfg,
    )
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()

    wrapper = _ProbabilityWrapper(model)
    dummy = torch.zeros(1, int(input_dim), dtype=torch.float32)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        wrapper,
        dummy,
        str(output_path),
        input_names=["features"],
        output_names=["probabilities"],
        dynamic_axes={"features": {0: "batch"}, "probabilities": {0: "batch"}},
        opset_version=int(opset),
        dynamo=False,
    )

    artifact_dir = output_path.parent
    feature_order_path = artifact_dir / "feature_order.json"
    feature_order_path.write_text(json.dumps(DEFAULT_FEATURES, indent=2) + "\n", encoding="utf-8")

    metadata_path = output_path.with_suffix(".metadata.json")
    metadata_path.write_text(
        json.dumps(
            {
                "checkpoint_path": _safe_relative(checkpoint_path, transferids_root),
                "checkpoint_sha256": _sha256_file(checkpoint_path),
                "onnx_path": _safe_relative(output_path, _web3_root()),
                "onnx_sha256": _sha256_file(output_path),
                "source_dataset": source,
                "target_dataset": target,
                "task": task,
                "backbone": backbone_name,
                "input_dim": int(input_dim),
                "num_classes": resolved_num_classes,
                "feature_order": DEFAULT_FEATURES,
                "feature_order_path": _safe_relative(feature_order_path, _web3_root()),
                "opset": int(opset),
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    web_root = _web3_root()
    root = _transferids_root(web_root)
    parser = argparse.ArgumentParser(description="Export a TransferIDS C3/C3-2 PyTorch checkpoint to ONNX for web3.")
    parser.add_argument("--checkpoint", default=str(_default_checkpoint(root)), help="Path to C3/C3-2 .pt checkpoint.")
    parser.add_argument("--output", default=str(web_root / "backend" / "app" / "ml" / "artifacts" / "transferids_c3.onnx"), help="Output .onnx path.")
    parser.add_argument("--transferids-root", default=str(root), help="TransferIDS project root.")
    parser.add_argument("--input-dim", type=int, default=13, help="Canonical feature count. Must be 13.")
    parser.add_argument("--num-classes", type=int, default=None, help="Override class count; defaults from schema or 2.")
    parser.add_argument("--opset", type=int, default=17, help="ONNX opset version.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    checkpoint_path = Path(args.checkpoint).resolve()
    output_path = Path(args.output).resolve()
    transferids_root = Path(args.transferids_root).resolve()
    if not checkpoint_path.exists():
        raise FileNotFoundError(f"checkpoint not found: {checkpoint_path}")
    export_checkpoint_to_onnx(
        checkpoint_path=checkpoint_path,
        output_path=output_path,
        transferids_root=transferids_root,
        input_dim=int(args.input_dim),
        num_classes=args.num_classes,
        opset=int(args.opset),
    )
    print(output_path)
    print(output_path.with_suffix(".metadata.json"))
    print(output_path.parent / "feature_order.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
