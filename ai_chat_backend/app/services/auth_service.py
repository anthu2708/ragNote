# app/services/auth_service.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from uuid import UUID
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin
from app.utils.security import create_access_token, verify_token
from passlib.context import CryptContext
import logging

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_user_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def register(self, data: UserCreate):
        if await self._get_user_by_email(data.email):
            raise HTTPException(status_code=400, detail="Email already registered")

        user = User(
            email=data.email,
            name=data.name,
            password=pwd_context.hash(data.password),
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def login(self, data: UserLogin):
        user = await self._get_user_by_email(data.email)
        if not user or not pwd_context.verify(data.password, user.password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        token = create_access_token({"sub": str(user.id)})
        return user, token

    async def refresh_token(self, old_token: str):

        payload = verify_token(old_token)

        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Invalid token")

        try:
            user_id = UUID(user_id_str)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Invalid token format")

        user = await self.db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="User not found")

        new_token = create_access_token({"sub": str(user.id)})

        return user, new_token