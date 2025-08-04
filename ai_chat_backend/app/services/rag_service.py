from langchain_openai import OpenAIEmbeddings, OpenAI
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate
from app.config import settings

embeddings = OpenAIEmbeddings()
llm = OpenAI(temperature=0)

db = Chroma(
    persist_directory=settings.CHROMA_PATH,
    embedding_function=embeddings
)

prompt_template = """Answer the question based on the following context:
{context}

Question: {query}
"""

prompt = PromptTemplate(input_variables=["context", "query"], template=prompt_template)
chain = prompt | llm


def get_rag_answer(query_text: str, chat_id: int) -> str:
    results = db.similarity_search(query_text, k=3, filter={"chat_id": str(chat_id)})

    if not results:
        return "No relevant context found for this chat."

    context = "\n\n".join([doc.page_content for doc in results])
    return chain.invoke({"context": context, "query": query_text})
