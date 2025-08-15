import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, LargeBinary, func, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from uuid import uuid4
from datetime import datetime
from ..database import Base
from sqlalchemy import Enum

class FileStatus(str, enum.Enum):
    requested = "requested"
    uploaded  = "uploaded"
    ingesting = "ingesting"
    ready     = "ready"
    failed    = "failed"

class File(Base):
    __tablename__ = "files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    filename = Column(String, nullable=False)
    filetype = Column(String)
    url = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())
    chat_id = Column(UUID(as_uuid=True), ForeignKey("chats.id", ondelete="CASCADE"))
    data = Column(LargeBinary)

    key = Column(String, nullable=False)
    etag = Column(String)
    size = Column(BigInteger)
    status = Column(Enum(FileStatus, names="file_status", validate_strings=True),
                    nullable=False, server_default=FileStatus.requested.value)

    chat = relationship("Chat", back_populates="files")

