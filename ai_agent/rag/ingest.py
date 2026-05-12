"""
Ingest a PDF (Arabic textbook) into rag_books + rag_chunks (Supabase + pgvector).

Pipeline highlights:
    • OCRmyPDF: only when `RAG_OCRMYPDF=auto` AND (sparse text layer OR you opt into global OCR). Severe fragmentation no longer forces full-book `--redo-ocr` by default (`RAG_OCR_FORCE_SEVERE_ENABLED=0`); ingest uses faster capped per-page OCR for bad layers.
    • Optional Docling Markdown (RAG_PDF_CONVERTER) + lesson/activity-aware chunking.
    • Per-chunk quality_score; shards below RAG_MIN_QUALITY never enter the index.
    • Arabic normalization: clean `content_display`; `content_for_embedding` without tashkīl; optional per-page Tesseract when extract appears reversed (`RAG_PAGE_REVERSAL_OCR`).
    • Local-first RAG (no API quotas): default embeddings = BGE-M3 (local); hybrid search = pgvector + Postgres FTS (RRF). Optional ``<pdf>.toc.json`` sidecar for a perfect TOC; optional ``RAG_TOC_LLM_URL`` (Ollama / LM Studio) to parse OCR’d TOC; set ``RAG_TOC_CLOUD=0`` to skip Gemini/Groq/Vision entirely.

Usage (from ai_agent/):
    python -m rag.ingest --file books/primary/g3/arabic/main.pdf \
        --title "كتاب اللغة العربية" --grade 3 --stage-name "ابتدائى" \
        --subject-name "اللغة العربية"

    python -m rag.ingest ... --content-first-pdf-page 6 \
        --citation-starts-at-pdf-page 6 --force

Env: RAG_OCRMYPDF, RAG_OCR_FRAG_*, RAG_OCR_FORCE_SEVERE_ENABLED (default 0: avoid slow full-book `--redo-ocr`; set 1 for maximum text-layer repair), RAG_OCR_SKIP_EXISTING_TEXT (`1` restores old `--skip-text`, unsafe for MOE PDFs), RAG_INGEST_INSERT_BATCH, …

Repeated runs same SHA256 → idempotent (--force re-ingests).
"""
from __future__ import annotations

import argparse
import hashlib
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Load env from ai_agent/.env so GEMINI_API_KEY + SUPABASE_* are present
_AI_AGENT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_AI_AGENT_DIR / ".env", override=False)

# Make `db.*` and `rag.*` importable when invoked as a script
if str(_AI_AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_AGENT_DIR))

from db.client import supabase  # noqa: E402
from rag.arabic_text import (  # noqa: E402
    clean_arabic_display,
    clean_page_text,
    content_for_embedding_from_display,
    maybe_replace_reversed_pages,
)
from rag.client import embed_text, embed_batch, EmbeddingError  # noqa: E402
from rag.pdf_pipeline import cleanup_temp, maybe_ocr_pdf, pdf_to_markdown_via_docling  # noqa: E402
from rag.quality import text_quality_score  # noqa: E402
from rag.sectioning import build_lesson_sections, markdown_to_blob  # noqa: E402
from rag.toc_local import (  # noqa: E402
    load_toc_override,
    parse_toc_ocr_with_local_llm,
    toc_cloud_enabled,
    toc_entries_quality,
)

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(levelname)s [%(name)s] %(message)s",
)
log = logging.getLogger("egypt_edu.rag.ingest")

MIN_CHUNK = 80
MIN_QUALITY = float(os.getenv("RAG_MIN_QUALITY", "0.32"))
DEFAULT_INSERT_BATCH = int(os.getenv("RAG_INGEST_INSERT_BATCH", "32"))
# auto → PyMuPDF if available, else pypdf
PDF_BACKEND = (os.getenv("RAG_PDF_BACKEND") or "auto").strip().lower()


def is_noise_chunk(text: str) -> bool:
    """Drop tiny, dot-only, or almost-letter-free segments unsuitable for RAG."""
    t = text.strip()
    if len(t) < MIN_CHUNK:
        return True
    if len(t) <= 200 and re.fullmatch(r"[0-9٠-٩.\s\u00b7•|\\_:،؛\-]+", t):
        return True
    dotish = len(re.sub(r"[^.\u00b7•]", "", t))
    if dotish / max(len(t), 1) > 0.28:
        return True
    letters = len(re.findall(r"[\u0600-\u06FF\u0750-\u077f\u08a0-\u08ffA-Za-z]", t))
    if letters < 18:
        return True
    return False


# ─── PDF reading ─────────────────────────────────────────────────────────────

def read_pdf_pages_pymupdf(
    path: str, *, min_pdf_page: int = 1, skip_trailing_pdf_pages: int = 0
) -> list[tuple[int, str]]:
    import fitz  # PyMuPDF

    if min_pdf_page < 1:
        raise ValueError("min_pdf_page must be >= 1")
    if skip_trailing_pdf_pages < 0:
        raise ValueError("skip_trailing_pdf_pages must be >= 0")
    doc = fitz.open(path)
    pages: list[tuple[int, str]] = []
    try:
        total = doc.page_count
        last = total - skip_trailing_pdf_pages
        if last < min_pdf_page:
            log.warning("PDF has no pages in range %s..%s (total=%s skip_trail=%s)",
                        min_pdf_page, last, total, skip_trailing_pdf_pages)
            return []
        for pno in range(min_pdf_page, last + 1):
            page = doc.load_page(pno - 1)
            try:
                txt = page.get_text("text", sort=True)  # type: ignore[call-arg]
            except Exception:
                txt = page.get_text("text")
            if not txt:
                txt = ""
            cleaned = clean_page_text(txt)
            if cleaned:
                pages.append((pno, cleaned))
    finally:
        doc.close()
    return pages


def read_pdf_pages_pypdf(
    path: str, *, min_pdf_page: int = 1, skip_trailing_pdf_pages: int = 0
) -> list[tuple[int, str]]:
    try:
        from pypdf import PdfReader  # type: ignore
    except Exception:
        log.error("pypdf is not installed. Run: pip install pypdf")
        raise
    if min_pdf_page < 1:
        raise ValueError("min_pdf_page must be >= 1")
    if skip_trailing_pdf_pages < 0:
        raise ValueError("skip_trailing_pdf_pages must be >= 0")
    reader = PdfReader(path)
    total = len(reader.pages)
    last = total - skip_trailing_pdf_pages
    if last < min_pdf_page:
        log.warning("PDF has no pages in range %s..%s (total=%s skip_trail=%s)",
                    min_pdf_page, last, total, skip_trailing_pdf_pages)
        return []
    pages: list[tuple[int, str]] = []
    for i in range(min_pdf_page, last + 1):
        p = reader.pages[i - 1]
        try:
            txt = p.extract_text() or ""
        except Exception:
            txt = ""
        cleaned = clean_page_text(txt)
        if cleaned:
            pages.append((i, cleaned))
    return pages


def read_pdf_pages(
    path: str,
    *,
    min_pdf_page: int = 1,
    skip_trailing_pdf_pages: int = 0,
    backend: str | None = None,
) -> list[tuple[int, str]]:
    """Return list of (pdf_page_number_1based, cleaned text).

    backend: auto | pymupdf | pypdf (default from RAG_PDF_BACKEND env).
    """
    be = (backend or PDF_BACKEND or "auto").lower()
    if be == "pypdf":
        log.info("PDF extract: pypdf")
        return read_pdf_pages_pypdf(path, min_pdf_page=min_pdf_page, skip_trailing_pdf_pages=skip_trailing_pdf_pages)
    if be == "pymupdf":
        log.info("PDF extract: PyMuPDF")
        return read_pdf_pages_pymupdf(path, min_pdf_page=min_pdf_page, skip_trailing_pdf_pages=skip_trailing_pdf_pages)
    # auto
    try:
        import fitz  # noqa: F401

        log.info("PDF extract: PyMuPDF (auto)")
        return read_pdf_pages_pymupdf(path, min_pdf_page=min_pdf_page, skip_trailing_pdf_pages=skip_trailing_pdf_pages)
    except Exception as e:
        log.warning("PyMuPDF unavailable (%s), falling back to pypdf", e)
        return read_pdf_pages_pypdf(path, min_pdf_page=min_pdf_page, skip_trailing_pdf_pages=skip_trailing_pdf_pages)


def _stored_page_number(pdf_page: int, citation_starts_at_pdf_page: int | None) -> int:
    """Map PDF page index to the value stored on rag_chunks.page_number (citations / UI)."""
    if citation_starts_at_pdf_page is None:
        return pdf_page
    return max(1, pdf_page - citation_starts_at_pdf_page + 1)


# ─── Stage / subject lookup ──────────────────────────────────────────────────

def find_stage_id(name: str | None) -> str | None:
    if not name:
        return None
    try:
        r = (
            supabase.table("stages")
            .select("id, name, name_ar")
            .or_(f"name.ilike.%{name}%,name_ar.ilike.%{name}%")
            .limit(1)
            .execute()
        )
        rows = r.data or []
        return rows[0]["id"] if rows else None
    except Exception as e:
        log.warning("find_stage_id error: %s", e)
        return None


def find_subject_id(name: str | None, grade: int | None = None) -> str | None:
    if not name:
        return None
    try:
        q = (
            supabase.table("subjects")
            .select("id, name, name_ar, grade_number")
            .or_(f"name.ilike.%{name}%,name_ar.ilike.%{name}%")
        )
        if grade:
            q = q.eq("grade_number", grade)
        r = q.limit(1).execute()
        rows = r.data or []
        if rows:
            return rows[0]["id"]
        # try without grade filter
        r2 = (
            supabase.table("subjects")
            .select("id")
            .or_(f"name.ilike.%{name}%,name_ar.ilike.%{name}%")
            .limit(1)
            .execute()
        )
        rows2 = r2.data or []
        return rows2[0]["id"] if rows2 else None
    except Exception as e:
        log.warning("find_subject_id error: %s", e)
        return None


# ─── TOC extraction ──────────────────────────────────────────────────────────

# Eastern Arabic → Western digits
_AR_DIGIT_MAP = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")

# Arabic ordinals for unit numbers
_UNIT_ORDINALS = {
    "الأولى": 1, "الثانية": 2, "الثالثة": 3, "الرابعة": 4,
    "الخامسة": 5, "السادسة": 6, "السابعة": 7, "الثامنة": 8,
    "التاسعة": 9, "العاشرة": 10,
}

_UNIT_RE = re.compile(
    r"(الوحدة\s+(الأولى|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|الثامنة|التاسعة|العاشرة)"
    r"|الفصل\s+(الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|الحادي\s+عشر|الثاني\s+عشر))"
)
_LESSON_RE = re.compile(
    r"(الدرس\s+(الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|[0-9]+)\b"
    r"|الدرس\s+[0-9]+\s*:)"
)
# Match Eastern Arabic OR Western Arabic page numbers (1-3 digits)
_AR_PAGE_END = re.compile(r"(?<!\w)([٠-٩]{1,3}|[0-9]{1,3})\s*$")
_AR_PAGE_START = re.compile(r"^([٠-٩]{1,3}|[0-9]{1,3})\s+")
_DOTS_RE = re.compile(r"[.\u00b7\u2026\s]{3,}")
_LATIN_WORD_RE = re.compile(r"\b[A-Za-z][A-Za-z0-9]{0,4}\b")
_LATIN_NUM_RE = re.compile(r"\b[0-9]+\s*[A-Za-z\)]+")


def _ar_to_int(s: str) -> int | None:
    try:
        return int(s.strip().translate(_AR_DIGIT_MAP))
    except (ValueError, AttributeError):
        return None


_BIDI_CTRL = re.compile(r"[\u200e\u200f\u202a-\u202e\u2066-\u2069]")
_BULLET_PREFIX = re.compile(r"^[\u0660\u06F0٠●•◦▪\u200e\u200f\-]+\s*")  # Arabic zero bullet, etc.


def _clean_toc_title(text: str) -> str:
    """Strip OCR artifacts (bidi marks, Latin words/numbers, Arabic-zero bullets) from an Arabic TOC title."""
    t = _BIDI_CTRL.sub("", text)
    t = _BULLET_PREFIX.sub("", t.strip())
    t = _LATIN_NUM_RE.sub("", t)
    t = _LATIN_WORD_RE.sub("", t)
    t = re.sub(r"\s+", " ", t).strip().rstrip(".)،: ")
    # Remove trailing OCR page-number fragments that PSM4 inlines with titles:
    # e.g. "رحلتي مع الدرس ف" (single Arabic char)
    # e.g. "البيئة ات" (short suffix detached from word)
    # e.g. "وطني حل" (2-char Arabic noise from garbled page number)
    t = re.sub(r"\s+[\u0600-\u06FF]\s*$", "", t)                        # single Arabic letter
    t = re.sub(r"\s+[\u0600-\u06FF]{1,3}[0-9٠-٩/]+\s*$", "", t)        # Arabic+digit mix "ع9" "7/١"
    t = re.sub(r"\s+[0-9٠-٩][/0-9٠-٩]*[\u0600-\u06FF]?\s*$", "", t)    # leading digit fragment
    # Common 2-4 char garbled page-number suffixes in PSM4 Arabic OCR output
    t = re.sub(r"\s+(?:هل|حل|عل|يا|بس|يم|عم|ات|من|لا|ين|عن|كم|ته)\s*$", "", t)
    return t.strip()


def _ocr_pages_hires(
    pdf_path: str,
    page_numbers: list[int],
    dpi: int = 300,
    psm: int = 11,
) -> dict[int, str]:
    """Re-OCR specific pages at higher DPI using Tesseract; returns {page_1based: text}.

    psm=11 (sparse text) is the default for TOC pages because it reads ALL visible
    text regardless of two-column layout, capturing page numbers that PSM 3 misses.
    """
    import shutil
    import subprocess
    import tempfile

    tess = shutil.which("tesseract")
    if not tess:
        return {}
    try:
        import fitz
    except Exception:
        return {}

    lang = os.getenv("RAG_OCR_LANGUAGE", "ara+eng")
    env = dict(os.environ)
    for p in (r"C:\Program Files\Tesseract-OCR",):
        if os.path.isdir(p):
            env["PATH"] = p + os.pathsep + env.get("PATH", "")

    doc = fitz.open(pdf_path)
    results: dict[int, str] = {}
    try:
        for pno in page_numbers:
            try:
                pix = doc[pno - 1].get_pixmap(dpi=dpi)
            except Exception:
                continue
            work = tempfile.mkdtemp(prefix=f"tess_toc_{pno}_")
            try:
                png = os.path.join(work, "p.png")
                out = os.path.join(work, "o")
                with open(png, "wb") as f:
                    f.write(pix.tobytes("png"))
                subprocess.run(
                    [tess, png, out, "-l", lang, "--psm", str(psm)],
                    check=True, capture_output=True, text=True, timeout=60, env=env,
                )
                txt_path = out + ".txt"
                if os.path.isfile(txt_path):
                    with open(txt_path, encoding="utf-8", errors="replace") as f:
                        results[pno] = f.read()
            except Exception as exc:
                log.debug("High-DPI OCR page %s failed: %s", pno, exc)
            finally:
                import shutil as _sh; _sh.rmtree(work, ignore_errors=True)
    finally:
        doc.close()
    return results


def extract_printed_toc(
    pdf_path: str,
    pages_text: list[tuple[int, str]],
    *,
    content_first_pdf_page: int = 1,
) -> list[dict]:
    """
    Parse the printed (visual) فهرس from the first pages of an MOE Arabic PDF.

    Strategy:
    1. If content_first_pdf_page > 1, the pages before it are the printed TOC → re-OCR them at 300 DPI.
    2. Otherwise auto-detect the first pages that look like TOC (many dot leaders + Arabic page numbers).
    3. Parse lines to extract a 3-level hierarchy: unit (level 1) → lesson (level 2) → sub-item (level 3).

    Returns [] if nothing useful is found (caller should fall back to synthetic TOC).
    """
    # Determine candidate pages: everything before the body text
    candidate_range = list(range(1, max(content_first_pdf_page, 2)))
    if not candidate_range:
        candidate_range = list(range(1, 9))  # auto mode: first 8 pages

    # ── Step 1a: OCR all candidate pages with PSM 11 (fast detection pass) ──────
    log.info("TOC: scanning %d candidate pages at 300 DPI for فهرس …", len(candidate_range))
    all_hires = _ocr_pages_hires(pdf_path, candidate_range, dpi=300, psm=11)

    # Select pages that look like TOC.
    # Match Arabic ordinal lessons, numbered lessons (درس 1:), chapter headers (الفصل السابع),
    # and the TOC title itself (جدول المحتويات).
    _toc_signal = re.compile(
        r"الدرس\s+(الأول|الثاني|الثالث|الرابع)"   # Arabic ordinal lessons
        r"|الفصل\s+ال"                              # chapter headings (الفصل السابع …)
        r"|درس\s+[0-9٠-٩]"                         # numbered lesson without article
        r"|الدرس\s+[0-9٠-٩]"                       # numbered lesson with article
        r"|المحتويات"                               # TOC header text
    )
    toc_page_numbers: list[int] = []
    for pno in candidate_range:
        txt = all_hires.get(pno, "")
        if _toc_signal.search(txt) and (
            re.search(r"[٠-٩]{1,3}", txt) or
            re.search(r"[0-9]{1,3}", txt) or
            len(_DOTS_RE.findall(txt)) >= 2
        ):
            toc_page_numbers.append(pno)

    if not toc_page_numbers:
        log.info("TOC: no printed فهرس pages detected among candidates %s", candidate_range)
        return []

    log.info("TOC: detected فهرس pages: %s", toc_page_numbers)

    # ── Step 1b: Re-OCR ONLY the detected TOC pages with PSM 4 ───────────────
    # PSM 4 (single column) captures entries like تقييم الوحدة that PSM 11 misses.
    all_hires_p4 = _ocr_pages_hires(pdf_path, toc_page_numbers, dpi=300, psm=4)

    # ── Step 2: Gemini text API (single call → avoids rate limits) ───────────────
    # We send the union of PSM4 (more complete) and PSM11 (cleaner) OCR texts.
    combined_ocr = "\n\n".join(
        f"=== صفحة {pno} PSM4 ===\n{all_hires_p4.get(pno, '')}\n\n"
        f"=== صفحة {pno} PSM11 ===\n{all_hires.get(pno, '')}"
        for pno in toc_page_numbers
    )

    # ── Local OpenAI-compatible LLM (Ollama / LM Studio) — no cloud quota ─────────
    local_toc = parse_toc_ocr_with_local_llm(combined_ocr)
    if local_toc and len(local_toc) >= 5:
        _lq = toc_entries_quality(local_toc)
        if _lq >= 0.80:
            log.info("TOC from local LLM: %d entries (quality=%.2f)", len(local_toc), _lq)
            return local_toc
        log.debug("Local LLM TOC quality %.2f — trying cloud / rules next", _lq)

    text_toc: list[dict] = []
    if toc_cloud_enabled():
        text_toc = _parse_toc_text_with_gemini(combined_ocr)
    else:
        log.info("TOC: RAG_TOC_CLOUD disabled — skipping Gemini / Groq / Vision")

    text_quality = toc_entries_quality(text_toc)
    if text_toc and len(text_toc) >= 5 and text_quality >= 0.80:
        log.info("Gemini-text TOC: %d entries (quality=%.2f)", len(text_toc), text_quality)
        return text_toc

    if text_toc and len(text_toc) >= 5:
        log.info(
            "Gemini-text TOC quality low (%.2f, %d entries) — falling back to Vision API",
            text_quality, len(text_toc),
        )

    # ── Step 2b: Vision API — multi-column layouts when cloud is enabled ───────
    vision_toc: list[dict] = []
    if toc_cloud_enabled():
        vision_toc = _extract_toc_with_vision(pdf_path, toc_page_numbers, dpi=300)
    if vision_toc and len(vision_toc) >= 5:
        if len(vision_toc) >= len(text_toc or []):
            log.info("Vision TOC: %d entries (better than text %d)", len(vision_toc), len(text_toc or []))
            return vision_toc
    if text_toc and len(text_toc) >= 5:
        log.info("Using Gemini-text TOC as fallback: %d entries", len(text_toc))
        return text_toc
    if local_toc and len(local_toc) >= 5:
        log.info("Using local LLM TOC as fallback: %d entries", len(local_toc))
        return local_toc

    # ── Step 3: Manual text-based OCR parser (no API key / API fails) ─────────
    # Merge PSM11 and PSM4 texts: PSM4 gets entries like تقييم الوحدة that PSM11 misses
    hires: dict[int, str] = {}
    for pno in toc_page_numbers:
        t11 = all_hires.get(pno, "")
        t4 = all_hires_p4.get(pno, "")
        # Use PSM4 as primary if it has more text; append PSM11 as a second pass
        hires[pno] = f"{t4}\n\n{t11}" if len(t4) > len(t11) else f"{t11}\n\n{t4}"

    # Fallback to existing OCR text if hi-res failed
    pages_dict = {pno: txt for pno, txt in pages_text}
    combined_lines: list[str] = []
    for pno in toc_page_numbers:
        raw = hires.get(pno) or pages_dict.get(pno, "")
        combined_lines.extend(raw.splitlines())

    toc: list[dict] = []
    seen: set[str] = set()
    _pending_page: int | None = None  # page number found on a standalone line

    for raw_line in combined_lines:
        line = raw_line.strip()
        if not line or len(line) < 2:
            continue

        # Standalone page-number lines (left column, e.g. "٧" or "44" alone)
        if re.fullmatch(r"[٠-٩]{1,3}|[0-9]{1,3}", line):
            n = _ar_to_int(line)
            if n and 1 <= n <= 500:
                # Assign to the LAST entry if it has no page yet (number came after title in RTL OCR)
                # OR save for the NEXT entry (number came before title)
                if toc and toc[-1]["page"] is None:
                    toc[-1]["page"] = n
                else:
                    _pending_page = n
            continue

        # Extract page number embedded at start or end
        page_num: int | None = None
        m_end = _AR_PAGE_END.search(line)
        if m_end:
            page_num = _ar_to_int(m_end.group(1))
            line = line[: m_end.start()].strip()
        else:
            m_start = _AR_PAGE_START.match(line)
            if m_start:
                page_num = _ar_to_int(m_start.group(1))
                line = line[m_start.end():].strip()

        # Use pending standalone page number if not found inline
        if page_num is None and _pending_page is not None:
            page_num = _pending_page
        _pending_page = None

        # Remove dot leaders
        cleaned = _DOTS_RE.sub(" ", line).strip()
        cleaned = _clean_toc_title(cleaned)
        if not cleaned or len(cleaned) < 3:
            continue

        key = re.sub(r"[\u200e\u200f\u202a-\u202e\u2066-\u2069\s]", "", cleaned)
        if key in seen:
            continue
        seen.add(key)

        # Classify line
        unit_m = _UNIT_RE.search(cleaned)
        if unit_m:
            full_unit = unit_m.group(0)  # e.g. "الوحدة الأولى" or "الفصل السابع"
            rest = cleaned[unit_m.end():].strip().lstrip(":–- ")
            title = full_unit + (f": {rest}" if rest and len(rest) > 1 else "")
            toc.append({"title": title, "level": 1, "page": page_num})
            continue

        lesson_m = _LESSON_RE.search(cleaned)
        if lesson_m:
            toc.append({"title": cleaned, "level": 2, "page": page_num})
            continue

        # Sub-items, assessment, family reading
        bullet_stripped = cleaned.lstrip("•٠●◦▪- ").strip()
        if cleaned[0] in "•٠●◦▪" or any(
            cleaned.startswith(kw) for kw in ("الأساليب", "القواعد", "التحدث", "الكتابة", "رحلتي", "تقييم", "اقرأ")
        ):
            t = _clean_toc_title(bullet_stripped or cleaned)
            if t and len(t) > 3:
                lvl = 2 if any(t.startswith(k) for k in ("تقييم الوحدة", "اقرأ مع", "نصوص", "فقرات")) else 3
                toc.append({"title": t, "level": lvl, "page": page_num})

    if len(toc) < 4:
        log.debug("Printed TOC parser found only %d entries — discarding", len(toc))
        return []

    log.info("Printed TOC: extracted %d entries from pages %s", len(toc), toc_page_numbers)
    return toc


def _extract_toc_with_vision(
    pdf_path: str,
    candidate_pages: list[int],
    *,
    dpi: int = 200,
) -> list[dict]:
    """
    Use Google Gemini Vision API to extract a complete structured TOC from
    scanned MOE PDF pages.  Handles both وحدة (Arabic books) and فصل/chapter
    (Math, Science, etc.) layouts perfectly—even with two-column dot-leader designs
    that confuse Tesseract.

    Returns list of {title, level, page} dicts, or [] if API is unavailable.
    """
    import base64
    import json as _json
    import urllib.request as _urlreq
    import urllib.error

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key.startswith("YOUR_"):
        log.debug("GEMINI_API_KEY not set — skipping vision TOC")
        return []

    try:
        import fitz
    except ImportError:
        return []

    doc = fitz.open(pdf_path)
    pages_b64: list[tuple[int, str]] = []  # (page_number, base64_image)
    try:
        for pno in candidate_pages:
            try:
                pix = doc[pno - 1].get_pixmap(dpi=dpi)
                pages_b64.append((pno, base64.b64encode(pix.tobytes("png")).decode()))
            except Exception as e:
                log.debug("Vision render p%s: %s", pno, e)
    finally:
        doc.close()

    if not pages_b64:
        return []

    prompt = (
        "أنت خبير دقيق في استخراج جداول المحتويات من كتب الوزارة المصرية.\n"
        "هذه صورة واحدة من صفحة جدول محتويات. استخرج كل عنصر مرئي — لا تحذف شيئاً.\n\n"
        "أرجع JSON array فقط (بدون markdown أو شرح):\n"
        '[\n'
        '  {"level":1,"title":"الوحدة الأولى: قصص من بلادي","page":null},\n'
        '  {"level":2,"title":"الدرس الأول (الاستماع): قرية الجمال","page":7},\n'
        '  {"level":3,"title":"الأساليب والتراكيب: أنواع الجمع","page":15},\n'
        '  {"level":3,"title":"القواعد الإملائية: من علامات الترقيم","page":18},\n'
        '  {"level":3,"title":"التحدث: أنقذت أخي","page":19},\n'
        '  {"level":3,"title":"الكتابة: كتابة قصة قصيرة","page":20},\n'
        '  {"level":3,"title":"رحلتي مع الدرس","page":21},\n'
        '  {"level":3,"title":"تقييم: درس للمساعدة قواعد","page":22},\n'
        '  {"level":2,"title":"تقييم الوحدة الأولى","page":40},\n'
        '  {"level":1,"title":"الفصل السابع","page":null},\n'
        '  {"level":2,"title":"الدرس 1: جمع كسرين لهما نفس المقام","page":58}\n'
        ']\n\n'
        "تعليمات صارمة:\n"
        "• level=1 → وحدة (الوحدة الأولى...) أو فصل (الفصل السابع...)\n"
        "• level=2 → الدروس الرئيسية + تقييم الوحدة + اقرأ مع الأسرة\n"
        "• level=3 → كل نشاط أو مهارة مندرجة بعلامة نقطة (•) أو نجمة (*) أو بدونها:\n"
        "  الأساليب والتراكيب، القواعد الإملائية، التحدث، الكتابة،\n"
        "  رحلتي مع الدرس، تقييم درس، نشاط\n"
        "• page: رقم الصفحة من الجدول كعدد صحيح، null إذا لم يوجد\n"
        "• CRITICAL: اقرأ كل سطر في الصفحة ولا تقفز فوق أي عنصر\n"
        "• إذا الصورة غلاف أو مقدمة بدون جدول، أرجع []\n"
        "أرجع JSON array فقط."
    )

    all_entries: list[dict] = []
    seen_titles: set[str] = set()

    import time as _time2

    def _call_vision(b64: str) -> list[dict]:
        parts: list[dict] = [
            {"text": prompt},
            {"inline_data": {"mime_type": "image/png", "data": b64}},
        ]
        body_v = _json.dumps({
            "contents": [{"parts": parts}],
            "generationConfig": {"temperature": 0.0, "maxOutputTokens": 8192},
        }).encode("utf-8")

        for model in ("gemini-2.0-flash", "gemini-1.5-flash"):
            url = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model}:generateContent?key={api_key}"
            )
            for attempt in range(3):
                try:
                    req = _urlreq.Request(url, data=body_v, headers={"Content-Type": "application/json"})
                    with _urlreq.urlopen(req, timeout=90) as r:
                        resp = _json.loads(r.read().decode("utf-8"))
                    raw = resp["candidates"][0]["content"]["parts"][0]["text"].strip()
                    raw = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.MULTILINE)
                    raw = re.sub(r"```\s*$", "", raw, flags=re.MULTILINE)
                    parsed = _json.loads(raw.strip())
                    if isinstance(parsed, list):
                        return parsed
                    break
                except urllib.error.HTTPError as exc:
                    if exc.code == 429 and attempt < 2:
                        wait_sec = 65 * (attempt + 1)
                        log.info("Vision 429 (attempt %d) — waiting %ds…", attempt + 1, wait_sec)
                        _time2.sleep(wait_sec)
                    else:
                        log.debug("Vision %s HTTP %s", model, exc.code)
                        break
                except Exception as exc:
                    log.debug("Vision %s: %s", model, exc)
                    break
        return []

    # Process each TOC page individually for highest accuracy
    for pno, b64 in pages_b64:
        raw_entries = _call_vision(b64)
        if not raw_entries:
            continue
        page_count = 0
        for e in raw_entries:
            t = _clean_toc_title(str(e.get("title", "")).strip())
            if not t:
                continue
            lvl = int(e.get("level", 2))
            # Only deduplicate level-1/2; level-3 items repeat legitimately (رحلتي, الكتابة…)
            if lvl <= 2:
                key = re.sub(r"\s+", "", t)
                if key in seen_titles:
                    continue
                seen_titles.add(key)
            raw_p = e.get("page")
            try:
                p: int | None = int(raw_p) if raw_p is not None else None
            except (ValueError, TypeError):
                p = None
            all_entries.append({"title": t, "level": lvl, "page": p})
            page_count += 1
        log.info("Vision TOC p%s: %d entries", pno, page_count)

    if len(all_entries) >= 3:
        log.info("Vision TOC total: %d entries from %d pages", len(all_entries), len(pages_b64))
        return all_entries

    log.warning("Vision TOC: insufficient results (%d) — falling back to text parser", len(all_entries))
    return []


def _parse_toc_text_with_gemini(raw_ocr_text: str) -> list[dict]:
    """
    Send the combined raw OCR text of TOC pages to Gemini text API and ask it to
    parse the structure into a clean JSON list.  This avoids the size/quality
    limitations of vision models for dense small-font tables.

    Returns list of {title, level, page} dicts or [] on failure.
    """
    import json as _json
    import urllib.request as _urlreq
    import urllib.error

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key.startswith("YOUR_"):
        return []
    if not raw_ocr_text.strip():
        return []

    prompt = (
        "النص التالي هو مخرجات OCR لصفحات جدول محتويات كتاب مدرسي مصري (وزارة التربية).\n"
        "قد يحتوي النص على أخطاء إملائية طفيفة وأحرف إنجليزية خاطئة من OCR.\n"
        "المطلوب: استخرج جدول المحتويات الكامل وأرجعه كـ JSON array فقط — لا تحذف أي سطر.\n\n"
        "مثال على الناتج:\n"
        '[\n'
        '  {"level":1,"title":"الوحدة الأولى: قصص من بلادي","page":null},\n'
        '  {"level":2,"title":"الدرس الأول (الاستماع): قرية الجمال","page":7},\n'
        '  {"level":3,"title":"الأساليب والتراكيب: أنواع الجمع","page":15},\n'
        '  {"level":3,"title":"القواعد الإملائية: من علامات الترقيم","page":18},\n'
        '  {"level":3,"title":"التحدث: أنقذت أخي","page":19},\n'
        '  {"level":3,"title":"الكتابة: كتابة قصة قصيرة","page":20},\n'
        '  {"level":3,"title":"رحلتي مع الدرس","page":21},\n'
        '  {"level":3,"title":"تقييم: درس للمساعدة قواعد","page":22},\n'
        '  {"level":1,"title":"الفصل السابع","page":null},\n'
        '  {"level":2,"title":"الدرس 1: جمع كسرين لهما نفس المقام","page":58}\n'
        ']\n\n'
        "قواعد مهمة:\n"
        "• level=1: الوحدات (الوحدة الأولى...) أو الفصول (الفصل السابع...)\n"
        "• level=2: الدروس الرئيسية + تقييم الوحدة + اقرأ مع الأسرة + اقرأ واستمتع\n"
        "• level=3: الأنشطة المندرجة تحت الدرس: الأساليب والتراكيب، القواعد الإملائية،\n"
        "  التحدث، الكتابة، رحلتي مع الدرس، تقييم درس، نشاط\n"
        "• صحح أخطاء OCR في العناوين (مثل 'الكتاب' قد تكون 'الكتابة')\n"
        "• قاعدة مهمة جداً: الأرقام (عربية أو غربية أو حروف إنجليزية تشبه أرقاماً)\n"
        "  في بداية السطر أو نهايته هي أرقام صفحات فقط — لا تُدرجها في الـ title:\n"
        "  '٧ الدرس الأول (الاستماع): قرية الجمال' → title='الدرس الأول (الاستماع): قرية الجمال', page=7\n"
        "  'رحلتي مع الدرس ف' → title='رحلتي مع الدرس', page=null (ف مكسور)\n"
        "  'الدرس الرابع (نشيد): أبني وطني حل' → title='الدرس الرابع (نشيد): أبني وطني', page=null\n"
        "• استخرج كل سطر — لا تختصر ولا تحذف\n"
        "• لا تضف أي نص خارج الـ JSON array\n\n"
        "نص OCR:\n"
        "---\n"
        f"{raw_ocr_text[:12000]}\n"  # cap at ~12k chars to stay within token limits
        "---\n"
        "أرجع JSON array فقط."
    )

    body = _json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 8192},
    }).encode("utf-8")

    import time as _time

    for model in ("gemini-2.0-flash", "gemini-1.5-flash"):
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={api_key}"
        )
        for attempt in range(3):
            try:
                req = _urlreq.Request(url, data=body, headers={"Content-Type": "application/json"})
                with _urlreq.urlopen(req, timeout=60) as r:
                    resp = _json.loads(r.read().decode("utf-8"))
                raw = resp["candidates"][0]["content"]["parts"][0]["text"].strip()
                raw = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.MULTILINE)
                raw = re.sub(r"```\s*$", "", raw, flags=re.MULTILINE)
                parsed = _json.loads(raw.strip())
                if isinstance(parsed, list) and len(parsed) >= 3:
                    result: list[dict] = []
                    for e in parsed:
                        t = _clean_toc_title(str(e.get("title", "")).strip())
                        if not t:
                            continue
                        raw_p = e.get("page")
                        try:
                            p_raw: int | None = int(raw_p) if raw_p is not None else None
                            # page=0 is an OCR garbling artefact, treat as unknown
                            p: int | None = p_raw if (p_raw and p_raw > 0) else None
                        except (ValueError, TypeError):
                            p = None
                        result.append({"title": t, "level": int(e.get("level", 2)), "page": p})
                    log.info("Gemini-text TOC (%s): %d entries", model, len(result))
                    return result
            except urllib.error.HTTPError as exc:
                if exc.code == 429 and attempt < 2:
                    wait_sec = 65 * (attempt + 1)
                    log.info("Gemini-text 429 (attempt %d) — waiting %ds…", attempt + 1, wait_sec)
                    _time.sleep(wait_sec)
                else:
                    log.debug("Gemini-text TOC %s HTTP %s — giving up", model, exc.code)
                    break
            except Exception as exc:
                log.debug("Gemini-text TOC %s: %s", model, exc)
                break

    # ── Groq fallback (free, high rate limits, OpenAI-compatible) ────────────
    groq_key = os.getenv("GROQ_API_KEY", "")
    if not groq_key:
        return []

    log.info("Gemini rate-limited — trying Groq llama-3.3-70b as fallback…")
    groq_url = "https://api.groq.com/openai/v1/chat/completions"
    groq_body = _json.dumps({
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.0,
        "max_tokens": 8192,
    }).encode("utf-8")
    groq_headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {groq_key}",
    }

    import time as _time_g
    for _attempt in range(3):
        try:
            req_g = _urlreq.Request(groq_url, data=groq_body, headers=groq_headers)
            with _urlreq.urlopen(req_g, timeout=90) as r:
                resp_g = _json.loads(r.read().decode("utf-8"))
            raw_g = resp_g["choices"][0]["message"]["content"].strip()
            raw_g = re.sub(r"^```[a-z]*\n?", "", raw_g, flags=re.MULTILINE)
            raw_g = re.sub(r"```\s*$", "", raw_g, flags=re.MULTILINE)
            parsed_g = _json.loads(raw_g.strip())
            if isinstance(parsed_g, list) and len(parsed_g) >= 3:
                result_g: list[dict] = []
                for e in parsed_g:
                    t = _clean_toc_title(str(e.get("title", "")).strip())
                    if not t:
                        continue
                    raw_p = e.get("page")
                    try:
                        p_raw_g: int | None = int(raw_p) if raw_p is not None else None
                        p_g: int | None = p_raw_g if (p_raw_g and p_raw_g > 0) else None
                    except (ValueError, TypeError):
                        p_g = None
                    result_g.append({"title": t, "level": int(e.get("level", 2)), "page": p_g})
                log.info("Groq TOC: %d entries", len(result_g))
                return result_g
        except _urlreq.HTTPError as exc_g:
            if exc_g.code == 429 and _attempt < 2:
                _time_g.sleep(30)
            else:
                log.debug("Groq TOC HTTP %s", exc_g.code)
                break
        except Exception as exc_g:
            log.debug("Groq TOC: %s", exc_g)
            break

    return []


def _reorder_toc_units(toc: list[dict]) -> list[dict]:
    """
    Fix OCR-induced ordering in printed MOE Arabic TOC pages.

    Tesseract reads each unit's lessons BEFORE the large colored unit-header box
    at the top of the page.  This function re-orders so every unit header appears
    BEFORE its own lessons, and removes duplicate unit headers.
    """
    # Dedup: for each Arabic unit ordinal keep only the LAST occurrence in the list
    ordinal_last: dict[str, int] = {}
    for i, e in enumerate(toc):
        if e.get("level") == 1:
            m = _UNIT_RE.search(e.get("title", ""))
            key = m.group(1) if m else f"_anon_{i}"
            ordinal_last[key] = i
    keep_set = set(ordinal_last.values())

    # Remove duplicate unit entries (keep latest per ordinal)
    deduped: list[dict] = [e for i, e in enumerate(toc) if e.get("level") != 1 or i in keep_set]

    unit_idxs = [i for i, e in enumerate(deduped) if e.get("level") == 1]
    if not unit_idxs:
        return deduped

    result: list[dict] = []
    tail_consumed_up_to: int = 0

    for ki, ui in enumerate(unit_idxs):
        unit_e = deduped[ui]

        # Entries BEFORE this unit header (since last tail) = main lessons of this unit
        main_lessons = [e for e in deduped[tail_consumed_up_to:ui] if e.get("level") != 1]

        result.append(unit_e)
        result.extend(main_lessons)

        # Tail: entries AFTER the unit header until the first main "درس" entry
        next_ui = unit_idxs[ki + 1] if ki + 1 < len(unit_idxs) else len(deduped)
        tail_end = ui + 1
        for j in range(ui + 1, next_ui):
            e = deduped[j]
            if e.get("level") == 1:
                break
            title = (e.get("title") or "").strip()
            # A main درس entry signals the start of the NEXT unit's content
            if _LESSON_RE.search(title):
                break
            result.append(e)
            tail_end = j + 1

        tail_consumed_up_to = tail_end

    # Any remaining non-unit entries after the last unit header
    for e in deduped[tail_consumed_up_to:]:
        if e.get("level") != 1:
            result.append(e)

    return result


def _infer_toc_pages_from_content(
    toc: list[dict],
    pages_text: list[tuple[int, str]],
    citation_starts_at_pdf_page: int | None,
) -> list[dict]:
    """
    For TOC entries that still have page=None, search the OCR'd content pages for
    the lesson's key phrase and infer the starting page.

    Works because each MOE lesson starts with a heading on its first page. Even
    low-DPI OCR usually captures enough of the title to make a match.
    """
    if all(e.get("page") is not None for e in toc):
        return toc  # all resolved

    def _key_phrase(title: str) -> str:
        """Extract the most distinctive part of the title for searching."""
        t = title.strip()
        if ":" in t:
            part = t.split(":")[-1].strip()
            if len(part) >= 4:
                return part
        return t

    _cite_offset = (citation_starts_at_pdf_page or 1) - 1  # pdf_page - offset = citation_page

    unresolved = [e for e in toc if e.get("page") is None and e.get("level", 1) >= 2]
    if not unresolved:
        return toc

    for entry in unresolved:
        key = _key_phrase(entry["title"])
        if not key or len(key) < 3:
            continue
        # Try exact then prefix match across content pages (in reading order)
        found_page: int | None = None
        for pno, txt in pages_text:
            if key in txt:
                found_page = pno
                break
        if found_page is None and len(key) > 5:
            # Looser: first 6 chars of key (handles small OCR differences)
            prefix = key[:6]
            for pno, txt in pages_text:
                if prefix in txt:
                    found_page = pno
                    break
        if found_page is not None:
            citation = found_page - _cite_offset
            entry["page"] = max(1, citation)
            log.debug("TOC infer: '%s' → page %s (PDF %s)", entry["title"][:40], entry["page"], found_page)

    resolved = sum(1 for e in toc if e.get("page") is not None)
    log.info("TOC page inference: %d/%d entries have page numbers", resolved, len(toc))
    return toc


def extract_toc_from_pdf(path: str) -> list[dict]:
    """Extract table of contents from PDF embedded outline (bookmarks) using PyMuPDF.

    Returns a list of {title, level, page} dicts, or an empty list if the PDF
    has no embedded outline (common for MOE Egypt scanned/copy-paste PDFs).
    """
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(path)
        try:
            raw = doc.get_toc(simple=False)  # [[level, title, page, dest], ...]
        finally:
            doc.close()

        toc: list[dict] = []
        for entry in raw:
            level = entry[0] if len(entry) > 0 else 1
            title = (entry[1] or "").strip() if len(entry) > 1 else ""
            page = entry[2] if len(entry) > 2 else None
            if title:
                toc.append({"title": title, "level": int(level), "page": int(page) if page else None})
        return toc
    except Exception as e:
        log.debug("TOC extraction failed (non-critical): %s", e)
        return []


def build_synthetic_toc_from_sections(sections: list[dict]) -> list[dict]:
    """Build a synthetic TOC from section headings detected during chunking.

    Used as last resort when the PDF has no embedded outline and printed TOC parsing failed.
    Titles are cleaned of OCR artifacts before inclusion.
    """
    seen: set[str] = set()
    toc: list[dict] = []
    for sec in sections:
        paths = sec.get("section_path") or []
        for idx, title in enumerate(paths):
            title = _clean_toc_title((title or "").strip())
            if not title or title in seen:
                continue
            seen.add(title)
            toc.append({
                "title": title,
                "level": idx + 1,
                "page": sec.get("page_start"),
            })
    return toc


# ─── Hashing ─────────────────────────────────────────────────────────────────

def file_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for blk in iter(lambda: f.read(64 * 1024), b""):
            h.update(blk)
    return h.hexdigest()


# ─── Main ingest ─────────────────────────────────────────────────────────────

def ingest_pdf(
    *,
    file: str,
    title: str,
    title_ar: str | None,
    grade_number: int | None,
    stage_name: str | None,
    stage_id: str | None,
    subject_name: str | None,
    subject_id: str | None,
    force: bool = False,
    content_first_pdf_page: int = 1,
    citation_starts_at_pdf_page: int | None = None,
    skip_trailing_pdf_pages: int = 0,
    toc_json_path: str | None = None,
) -> dict:
    fp_try = Path(file)
    if not fp_try.is_file():
        fp_try = _AI_AGENT_DIR / file
    if not fp_try.is_file():
        return {"error": f"file not found: {file}"}
    file = str(fp_try.resolve())

    if content_first_pdf_page < 1:
        return {"error": "content_first_pdf_page must be >= 1"}
    if citation_starts_at_pdf_page is not None and citation_starts_at_pdf_page < 1:
        return {"error": "citation_starts_at_pdf_page must be >= 1 when set"}
    if skip_trailing_pdf_pages < 0:
        return {"error": "skip_trailing_pdf_pages must be >= 0"}

    sha = file_sha256(file)
    log.info("Hashing → %s", sha[:12])

    # Idempotency: if already ingested with same hash, short-circuit
    existing = (
        supabase.table("rag_books").select("id, total_chunks").eq("file_hash", sha).maybe_single().execute()
    )
    if existing and existing.data:
        if not force:
            log.info("Already ingested: book_id=%s chunks=%s (use --force to re-ingest)",
                     existing.data["id"], existing.data.get("total_chunks"))
            return {"book_id": existing.data["id"], "skipped": True}
        # re-ingest: delete old chunks first
        supabase.table("rag_chunks").delete().eq("book_id", existing.data["id"]).execute()
        supabase.table("rag_books").delete().eq("id", existing.data["id"]).execute()

    # Resolve stage / subject ids
    if not stage_id and stage_name:
        stage_id = find_stage_id(stage_name)
    if not subject_id and subject_name:
        subject_id = find_subject_id(subject_name, grade_number)

    log.info(
        "Reading PDF: %s (from PDF page %s, skip last %s)",
        file,
        content_first_pdf_page,
        skip_trailing_pdf_pages,
    )
    ocr_work: str | None = None
    ocr_meta: dict = {}
    conv_meta: dict = {"converter": "none"}
    pages: list[tuple[int, str]] = []
    sections: list[dict] = []
    try:
        source_pdf, ocr_meta = maybe_ocr_pdf(file)
        if ocr_meta.get("ocr_applied"):
            ocr_work = source_pdf
            log.info("OCR pipeline: %s", ocr_meta)
        frag = ocr_meta.get("text_layer_fragmentation") or {}
        # Severe = frag_max ≥ 0.48 or frag_mean ≥ 0.28 across sampled pages.
        # In this case we OCR every page in parallel (fast path) instead of the
        # slow ocrmypdf --redo-ocr over the full document.
        frag_max_val = float(frag.get("frag_max") or 0.0)
        frag_mean_val = float(frag.get("frag_mean") or 0.0)
        _SEVERE_MAX = float(os.getenv("RAG_OCR_GLOBAL_FORCE_SEVERE_MAX", "0.48"))
        _SEVERE_MEAN = float(os.getenv("RAG_OCR_GLOBAL_FORCE_SEVERE_MEAN", "0.28"))
        severe_layer = (
            bool(frag.get("bad"))
            and not ocr_meta.get("ocr_applied")
            and (frag_max_val >= _SEVERE_MAX or frag_mean_val >= _SEVERE_MEAN)
        )
        if frag.get("bad") and not ocr_meta.get("ocr_applied"):
            if severe_layer:
                log.warning(
                    "Arabic text layer severely corrupted (frag_max=%s frag_mean=%s); "
                    "will OCR all pages in parallel with Tesseract (fast path).",
                    frag.get("frag_max"), frag.get("frag_mean"),
                )
            else:
                log.warning(
                    "Arabic text layer looks corrupted (frag_max=%s), "
                    "using capped per-page OCR fallback.",
                    frag.get("frag_max"),
                )

        pages = read_pdf_pages(
            source_pdf,
            min_pdf_page=content_first_pdf_page,
            skip_trailing_pdf_pages=skip_trailing_pdf_pages,
        )
        log.info("  %d pages with text (after skipping front matter)", len(pages))
        pages, rev_meta = maybe_replace_reversed_pages(
            source_pdf, pages, text_quality_score=text_quality_score,
            force_all=severe_layer,
        )
        if rev_meta.get("reversal_ocr_pages"):
            log.info(
                "  reversal page OCR applied: %s",
                rev_meta.get("reversal_ocr_pages"),
            )
        frag_done = len(rev_meta.get("fragmentation_ocr_pages") or [])
        frag_skip = len(rev_meta.get("fragmentation_ocr_skipped") or [])
        rev_done = len(rev_meta.get("reversal_ocr_pages") or [])
        rev_skip = len(rev_meta.get("reversal_ocr_skipped") or [])
        log.info(
            "  page OCR summary: replaced=%d (frag=%d,rev=%d), skipped=%d (frag=%d,rev=%d)",
            frag_done + rev_done,
            frag_done,
            rev_done,
            frag_skip + rev_skip,
            frag_skip,
            rev_skip,
        )
        ocr_meta["page_reversal"] = rev_meta

        if not pages:
            return {"error": "no_text_pages: check PDF, OCR (RAG_OCRMYPDF), or content_first_pdf_page"}

        md, conv_meta = pdf_to_markdown_via_docling(source_pdf)
        if conv_meta.get("converter") == "docling":
            log.info("Docling markdown extracted (%d chars)", len(md or ""))

        blob = markdown_to_blob(md, pages)
        fb_lo, fb_hi = pages[0][0], pages[-1][0]
        sections = build_lesson_sections(blob, pdf_page_bounds=(fb_lo, fb_hi))

        toc_arg_resolved: str | None = None
        if toc_json_path:
            tp = Path(toc_json_path)
            if not tp.is_file():
                tp = _AI_AGENT_DIR / toc_json_path.lstrip("/\\")
            if tp.is_file():
                toc_arg_resolved = str(tp.resolve())
            else:
                log.warning("TOC JSON path not found (skipping): %s", toc_json_path)

        toc_override = load_toc_override(file, toc_arg_resolved)
        if toc_override:
            toc = toc_override
            log.info("Using editor TOC override / sidecar: %d entries", len(toc))
        else:
            # Priority 1: embedded PDF bookmarks
            toc = extract_toc_from_pdf(source_pdf)
            if toc:
                log.info("PDF outline TOC: %d entries", len(toc))

            # Priority 2: parse the printed فهرس pages (re-OCR at 300 DPI for accuracy)
            if not toc:
                toc = extract_printed_toc(
                    source_pdf,
                    pages,
                    content_first_pdf_page=content_first_pdf_page,
                )

            # Priority 3: synthetic from section headings detected in content
            if not toc:
                toc = build_synthetic_toc_from_sections(sections)
                if toc:
                    log.info("Built synthetic TOC from %d heading sections", len(toc))

        # Post-process: fix OCR reading-order ONLY when units appear after their
        # lessons (Tesseract text artifact).  Vision/bookmark TOC already has correct order.
        first_unit_pos = next((i for i, e in enumerate(toc) if e.get("level") == 1), None)
        first_lesson_pos = next((i for i, e in enumerate(toc) if e.get("level") == 2), None)
        needs_reorder = (
            first_unit_pos is not None
            and first_lesson_pos is not None
            and first_unit_pos > first_lesson_pos
        )
        if needs_reorder:
            toc = _reorder_toc_units(toc)
        # Fix duplicate word artifact: "الوحدة الوحدة الأولى" → "الوحدة الأولى"
        for entry in toc:
            entry["title"] = re.sub(
                r"\b(الوحدة|الفصل)\s+\1\b", r"\1", entry.get("title", "")
            )

        # Post-process: page=0 is an OCR artifact, treat as unknown
        for entry in toc:
            if entry.get("page") == 0:
                entry["page"] = None

        # Post-process: fill in missing page numbers by searching content pages
        if toc and any(e.get("page") is None for e in toc):
            toc = _infer_toc_pages_from_content(
                toc, pages, citation_starts_at_pdf_page
            )
    finally:
        cleanup_temp(ocr_work, original=file)

    # Insert book row
    book_payload = {
        "title": title,
        "title_ar": title_ar or title,
        "stage_id": stage_id,
        "grade_number": grade_number,
        "subject_id": subject_id,
        "subject_name": subject_name,
        "source_file": os.path.relpath(file, _AI_AGENT_DIR),
        "file_hash": sha,
        "total_pages": len(pages),
        "total_chunks": 0,
        "toc_json": toc if toc else None,
    }
    book_ins = supabase.table("rag_books").insert(book_payload).execute()
    book_id = (book_ins.data or [{}])[0].get("id")
    if not book_id:
        return {"error": "failed to insert book row"}
    log.info("Book inserted: %s", book_id)

    # Chunk + embed + insert
    total_chunks = 0
    BATCH = max(1, DEFAULT_INSERT_BATCH)

    # Pre-flight: try one embedding before processing the whole book so we
    # fail-fast (and avoid leaving an empty book in the DB).
    try:
        embed_text("اختبار", task_type="RETRIEVAL_DOCUMENT")
    except EmbeddingError as e:
        supabase.table("rag_books").delete().eq("id", book_id).execute()
        return {"error": f"embedding_unavailable: {e}"}

    pipeline_meta = {"ocr": ocr_meta, "markdown_converter": conv_meta}
    chunks_meta: list[dict[str, Any]] = []
    for sec in sections:
        raw = sec.get("content") or ""
        content_display = clean_arabic_display(raw)
        content_embed = content_for_embedding_from_display(content_display)
        if is_noise_chunk(content_display):
            continue
        q = text_quality_score(content_display)
        if q < MIN_QUALITY:
            log.debug("skip low quality_score=%.3f (< %.3f)", q, MIN_QUALITY)
            continue
        ps = sec.get("page_start")
        pe = sec.get("page_end")
        if ps is None:
            continue
        pdf_ps = int(ps)
        pdf_pe = int(pe) if pe is not None else pdf_ps
        citation_page = _stored_page_number(pdf_ps, citation_starts_at_pdf_page)
        extra = {
            **pipeline_meta,
            "section_path": sec.get("section_path") or [],
        }
        raw_lesson = sec.get("lesson_title")
        raw_activity = sec.get("activity_title")
        raw_path = sec.get("section_path") or []
        chunks_meta.append({
            "chunk_index": len(chunks_meta),
            "page_number": citation_page,
            "page_start": pdf_ps,
            "page_end": pdf_pe,
            "content": content_display,
            "content_display": content_display,
            "content_for_embedding": content_embed,
            "quality_score": round(q, 4),
            "lesson_title": _clean_toc_title(raw_lesson) if raw_lesson else None,
            "activity_title": _clean_toc_title(raw_activity) if raw_activity else None,
            "section_path": [_clean_toc_title(p) for p in raw_path if p],
            "chunk_kind": sec.get("chunk_kind"),
            "extra_metadata": extra,
        })

    if not chunks_meta:
        supabase.table("rag_books").delete().eq("id", book_id).execute()
        return {"error": "no_chunks_after_cleaning: lower RAG_MIN_QUALITY, enable OCR, or check PDF extract"}

    log.info("Embedding %d lesson/activity chunks in batches of %d …", len(chunks_meta), BATCH)
    for start in range(0, len(chunks_meta), BATCH):
        slice_meta = chunks_meta[start:start + BATCH]
        try:
            embeddings = embed_batch(
                [c["content_for_embedding"] for c in slice_meta],
                task_type="RETRIEVAL_DOCUMENT",
            )
        except EmbeddingError as e:
            supabase.table("rag_chunks").delete().eq("book_id", book_id).execute()
            supabase.table("rag_books").delete().eq("id", book_id).execute()
            return {"error": f"embedding_failed_mid_ingest: {e}"}

        rows = []
        for row_d, emb in zip(slice_meta, embeddings):
            rows.append({
                "book_id": book_id,
                "chunk_index": row_d["chunk_index"],
                "page_number": row_d["page_number"],
                "page_start": row_d["page_start"],
                "page_end": row_d["page_end"],
                "content": row_d["content"],
                "content_display": row_d["content_display"],
                "content_for_embedding": row_d["content_for_embedding"],
                "content_tokens_est": max(1, len(row_d["content_for_embedding"]) // 4),
                "embedding": emb,
                "quality_score": row_d["quality_score"],
                "lesson_title": row_d["lesson_title"],
                "activity_title": row_d["activity_title"],
                "section_path": row_d["section_path"],
                "chunk_kind": row_d["chunk_kind"],
                "extra_metadata": row_d["extra_metadata"],
            })
        supabase.table("rag_chunks").insert(rows).execute()
        total_chunks += len(rows)
        log.info("  inserted %d chunks (total=%d / %d)", len(rows), total_chunks, len(chunks_meta))

    supabase.table("rag_books").update({"total_chunks": total_chunks}).eq("id", book_id).execute()
    log.info("DONE — book_id=%s pages=%d chunks=%d", book_id, len(pages), total_chunks)
    return {"book_id": book_id, "pages": len(pages), "chunks": total_chunks}


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingest an Arabic textbook PDF into the RAG store.")
    p.add_argument("--file", required=True, help="Path to PDF (relative to ai_agent/ or absolute)")
    p.add_argument("--title", required=True, help="Book title (English or Arabic)")
    p.add_argument("--title-ar", default=None, help="Arabic title (defaults to --title)")
    p.add_argument("--grade", type=int, default=None, help="Grade number (1..12 / 1..3 etc.)")
    p.add_argument("--stage-name", default=None, help="ابتدائى / اعدادى / ثانوى عام / etc.")
    p.add_argument("--stage-id", default=None, help="Direct stage UUID (skips name lookup)")
    p.add_argument("--subject-name", default=None, help="مثال: اللغة العربية")
    p.add_argument("--subject-id", default=None, help="Direct subject UUID")
    p.add_argument("--force", action="store_true", help="Re-ingest even if file_hash already exists")
    p.add_argument(
        "--content-first-pdf-page",
        type=int,
        default=1,
        metavar="N",
        help="1-based PDF page where body text starts (skip TOC / front matter before this page).",
    )
    p.add_argument(
        "--citation-starts-at-pdf-page",
        type=int,
        default=None,
        metavar="N",
        help="If set, stored page_number = PDF_page - N + 1 (e.g. N=6 when printed page 1 is PDF page 6). Omit to store raw PDF page numbers.",
    )
    p.add_argument(
        "--skip-trailing-pdf-pages",
        type=int,
        default=0,
        metavar="N",
        help="Exclude last N PDF pages (back-of-book index). Try 5–25 if chunks are full of dotted TOC lines.",
    )
    p.add_argument(
        "--toc-json",
        default=None,
        metavar="PATH",
        help="Explicit TOC JSON file (array of {title,level,page}). Overrides sidecar <pdf>.toc.json.",
    )
    return p.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    out = ingest_pdf(
        file=args.file,
        title=args.title,
        title_ar=args.title_ar,
        grade_number=args.grade,
        stage_name=args.stage_name,
        stage_id=args.stage_id,
        subject_name=args.subject_name,
        subject_id=args.subject_id,
        force=args.force,
        content_first_pdf_page=args.content_first_pdf_page,
        citation_starts_at_pdf_page=args.citation_starts_at_pdf_page,
        skip_trailing_pdf_pages=args.skip_trailing_pdf_pages,
        toc_json_path=args.toc_json,
    )
    print(out)
