import re
import uuid
from typing import List
from uuid import UUID, uuid4
from datetime import datetime, timezone
import boto3
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from app.utils.dependencies import get_db
from app.schemas.file import FileResponse, AttachReq, DiscardReq
from app.services.file_service import FileService
from app.models import Chat
from app.config import settings
from botocore.config import Config
from app.schemas.file import PresignByKeyReq, ConfirmReq
from app.utils.dependencies import get_current_user
from app.models.file import File, FileStatus
from fastapi import File as FastAPIFile, APIRouter
from fastapi import BackgroundTasks
from app.utils.s3_utils import get_s3_client
from uuid import UUID
import asyncio
from fastapi import HTTPException, Depends
from sqlalchemy import update, and_, select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import File, Chat
from app.utils.s3_utils import _norm_uuid_list
from app.services.ingest_from_s3 import ingest_file_s3

router = APIRouter(prefix="/file", tags=["File Upload"])

BUCKET = settings.S3_BUCKET
MAX_MB = settings.MAX_FILE_SIZE_MB
SSE_MODE = settings.SSE_MODE
MAX_BYTES = MAX_MB * 1024 * 1024
BUFFER = 1024 * 1024


# @router.post("/upload")
# async def upload_file(
#         chat_id: UUID = Form(...),
#         files: List[UploadFile] = FastAPIFile(...),
#         session: AsyncSession = Depends(get_db)):
#     if not files:
#         raise HTTPException(status_code=400, detail="No files provided")
#
#     results: List[FileResponse] = []
#
#     try:
#         for f in files:
#             file_path, content, _ = await save_file_to_disk(f)
#             db_file = await process_uploaded_file(f, chat_id, session, file_path, content)
#             results.append(db_file)
#
#         chat = await session.get(Chat, chat_id)
#         if chat:
#             chat.updated_at = datetime.now(timezone.utc)
#             await session.commit()
#
#         return results
#     except Exception as e:
#         import traceback
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{file_id}", response_model=FileResponse)
async def delete_file(file_id: UUID, session: AsyncSession = Depends(get_db)):
    try:
        deleted_file = await FileService.delete(session, file_id)
        return deleted_file
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/presign-by-key")
async def presign_by_key(
        req: PresignByKeyReq,
        db: AsyncSession = Depends(get_db),
        user=Depends(get_current_user)
):
    # _validate(str(user.id), req.key, req.contentType, req.size)
    key = f"uploads/{user.id}/{uuid4()}.pdf"
    if req.contentType != "application/pdf":
        raise HTTPException(400, "Only PDF for now")
    if req.size > MAX_BYTES:
        raise HTTPException(400, f"File too large (>{MAX_MB}MB)")

    f = File(
        id=uuid4(),
        filename=req.filename or key.split("/")[-1],
        filetype=req.contentType,
        url=f"s3://{BUCKET}/{key}",
        chat_id=None,
        key=key,
        status=FileStatus.requested,
        size=None,
        etag=None,
    )
    db.add(f)
    await db.flush()
    await db.commit()
    await db.refresh(f)

    print("PRESIGN SAVED:", f.id, f.key)


    if not f.id:
        import logging
        logging.getLogger(__name__).error("presign created File with empty id for key=%s", key)
        raise HTTPException(500, "failed to create file record")

    s3 = get_s3_client()
    fields = {
        "Content-Type": req.contentType,
        "x-amz-server-side-encryption": SSE_MODE,
        "success_action_status": "201",
        "key": key,
    }
    cond = [
        {"Content-Type": req.contentType},
        {"x-amz-server-side-encryption": SSE_MODE},
        {"success_action_status": "201"},
        {"key": key},
        ["content-length-range", 1, MAX_BYTES + BUFFER],
    ]
    presigned = s3.generate_presigned_post(
        BUCKET, key, Fields=fields, Conditions=cond, ExpiresIn=900
    )

    return {
        "url": presigned["url"],
        "fields": presigned["fields"],
        "file_id": str(f.id),
        "key": key}

ETAG_RE = re.compile(r'^"?([0-9a-fA-F]{32}(-\d+)?)"?$')


@router.post("/confirm")
async def confirm(
        body: ConfirmReq,
        db: AsyncSession = Depends(get_db),
        user=Depends(get_current_user),
        background: BackgroundTasks = None,
):
    try:
        file_uuid = UUID(body.file_id)
    except Exception:
        raise HTTPException(400, "Invalid file_id")

    m = ETAG_RE.match(body.etag.strip())
    if not m:
        raise HTTPException(400, "Invalid ETag")
    clean_etag = m.group(1)

    if not (body.s3_url.startswith("s3://") or body.s3_url.startswith("https://")):
        raise HTTPException(400, "Invalid s3_url")

    try:
        size_int = int(body.size)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid size")
    if size_int <= 0:
        raise HTTPException(status_code=400, detail="Invalid size")

    f = await db.get(File, file_uuid)
    if not f:
        raise HTTPException(404, "File not found")

    try:
        f.etag = clean_etag
        f.size = size_int
        f.filetype = body.mime
        f.url = body.s3_url
        f.status = FileStatus.uploaded


        await db.commit()
        await db.refresh(f)
    except Exception:
        raise HTTPException(500, "DB commit failed")

    return {"id": str(f.id), "status": f.status}

@router.post("/ingest/{file_id}")
async def ingest_now(
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
):

    await ingest_file_s3(str(file_id), db)

    f = await db.get(File, file_id)
    if not f:
        raise HTTPException(status_code=404, detail="File not found after ingest")

    return {"id": str(file_id), "status": getattr(f, "status", None)}


@router.post("/attach")
async def attach_files(req: AttachReq, db: AsyncSession=Depends(get_db), user=Depends(get_current_user)):
    chat_id = req.chat_id if isinstance(req.chat_id, uuid.UUID) else uuid.UUID(str(req.chat_id))
    file_ids = _norm_uuid_list(req.file_ids)

    chat = await db.get(Chat, chat_id)
    if not chat or chat.user_id != user.id:
        raise HTTPException(403, "Invalid chat")

    if not file_ids:
        return {"updated": 0, "attached_ids": []}

    stmt = (
        update(File)
        .where(
            and_(
                File.id.in_(file_ids),
                File.key.startswith(f"uploads/{user.id}/"),
            )
        )
        .values(chat_id=chat_id)
        .returning(File.id)
        .execution_options(synchronize_session=False)
    )

    res = await db.execute(stmt)
    attached_ids = res.scalars().all()
    await db.commit()

    return {"updated": len(attached_ids), "attached_ids": attached_ids}

@router.post("/discard")
async def discard_files(req: DiscardReq, db: AsyncSession=Depends(get_db), user=Depends(get_current_user)):
    if not req.file_ids:
        return {"deleted": 0}

    rows = (await db.execute(
        select(File.id, File.key)
        .where(
            File.id.in_(req.file_ids),
            File.chat_id.is_(None),
            File.key.startswith(f"uploads/{user.id}/")
        )
    )).all()

    keys = [r.key for r in rows if r.key]

    await db.execute(
        delete(File).where(File.id.in_([r.id for r in rows]))
    )
    await db.commit()

    # xóa S3 (best-effort)
    try:
        s3 = get_s3_client()
        for k in keys:
            try:
                s3.delete_object(Bucket=BUCKET, Key=k)
            except Exception:
                pass
    except Exception:
        pass

    return {"deleted": len(rows)}
