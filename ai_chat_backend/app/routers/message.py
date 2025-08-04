from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import datetime, timezone

from app.schemas.message import MessageCreate, MessageResponse
from app.models.message import Message
from app.models.chat import Chat
from app.models.user import User
from app.utils.dependencies import get_db, get_current_user
from app.utils.dependencies import get_current_user

from app.models.message import RoleType

router = APIRouter(prefix="/message", tags=["Messages"])

@router.post("/send", response_model=MessageResponse)
async def send_message(
    msg: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat = await db.get(Chat, msg.chat_id)
    if not chat or chat.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat not found")

    new_msg = Message(
        role=RoleType.USER,
        content=msg.content,
        chat_id=msg.chat_id,
    )
    db.add(new_msg)

    chat.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(new_msg)
    return new_msg

@router.get("/{chat_id}", response_model=list[MessageResponse])
async def get_messages_by_chat(
    chat_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat = await db.get(Chat, chat_id)
    if not chat or chat.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat not found")

    result = await db.execute(
        select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    return messages

