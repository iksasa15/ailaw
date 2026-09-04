from fastapi import APIRouter, File, Form, UploadFile

from app.services.whisper_service import transcribe_bytes

router = APIRouter(tags=["stt"])


@router.post("/stt")
async def stt(
    file: UploadFile = File(...),
    language: str = Form("ar"),
):
    data = await file.read()
    result = transcribe_bytes(data, language=language or "ar")
    return result
