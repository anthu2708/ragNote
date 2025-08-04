from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.models import Note, Chat, User
from app.schemas.note import NoteUpdate, NoteResponse
from app.utils.dependencies import get_db, get_current_user

router = APIRouter(prefix="/note", tags=["Note"])

@router.get("/{chat_id}", response_model=NoteResponse)
async def get_note_by_chat_id(
    chat_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Note).where(Note.chat_id == chat_id)
    )
    note = result.scalars().first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    chat = await db.get(Chat, chat_id)
    if not chat or chat.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your chat")

    return note

@router.put("/{id}", response_model=NoteResponse)
async def update_note(
    id: UUID,
    note_update: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = await db.get(Note, id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    chat = await db.get(Chat, note.chat_id)
    if not chat or chat.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your note")

    note.title = note_update.title
    note.content = note_update.content
    await db.commit()
    await db.refresh(note)
    return note
