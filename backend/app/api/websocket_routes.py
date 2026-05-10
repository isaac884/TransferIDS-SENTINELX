from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.event_bus import event_bus


router = APIRouter()


@router.websocket("/live")
async def live_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        await websocket.send_json({"type": "connected", "channel": "live-detection", "recent": event_bus.recent("detection", 25)})
        while True:
            await websocket.receive_text()
            await websocket.send_json({"type": "heartbeat", "recent": event_bus.recent("detection", 25)})
    except WebSocketDisconnect:
        return
