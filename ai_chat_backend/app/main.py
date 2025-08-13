import os
from alembic import command
from alembic.config import Config
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.config import settings
from app.routers import auth, file, ai, note, chat, message
from app.services.rag_store import init_rag
import logging
from starlette.concurrency import run_in_threadpool

ALEMBIC_INI = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
RUN_MIGRATIONS_ON_STARTUP = os.getenv("RUN_MIGRATIONS_ON_STARTUP", "1") == "1"
logging.basicConfig(level=logging.DEBUG)

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    alembic_cfg = Config(ALEMBIC_INI)
    command.upgrade(alembic_cfg, "head")
    init_rag()
    yield

@asynccontextmanager
async def lifespan(app: FastAPI):
    if RUN_MIGRATIONS_ON_STARTUP:
        try:
            if not os.path.exists(ALEMBIC_INI):
                raise FileNotFoundError(f"alembic.ini not found at: {ALEMBIC_INI}")
            alembic_cfg = Config(ALEMBIC_INI)

            # (Tuỳ chọn) ép URL sync cho migrations nếu vẫn dùng async DSN ở env:
            # from alembic import context
            # alembic_cfg.set_main_option("sqlalchemy.url",
            #     os.getenv("DATABASE_URL").replace("+asyncpg", "+psycopg"))

            logging.info("Running alembic upgrade head...")
            await run_in_threadpool(command.upgrade, alembic_cfg, "head")
            logging.info("Alembic upgrade completed.")
        except Exception:
            logging.exception("Alembic migration failed during startup")
            raise  # cho Uvicorn fail sớm với stacktrace rõ ràng

    try:
        init_rag()
    except Exception:
        logging.log.exception("init_rag failed")
        raise

    yield
app = FastAPI(title="AI Chat RAG API", lifespan=lifespan)

logging.basicConfig(level=logging.DEBUG)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# mount routers
app.include_router(auth.router, tags=["Auth"])
app.include_router(chat.router, tags=["Chat"])
app.include_router(file.router, tags=["File"])
app.include_router(message.router, tags=["Message"])
app.include_router(note.router, tags=["Note"])
app.include_router(ai.router)

