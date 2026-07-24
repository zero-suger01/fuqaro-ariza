from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import admin, ai, auth, complaints, notifications
from app.services.storage import ensure_bucket

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(ai.router)
app.include_router(admin.router)
app.include_router(notifications.router)


@app.on_event("startup")
def on_startup():
    ensure_bucket()


@app.get("/api/health")
def health():
    return {"status": "ok"}
