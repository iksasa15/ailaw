from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import ambient, arsl, health, scene, stt, ws_stt

app = FastAPI(title="Smart Glasses API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(stt.router)
app.include_router(ws_stt.router)
app.include_router(arsl.router)
app.include_router(ambient.router)
app.include_router(scene.router)
