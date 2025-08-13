# app/services/rag_store.py
from typing import Optional
from pinecone import Pinecone
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from app.config import settings

_pc: Optional[Pinecone] = None
_embeddings: Optional[OpenAIEmbeddings] = None
_vectorstore: Optional[PineconeVectorStore] = None

def init_rag() -> None:
    global _pc, _embeddings, _vectorstore
    if _pc is not None:
        return

    _pc = Pinecone(api_key=settings.OPENAI_API_KEY if False else settings.PINECONE_API_KEY)

    if not _pc.has_index(settings.PINECONE_INDEX_NAME):
        _pc.create_index_for_model(
            name=settings.PINECONE_INDEX_NAME,
            cloud="aws",
            region="us-east-1",
            embed={
                "model": "text-embedding-3-small",
                "field_map": {"text": "chunk_text"}
            }
        )

    _embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    _vectorstore = PineconeVectorStore.from_existing_index(
        index_name=settings.PINECONE_INDEX_NAME,
        embedding=_embeddings,
        text_key="text",
    )

def get_vectorstore() -> PineconeVectorStore:
    if _vectorstore is None:
        init_rag()
    return _vectorstore
