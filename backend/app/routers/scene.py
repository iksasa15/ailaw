from __future__ import annotations

import json
import re
import secrets
from time import time
from typing import Any, Literal, Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

router = APIRouter(prefix="/scene", tags=["scene"])
ws_router = APIRouter(tags=["scene"])

HISTORY_LIMIT = 20
ROOM_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{4,32}$")

# rooms[room_id] = { lawyer, person, history, clients: set[WebSocket] }
_rooms: dict[str, dict[str, Any]] = {}
# Default shared room for legacy clients without room id
DEFAULT_ROOM = "default"


def _normalize_room(room: Optional[str]) -> str:
    raw = (room or DEFAULT_ROOM).strip()
    if not ROOM_ID_RE.match(raw):
        return DEFAULT_ROOM
    return raw


def _ensure_room(room_id: str) -> dict[str, Any]:
    if room_id not in _rooms:
        _rooms[room_id] = {
            "lawyer": None,
            "person": None,
            "history": [],
            "clients": set(),
        }
    return _rooms[room_id]


def new_room_id() -> str:
    return secrets.token_urlsafe(6)[:8]


class PhraseIn(BaseModel):
    role: Literal["lawyer", "person"]
    text: str = Field(min_length=1, max_length=200)
    fingers: Optional[int] = Field(default=None, ge=1, le=10)
    room: Optional[str] = Field(default=None, max_length=32)


def _phrase_payload(body: PhraseIn, room_id: str) -> dict[str, Any]:
    return {
        "role": body.role,
        "text": body.text.strip(),
        "fingers": body.fingers,
        "at": int(time() * 1000),
        "room": room_id,
    }


def _snapshot(room: dict[str, Any], room_id: str) -> dict[str, Any]:
    return {
        "type": "snapshot",
        "room": room_id,
        "lawyer": room.get("lawyer"),
        "person": room.get("person"),
        "history": list(room.get("history") or []),
    }


async def _broadcast(room: dict[str, Any], message: dict[str, Any], exclude: WebSocket | None = None) -> None:
    dead: list[WebSocket] = []
    data = json.dumps(message, ensure_ascii=False)
    for ws in list(room.get("clients") or []):
        if ws is exclude:
            continue
        try:
            await ws.send_text(data)
        except Exception:  # noqa: BLE001
            dead.append(ws)
    for ws in dead:
        room["clients"].discard(ws)


def _apply_phrase(room: dict[str, Any], payload: dict[str, Any]) -> None:
    role = payload["role"]
    room[role] = payload
    history = room.setdefault("history", [])
    history.append(payload)
    if len(history) > HISTORY_LIMIT:
        del history[:-HISTORY_LIMIT]


@router.post("/phrase")
async def publish_phrase(body: PhraseIn):
    """نشر عبارة من شاشة المحامي أو الشخص لمزامنة الجهازين."""
    room_id = _normalize_room(body.room)
    room = _ensure_room(room_id)
    payload = _phrase_payload(body, room_id)
    _apply_phrase(room, payload)
    await _broadcast(room, {"type": "phrase", **payload})
    return payload


@router.get("/lawyer")
def latest_lawyer(room: Optional[str] = Query(default=None)):
    """شاشة الشخص تقرأ آخر كلام للمحامي لعرضه كلغة إشارة."""
    room_id = _normalize_room(room)
    state = _ensure_room(room_id)
    return state.get("lawyer") or {"text": None, "fingers": None, "at": None, "room": room_id}


@router.get("/person")
def latest_person(room: Optional[str] = Query(default=None)):
    room_id = _normalize_room(room)
    state = _ensure_room(room_id)
    return state.get("person") or {"text": None, "fingers": None, "at": None, "room": room_id}


@router.get("/state")
def full_state(room: Optional[str] = Query(default=None)):
    room_id = _normalize_room(room)
    state = _ensure_room(room_id)
    return {
        "room": room_id,
        "lawyer": state.get("lawyer"),
        "person": state.get("person"),
        "history": list(state.get("history") or []),
    }


@router.post("/room")
def create_room():
    """إنشاء معرّف غرفة جديد للجلسة المزدوجة."""
    room_id = new_room_id()
    _ensure_room(room_id)
    return {"room": room_id}


@ws_router.websocket("/ws/scene")
async def ws_scene(
    websocket: WebSocket,
    room: Optional[str] = Query(default=None),
    role: Optional[str] = Query(default=None),
):
    """
    بث فوري لغرفة الجلسة.
    Query: room=...&role=lawyer|person
    Client may also send {type:\"publish\", role, text, fingers}.
    """
    room_id = _normalize_room(room)
    role_norm = role if role in ("lawyer", "person") else None
    room_state = _ensure_room(room_id)
    await websocket.accept()
    room_state["clients"].add(websocket)
    try:
        await websocket.send_text(json.dumps(_snapshot(room_state, room_id), ensure_ascii=False))
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break
            if "text" not in message or message["text"] is None:
                continue
            try:
                payload = json.loads(message["text"])
            except json.JSONDecodeError:
                continue
            msg_type = payload.get("type")
            if msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue
            if msg_type == "publish":
                pub_role = payload.get("role") or role_norm
                text = str(payload.get("text") or "").strip()
                if pub_role not in ("lawyer", "person") or not text:
                    continue
                fingers = payload.get("fingers")
                try:
                    fingers_i = int(fingers) if fingers is not None else None
                except (TypeError, ValueError):
                    fingers_i = None
                body = PhraseIn(role=pub_role, text=text, fingers=fingers_i, room=room_id)
                phrase = _phrase_payload(body, room_id)
                _apply_phrase(room_state, phrase)
                await _broadcast(room_state, {"type": "phrase", **phrase})
                continue
            if msg_type == "snapshot":
                await websocket.send_text(json.dumps(_snapshot(room_state, room_id), ensure_ascii=False))
    except WebSocketDisconnect:
        pass
    finally:
        room_state["clients"].discard(websocket)
