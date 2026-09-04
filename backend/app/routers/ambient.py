from fastapi import APIRouter, File, UploadFile

from app.services.yamnet_service import classify_ambient

router = APIRouter(tags=["ambient"])


@router.post("/ambient")
async def ambient(file: UploadFile = File(...)):
    data = await file.read()
    return classify_ambient(data)
