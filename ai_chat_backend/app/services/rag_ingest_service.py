import os
import uuid
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    TextLoader, PyPDFLoader, UnstructuredWordDocumentLoader
)
from app.config import settings
from app.services.file_service import FileService
from app.services.rag_store import get_vectorstore

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


def select_loader(file_path: str):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".txt" or ext == ".md":
        return TextLoader(file_path, encoding="utf-8")
    elif ext == ".pdf":
        return PyPDFLoader(file_path)
    elif ext in [".doc", ".docx"]:
        return UnstructuredWordDocumentLoader(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


async def process_uploaded_file(
    file: UploadFile,
    chat_id: UUID,
    session: AsyncSession,
    file_path: str,
    content: bytes,
):
    db_file = await save_file_to_db(session, chat_id, file, file_path, content)
    index_file_content_to_rag(chat_id, file_path, file.filename)
    return db_file


async def save_file_to_db(session: AsyncSession, chat_id: UUID, file: UploadFile, file_path: str, content: bytes):
    return await FileService.create(
        session=session,
        chat_id=chat_id,
        filename=file.filename,
        filetype=file.content_type,
        url=file_path,
        data=None
    )

def index_file_content_to_rag(chat_id: UUID, file_path: str, original_filename: str):
    loader = select_loader(file_path)
    documents = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_documents(documents)

    for chunk in chunks:
        chunk.metadata["chat_id"] = str(chat_id)
        chunk.metadata["source"] = original_filename

    vs = get_vectorstore()
    vs.add_documents(chunks)


async def save_file_to_disk(file: UploadFile) -> tuple[str, bytes, str]:
    content = await file.read()
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as f:
        f.write(content)
    return file_path, content, file.content_type

