from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum

class RoleType(str, Enum):
    user = "user"
    assistant = "assistant"

class MessageCreate(BaseModel):
    role: RoleType
    content: str
    chat_id: UUID

class MessageResponse(BaseModel):
    id: UUID
    role: RoleType
    content: str
    created_at: datetime
    chat_id: UUID

    class Config:
        from_attributes = True

