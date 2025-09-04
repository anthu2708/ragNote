from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, constr, conint
from typing import Literal

class FileResponse(BaseModel):
    id: UUID
    filename: str
    filetype: str
    url: str
    created_at: datetime
    chat_id: UUID

    class Config:
        from_attributes = True

class PresignByKeyReq(BaseModel):
    contentType: Literal["application/pdf"]
    size: conint(gt=0)
    filename: str

class ConfirmReq(BaseModel):
    file_id: str
    etag: str
    s3_url: str
    size: int
    mime: Literal["application/pdf"]

class AttachReq(BaseModel):
    chat_id: UUID
    file_ids: list[UUID]

class DiscardReq(BaseModel):
    file_ids: list[UUID]
