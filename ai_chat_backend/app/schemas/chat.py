from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime

class ChatAskRequest(BaseModel):
    chat_id: UUID
    question: str

class ChatSummary(BaseModel):  # dùng thay ChatListItem nếu muốn
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    title: str
    updated_at: datetime