from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class FileUpload(BaseModel):
    filename: str
    chat_id: UUID

class FileResponse(BaseModel):
    id: UUID
    filename: str
    filetype: str
    url: str
    created_at: datetime
    chat_id: UUID

    class Config:
        from_attributes = True

