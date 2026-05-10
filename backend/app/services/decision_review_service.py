from __future__ import annotations


class DecisionReviewService:
    def record(self, event_id: str, verdict: str, notes: str | None = None) -> dict:
        return {"event_id": event_id, "verdict": verdict, "notes": notes, "status": "recorded"}

