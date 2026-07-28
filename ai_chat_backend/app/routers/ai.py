from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.chat import Chat
from app.models.message import Message, RoleType
from app.schemas.chat import ChatAskRequest
from app.schemas.message import MessageOut
from app.services.rag_service import get_rag_answer
from app.config import settings

router = APIRouter(prefix="/ai", tags=["AI"])


def _check_and_increment_rate_limit(user: User) -> None:
    today = date.today()
    if user.last_ask_date != today:
        user.daily_ask_count = 0
        user.last_ask_date = today
    if user.daily_ask_count >= settings.DAILY_ASK_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Daily limit of {settings.DAILY_ASK_LIMIT} questions reached. Try again tomorrow."
        )
    user.daily_ask_count += 1


@router.post("/ask", response_model=MessageOut)
async def ask_chat(
    body: ChatAskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat = await db.get(Chat, body.chat_id)
    if not chat or chat.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat not found")

    _check_and_increment_rate_limit(current_user)

    user_msg = Message(
        role=RoleType.USER,
        content=body.question,
        chat_id=body.chat_id
    )
    db.add(user_msg)

    answer = get_rag_answer(body.question, chat_id=str(body.chat_id))

    assistant_msg = Message(
        role=RoleType.ASSISTANT,
        content=answer,
        chat_id=body.chat_id
    )
    db.add(assistant_msg)

    await db.commit()
    await db.refresh(assistant_msg)

    return MessageOut(
        content=assistant_msg.content,
        id=assistant_msg.id,
        created_at=assistant_msg.created_at
    )
