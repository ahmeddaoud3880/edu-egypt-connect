"""
Embedding client for RAG.

Backends (one per process — selected via env RAG_EMBEDDING_BACKEND):
  • "bge_m3"  → BAAI/bge-m3 via sentence-transformers (LOCAL, free, unlimited).
                Default, RECOMMENDED. 1024 dims native, GPU-accelerated when CUDA is available.
  • "gemini"  → Google Gemini text embedding (cloud, free tier, has quotas).
                Output dimension is constrained to 1024 to match pgvector(1024).
                Models: gemini-embedding-2 (default) or gemini-embedding-001 via GEMINI_EMBEDDING_MODEL.
  • "openai"  → OpenAI text-embedding-3-small (cloud, paid, very cheap), dimensioned to 1024.

Behaviour:
  - ONE backend per ingestion run → all chunks live in the same vector space.
  - On HTTP 429 / rate-limit (cloud backends) → exponential backoff retry on the SAME model.
  - All embeddings normalised to L2 = 1 so cosine ≡ dot-product.

Embedding dimension is fixed at 1024 (matches the latest pgvector migration).
"""
from __future__ import annotations

import math
import os
import logging
import re
import time
from typing import Iterable

# Quieter TF (some stacks pull keras/tensorflow before first embed)
for _k, _v in (("TF_CPP_MIN_LOG_LEVEL", "2"), ("TF_ENABLE_ONEDNN_OPTS", "0")):
    os.environ.setdefault(_k, _v)

log = logging.getLogger("egypt_edu.rag.client")

if (os.getenv("RAG_SILENT_TF") or "1").strip().lower() not in ("0", "false", "no", "off"):
    for _lg in ("tensorflow", "tf_keras", "keras", "absl"):
        logging.getLogger(_lg).setLevel(logging.ERROR)

EMBED_DIM = 1024

DEFAULT_BACKEND = (os.getenv("RAG_EMBEDDING_BACKEND") or "bge_m3").lower()
DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-2")
ALLOWED_GEMINI_MODELS = {"gemini-embedding-2", "gemini-embedding-001"}
DEFAULT_BGE_MODEL = os.getenv("BGE_M3_MODEL", "BAAI/bge-m3")

MAX_RETRIES = int(os.getenv("RAG_EMBED_MAX_RETRIES", "5"))
BACKOFF_BASE_S = float(os.getenv("RAG_EMBED_BACKOFF_BASE_S", "20"))
BACKOFF_CAP_S = float(os.getenv("RAG_EMBED_BACKOFF_CAP_S", "180"))


_genai_client = None
_openai_client = None
_st_model = None
_st_device = "cpu"
_active_backend: str | None = None


class EmbeddingError(RuntimeError):
    """Raised on non-recoverable embedding failures."""


# ─── Init helpers ────────────────────────────────────────────────────────────

def _try_init_bge_m3():
    """Lazy-load BGE-M3 via sentence-transformers, GPU-accelerated when available."""
    global _st_model, _st_device
    if _st_model is not None:
        return _st_model
    try:
        import torch  # type: ignore
        from sentence_transformers import SentenceTransformer  # type: ignore
    except Exception as e:
        log.warning("sentence-transformers / torch not installed: %s", e)
        return None

    if torch.cuda.is_available():
        _st_device = "cuda"
        gpu_name = torch.cuda.get_device_name(0)
    else:
        _st_device = "cpu"
        gpu_name = "(none — CPU mode)"

    log.info("Loading %s on %s (%s) — first run downloads ~2.3GB, cached afterwards",
             DEFAULT_BGE_MODEL, _st_device.upper(), gpu_name)
    try:
        _st_model = SentenceTransformer(DEFAULT_BGE_MODEL, device=_st_device, trust_remote_code=False)
        # Verify dim (bge-m3 returns 1024 by default)
        try:
            test = _st_model.encode("اختبار", normalize_embeddings=True)
            log.info("%s ready — output dim=%s on %s", DEFAULT_BGE_MODEL, len(test), _st_device.upper())
        except Exception as e:
            log.warning("BGE-M3 self-test failed: %s", e)
        return _st_model
    except Exception as e:
        log.warning("BGE-M3 load failed: %s", e)
        return None


def _try_init_gemini():
    global _genai_client
    if _genai_client is not None:
        return _genai_client
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None
    try:
        from google import genai  # type: ignore
        _genai_client = genai.Client(api_key=api_key)
        return _genai_client
    except Exception as e:
        log.warning("google-genai init failed: %s", e)
        return None


def _try_init_openai():
    global _openai_client
    if _openai_client is not None:
        return _openai_client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key.startswith("sk-..."):
        return None
    try:
        from openai import OpenAI  # type: ignore
        _openai_client = OpenAI(api_key=api_key)
        return _openai_client
    except Exception as e:
        log.warning("openai init failed: %s", e)
        return None


def _resolve_backend() -> str | None:
    global _active_backend
    if _active_backend:
        return _active_backend

    requested = DEFAULT_BACKEND
    candidates = [requested] + [b for b in ("bge_m3", "gemini", "openai") if b != requested]

    for b in candidates:
        if b == "bge_m3" and _try_init_bge_m3():
            _active_backend = "bge_m3"
            break
        if b == "gemini" and _try_init_gemini():
            _active_backend = "gemini"
            break
        if b == "openai" and _try_init_openai():
            _active_backend = "openai"
            break

    if _active_backend:
        log.info("RAG embedding backend = %s (model=%s)", _active_backend, get_active_model())
    else:
        log.warning(
            "RAG: no embedding backend configured. "
            "For free local: pip install sentence-transformers. "
            "For Gemini: set GEMINI_API_KEY. For OpenAI: set OPENAI_API_KEY."
        )
    return _active_backend


def get_active_model() -> str:
    backend = _active_backend or _resolve_backend()
    if backend == "bge_m3":
        return DEFAULT_BGE_MODEL
    if backend == "gemini":
        m = DEFAULT_GEMINI_MODEL
        return m if m in ALLOWED_GEMINI_MODELS else "gemini-embedding-001"
    if backend == "openai":
        return "text-embedding-3-small"
    return "none"


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _l2_normalize(vec: list[float]) -> list[float]:
    s = sum(x * x for x in vec)
    if s <= 0:
        return vec
    n = math.sqrt(s)
    return [x / n for x in vec]


_RETRY_AFTER_RE = re.compile(r"retry.*?(\d+)\s*s", re.IGNORECASE)


def _extract_retry_after_secs(err_msg: str) -> float | None:
    m = _RETRY_AFTER_RE.search(err_msg)
    if m:
        try:
            return float(m.group(1))
        except Exception:
            return None
    return None


def _is_rate_limit(err: Exception) -> bool:
    msg = str(err)
    return (
        "RESOURCE_EXHAUSTED" in msg
        or "429" in msg
        or "rate limit" in msg.lower()
        or "quota" in msg.lower()
    )


# ─── BGE-M3 (local) ──────────────────────────────────────────────────────────

def _bge_embed(text: str) -> list[float]:
    if _st_model is None:
        raise EmbeddingError("BGE-M3 model not loaded")
    try:
        v = _st_model.encode(text, normalize_embeddings=True, show_progress_bar=False)
        # numpy array → list
        vec = list(v.tolist() if hasattr(v, "tolist") else v)
        if len(vec) != EMBED_DIM:
            vec = (vec + [0.0] * EMBED_DIM)[:EMBED_DIM]
        return vec
    except Exception as e:
        raise EmbeddingError(f"BGE-M3 encode failed: {e}") from e


# ─── Gemini single embed with backoff ────────────────────────────────────────

def _gemini_embed_one(text: str, *, task_type: str) -> list[float]:
    from google.genai import types  # type: ignore

    model = get_active_model()
    cfg_kwargs: dict = {"output_dimensionality": EMBED_DIM}
    if model != "gemini-embedding-2":
        cfg_kwargs["task_type"] = task_type
    cfg = types.EmbedContentConfig(**cfg_kwargs)

    last_err: Exception | None = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            r = _genai_client.models.embed_content(  # type: ignore
                model=model, contents=text, config=cfg,
            )
            embeddings = getattr(r, "embeddings", None) or []
            if not embeddings:
                raise EmbeddingError(f"{model}: empty embeddings response")
            vec = list(getattr(embeddings[0], "values", None) or [])
            if len(vec) != EMBED_DIM:
                vec = (vec + [0.0] * EMBED_DIM)[:EMBED_DIM]
            if model == "gemini-embedding-001":
                vec = _l2_normalize(vec)
            return vec
        except Exception as e:
            last_err = e
            msg = str(e)
            if "API_KEY_HTTP_REFERRER_BLOCKED" in msg or "referer" in msg.lower():
                raise EmbeddingError(
                    "Gemini API key is restricted to HTTP referrers. "
                    "Edit it at https://aistudio.google.com/apikey and set "
                    "Application restrictions = None (server-side)."
                ) from e
            if not _is_rate_limit(e) or attempt == MAX_RETRIES:
                break
            suggested = _extract_retry_after_secs(msg)
            wait_s = suggested if suggested else min(BACKOFF_BASE_S * (2 ** attempt), BACKOFF_CAP_S)
            log.info("rate-limited on %s (attempt %d/%d) — sleeping %.0fs",
                     model, attempt + 1, MAX_RETRIES, wait_s)
            time.sleep(wait_s)
            continue

    raise EmbeddingError(f"gemini embed failed after {MAX_RETRIES} retries: {last_err}") from last_err


# ─── Public API ──────────────────────────────────────────────────────────────

def embed_text(text: str, *, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
    """Embed a single string. Raises EmbeddingError on backend failures."""
    text = (text or "").strip()
    if not text:
        return [0.0] * EMBED_DIM

    backend = _resolve_backend()
    if backend == "bge_m3":
        return _bge_embed(text)

    if backend == "gemini":
        tt = task_type.upper().replace("-", "_")
        if tt not in {
            "RETRIEVAL_DOCUMENT", "RETRIEVAL_QUERY", "SEMANTIC_SIMILARITY",
            "CLASSIFICATION", "CLUSTERING", "QUESTION_ANSWERING",
            "FACT_VERIFICATION", "CODE_RETRIEVAL_QUERY",
        }:
            tt = "RETRIEVAL_DOCUMENT"
        return _gemini_embed_one(text, task_type=tt)

    if backend == "openai":
        try:
            r = _openai_client.embeddings.create(  # type: ignore
                model="text-embedding-3-small",
                input=text,
                dimensions=EMBED_DIM,
            )
            return list(r.data[0].embedding)[:EMBED_DIM]
        except Exception as e:
            raise EmbeddingError(f"openai embed failed: {e}") from e

    raise EmbeddingError(
        "No embedding backend available. Configure one of: bge_m3 (default, "
        "needs sentence-transformers), gemini (GEMINI_API_KEY), openai (OPENAI_API_KEY)."
    )


def embed_batch(texts: Iterable[str], *, task_type: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
    """Batch-embed. For BGE-M3 we exploit the underlying batched encode for speed."""
    texts = list(texts)
    if not texts:
        return []

    backend = _resolve_backend()
    if backend == "bge_m3" and _st_model is not None:
        try:
            arr = _st_model.encode(
                texts,
                normalize_embeddings=True,
                show_progress_bar=False,
                batch_size=int(os.getenv("BGE_BATCH_SIZE", "16")),
                convert_to_numpy=True,
            )
            out: list[list[float]] = []
            for v in arr:
                vec = list(v.tolist())
                if len(vec) != EMBED_DIM:
                    vec = (vec + [0.0] * EMBED_DIM)[:EMBED_DIM]
                out.append(vec)
            return out
        except Exception as e:
            raise EmbeddingError(f"BGE-M3 batch encode failed: {e}") from e

    return [embed_text(t, task_type=task_type) for t in texts]
