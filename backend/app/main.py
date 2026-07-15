import logging
from pathlib import Path
from time import perf_counter
from uuid import uuid4

from fastapi import Depends, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging_config import setup_logging
from app.db.database import Base, engine, get_db
from app.db import models
from app.routers import ai, applications, auth, dashboard, documents
from app.routers import candidate, companies, hr, jobs

from time import perf_counter

from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.core.metrics import (
    HTTP_REQUEST_DURATION_SECONDS,
    HTTP_REQUESTS_IN_PROGRESS,
    HTTP_REQUESTS_TOTAL,
)
setup_logging()
settings = get_settings()
http_logger = logging.getLogger("app.http")

if settings.STORAGE_BACKEND.lower() == "local":
    Path(settings.LOCAL_UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

app = FastAPI(title=settings.PROJECT_NAME, debug=settings.APP_DEBUG)


@app.middleware("http")
async def prometheus_metrics_middleware(
    request: Request,
    call_next,
):
    # Không đo request Prometheus tự scrape để tránh gây nhiễu.
    if request.url.path == "/metrics":
        return await call_next(request)

    method = request.method
    status_code = 500
    started_at = perf_counter()

    HTTP_REQUESTS_IN_PROGRESS.labels(
        method=method,
    ).inc()

    try:
        response = await call_next(request)
        status_code = response.status_code
        return response

    finally:
        duration_seconds = (
            perf_counter() - started_at
        )

        route_object = request.scope.get("route")

        route_path = getattr(
            route_object,
            "path",
            "unmatched",
        )

        HTTP_REQUESTS_TOTAL.labels(
            method=method,
            route=route_path,
            status_code=str(status_code),
        ).inc()

        HTTP_REQUEST_DURATION_SECONDS.labels(
            method=method,
            route=route_path,
        ).observe(duration_seconds)

        HTTP_REQUESTS_IN_PROGRESS.labels(
            method=method,
        ).dec()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.STORAGE_BACKEND.lower() == "local":
    app.mount(
        "/uploads",
        StaticFiles(directory=settings.LOCAL_UPLOAD_DIR),
        name="uploads",
    )

@app.get(
    "/metrics",
    include_in_schema=False,
)
def prometheus_metrics():
    return Response(
        content=generate_latest(),
        headers={
            "Content-Type": CONTENT_TYPE_LATEST,
        },
    )

@app.on_event("startup")
def create_tables_for_local_mvp() -> None:
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    if "users" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("users")}
        if "role" not in columns:
            with engine.begin() as connection:
                if engine.dialect.name == "sqlite":
                    connection.execute(
                        text("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'candidate'")
                    )
                else:
                    connection.execute(
                        text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'candidate'")
                    )


@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/health/live", include_in_schema=False)
def liveness():
    return {
        "status": "alive",
        "service": "internship-api",
    }


@app.get("/health/ready", include_in_schema=False)
def readiness(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))

    return {
        "status": "ready",
        "service": "internship-api",
        "dependencies": {
            "postgres": True,
        },
    }

app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(documents.router)
app.include_router(ai.router)
app.include_router(dashboard.router)
app.include_router(candidate.router)
app.include_router(companies.router)
app.include_router(jobs.router)
app.include_router(hr.router)
