from uuid import UUID

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.services import chat_service
from app.utils.dependencies import get_db, get_current_user
from app.models import Chat, User
from app.schemas.chat import ChatSummary

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/minimal", response_model=ChatSummary, status_code=201)
async def create_chat_minimal(
        title: str = Form(...),
        db: AsyncSession = Depends(get_db),
        current_user=Depends(get_current_user),
):
    chat = await chat_service.create_chat_minimal(
        db=db,
        user_id=current_user.id,
        title=title,
    )
    return ChatSummary.model_validate(chat)

@router.get("/title/{chat_id}")
async def get_chat_title(
    chat_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Chat).where(Chat.id == chat_id, Chat.user_id == current_user.id)
    )
    title = result.scalars().first().title

    if title is None:
        raise HTTPException(status_code=404, detail="Chat not found")

    return {"title": title}

@router.delete("/{chat_id}", status_code=204)
async def delete_chat(
        chat_id: UUID,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Chat).where(Chat.id == chat_id, Chat.user_id == current_user.id)
    )
    chat = result.scalars().first()

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    await db.delete(chat)
    await db.commit()
    return


@router.get("/", response_model=list[ChatSummary])
async def get_all_chats(
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Chat).where(Chat.user_id == current_user.id).order_by(Chat.updated_at.desc())
    )
    chats = result.scalars().all()

    return [
        ChatSummary(
            id=chat.id,
            title=chat.title,
            updated_at=chat.updated_at
        )
        for chat in chats
    ]
