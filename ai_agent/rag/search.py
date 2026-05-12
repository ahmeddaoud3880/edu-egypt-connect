"""
RAG retrieval — hybrid (vector + FTS) with optional BGE reranker; wraps Supabase RPCs.
"""
from __future__ import annotations

import logging
import os
from typing import Any

from db.client import supabase
from rag.client import embed_text, EmbeddingError
from rag.reranker import rerank_chunks

log = logging.getLogger("egypt_edu.rag.search")

_rrf_k = float(os.getenv("RAG_RRF_K", "60"))
_vector_pool = max(10, int(os.getenv("RAG_HYBRID_VECTOR_POOL", "48")))
_fts_pool = max(10, int(os.getenv("RAG_HYBRID_FTS_POOL", "48")))
_hybrid_default = (os.getenv("RAG_HYBRID") or "1").strip().lower() not in ("0", "false", "no", "off")
_min_quality_default = float(os.getenv("RAG_MIN_QUALITY", "0.32"))


def _rpc_missing_book_param(exc: Exception) -> bool:
    s = str(exc).lower()
    return (
        "pgrst202" in s
        or "filter_book_id" in s
        or "could not find the function" in s
        or "no matches were found in the schema cache" in s
    )


def _rpc_missing_fts(exc: Exception) -> bool:
    s = str(exc).lower()
    return "match_textbook_chunks_fts" in s or "pgrst202" in s or "could not find the function" in s


def _rrf_fuse(list_ids: list[list[str]], *, k: float) -> dict[str, float]:
    scores: dict[str, float] = {}
    for lst in list_ids:
        for r, cid in enumerate(lst):
            if not cid:
                continue
            scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + r + 1)
    return scores


def _row_key(r: dict[str, Any]) -> str:
    return str(r.get("chunk_id") or "")


def _vector_search(
    embedding: list[float],
    *,
    match_n: int,
    grade_number: int | None,
    subject_id: str | None,
    stage_id: str | None,
    book_id: str | None,
    min_quality: float | None,
) -> list[dict[str, Any]]:
    params: dict[str, Any] = {
        "query_embedding": embedding,
        "match_count": match_n,
        "filter_grade": grade_number,
        "filter_subject": subject_id,
        "filter_stage": stage_id,
        "filter_min_quality": min_quality,
    }
    if book_id:
        params["filter_book_id"] = book_id
    try:
        res = supabase.rpc("match_textbook_chunks", params).execute()
        return list(res.data or [])
    except Exception as e:
        if book_id and _rpc_missing_book_param(e):
            wide_n = min(80, max(match_n * 12, 36))
            legacy = {
                "query_embedding": embedding,
                "match_count": wide_n,
                "filter_grade": grade_number,
                "filter_subject": subject_id,
                "filter_stage": stage_id,
                "filter_min_quality": min_quality,
            }
            try:
                log.info("match_textbook_chunks legacy (no filter_book_id); Python filter.")
                res = supabase.rpc("match_textbook_chunks", legacy).execute()
                rows = [r for r in (res.data or []) if str(r.get("book_id")) == str(book_id)]
                return rows[:match_n]
            except Exception as e2:
                log.warning("vector legacy retry failed: %s", e2)
                return []
        log.warning("match_textbook_chunks failed: %s", e)
        return []


def _fts_search(
    query: str,
    *,
    match_n: int,
    grade_number: int | None,
    subject_id: str | None,
    stage_id: str | None,
    book_id: str | None,
    min_quality: float | None,
) -> list[dict[str, Any]]:
    params: dict[str, Any] = {
        "query_text": query,
        "match_count": match_n,
        "filter_grade": grade_number,
        "filter_subject": subject_id,
        "filter_stage": stage_id,
        "filter_min_quality": min_quality,
    }
    if book_id:
        params["filter_book_id"] = book_id
    try:
        res = supabase.rpc("match_textbook_chunks_fts", params).execute()
        out = []
        for r in res.data or []:
            row = dict(r)
            row["similarity"] = float(row.get("rank") or 0.0)
            row.pop("rank", None)
            out.append(row)
        return out
    except Exception as e:
        if _rpc_missing_fts(e):
            log.info("match_textbook_chunks_fts not deployed — FTS branch disabled.")
        else:
            log.warning("match_textbook_chunks_fts failed: %s", e)
        return []


def search_textbook_chunks(
    query: str,
    *,
    grade_number: int | None = None,
    subject_id: str | None = None,
    stage_id: str | None = None,
    book_id: str | None = None,
    top_k: int = 5,
    hybrid: bool | None = None,
    min_quality: float | None = None,
    rerank: bool = True,
    fast_path: bool = False,
) -> list[dict[str, Any]]:
    """
    Retrieve textbook chunks. When hybrid=True (default from RAG_HYBRID), runs pgvector +
    lexical FTS fused via RRF; optional cross-encoder rerank (RAG_RERANK=1).

    ``fast_path=True`` skips FTS + fusion (single vector RPC), smaller PG fetch — best for latency (e.g. quiz).
    Controlled by callers or env defaults (see RAG_QUIZ_* in main rag_generate_quiz).
    """
    q = (query or "").strip()
    if not q:
        return []

    use_hybrid = _hybrid_default if hybrid is None else hybrid
    mq = min_quality if min_quality is not None else _min_quality_default

    try:
        embedding = embed_text(q, task_type="RETRIEVAL_QUERY")
    except EmbeddingError as e:
        log.warning("search aborted: %s", e)
        return []
    if not any(embedding):
        log.warning("empty embedding vector")
        return []

    match_n = max(1, min(int(top_k or 5), 40))

    _quiz_pool = max(16, min(64, int(os.getenv("RAG_QUIZ_VECTOR_POOL", "28"))))

    # Fast path: one vector RPC, no lexical branch, caller usually sets rerank=False
    if fast_path:
        vec_n = max(match_n + 8, min(_quiz_pool, 48))
        vec_rows_fast = _vector_search(
            embedding,
            match_n=vec_n,
            grade_number=grade_number,
            subject_id=subject_id,
            stage_id=stage_id,
            book_id=book_id,
            min_quality=mq,
        )
        pool = vec_rows_fast[: max(vec_n, match_n * 2)]
        return rerank_chunks(q, pool, top_k=match_n) if rerank else pool[:match_n]

    vec_rows = _vector_search(
        embedding,
        match_n=_vector_pool if use_hybrid else max(match_n * 6, match_n),
        grade_number=grade_number,
        subject_id=subject_id,
        stage_id=stage_id,
        book_id=book_id,
        min_quality=mq,
    )

    if not use_hybrid:
        pool = vec_rows[: max(match_n * 6, match_n)]
        return rerank_chunks(q, pool, top_k=match_n) if rerank else pool[:match_n]

    fts_rows = _fts_search(
        q,
        match_n=_fts_pool,
        grade_number=grade_number,
        subject_id=subject_id,
        stage_id=stage_id,
        book_id=book_id,
        min_quality=mq,
    )

    if not fts_rows:
        pool = vec_rows[: max(_vector_pool, match_n * 8)]
        for row in pool:
            row.setdefault("rrf_score", 0.0)
    else:
        list_vec = [_row_key(r) for r in vec_rows if _row_key(r)]
        list_fts = [_row_key(r) for r in fts_rows if _row_key(r)]
        fused = _rrf_fuse([list_vec, list_fts], k=_rrf_k)
        merged: dict[str, dict[str, Any]] = {}
        for r in vec_rows + fts_rows:
            k = _row_key(r)
            if k and k not in merged:
                merged[k] = dict(r)
        pool = sorted(merged.values(), key=lambda row: fused.get(_row_key(row), 0.0), reverse=True)
        for row in pool:
            row["rrf_score"] = float(fused.get(_row_key(row), 0.0))

    return rerank_chunks(q, pool, top_k=match_n) if rerank else pool[:match_n]


def list_books(
    *,
    grade_number: int | None = None,
    subject_id: str | None = None,
    stage_id: str | None = None,
) -> list[dict]:
    try:
        q = supabase.table("rag_books").select(
            "id, title, title_ar, stage_id, grade_number, subject_id, subject_name, total_chunks, total_pages, source_file"
        )
        if grade_number is not None:
            q = q.eq("grade_number", grade_number)
        if subject_id:
            q = q.eq("subject_id", subject_id)
        if stage_id:
            q = q.eq("stage_id", stage_id)
        res = q.order("grade_number").execute()
        return res.data or []
    except Exception as e:
        log.warning("list_books failed: %s", e)
        return []
