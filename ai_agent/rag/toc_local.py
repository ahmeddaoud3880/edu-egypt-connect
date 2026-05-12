"""
Local-first table-of-contents helpers (no cloud quota).

Inspired by common patterns in local RAG stacks (e.g. offline ingestion + sidecar metadata):

* Sidecar JSON: ``<pdf_stem>.toc.json`` next to the PDF — editor-verified TOC, zero API calls.
* Optional OpenAI-compatible local LLM (Ollama, LM Studio, vLLM): parses hi-res OCR text into
  structured TOC JSON when ``RAG_TOC_LLM_URL`` is set.

Embedding + hybrid retrieval already default to local BGE-M3 + Postgres FTS in this project;
this module completes the “sovereign ingest” story for printed MOE textbooks.
"""
from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any

log = logging.getLogger("egypt_edu.rag.toc_local")


def toc_entries_quality(entries: list[dict]) -> float:
    """Heuristic 0..1 — penalises merged multi-column OCR titles."""
    if not entries:
        return 0.0
    bad = sum(
        1
        for e in entries
        if len(str(e.get("title", ""))) > 80
        or str(e.get("title", "")).count("الدرس") > 1
        or str(e.get("title", "")).count("الفصل") > 1
    )
    return 1.0 - bad / len(entries)


def normalize_toc_entries(raw: Any) -> list[dict]:
    """Validate JSON list → list[{title, level, page}]."""
    if not isinstance(raw, list):
        return []
    out: list[dict] = []
    for e in raw:
        if not isinstance(e, dict):
            continue
        t = str(e.get("title", "")).strip()
        if not t:
            continue
        try:
            lvl = int(e.get("level", 2))
        except (TypeError, ValueError):
            lvl = 2
        raw_p = e.get("page")
        p: int | None
        try:
            p_raw = int(raw_p) if raw_p is not None else None
            p = p_raw if (p_raw and p_raw > 0) else None
        except (TypeError, ValueError):
            p = None
        out.append({"title": t, "level": lvl, "page": p})
    return out


def load_sidecar_toc(pdf_path: str) -> list[dict] | None:
    """
    Load ``Path(pdf).with_suffix('.toc.json')`` if it exists.

    Example: ``Arabic_Prim3_TR2.pdf`` → ``Arabic_Prim3_TR2.toc.json``
    """
    p = Path(pdf_path).expanduser().resolve()
    cand = p.with_suffix(".toc.json")
    if not cand.is_file():
        return None
    try:
        raw = json.loads(cand.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        log.warning("TOC sidecar unreadable %s: %s", cand, exc)
        return None
    toc = normalize_toc_entries(raw)
    if len(toc) < 3:
        log.debug("TOC sidecar too few entries: %s", cand)
        return None
    log.info("Loaded %d TOC entries from sidecar %s", len(toc), cand.name)
    return toc


def load_toc_override(pdf_path: str, explicit_json_path: str | None) -> list[dict] | None:
    """explicit_json_path wins; else sidecar next to PDF."""
    if explicit_json_path:
        ep = Path(explicit_json_path).expanduser().resolve()
        if ep.is_file():
            try:
                raw = json.loads(ep.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as exc:
                log.warning("TOC override file unreadable %s: %s", ep, exc)
            else:
                toc = normalize_toc_entries(raw)
                if len(toc) >= 3:
                    log.info("Loaded %d TOC entries from override %s", len(toc), ep)
                    return toc
    return load_sidecar_toc(pdf_path)


def _strip_code_fences(text: str) -> str:
    t = re.sub(r"^```[a-z]*\n?", "", text.strip(), flags=re.MULTILINE)
    return re.sub(r"```\s*$", "", t, flags=re.MULTILINE).strip()


def build_local_llm_toc_prompt(ocr_text: str) -> str:
    """Same semantics as Gemini text TOC prompt — structured JSON only."""
    return (
        "النص التالي هو مخرجات OCR لصفحات جدول محتويات كتاب مدرسي مصري (وزارة التربية).\n"
        "قد يحتوي النص على أخطاء إملائية طفيفة وأحرف إنجليزية خاطئة من OCR.\n"
        "المطلوب: استخرج جدول المحتويات الكامل وأرجعه كـ JSON array فقط — لا تحذف أي سطر.\n\n"
        "مثال على الناتج:\n"
        '[\n'
        '  {"level":1,"title":"الوحدة الأولى: قصص من بلادي","page":null},\n'
        '  {"level":2,"title":"الدرس الأول (الاستماع): قرية الجمال","page":7},\n'
        '  {"level":3,"title":"الأساليب والتراكيب: أنواع الجمع","page":15}\n'
        ']\n\n'
        "قواعد مهمة:\n"
        "• level=1: الوحدات (الوحدة الأولى...) أو الفصول (الفصل السابع...)\n"
        "• level=2: الدروس الرئيسية + تقييم الوحدة + اقرأ مع الأسرة\n"
        "• level=3: الأنشطة المندرجة: الأساليب والتراكيب، القواعد الإملائية، "
        "التحدث، الكتابة، رحلتي مع الدرس، تقييم، نشاط\n"
        "• الأرقام في بداية/نهاية السطر هي أرقام صفحات — ضعها في page لا\" title\n"
        "• استخرج كل سطر — لا تختصر\n"
        "• لا تضف أي نص خارج الـ JSON array\n\n"
        "نص OCR:\n"
        "---\n"
        f"{ocr_text}\n"
        "---\n"
        "أرجع JSON array فقط."
    )


def parse_toc_ocr_with_local_llm(ocr_text: str) -> list[dict]:
    """
    Call an OpenAI-compatible ``/v1/chat/completions`` endpoint (Ollama, LM Studio, vLLM).

    Env:
        RAG_TOC_LLM_URL   — base URL with optional ``/v1`` suffix (e.g. http://127.0.0.1:11434/v1)
        RAG_TOC_LLM_MODEL — default ``qwen2.5:7b``
        RAG_TOC_LLM_API_KEY — optional Bearer token
        RAG_TOC_LLM_TIMEOUT — seconds (default 120)
        RAG_TOC_LLM_MAX_OCR — max OCR chars (default 28000)
    """
    import urllib.error
    import urllib.request

    base = (os.getenv("RAG_TOC_LLM_URL") or "").strip().rstrip("/")
    if not base:
        return []
    if "/v1" not in base:
        base = base + "/v1"
    url = base + "/chat/completions"
    model = (os.getenv("RAG_TOC_LLM_MODEL") or "qwen2.5:7b").strip()
    timeout = max(30, int(os.getenv("RAG_TOC_LLM_TIMEOUT", "120")))
    max_ocr = max(4000, int(os.getenv("RAG_TOC_LLM_MAX_OCR", "28000")))
    trimmed = (ocr_text or "")[:max_ocr]
    if len(ocr_text or "") > max_ocr:
        log.warning("TOC local LLM: truncated OCR from %d to %d chars", len(ocr_text or ""), max_ocr)

    prompt = build_local_llm_toc_prompt(trimmed)
    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.0,
        "max_tokens": 8192,
    }).encode("utf-8")

    headers = {"Content-Type": "application/json"}
    key = (os.getenv("RAG_TOC_LLM_API_KEY") or "").strip()
    if key:
        headers["Authorization"] = f"Bearer {key}"

    try:
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=timeout) as r:
            resp = json.loads(r.read().decode("utf-8"))
        raw = resp["choices"][0]["message"]["content"].strip()
        raw = _strip_code_fences(raw)
        parsed = json.loads(raw)
        result = normalize_toc_entries(parsed)
        if len(result) >= 3:
            log.info("Local LLM TOC (%s): %d entries", model, len(result))
        return result
    except urllib.error.HTTPError as exc:
        log.debug("Local LLM TOC HTTP %s: %s", exc.code, exc.read()[:500] if exc.fp else "")
        return []
    except (json.JSONDecodeError, KeyError, IndexError, OSError, TypeError) as exc:
        log.debug("Local LLM TOC failed: %s", exc)
        return []


def toc_cloud_enabled() -> bool:
    """When false, skip Gemini / Groq / Vision for printed TOC (OCR + local LLM + rules only).

    Default is off so ingest matches the local-first stack (sidecar ``.toc.json`` + Tesseract + BGE-M3).
    Set ``RAG_TOC_CLOUD=1`` only if you want cloud TOC repair.
    """
    v = (os.getenv("RAG_TOC_CLOUD") or "0").strip().lower()
    return v in ("1", "true", "yes", "on", "cloud", "always")
