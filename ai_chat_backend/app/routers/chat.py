from uuid import UUID

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
from app.services import chat_service
from app.schemas.chat import ChatResponse
from app.utils.dependencies import get_db, get_current_user
from app.models import Chat, User
from app.schemas.chat import ChatListItem

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/", response_model=ChatResponse, status_code=201)
async def create_chat(
        title: str = Form(...),
        files: list[UploadFile] = File(...),
        db: AsyncSession = Depends(get_db),
        current_user=Depends(get_current_user),
):
    if not files:
        raise HTTPException(400, "At least one file is required to start a chat.")

    chat = await chat_service.create_chat_with_files(
        db=db,
        user_id=current_user.id,
        title=title,
        files=files,
    )
    return ChatResponse.model_validate(chat)


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

@router.get("/", response_model=list[ChatListItem])
async def get_all_chats(
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Chat).where(Chat.user_id == current_user.id).order_by(Chat.updated_at.desc())
    )
    chats = result.scalars().all()

    return [
        ChatListItem(
            id=chat.id,
            title=chat.title,
            created=chat.updated_at
        )
        for chat in chats
    ]
