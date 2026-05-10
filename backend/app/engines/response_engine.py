from __future__ import annotations


class ResponseEngine:
    def recommend(self, severity: str) -> list[str]:
        if severity == "critical":
            return ["isolate_endpoint", "block_source_ip", "export_evidence_package"]
        if severity == "high":
            return ["block_source_ip", "review_asset_logs"]
        return ["monitor", "attach_to_case"]

