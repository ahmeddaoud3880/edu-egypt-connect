"""Offline / API RAG evaluation: retrieval hit rates vs fixture question lists."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from rag.search import search_textbook_chunks

log = logging.getLogger("egypt_edu.rag.eval")

_EVAL_DIR = Path(__file__).resolve().parent
FIXTURE_DIR = _EVAL_DIR / "fixtures"


def load_fixture(path: str | Path) -> dict[str, Any]:
    p = Path(path)
    if not p.is_file():
        raise FileNotFoundError(str(p))
    data = json.loads(p.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("fixture root must be a JSON object")
    return data


def normalize_questions(items: list[Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for raw in items:
        if isinstance(raw, str):
            out.append({"query": raw.strip()})
            continue
        if isinstance(raw, dict) and raw.get("query"):
            out.append(raw)
    return out


def _matches_keywords(text: str, *, any_of: list[str] | None, all_of: list[str] | None) -> bool:
    if any_of:
        return any(k in text for k in any_of if isinstance(k, str) and k.strip())
    if all_of:
        return all(k in text for k in all_of if isinstance(k, str) and k.strip())
    return True


def evaluate_book_questions(
    *,
    book_id: str,
    grade_number: int | None,
    subject_id: str | None,
    stage_id: str | None,
    questions: list[dict[str, Any]],
    top_k: int = 5,
    hybrid: bool | None = None,
    rerank: bool = True,
    min_similarity: float | None = None,
) -> dict[str, Any]:
    """Return aggregate metrics + per-question traces."""
    thr = float(min_similarity) if min_similarity is not None else None
    rows_out: list[dict[str, Any]] = []
    non_empty = 0
    kw_hits = 0
    kw_total = 0

    for i, q in enumerate(questions):
        query = (q.get("query") or "").strip()
        if not query:
            continue
        any_kw = q.get("must_contain_any") or q.get("keywords_any")
        all_kw = q.get("must_contain_all") or q.get("keywords_all")
        retrieved = search_textbook_chunks(
            query,
            grade_number=grade_number,
            subject_id=subject_id,
            stage_id=stage_id,
            book_id=book_id,
            top_k=top_k,
            hybrid=hybrid,
            rerank=rerank,
        )
        joined = "\n".join((r.get("content") or "") for r in retrieved)
        ok_nonempty = len(retrieved) > 0
        sim_ok = True
        if thr is not None and retrieved:
            sim_ok = max(float(r.get("similarity") or 0) for r in retrieved) >= thr
        elif thr is not None:
            sim_ok = False

        kw_ok = True
        if any_kw or all_kw:
            kw_total += 1
            kw_ok = _matches_keywords(joined, any_of=any_kw, all_of=all_kw)
            if kw_ok:
                kw_hits += 1

        if ok_nonempty and (thr is None or sim_ok):
            non_empty += 1

        rows_out.append({
            "i": i + 1,
            "query": query[:200],
            "chunks": len(retrieved),
            "hit_nonempty": ok_nonempty,
            "hit_similarity": sim_ok,
            "hit_keywords": kw_ok if (any_kw or all_kw) else None,
            "top_page": retrieved[0].get("page_number") if retrieved else None,
        })

    n = max(len(rows_out), 1)
    return {
        "book_id": book_id,
        "questions_evaluated": len(rows_out),
        "non_empty_rate": non_empty / n,
        "keyword_hit_rate": (kw_hits / kw_total) if kw_total else None,
        "detail": rows_out[:200],
    }


def fixture_paths() -> list[str]:
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    return sorted(str(p.relative_to(FIXTURE_DIR)).replace("\\", "/") for p in FIXTURE_DIR.glob("*.json"))
