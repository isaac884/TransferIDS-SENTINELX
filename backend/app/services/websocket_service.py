from __future__ import annotations


class WebSocketService:
    def connection_message(self) -> dict:
        return {"type": "connected", "service": "transferids-websocket"}

