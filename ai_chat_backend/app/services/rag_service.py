from typing import List, Tuple, Any
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


MIN_SCORE = 0.35
TOP_K_PRIMARY = 4
TOP_K_FALLBACK = 3

def _has_scores_api(vs) -> bool:
    return hasattr(vs, "similarity_search_with_score") or hasattr(vs, "similarity_search_with_relevance_scores")

def _filter_by_score(results: List[Tuple[Any, float]]) -> List[Any]:
    good = [doc for (doc, s) in results if (s is None or s >= MIN_SCORE)]
    return good

def _to_docs_only(results) -> List[Any]:
    if not results:
        return []
    if isinstance(results[0], tuple):
        return [r[0] for r in results]
    return results

def get_rag_answer(query_text: str, chat_id: UUID) -> str:
    vs = get_vectorstore()

    # === Try 1: search by chat_id ===
    docs_primary = []
    if _has_scores_api(vs):
        try:
            if hasattr(vs, "similarity_search_with_relevance_scores"):
                results = vs.similarity_search_with_relevance_scores(
                    query_text,
                    k=TOP_K_PRIMARY,
                    filter={"chat_id": {"$eq": str(chat_id)}}
                )
            else:
                results = vs.similarity_search_with_score(
                    query_text,
                    k=TOP_K_PRIMARY,
                    filter={"chat_id": {"$eq": str(chat_id)}}
                )
            docs_primary = _filter_by_score(results)
        except TypeError:
            results = vs.similarity_search(query_text, k=TOP_K_PRIMARY)
            docs_primary = _to_docs_only(results)
    else:
        results = vs.similarity_search(
            query_text,
            k=TOP_K_PRIMARY,
            filter={"chat_id": {"$eq": str(chat_id)}}
        )
        docs_primary = _to_docs_only(results)

    if docs_primary:
        context = "\n\n".join(doc.page_content for doc in docs_primary)
        return chain.invoke({"context": context, "query": query_text})

    # === Fallback: global search (không filter chat), k nhỏ để giảm nhiễu ===
    docs_fallback = []
    if _has_scores_api(vs):
        try:
            if hasattr(vs, "similarity_search_with_relevance_scores"):
                results_fb = vs.similarity_search_with_relevance_scores(
                    query_text, k=TOP_K_FALLBACK
                )
            else:
                results_fb = vs.similarity_search_with_score(
                    query_text, k=TOP_K_FALLBACK
                )
            docs_fallback = _filter_by_score(results_fb)
        except TypeError:
            results_fb = vs.similarity_search(query_text, k=TOP_K_FALLBACK)
            docs_fallback = _to_docs_only(results_fb)
    else:
        results_fb = vs.similarity_search(query_text, k=TOP_K_FALLBACK)
        docs_fallback = _to_docs_only(results_fb)

    if docs_fallback:
        context = "\n\n".join(doc.page_content for doc in docs_fallback)
        # Thêm nhãn để model biết đây là context không ràng buộc theo chat
        prompt_context = f"[Global context — not chat-scoped]\n{context}"
        return chain.invoke({"context": prompt_context, "query": query_text})

    # === No context at all -> guardrail prompt ===
    # Dặn model: Không có tài liệu đính kèm; trả lời chung + đề xuất user bổ sung file
    no_ctx_instructions = (
        "No retrieved context. Answer from general knowledge. "
        "If the answer depends on user-specific files, state that no project files "
        "were found for this chat and suggest uploading or attaching relevant PDFs."
    )
    return chain.invoke({"context": no_ctx_instructions, "query": query_text})
