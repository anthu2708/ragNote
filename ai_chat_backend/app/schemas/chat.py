from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class ChatCreate(BaseModel):
    title: Optional[str] = None

class ChatResponse(BaseModel):
    id: UUID
    title: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ChatAskRequest(BaseModel):
    chat_id: UUID
    question: str

class ChatAskResponse(BaseModel):
    ans: str


class ChatListItem(BaseModel):
    id: UUID
    title: str
    created: str

