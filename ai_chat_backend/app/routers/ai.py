from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.utils.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.chat import Chat
from app.models.message import Message, RoleType
from app.schemas.chat import ChatAskRequest, ChatAskResponse
from app.services.rag_service import get_rag_answer

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/ask", response_model=ChatAskResponse)
async def ask_chat(
    body: ChatAskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat = await db.get(Chat, body.chat_id)
    if not chat or chat.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat not found")

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

    return ChatAskResponse(ans=answer)
