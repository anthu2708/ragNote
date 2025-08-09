from uuid import UUID
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from app.services.rag_ingest_service import db



prompt_template = """Answer the question using ONLY the context below.
If the answer isn't in the context, say you don't have enough information.

Context:
{context}

Question: {query}
"""

prompt = PromptTemplate(input_variables=["context", "query"], template=prompt_template)
llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0)
parser = StrOutputParser()
chain = prompt | llm | parser


def get_rag_answer(query_text: str, chat_id: UUID) -> str:
    results = db.similarity_search(
        query_text,
        k=3,
        filter={"chat_id": {"$eq": str(chat_id)}}
    )

    if not results:
        return "No relevant context found for this chat."

    context = "\n\n".join([doc.page_content for doc in results])
    return chain.invoke({"context": context, "query": query_text})
