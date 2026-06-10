from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.core.config import get_settings
from app.core.logging_config import setup_logging
from app.db.database import Base, engine
from app.db import models
from app.routers import ai, applications, auth, dashboard, documents
from app.routers import candidate, companies, hr, jobs


setup_logging()
settings = get_settings()

if settings.STORAGE_BACKEND.lower() == "local":
    Path(settings.LOCAL_UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

app = FastAPI(title=settings.PROJECT_NAME, debug=settings.APP_DEBUG)

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


app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(documents.router)
app.include_router(ai.router)
app.include_router(dashboard.router)
app.include_router(candidate.router)
app.include_router(companies.router)
app.include_router(jobs.router)
app.include_router(hr.router)
