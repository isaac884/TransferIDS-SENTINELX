from __future__ import annotations


class IncidentEngine:
    def group_key(self, source_ip: str, destination_ip: str, attack_type: str = "unknown") -> str:
        return f"{source_ip}->{destination_ip}:{attack_type}"

