# ai_chat_backend/Dockerfile
FROM python:3.13

WORKDIR /app

# Install system dependencies needed by gssapi
RUN apt-get update && apt-get install -y --no-install-recommends \
    libkrb5-dev \
 && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


COPY . .
COPY alembic.ini ./alembic.ini
COPY alembic ./alembic


CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
