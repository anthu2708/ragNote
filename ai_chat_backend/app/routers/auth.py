from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.user import UserCreate, UserLogin, UserOut
from app.services.auth_service import AuthService
from app.utils.dependencies import get_db
from app.schemas.user import LoginResponse
from uuid import uuid4
from datetime import datetime
from app.schemas.user import UserOut, LoginResponse
import logging
from fastapi import Cookie, HTTPException
from fastapi.responses import JSONResponse
from app.models import User
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=UserOut)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    return await AuthService(db).register(data)

@router.post("/login", response_model=LoginResponse)
async def login(data: UserLogin,
                response: Response,
                db: AsyncSession = Depends(get_db)):

    user, token = await AuthService(db).login(data)

    user_out = UserOut.from_orm(user)

    response.set_cookie(
        "access_token",
        token,
        httponly=True,
        samesite="Lax",  # hoặc "None" nếu dùng HTTPS
        secure=False,  # dùng True nếu deploy qua HTTPS
        max_age=60 * 60 * 24,
    )

    return LoginResponse(user=user_out, token=token)

from fastapi.responses import JSONResponse

@router.post("/logout")
async def logout(response: Response):
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("access_token")
    return response


@router.post("/refresh-token", response_model=LoginResponse)
async def refresh_token(
        response: Response,
        access_token: str | None = Cookie(None),
        db: AsyncSession = Depends(get_db)
):
    if access_token is None:
        raise HTTPException(status_code=401, detail="No token provided")

    user, new_token = await AuthService(db).refresh_token(access_token)
    user_out = UserOut.from_orm(user)

    response.set_cookie(
        "access_token",
        new_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=60 * 60 * 24 * 7,
    )
    return LoginResponse(user=user_out, token=new_token)

@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return UserOut.from_orm(user)


