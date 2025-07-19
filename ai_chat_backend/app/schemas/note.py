from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class NoteCreate(BaseModel):
    title: str
    content: str

class NoteResponse(BaseModel):
    id: UUID
    title: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
