from __future__ import annotations

import logging
from langchain_core.tools import tool

from rag.search import search_textbook_chunks, list_books

log = logging.getLogger("egypt_edu.rag.tools")


def _format_passages(passages: list[dict]) -> str:
    if not passages:
        return ""
    lines: list[str] = []
    for i, p in enumerate(passages, 1):
        title = (p.get("book_title") or "").strip() or "(book)"
        head_parts = [
            f"[{i}] {title}",
        ]
        if p.get("page_number") is not None:
            head_parts.append(f"صفحة {p.get('page_number')}")
        if p.get("lesson_title"):
            head_parts.append(str(p["lesson_title"])[:80])
        if p.get("activity_title"):
            head_parts.append(str(p["activity_title"])[:80])
        sim = p.get("similarity")
        rs = p.get("rerank_score")
        rr = p.get("rrf_score")
        tail = []
        if sim is not None:
            tail.append(f"vec={float(sim):.2f}")
        if rs is not None:
            tail.append(f"rerank={float(rs):.2f}")
        if rr is not None:
            tail.append(f"rrf={float(rr):.3f}")
        suf = ("  (" + ", ".join(tail) + ")") if tail else ""
        head = " — ".join(head_parts) + suf
        body = (p.get("content") or "").strip()
        lines.append(f"{head}\n{body}")
    return "\n\n".join(lines)


@tool
def rag_search_textbook(
    query: str,
    grade_number: int = 0,
    subject_id: str = "",
    book_id: str = "",
    top_k: int = 5,
) -> str:
    """
    Semantic search across ingested Arabic textbooks.
    Returns the top-K most relevant passages (with book title + page number).

    Args:
        query: the user's question or topic, in Arabic or English.
        grade_number: e.g. 3 for Grade 3 (0 = no filter).
        subject_id: subject UUID to restrict to (empty = no filter).
        book_id: rag_books.id UUID to search inside ONE book only (empty = all books matching other filters).
        top_k: number of passages to return (1..15, default 5).

    Use this BEFORE answering any factual question that relates to the curriculum,
    so your answer is grounded in the official textbook content.
    """
    grade = int(grade_number) if grade_number else None
    subj = subject_id or None
    bid = (book_id or "").strip() or None
    res = search_textbook_chunks(
        query, grade_number=grade, subject_id=subj, book_id=bid, top_k=top_k
    )
    if not res:
        return "(no matching textbook passages — either RAG not configured or no books ingested for this filter)"
    return _format_passages(res)


@tool
def rag_list_books(grade_number: int = 0, subject_id: str = "") -> list:
    """
    List ingested textbooks, optionally filtered by grade / subject.
    Use this when the user asks 'what books are available?' or to confirm
    a topic exists before a deeper search.
    """
    grade = int(grade_number) if grade_number else None
    return list_books(grade_number=grade, subject_id=subject_id or None)


@tool
def rag_generate_questions_context(
    topic: str,
    grade_number: int = 0,
    subject_id: str = "",
    top_k: int = 6,
) -> str:
    """
    Retrieve textbook passages on a topic, formatted as context for the LLM
    to USE when generating quiz questions for a teacher.

    The agent should:
      1. Call this with the topic the teacher wants questions about.
      2. Use the returned passages as the SOURCE OF TRUTH and write
         the requested number of questions (MCQ / true-false / open) in Arabic,
         with the correct answer drawn from the passages.
    """
    grade = int(grade_number) if grade_number else None
    res = search_textbook_chunks(
        topic,
        grade_number=grade,
        subject_id=subject_id or None,
        book_id=None,
        top_k=top_k,
    )
    if not res:
        return "(no matching textbook passages — ask the teacher to choose another topic or ingest the book first)"
    return (
        "PASSAGES FROM THE OFFICIAL TEXTBOOK (use ONLY these as ground truth when writing questions):\n\n"
        + _format_passages(res)
    )
