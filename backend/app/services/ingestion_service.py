from __future__ import annotations


class IngestionService:
    def accept_batch(self, flows: list[dict]) -> dict:
        return {"accepted": len(flows), "rejected": 0}

