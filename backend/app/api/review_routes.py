from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user, get_tenant_id
from app.api.response_utils import api_success
from app.schemas.review_schema import ReviewDecision
from app.services.event_store import event_store


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/history")
def review_history(tenant_id: str = Depends(get_tenant_id)) -> dict:
    records = event_store.list_reviews(tenant_id)
    return api_success({"tenant_id": tenant_id, "records": records}, tenant_id=tenant_id, records=records)


@router.post("/decision")
def submit_review(payload: ReviewDecision, tenant_id: str = Depends(get_tenant_id)) -> dict:
    review = event_store.add_review(
        {
            "tenant_id": tenant_id,
            "event_id": payload.event_id,
            "verdict": payload.verdict,
            "notes": payload.notes,
        }
    )
    return api_success({"tenant_id": tenant_id, "status": "recorded", "review": review}, tenant_id=tenant_id, status="recorded", review=review)


@router.get("/disagreements")
def review_disagreements(tenant_id: str = Depends(get_tenant_id)) -> dict:
    events = {event.get("id"): event for event in event_store.list_events(tenant_id)}
    disagreements = []
    for review in event_store.list_reviews(tenant_id):
        event = events.get(review.get("event_id"))
        if event is None:
            continue
        analyst_verdict = review.get("verdict")
        model_verdict = event.get("verdict")
        if analyst_verdict in {"false_positive", "benign"} and model_verdict == "attack":
            disagreements.append({"event": event, "review": review, "type": "model_attack_analyst_false_positive"})
        elif analyst_verdict == "attack" and model_verdict != "attack":
            disagreements.append({"event": event, "review": review, "type": "analyst_attack_model_benign"})
    return api_success({"tenant_id": tenant_id, "disagreements": disagreements}, tenant_id=tenant_id, disagreements=disagreements)
