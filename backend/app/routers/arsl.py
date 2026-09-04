from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.arsl_service import list_vocab, predict_word_from_landmarks

router = APIRouter(prefix="/arsl", tags=["arsl"])


class LandmarkPayload(BaseModel):
    landmarks: List[List[float]] = Field(..., description="21x3 hand landmarks")
    threshold: Optional[float] = None


@router.get("/vocab")
def vocab():
    return list_vocab()


@router.post("/predict")
def predict(payload: LandmarkPayload):
    kwargs = {}
    if payload.threshold is not None:
        kwargs["threshold"] = payload.threshold
    return predict_word_from_landmarks(payload.landmarks, **kwargs)
