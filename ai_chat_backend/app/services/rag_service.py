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
REFUSAL_PREFIX = "I can only help with questions about your uploaded documents."
NO_CONTEXT_PREFIX = "I couldn't find any relevant content in your uploaded documents."

MIN_SCORE = 0.35
TOP_K_PRIMARY = 4
TOP_K_FALLBACK = 3


SYSTEM_PROMPT = (
    "You are a document assistant. Your sole purpose is to help users with questions "
    "about their uploaded documents — any type: notes, resumes, reports, textbooks, etc.\n\n"
    "ALLOWED: explain, summarize, review, analyze, or answer factual questions about content in the provided documents.\n"
    "FORBIDDEN — even if the documents contain related content:\n"
    "- Writing poems, songs, stories, creative fiction, or any creative content\n"
    "- Writing code or scripts from scratch\n"
    "- General knowledge questions unrelated to the documents\n"
    "- Any task that asks you to CREATE new content rather than EXPLAIN existing content\n\n"
    "If a request asks you to create/write/generate anything, respond ONLY with: "
    "'I can only help with questions about your uploaded documents. "
    "Please ask me something about your files.'"
)

def _call_llm(context: str, query: str, history: list | None = None) -> Tuple[str, int]:
    prompt = PROMPT_TEMPLATE.format(context=context, query=query)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": prompt})
    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
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


def get_rag_answer(query_text: str, chat_id: UUID, history: list | None = None) -> Tuple[str, int]:
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
        return _call_llm(context, query_text, history)

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
        return _call_llm(context, query_text, history)

    # === No context ===
    return (
        "I couldn't find any relevant content in your uploaded documents. "
        "Please upload or attach study materials, then ask your question.",
        0,
    )
