from typing import List, Tuple, Any
from uuid import UUID
from openai import OpenAI
from app.services.rag_store import get_vectorstore

PROMPT_TEMPLATE = """Use the information in the context below as your primary source when answering.
You may use outside knowledge only to complement the context, not to override or contradict it.

If the context clearly contains enough information to answer, ignore outside knowledge.
If the answer is not in the context and you need to rely on outside knowledge, make it clear which parts come from the context and which parts come from general knowledge.

Context:
{context}

Question: {query}
"""

client = OpenAI()
MODEL = "gpt-4.1-mini"

MIN_SCORE = 0.35
TOP_K_PRIMARY = 4
TOP_K_FALLBACK = 3


SYSTEM_PROMPT = (
    "You are a study assistant. Your sole purpose is to help users understand "
    "their uploaded notes and documents. Only answer questions related to the "
    "provided study materials. If a question is unrelated to the context or "
    "academic study, politely decline and suggest the user ask about their documents."
)

def _call_llm(context: str, query: str) -> Tuple[str, int]:
    prompt = PROMPT_TEMPLATE.format(context=context, query=query)
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0,
    )
    return response.choices[0].message.content, response.usage.total_tokens


def _has_scores_api(vs) -> bool:
    return hasattr(vs, "similarity_search_with_score") or hasattr(vs, "similarity_search_with_relevance_scores")

def _filter_by_score(results: List[Tuple[Any, float]]) -> List[Any]:
    return [doc for (doc, s) in results if (s is None or s >= MIN_SCORE)]

def _to_docs_only(results) -> List[Any]:
    if not results:
        return []
    if isinstance(results[0], tuple):
        return [r[0] for r in results]
    return results


def get_rag_answer(query_text: str, chat_id: UUID) -> Tuple[str, int]:
    vs = get_vectorstore()

    # === Try 1: search by chat_id ===
    docs_primary = []
    if _has_scores_api(vs):
        try:
            if hasattr(vs, "similarity_search_with_relevance_scores"):
                results = vs.similarity_search_with_relevance_scores(
                    query_text, k=TOP_K_PRIMARY,
                    filter={"chat_id": {"$eq": str(chat_id)}}
                )
            else:
                results = vs.similarity_search_with_score(
                    query_text, k=TOP_K_PRIMARY,
                    filter={"chat_id": {"$eq": str(chat_id)}}
                )
            docs_primary = _filter_by_score(results)
        except TypeError:
            docs_primary = _to_docs_only(vs.similarity_search(query_text, k=TOP_K_PRIMARY))
    else:
        docs_primary = _to_docs_only(vs.similarity_search(
            query_text, k=TOP_K_PRIMARY,
            filter={"chat_id": {"$eq": str(chat_id)}}
        ))

    if docs_primary:
        context = "\n\n".join(doc.page_content for doc in docs_primary)
        return _call_llm(context, query_text)

    # === Fallback: global search ===
    docs_fallback = []
    if _has_scores_api(vs):
        try:
            if hasattr(vs, "similarity_search_with_relevance_scores"):
                results_fb = vs.similarity_search_with_relevance_scores(query_text, k=TOP_K_FALLBACK)
            else:
                results_fb = vs.similarity_search_with_score(query_text, k=TOP_K_FALLBACK)
            docs_fallback = _filter_by_score(results_fb)
        except TypeError:
            docs_fallback = _to_docs_only(vs.similarity_search(query_text, k=TOP_K_FALLBACK))
    else:
        docs_fallback = _to_docs_only(vs.similarity_search(query_text, k=TOP_K_FALLBACK))

    if docs_fallback:
        context = "[Global context — not chat-scoped]\n" + "\n\n".join(doc.page_content for doc in docs_fallback)
        return _call_llm(context, query_text)

    # === No context ===
    no_ctx = (
        "No retrieved context. Answer from general knowledge. "
        "If the answer depends on user-specific files, state that no project files "
        "were found for this chat and suggest uploading or attaching relevant PDFs."
    )
    return _call_llm(no_ctx, query_text)
