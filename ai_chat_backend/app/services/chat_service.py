from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile
from uuid import uuid4
from app.models import Chat, Note, File, Message
from app.services.rag_ingest_service import process_uploaded_file
from app.models.message import RoleType
from app.services.file_service import FileService
from app.services.rag_ingest_service import save_file_to_disk


async def create_chat_with_files(
    db: AsyncSession, user_id, title: str, files: list[UploadFile]
) -> Chat:

    note = Note(title=title, content="")
    chat = Chat(title=title, user_id=user_id, note=note)
    db.add(chat)
    await db.flush()

    for f in files:
        file_path, content, filetype = await save_file_to_disk(f)
        await process_uploaded_file(f, chat.id, db, file_path, content)



    await db.commit()
    await db.refresh(chat)
    return chat


def save_message(db: AsyncSession, chat_id, role: RoleType, content: str):
    msg = Message(chat_id=chat_id, role=role, content=content)
    db.add(msg)
    db.commit()

