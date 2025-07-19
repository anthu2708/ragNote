
from fastapi import FastAPI

app = FastAPI(title="AI Chat RAG API")

@app.get("/")
async def root():
    return {"status": "OK"}
