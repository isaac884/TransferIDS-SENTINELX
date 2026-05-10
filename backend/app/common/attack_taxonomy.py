from __future__ import annotations

import json
from functools import lru_cache

from app.config import BACKEND_ROOT


ATTACK_VERDICTS = {"attack", "attacked", "malicious", "malware", "positive", "true_positive"}
BENIGN_VERDICTS = {"benign", "normal", "clean", "negative", "false_positive"}
UNCERTAIN_VERDICTS = {"uncertain", "needs_review", "review", "unknown", ""}


def normalize_verdict(verdict: str | None) -> str:
    normalized = str(verdict or "").strip().lower().replace(" ", "_").replace("-", "_")
    if normalized in ATTACK_VERDICTS:
        return "attack"
    if normalized in BENIGN_VERDICTS:
        return "benign"
    if normalized in UNCERTAIN_VERDICTS:
        return "uncertain"
    return normalized


@lru_cache(maxsize=1)
def load_attack_taxonomy() -> dict:
    taxonomy_path = BACKEND_ROOT / "app" / "ml" / "artifacts" / "attack_taxonomy.json"
    try:
        return json.loads(taxonomy_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"version": "unavailable", "families": {}}


def harmonize_dataset_label(label: str | None, source_dataset: str | None = None) -> dict[str, str | None]:
    normalized_label = str(label or "").strip().lower()
    dataset_key = str(source_dataset or "").strip().lower()
    taxonomy = load_attack_taxonomy()
    for family_key, family in (taxonomy.get("families") or {}).items():
        candidate_labels = []
        if dataset_key in {"cicids", "cicids2017"}:
            candidate_labels = family.get("cicids") or []
        elif dataset_key in {"unsw", "unsw-nb15", "unsw_nb15"}:
            candidate_labels = family.get("unsw") or []
        else:
            candidate_labels = [family.get("canonical_label"), *(family.get("cicids") or []), *(family.get("unsw") or [])]
        if normalized_label in {str(item).strip().lower() for item in candidate_labels}:
            return {
                "family_key": family_key,
                "canonical_label": family.get("canonical_label"),
                "severity": family.get("severity"),
                "taxonomy_version": taxonomy.get("version"),
            }
    return {
        "family_key": None,
        "canonical_label": None,
        "severity": None,
        "taxonomy_version": taxonomy.get("version"),
    }


def binary_attack_taxonomy(verdict: str) -> dict[str, str | None]:
    """Return honest taxonomy metadata for the current binary ONNX model.

    The deployed C3 ONNX artifact currently supports benign/attack judgment.
    It does not produce a validated multiclass attack family. Keeping this
    explicit prevents the SOC layer from inventing DoS/Scan/Malware labels.
    """

    normalized = normalize_verdict(verdict)
    if normalized == "attack":
        return {
            "classification_scope": "binary",
            "attack_family": "unclassified_attack",
            "attack_family_source": "binary_model_only",
        }
    if normalized == "uncertain":
        return {
            "classification_scope": "binary",
            "attack_family": None,
            "attack_family_source": "binary_model_only",
        }
    return {
        "classification_scope": "binary",
        "attack_family": "benign",
        "attack_family_source": "binary_model_only",
    }
