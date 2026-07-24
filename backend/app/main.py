from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.core.audit import audit_log_middleware
from app.core.errors import AppError, default_code
from app.routers import admin, auth, citizen, notifications, public
from app.services.storage import ensure_bucket

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_bucket()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(audit_log_middleware)

app.include_router(auth.router)
app.include_router(public.router)
app.include_router(admin.router)
app.include_router(citizen.router)
app.include_router(notifications.router)


@app.exception_handler(AppError)
def handle_app_error(request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail, "code": exc.code})


@app.exception_handler(HTTPException)
def handle_http_exception(request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail, "code": default_code(exc.status_code)})


@app.exception_handler(RequestValidationError)
def handle_validation_error(request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "Ma'lumotlar noto'g'ri kiritildi", "code": "validation_error"})


@app.get("/api/health")
def health():
    return {"status": "ok"}
