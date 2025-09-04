from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile
from uuid import uuid4
from app.models import Chat, Note, File, Message
from app.models.message import RoleType
from app.services.file_service import FileService


async def create_chat_minimal(
    db: AsyncSession, user_id, title: str
) -> Chat:

    note = Note(title=title, content="")
    chat = Chat(title=title, user_id=user_id, note=note)
    db.add(chat)
    await db.flush()

    await db.commit()
    await db.refresh(chat)
    return chat



def save_message(db: AsyncSession, chat_id, role: RoleType, content: str):
    msg = Message(chat_id=chat_id, role=role, content=content)
    db.add(msg)
    db.commit()

