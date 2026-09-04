from __future__ import annotations

import tempfile
from functools import lru_cache
from pathlib import Path

_WHISPER_ERROR = None


@lru_cache(maxsize=1)
def _load_model():
    global _WHISPER_ERROR
    try:
        from faster_whisper import WhisperModel

        # Plan target: small model for Arabic accuracy / acceptable latency
        return WhisperModel("small", device="cpu", compute_type="int8"), None
    except Exception as exc:  # noqa: BLE001
        _WHISPER_ERROR = str(exc)
        return None, str(exc)


def whisper_available() -> bool:
    model, err = _load_model()
    return model is not None


def transcribe_bytes(audio_bytes: bytes, language: str = "ar") -> dict:
    model, err = _load_model()
    if model is None:
        return {
            "text": "",
            "language": language or "ar",
            "engine": "unavailable",
            "error": (
                "faster-whisper غير مثبت. ثبّت requirements-ml.txt "
                "أو استخدم وضع المتصفح (Web Speech API) من الواجهة."
            ),
            "detail": err,
        }

    suffix = ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
    try:
        segments, info = model.transcribe(
            tmp_path,
            language=language if language else None,
            beam_size=1,
            vad_filter=True,
        )
        text = " ".join(seg.text.strip() for seg in segments).strip()
        return {
            "text": text,
            "language": getattr(info, "language", language or "ar"),
            "engine": "faster-whisper",
        }
    finally:
        Path(tmp_path).unlink(missing_ok=True)
