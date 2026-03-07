from datetime import datetime, timedelta
from http.client import HTTPException
import hashlib

import bcrypt
from jose import JWTError, jwt
from app.config import settings
from typing import Optional

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

def hash_password(password: str) -> str:
    """
    Store password as bcrypt over sha256(password) to avoid bcrypt's 72-byte input limit.
    Prefix keeps backward compatibility with legacy plain bcrypt hashes.
    """
    prehashed = hashlib.sha256(password.encode("utf-8")).digest()
    hashed = bcrypt.hashpw(prehashed, bcrypt.gensalt()).decode("utf-8")
    return f"bcrypt_sha256${hashed}"

def verify_password(password: str, stored_hash: str) -> bool:
    if not stored_hash:
        return False

    try:
        if stored_hash.startswith("bcrypt_sha256$"):
            bcrypt_hash = stored_hash.split("$", 1)[1].encode("utf-8")
            prehashed = hashlib.sha256(password.encode("utf-8")).digest()
            return bcrypt.checkpw(prehashed, bcrypt_hash)

        # Legacy hashes generated before migration to bcrypt_sha256.
        return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
    except Exception:
        return False
