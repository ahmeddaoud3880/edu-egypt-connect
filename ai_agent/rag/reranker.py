"""Lazy-loaded cross-encoder reranker (default: BGE reranker v2 M3)."""
from __future__ import annotations

import logging
import os

log = logging.getLogger("egypt_edu.rag.reranker")

_ce_model = None  # CrossEncoder instance or False when permanently skipped
MODEL_NAME = os.getenv("RAG_RERANK_MODEL", "BAAI/bge-reranker-v2-m3")


def rerank_chunks(query: str, passages: list[dict], *, top_k: int) -> list[dict]:
    """Re-order passages by cross-encoder scores."""
    global _ce_model

    if not passages or top_k <= 0:
        return []

    disable = (os.getenv("RAG_RERANK") or "1").strip().lower() in ("0", "false", "no", "off")
    if disable:
        return passages[:top_k]

    if _ce_model is False:
        return passages[:top_k]

    pairs: list[tuple[str, str]] = []
    idx_map: list[int] = []
    q = query[:2048]
    for i, p in enumerate(passages):
        c = (p.get("content") or "").strip()
        if not c:
            continue
        pairs.append((q, c[:8000]))
        idx_map.append(i)

    if not pairs:
        return passages[:top_k]

    try:
        from sentence_transformers import CrossEncoder  # type: ignore

        if _ce_model is None:
            device = os.getenv("RAG_RERANK_DEVICE", "").strip()
            kw = {"device": device} if device else {}
            log.info("Loading reranker %s …", MODEL_NAME)
            _ce_model = CrossEncoder(MODEL_NAME, **kw)

        scores = _ce_model.predict(
            pairs,
            batch_size=int(os.getenv("RAG_RERANK_BATCH", "16")),
            show_progress_bar=False,
        )
        seq = scores.tolist() if hasattr(scores, "tolist") else list(scores)

        ranked_idx = sorted(range(len(seq)), key=lambda j: float(seq[j]), reverse=True)
        out: list[dict] = []
        seen_chunk: set[str] = set()
        for j in ranked_idx:
            orig_i = idx_map[j]
            row = dict(passages[orig_i])
            row["rerank_score"] = float(seq[j])
            cid = str(row.get("chunk_id") or "")
            if cid and cid in seen_chunk:
                continue
            if cid:
                seen_chunk.add(cid)
            out.append(row)
            if len(out) >= top_k:
                break
        return out
    except Exception as e:
        log.warning("RAG reranker unavailable (%s); returning vector/FTS order.", e)
        _ce_model = False
        return passages[:top_k]
