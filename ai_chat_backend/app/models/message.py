from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from uuid import uuid4
from datetime import datetime
from enum import Enum as PyEnum
from ..database import Base

class RoleType(PyEnum):
    USER = "user"
    ASSISTANT = "assistant"

class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    chat_id = Column(UUID(as_uuid=True), ForeignKey("chats.id", ondelete="CASCADE"))
    role = Column(Enum(RoleType, name="roletype", create_type=True), nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())

    chat = relationship("Chat", back_populates="messages")