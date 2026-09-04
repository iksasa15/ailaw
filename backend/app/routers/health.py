from fastapi import APIRouter

from app.services.whisper_service import whisper_available
from app.services.arsl_service import list_vocab
from app.services.yamnet_service import _try_load_yamnet

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    vocab = list_vocab()
    yamnet, names = _try_load_yamnet()
    return {
        "status": "ok",
        "service": "smart-glasses-backend",
        "whisper": whisper_available(),
        "arsl_engine": vocab.get("engine"),
        "yamnet": yamnet is not None,
        "yamnet_classes": len(names) if isinstance(names, list) else 0,
    }
