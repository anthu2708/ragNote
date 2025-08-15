# main.py (đoạn thay thế phần lifespan & app init)

import os
import logging
from alembic import command
from alembic.config import Config
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from app.database import engine, Base
from app.config import settings
from app.routers import auth, file, ai, note, chat, message
from app.services.rag_store import init_rag

logging.basicConfig(level=logging.INFO)

ALEMBIC_INI = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
RUN_MIGRATIONS_ON_STARTUP = os.getenv("RUN_MIGRATIONS_ON_STARTUP", "1") == "1"

def _has_versions_folder() -> bool:
    versions = os.path.join(os.path.dirname(__file__), "..", "alembic", "versions")
    return os.path.isdir(versions) and bool(os.listdir(versions))

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Single source of truth:
      - Prefer Alembic upgrade head when available.
      - DEV fallback: create_all() + alembic stamp head when no versions present.
    """
    try:
        if RUN_MIGRATIONS_ON_STARTUP and os.path.exists(ALEMBIC_INI) and _has_versions_folder():
            cfg = Config(ALEMBIC_INI)
            db_url = os.getenv("DATABASE_URL", "")
            if "+asyncpg" in db_url:
                db_url = db_url.replace("+asyncpg", "+psycopg")
            cfg.set_main_option("sqlalchemy.url", db_url)

            logging.info("Running alembic upgrade head...")
            await run_in_threadpool(command.upgrade, cfg, "head")
            logging.info("Alembic upgrade completed.")
        else:
            logging.warning("Alembic not available (ini/versions missing) or RUN_MIGRATIONS_ON_STARTUP=0. "
                            "Running Base.metadata.create_all() as DEV fallback.")
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

            if os.path.exists(ALEMBIC_INI):
                try:
                    cfg = Config(ALEMBIC_INI)
                    db_url = os.getenv("DATABASE_URL", "")
                    if "+asyncpg" in db_url:
                        db_url = db_url.replace("+asyncpg", "+psycopg")
                    cfg.set_main_option("sqlalchemy.url", db_url)
                    await run_in_threadpool(command.stamp, cfg, "head")
                    logging.info("Alembic stamped head after create_all().")
                except Exception:
                    logging.exception("Alembic stamp failed after create_all()")

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
