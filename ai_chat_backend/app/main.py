from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.config import settings
from app.routers import auth, file, ai, note, chat, message
import logging


app = FastAPI(title="AI Chat RAG API")

logging.basicConfig(level=logging.DEBUG)
# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lifespan event để tạo bảng
@app.on_event("startup")
async def on_startup() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# mount routers
app.include_router(auth.router, tags=["Auth"])
app.include_router(chat.router, tags=["Chat"])
app.include_router(file.router, tags=["File"])
app.include_router(message.router, tags=["Message"])
app.include_router(note.router, tags=["Note"])
app.include_router(ai.router)

