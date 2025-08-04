import os

from app.models.file import File
from uuid import uuid4, UUID
import mimetypes

from sqlalchemy.ext.asyncio import AsyncSession


class FileService:
    @staticmethod
    def create(session: AsyncSession, chat_id: UUID, filename: str, filetype: str, url: str, data: bytes):
        db_file = File(
            chat_id=chat_id,
            filename=filename,
            filetype=filetype,
            url=url,
            data=data
        )
        session.add(db_file)
        session.commit()
        session.refresh(db_file)
        return db_file

    @staticmethod
    def delete(session: AsyncSession, file_id: UUID):
        db_file = session.query(File).filter(File.id == file_id).first()
        if not db_file:
            raise ValueError("File not found")

        if db_file.url and os.path.exists(db_file.url):
            os.remove(db_file.url)

        session.delete(db_file)
        session.commit()
