from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()
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
    PINECONE_API_KEY: str
    PINECONE_ENVIRONMENT: str
    PINECONE_INDEX_NAME: str
    S3_BUCKET: str
    MAX_FILE_SIZE_MB: int = 100
    SSE_MODE: str
    AWS_REGION: str
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    S3_ENDPOINT: str


    class Config:
        env_file = ".env",
        extra = "ignore"

settings = Settings()

