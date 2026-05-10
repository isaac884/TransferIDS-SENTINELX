from __future__ import annotations

from datetime import datetime, timezone
from socket import gethostname


def heartbeat_payload(agent_id: str = "windows-agent-local") -> dict:
    return {
        "agent_id": agent_id,
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "hostname": gethostname(),
        "agent_version": "0.1.0",
    }
