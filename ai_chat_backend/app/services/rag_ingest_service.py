import base64
import os
import uuid
from app.services.rag_service import db
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, UnstructuredWordDocumentLoader
from langchain_community.document_loaders.blob_loaders import Blob
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from app.config import settings
from langchain_community.document_loaders import (
    TextLoader, PyPDFLoader, UnstructuredWordDocumentLoader
)
import tempfile
from app.services.file_service import FileService


os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

embeddings = OpenAIEmbeddings()
db = Chroma(
        persist_directory=settings.CHROMA_PATH,
        embedding_function=embeddings
    )
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
    chat_id: uuid.UUID,
    session: AsyncSession,
    file_path: str,
    content: bytes,
):
    db_file = save_file_to_db(session, chat_id, file, file_path, content)
    index_file_content_to_rag(chat_id, file_path, file.filename)
    return db_file

async def save_file_to_disk(file: UploadFile) -> tuple[str, bytes, str]:
    content = await file.read()
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as f:
        f.write(content)
    return file_path, content, file.content_type

def save_file_to_db(session: AsyncSession, chat_id: uuid.UUID, file: UploadFile, file_path: str, content: bytes):
    encoded_content = base64.b64encode(content).decode("utf-8")

    return FileService.create(
        session=session,
        chat_id=chat_id,
        filename=file.filename,
        filetype=file.content_type,
        url=file_path,
        data=content
    )

def index_file_content_to_rag(chat_id: uuid.UUID, file_path: str, original_filename: str):
    loader = select_loader(file_path)
    documents = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_documents(documents)

    for chunk in chunks:
        chunk.metadata["chat_id"] = str(chat_id)
        chunk.metadata["source"] = original_filename

    db.add_documents(chunks)


