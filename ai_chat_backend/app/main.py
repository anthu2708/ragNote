# main.py (đoạn thay thế phần lifespan & app init)

import os
import logging
import re
from alembic import command
from alembic.config import Config
from alembic.util.exc import CommandError
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import ProgrammingError
from sqlalchemy import create_engine, inspect
from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.routers import auth, file, ai, note, chat, message
from app.services.rag_store import init_rag

logging.basicConfig(level=logging.INFO)

ALEMBIC_INI = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
RUN_MIGRATIONS_ON_STARTUP = os.getenv("RUN_MIGRATIONS_ON_STARTUP", "1") == "1"
ALEMBIC_AUTO_RECOVER_MISSING_REVISION = os.getenv("ALEMBIC_AUTO_RECOVER_MISSING_REVISION", "1") == "1"

def _has_versions_folder() -> bool:
    versions = os.path.join(os.path.dirname(__file__), "..", "alembic", "versions")
    return os.path.isdir(versions) and bool(os.listdir(versions))

def _resolve_sync_db_url() -> str:
    db_url = settings.DATABASE_URL or ""
    if not db_url:
        raise RuntimeError("DATABASE_URL is not set")
    if "+asyncpg" in db_url:
        db_url = re.sub(r"^\w+\+asyncpg", "postgresql+psycopg", db_url)
    return db_url

def _build_alembic_config() -> Config:
    if not os.path.exists(ALEMBIC_INI):
        raise RuntimeError(f"Alembic ini not found: {ALEMBIC_INI}")
    if not _has_versions_folder():
        raise RuntimeError("Alembic versions folder is missing or empty")

    cfg = Config(ALEMBIC_INI)
    cfg.set_main_option("sqlalchemy.url", _resolve_sync_db_url())
    return cfg

def _is_missing_revision_error(exc: Exception) -> bool:
    message = str(exc)
    return "Can't locate revision identified by" in message or "No such revision or branch" in message

def _is_duplicate_table_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "already exists" in message and "relation" in message

def _has_any_app_table(db_url: str) -> bool:
    table_names = ("users", "chats", "messages", "files", "notes")
    engine = create_engine(db_url)
    try:
        db_inspector = inspect(engine)
        return any(db_inspector.has_table(table) for table in table_names)
    finally:
        engine.dispose()

def _recover_from_missing_revision(cfg: Config) -> None:
    db_url = _resolve_sync_db_url()
    if _has_any_app_table(db_url):
        logging.warning("Orphaned alembic revision detected. Existing tables found, stamping to head.")
        command.stamp(cfg, "head")
        return

    logging.warning("Orphaned alembic revision detected. No app tables found, restamping to base then upgrading.")
    command.stamp(cfg, "base")
    command.upgrade(cfg, "head")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Single source of truth:
      - Always run Alembic upgrade on startup when enabled.
      - Fail fast when migration assets are missing to avoid schema drift.
    """
    try:
        if RUN_MIGRATIONS_ON_STARTUP:
            cfg = _build_alembic_config()
            logging.info("Running alembic upgrade head...")
            try:
                await run_in_threadpool(command.upgrade, cfg, "head")
            except CommandError as exc:
                if ALEMBIC_AUTO_RECOVER_MISSING_REVISION and _is_missing_revision_error(exc):
                    logging.warning("Alembic missing revision detected; auto-recover is enabled.")
                    await run_in_threadpool(_recover_from_missing_revision, cfg)
                    logging.info("Alembic recovery completed.")
                else:
                    raise
            except ProgrammingError as exc:
                if ALEMBIC_AUTO_RECOVER_MISSING_REVISION and _is_duplicate_table_error(exc):
                    logging.warning("Duplicate table detected during migration. Stamping to head.")
                    await run_in_threadpool(command.stamp, cfg, "head")
                    logging.info("Alembic duplicate-table recovery completed.")
                else:
                    raise
            logging.info("Alembic upgrade completed.")
        else:
            logging.info("Skipping DB migrations because RUN_MIGRATIONS_ON_STARTUP=0")

        # init vector store / rag
        try:
            init_rag()
        except Exception:
            logging.exception("init_rag failed")

        yield
    except Exception:
        logging.exception("Startup lifecycle failed")
        raise

app = FastAPI(title="AI Chat RAG API", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, tags=["Auth"])
app.include_router(chat.router, tags=["Chat"])
app.include_router(file.router, tags=["File"])
app.include_router(message.router, tags=["Message"])
app.include_router(note.router, tags=["Note"])
app.include_router(ai.router)

# (dev) hiện trace lỗi ra JSON để debug confirm/presign
from fastapi import Request
from fastapi.responses import JSONResponse
@app.exception_handler(Exception)
async def all_ex_handler(request: Request, exc: Exception):
    import traceback
    return JSONResponse(status_code=500, content={"detail": str(exc), "trace": traceback.format_exc()})
