from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from app.services.rag_ingest_service import process_uploaded_file
from app.utils.dependencies import get_db
from app.schemas.file import FileResponse
from app.services.file_service import FileService
from app.services.rag_ingest_service import save_file_to_disk
from app.models import Chat

router = APIRouter(prefix="/file", tags=["File Upload"])



@router.post("/upload")
async def upload_file(
        chat_id: int = Form(...),
        file: UploadFile = File(...),
        session: AsyncSession = Depends(get_db)):
    try:
        file_path, content, _ = await save_file_to_disk(file)
        db_file = await process_uploaded_file(file, chat_id, session, file_path, content)

        chat = await session.get(Chat, chat_id)
        if chat:
            chat.updated_at = datetime.now(timezone.utc)
            await session.commit()

        return db_file
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{file_id}", response_model=FileResponse)
def delete_file(file_id: UUID, session: AsyncSession = Depends(get_db)):
    try:
        deleted_file = FileService.delete(session, file_id)
        return deleted_file
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")