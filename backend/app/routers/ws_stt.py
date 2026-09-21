from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.whisper_service import transcribe_bytes

router = APIRouter(tags=["stt-ws"])


@router.websocket("/ws/stt")
async def ws_stt(websocket: WebSocket):
    await websocket.accept()
    buffer = bytearray()
    language = "ar"
    # Accumulate ~1.5–2s of audio before each decode; client sends discrete blobs
    try:
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break
            if "text" in message and message["text"] is not None:
                try:
                    payload = json.loads(message["text"])
                except json.JSONDecodeError:
                    continue
                if payload.get("type") == "config":
                    language = payload.get("language") or language
                    await websocket.send_json({"type": "ready", "language": language})
                elif payload.get("type") == "flush" and buffer:
                    data = bytes(buffer)
                    buffer.clear()
                    result = await asyncio.to_thread(transcribe_bytes, data, language)
                    await websocket.send_json(
                        {
                            "type": "final",
                            "text": result.get("text", ""),
                            "language": result.get("language", language),
                        }
                    )
            elif "bytes" in message and message["bytes"] is not None:
                chunk = message["bytes"]
                buffer.extend(chunk)
                # Auto-flush sooner for lower latency (~1–1.5s of webm)
                if len(buffer) >= 28_000:
                    data = bytes(buffer)
                    buffer.clear()
                    await websocket.send_json({"type": "partial", "text": "جاري التحويل…"})
                    result = await asyncio.to_thread(transcribe_bytes, data, language)
                    text = result.get("text", "")
                    if text:
                        # Show decoded text ASAP as a soft partial before final settles
                        await websocket.send_json({"type": "partial", "text": text})
                    await websocket.send_json(
                        {
                            "type": "final",
                            "text": text,
                            "language": result.get("language", language),
                        }
                    )
    except WebSocketDisconnect:
        return
