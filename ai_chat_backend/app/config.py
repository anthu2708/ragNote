from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()  # load .env vào environment variables

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    OPENAI_API_KEY: str
    S3_ENDPOINT: str
    S3_ACCESS_KEY: str
    S3_SECRET_KEY: str
    FRONTEND_ORIGIN: str = "http://localhost"
    CHROMA_PATH: str = "chroma_db"
    UPLOAD_DIR: str = "uploaded_files"

    class Config:
        env_file = ".env"

settings = Settings()

