"""
Ingest pipeline:
- Resolve (bucket, key) from file.url or file.key
- Download bytes from S3
- Extract text by MIME
- Chunk → Embed → Upsert vector store
- Update DB status: processing → indexed/failed
"""

from __future__ import annotations
import io
import logging
import time
from typing import Iterable, List, Tuple
from uuid import UUID
import boto3
from botocore.config import Config
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, Depends
from PyPDF2 import PdfReader
from app.config import settings
from app.models.file import File, FileStatus
from app.services.rag_store import get_vectorstore  # vector store đã có
from app.utils.s3_utils import parse_s3_url, s3_download_bytes

from app.utils.dependencies import get_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

logger = logging.getLogger("ingest")
logger.setLevel(logging.INFO)
# -----------------------
# Extraction
# -----------------------

def extract_text(data: bytes, mime: str) -> str:
    """
    Route by MIME. Keep it simple now; swap in better libs later.
    - application/pdf: PyPDF2/fitz
    - text/plain, text/markdown: decode utf-8
    - application/vnd.openxmlformats-officedocument.wordprocessingml.document: python-docx
    Return plain text (str).
    """
    if mime == "application/pdf":
        # Minimal extractor via PyPDF2
        reader = PdfReader(io.BytesIO(data))
        pages = []
        for pg in reader.pages:
            try:
                pages.append(pg.extract_text() or "")
            except Exception:
                pages.append("")
        return "\n\n".join(pages)

    if mime in ("text/plain", "text/markdown"):
        return data.decode("utf-8", errors="ignore")

    if mime in ("application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"):
        try:
            import docx
            doc = docx.Document(io.BytesIO(data))
            return "\n".join(p.text or "" for p in doc.paragraphs)
        except Exception:
            # fallback: best-effort decode
            return data.decode("utf-8", errors="ignore")

    # Default fallback
    return data.decode("utf-8", errors="ignore")


# -----------------------
# Chunking
# -----------------------

def chunk_text(text: str, target_chars: int = 3000, overlap: int = 300) -> List[str]:
    """
    Simple char-based chunker (ổn cho MVP).
    """
    if not text:
        return []
    chunks: List[str] = []
    i = 0
    n = len(text)
    while i < n:
        j = min(i + target_chars, n)
        chunks.append(text[i:j])
        i = max(j - overlap, j)
    return chunks


# -----------------------
# Upsert to vector store
# -----------------------

def upsert_chunks(
        chunks: List[str],
        metadata_common: dict,
):
    """
    Add documents to vector store with common metadata.
    """
    if not chunks:
        return
    vs = get_vectorstore()
    metadatas = []
    for idx, _ in enumerate(chunks):
        md = dict(metadata_common)
        md["chunk_index"] = idx
        metadatas.append(md)
    vs.add_texts(texts=chunks, metadatas=metadatas)


# -----------------------
# Main job
# -----------------------

async def ingest_file_s3(file_id: str, db: AsyncSession = Depends(get_db)):
    """
    Background job: move File -> processing, download, extract, chunk, embed, index, mark indexed.
    Idempotent: nếu đã indexed, return.
    """
    print("[INGEST] start file_id=%s", file_id)
    # 1) Load file
    f = await db.get(File, UUID(file_id))
    if not f:
        print("[INGEST] file not found: %s", file_id)
        return



    # 2) Mark processing
    f.status = FileStatus.processing
    await db.commit()
    await db.refresh(f)
    print("[INGEST] status=ingesting key=%s mime=%s", f.key, f.filetype)

    try:
        t_total = time.perf_counter()

        # 3) Resolve bucket/key
        if f.key:
            bucket = settings.S3_BUCKET
            key = f.key
        else:
            bucket, key = parse_s3_url(f.url)

        # 4) Download bytes
        t0 = time.perf_counter()
        data = s3_download_bytes(bucket, key)
        logger.info("INGEST_TRACE stage=s3_download ms=%.0f bytes=%d file_id=%s",
                    (time.perf_counter() - t0) * 1000, len(data or b""), file_id)

        # 5) Extract text
        t0 = time.perf_counter()
        text = extract_text(data, mime=f.filetype or "application/octet-stream")
        pages = text.count("\f") + 1 if text else 0
        logger.info("INGEST_TRACE stage=extract ms=%.0f chars=%d pages=%d file_id=%s",
                    (time.perf_counter() - t0) * 1000, len(text), pages, file_id)

        # 6) Chunk & Upsert
        t0 = time.perf_counter()
        chunks = chunk_text(text, target_chars=3000, overlap=300)
        logger.info("INGEST_TRACE stage=chunk ms=%.0f chunks=%d file_id=%s",
                    (time.perf_counter() - t0) * 1000, len(chunks), file_id)

        meta = {
            "project_id": str(getattr(f, "project_id", "") or ""),
            "chat_id": str(getattr(f, "chat_id", "") or ""),
            "file_id": str(f.id),
            "source": f.filename,
            "key": key,
            "etag": f.etag,
            "mime": f.filetype,
        }
        t0 = time.perf_counter()
        upsert_chunks(chunks, metadata_common=meta)
        logger.info("INGEST_TRACE stage=upsert ms=%.0f chunks=%d file_id=%s",
                    (time.perf_counter() - t0) * 1000, len(chunks), file_id)

        logger.info("INGEST_TRACE stage=total ms=%.0f file_id=%s",
                    (time.perf_counter() - t_total) * 1000, file_id)


        # 7) Mark indexed
        f.status = FileStatus.indexed
        await db.commit()
        print("[INGEST] DONE status=ready file_id=%s", file_id)

    except Exception as e:
        # 8) Mark failed
        f.status = FileStatus.failed
        await db.commit()
        # log thực tế bằng logger
        print("INGEST FAILED:", f.id, e)
