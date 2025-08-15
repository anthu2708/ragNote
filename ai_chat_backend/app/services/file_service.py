import os
from uuid import UUID
from sqlalchemy import select
from app.models.file import File
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings


class FileService:
    @staticmethod
    async def create(session: AsyncSession, **kwargs) -> File:
        db_file = File(**kwargs)
        session.add(db_file)
        await session.commit()
        await session.refresh(db_file)
        return db_file

    @staticmethod
    async def delete(session: AsyncSession, file_id: UUID) -> File:
        result = await session.execute(select(File).where(File.id == file_id))
        db_file = result.scalar_one_or_none()
        if not db_file:
            raise ValueError("File not found")

        if db_file.url and db_file.url.startswith("s3://"):
            pass

        if db_file.url and os.path.exists(db_file.url):
            os.remove(db_file.url)

        await session.delete(db_file)
        await session.commit()
        return db_file
