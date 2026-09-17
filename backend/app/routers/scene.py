from time import time
from typing import Any, Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/scene", tags=["scene"])

_state: dict[str, Any] = {
    "lawyer": None,
    "person": None,
}


class PhraseIn(BaseModel):
    role: Literal["lawyer", "person"]
    text: str = Field(min_length=1, max_length=200)
    fingers: Optional[int] = Field(default=None, ge=1, le=10)


@router.post("/phrase")
def publish_phrase(body: PhraseIn):
    """نشر عبارة من شاشة المحامي أو الشخص لمزامنة الجهازين."""
    payload = {
        "role": body.role,
        "text": body.text.strip(),
        "fingers": body.fingers,
        "at": int(time() * 1000),
    }
    _state[body.role] = payload
    return payload


@router.get("/lawyer")
def latest_lawyer():
    """شاشة الشخص تقرأ آخر كلام للمحامي لعرضه كلغة إشارة."""
    return _state.get("lawyer") or {"text": None, "fingers": None, "at": None}


@router.get("/person")
def latest_person():
    return _state.get("person") or {"text": None, "fingers": None, "at": None}


@router.get("/state")
def full_state():
    return {
        "lawyer": _state.get("lawyer"),
        "person": _state.get("person"),
    }
