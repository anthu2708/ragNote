from uuid import UUID
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from app.services.rag_store import get_vectorstore

prompt_template = """Use the information in the context below as your primary source when answering.
You may use outside knowledge only to complement the context, not to override or contradict it.

If the context clearly contains enough information to answer, ignore outside knowledge.
If the answer is not in the context and you need to rely on outside knowledge, make it clear which parts come from the context and which parts come from general knowledge.

Context:
{context}

Question: {query}
"""


prompt = PromptTemplate(input_variables=["context", "query"], template=prompt_template)
llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0)
parser = StrOutputParser()
chain = prompt | llm | parser


def get_rag_answer(query_text: str, chat_id: UUID) -> str:
    vs = get_vectorstore()
    results = vs.similarity_search(
        query_text,
        k=3,
        filter={"chat_id": {"$eq": str(chat_id)}}
    )

    if not results:
        return "No relevant context found for this chat."

    context = "\n\n".join([doc.page_content for doc in results])
    return chain.invoke({"context": context, "query": query_text})
