from __future__ import annotations


class AiAdvisorService:
    def brief(self, incident: dict) -> dict:
        severity = incident.get("severity", "unknown")
        return {"summary": f"Incident requires {severity} priority review.", "recommendations": ["review evidence", "validate scope"]}

