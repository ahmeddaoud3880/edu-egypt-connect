"""Arabic normalization for RAG: tashkīl removal, display cleanup, reversed-extract heuristics, page OCR."""
from __future__ import annotations

import concurrent.futures
import logging
import os
import re
import shutil
import subprocess
import tempfile
import unicodedata
from typing import Any

log = logging.getLogger("egypt_edu.rag.arabic_text")

# Arabic diacritics / quranic annotation marks (common in textbooks)
_TASHKEEL_RE = re.compile(
    "["
    "\u0610-\u061A"
    "\u064B-\u065F"
    "\u0670"
    "\u06D6-\u06ED"
    "\u08D4-\u08FF"
    "]"
)

_AR_LETTER = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]")


def _ocr_env_with_known_bins() -> dict[str, str]:
    env = dict(os.environ)
    path = env.get("PATH", "")
    extra: list[str] = []
    for p in (
        r"C:\Program Files\Tesseract-OCR",
        r"C:\Program Files\gs\gs10.07.0\bin",
        r"C:\Program Files\gs\gs10.06.0\bin",
        r"C:\Program Files\gs\gs10.05.1\bin",
    ):
        if os.path.isdir(p):
            extra.append(p)
    if extra:
        env["PATH"] = ";".join(extra + [path]) if path else ";".join(extra)
    return env


def remove_tashkeel(text: str) -> str:
    """Strip Arabic harakāt / tanwīn / shadda and related combining marks."""
    if not text:
        return ""
    return _TASHKEEL_RE.sub("", text)


def strip_pdf_control_chars(text: str) -> str:
    """Remove PDF junk (Cc control codes) but keep newlines and tabs."""
    if not text:
        return ""
    out: list[str] = []
    for c in text:
        if c in "\n\r\t":
            out.append(c)
            continue
        if unicodedata.category(c) == "Cc":
            continue
        if ord(c) == 0xFEFF:
            continue
        out.append(c)
    return "".join(out)


def arabic_text_layer_fragmentation_score(text: str) -> float:
    """
    0 = normal prose, up to ~1 = copy-paste layer probably broken
    (many 1–2 letter Arabic tokens = glyph stream / encoding issues).
    """
    t = strip_pdf_control_chars(unicodedata.normalize("NFKC", text or ""))
    nt = remove_tashkeel(re.sub(r"\s+", " ", t)).strip()
    words = nt.split()
    if len(words) < 14:
        return 0.0
    ar_words = [w for w in words if any("\u0600" <= c <= "\u06FF" for c in w)]
    if len(ar_words) < 14:
        return 0.0
    singles = sum(1 for w in ar_words if len(w) == 1)
    twos = sum(1 for w in ar_words if len(w) == 2)
    return min(1.0, (singles + twos * 0.35) / max(len(ar_words), 1))


def _arabic_letter_ratio(s: str) -> float:
    if not s:
        return 0.0
    ar = len(_AR_LETTER.findall(s))
    letters = sum(1 for c in s if c.isalpha() or ("\u0600" <= c <= "\u06FF"))
    denom = max(letters, len(s) * 0.35, 1)
    return ar / denom


def _arab_adjacency_score(s: str) -> int:
    """Count adjacent pairs of Arabic letters (coherence proxy for order)."""
    letters = [c for c in s if "\u0600" <= c <= "\u06FF" and c.isalpha()]
    if len(letters) < 2:
        return 0
    return sum(1 for a, b in zip(letters, letters[1:]) if a.isalpha() and b.isalpha())


def _line_reversal_signal(line: str) -> float:
    """Heuristic: word-order or glyph order looks LTR-broken vs reversed fix (0..1)."""
    line = line.strip()
    if len(line) < 14:
        return 0.0
    if _arabic_letter_ratio(line) < 0.42:
        return 0.0
    nt = remove_tashkeel(unicodedata.normalize("NFKC", line))

    words = nt.split()
    if len(words) >= 4:
        jf = " ".join(words)
        jr = " ".join(reversed(words))
        af = _arab_adjacency_score(jf)
        br = _arab_adjacency_score(jr)
        if br > af * 1.12 and br - af >= 4:
            return min(1.0, 0.35 + (br - af) / max(af + br, 1))

    core = "".join(c for c in nt if not c.isspace())
    if len(core) >= 22 and _arabic_letter_ratio(core) > 0.48:
        af = _arab_adjacency_score(core)
        br = _arab_adjacency_score(core[::-1])
        if br > af * 1.14 and br - af >= 5:
            return min(1.0, 0.5 + (br - af) / max(af + br + 1, 1))
    return 0.0


def page_text_looks_reversed(page_text: str) -> bool:
    """True if extract heuristics suggest reversed Arabic order ( warrants page OCR )."""
    mode = (os.getenv("RAG_PAGE_REVERSAL_OCR") or "auto").strip().lower()
    if mode in ("0", "false", "no", "off", "never"):
        return False
    lines = [ln for ln in (page_text or "").splitlines() if len(ln.strip()) > 12]
    if not lines:
        return False
    sigs = [_line_reversal_signal(ln) for ln in lines]
    if max(sigs) >= 0.52:
        return True
    strong = sum(1 for s in sigs if s >= 0.22)
    if strong >= 2 and strong / len(lines) >= 0.25:
        return True
    return (sum(sigs) / max(len(lines), 1)) >= 0.20


def clean_page_text(raw: str) -> str:
    """Strip TOC leaders, margin numbers, bidi controls; NFKC (PDF extract)."""
    if not raw:
        return ""
    t = unicodedata.normalize("NFKC", raw)
    t = strip_pdf_control_chars(t)
    t = t.replace("\u00ad", "").replace("\u200c", "")
    t = re.sub(r"[\u200e\u200f\u202a-\u202e]", "", t)
    t = re.sub(r"[ \t]+", " ", t)
    out_lines: list[str] = []
    for line in t.splitlines():
        line = line.strip()
        if not line:
            continue
        no_dots = re.sub(r"[.\u00b7•\|\s\-_:،]+", "", line)
        if len(line) >= 10 and len(no_dots) < max(6, len(line) * 0.12):
            continue
        if re.fullmatch(r"[0-9٠-٩٬,\s]+", line) and len(re.sub(r"\s", "", line)) <= 5:
            continue
        out_lines.append(line)
    return "\n".join(out_lines).strip()


# Matches any Latin word (including single letters — Tesseract reads Arabic exercise
# labels like ج،ب،أ as latin a/b/c or random ascii when OCR confidence is low).
_LATIN_WORD = re.compile(r"\b[A-Za-z]+\b")
_NOISE_LINE = re.compile(
    r"^[A-Za-z0-9\s\(\)\[\]{}\|\\/\+\-\*=@#$%^&_~`\"'<>,.;:!?]{4,}$"
)


def filter_ocr_noise(text: str) -> str:
    """
    Remove OCR artifacts from Arabic textbook content:
    - Lines with < 30 % Arabic characters (pure Latin/numeric noise)
    - ALL isolated Latin tokens (single letters included) inside Arabic lines
      — Tesseract misreads Arabic exercise labels (أ/ب/ج) as a/b/c and
        coloured-background glyphs as random ASCII (e.g. "gi", "EES", "Sdudiy")
    - Lines that collapse to near-nothing after Latin removal

    Keeps Arabic text, Arabic-script words, numbers, parentheses and punctuation.
    """
    if not text:
        return text

    output_lines: list[str] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            output_lines.append("")
            continue

        total = len(re.sub(r"\s", "", line))
        if total == 0:
            continue

        ar_chars = len(_AR_LETTER.findall(line))
        ar_ratio = ar_chars / total

        # Drop lines with NO Arabic at all — keep only digit/punctuation lines
        if ar_chars == 0:
            if not re.match(r'^[0-9٠-٩\(\)\[\]،؛:!؟.\s\-]+$', line):
                continue

        # Drop lines with low Arabic content (mostly Latin/numeric garbage)
        elif ar_ratio < 0.30 and total > 8:
            continue

        # Strip ALL isolated Latin tokens from lines that contain Arabic.
        # Covers: single-letter artifacts, short noise (gi/BW), longer garbles (Sdudiy/endl),
        # and Latin letters glued to digits e.g. "C58" → "58".
        if ar_chars > 0:
            line = _LATIN_WORD.sub("", line)
            line = re.sub(r"[A-Za-z]+(?=\d)", "", line)
            line = re.sub(r"(?<=\d)[A-Za-z]+", "", line)
            line = re.sub(r"\s{2,}", " ", line).strip()

        # After cleaning, drop lines that have almost no useful content left
        if not line:
            continue
        clean_total = len(re.sub(r"\s", "", line))
        if clean_total <= 4 and len(_AR_LETTER.findall(line)) < 2:
            continue

        output_lines.append(line)

    return "\n".join(output_lines).strip()


def clean_arabic_display(text: str) -> str:
    """Readable Arabic for UI: NFKC, no bidi controls, tidy whitespace, keep harakāt unless stripped later."""
    if not text:
        return ""
    t = unicodedata.normalize("NFKC", text)
    t = strip_pdf_control_chars(t)
    t = t.replace("\u00ad", "").replace("\u200c", "").replace("\ufeff", "")
    t = re.sub(r"[\u200e\u200f\u202a-\u202e]", "", t)
    t = re.sub(r"[ \t\u00a0]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    # Remove OCR noise introduced by low-DPI Tesseract on Arabic scans
    t = filter_ocr_noise(t)
    return t.strip()


def content_for_embedding_from_display(display: str) -> str:
    """Lexical + vector form: unstressed, compact spaces."""
    t = remove_tashkeel(clean_arabic_display(display))
    t = re.sub(r"\s+", " ", t).strip()
    return t


def ocr_pdf_page_tesseract(pdf_path: str, page_1based: int, *, lang: str | None = None) -> str:
    """Render one PDF page and run Tesseract (optional binary on PATH)."""
    lang = lang or os.getenv("RAG_PAGE_OCR_LANGUAGE", os.getenv("RAG_OCR_LANGUAGE", "ara+eng"))
    tess = shutil.which("tesseract")
    if not tess:
        return ""
    try:
        import fitz  # PyMuPDF
    except Exception as e:
        log.debug("PyMuPDF missing for page OCR: %s", e)
        return ""
    dpi = int(os.getenv("RAG_PAGE_OCR_DPI", "200"))
    doc = fitz.open(pdf_path)
    try:
        page = doc[page_1based - 1]
        pix = page.get_pixmap(dpi=dpi)
        img_bytes = pix.tobytes("png")
    finally:
        doc.close()
    work = tempfile.mkdtemp(prefix="tess_pg_")
    png_path = os.path.join(work, "page.png")
    out_base = os.path.join(work, "out")
    try:
        with open(png_path, "wb") as f:
            f.write(img_bytes)
        subprocess.run(
            [tess, png_path, out_base, "-l", lang],
            check=True,
            capture_output=True,
            text=True,
            timeout=int(os.getenv("RAG_PAGE_OCR_TIMEOUT_SEC", "120")),
            env=_ocr_env_with_known_bins(),
        )
        out_txt = out_base + ".txt"
        if os.path.isfile(out_txt):
            with open(out_txt, encoding="utf-8", errors="replace") as f:
                return f.read()
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError) as e:
        log.debug("tesseract page %s OCR failed: %s", page_1based, e)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return ""


def _bulk_parallel_ocr_all_pages(
    pdf_path: str,
    page_numbers: list[int],
    *,
    lang: str | None = None,
    dpi: int = 150,
    workers: int | None = None,
) -> dict[int, str]:
    """
    Render all requested pages as PNG images then run Tesseract on them in parallel.

    Designed for PDFs whose entire text layer is corrupted (MOE copy-paste encoding).
    Rendering (PyMuPDF) happens in the main thread; only Tesseract subprocesses are
    parallelised, so there are no thread-safety concerns with fitz.

    Returns {page_1based: raw_ocr_text}. Empty string means OCR failed for that page.
    """
    lang = lang or os.getenv("RAG_PAGE_OCR_LANGUAGE", os.getenv("RAG_OCR_LANGUAGE", "ara+eng"))
    tess = shutil.which("tesseract")
    if not tess:
        log.warning("tesseract not on PATH — cannot bulk-OCR pages; install Tesseract with ara+eng")
        return {}
    try:
        import fitz  # PyMuPDF
    except Exception as exc:
        log.warning("PyMuPDF missing for bulk page OCR: %s", exc)
        return {}

    # Render all pages → PNG bytes in the main thread (fast, ~10 ms/page).
    log.info("Bulk OCR: rendering %d pages at %d DPI …", len(page_numbers), dpi)
    doc = fitz.open(pdf_path)
    page_images: dict[int, bytes] = {}
    try:
        for pno in page_numbers:
            try:
                pix = doc[pno - 1].get_pixmap(dpi=dpi)
                page_images[pno] = pix.tobytes("png")
            except Exception as exc:
                log.debug("Render page %s failed: %s", pno, exc)
    finally:
        doc.close()

    timeout_sec = int(os.getenv("RAG_PAGE_OCR_TIMEOUT_SEC", "120"))
    env = _ocr_env_with_known_bins()

    def _ocr_one(pno: int) -> tuple[int, str]:
        img_bytes = page_images.get(pno)
        if not img_bytes:
            return pno, ""
        work = tempfile.mkdtemp(prefix=f"tess_bulk_{pno}_")
        png_path = os.path.join(work, "page.png")
        out_base = os.path.join(work, "out")
        try:
            with open(png_path, "wb") as f:
                f.write(img_bytes)
            subprocess.run(
                [tess, png_path, out_base, "-l", lang],
                check=True,
                capture_output=True,
                text=True,
                timeout=timeout_sec,
                env=env,
            )
            out_txt = out_base + ".txt"
            if os.path.isfile(out_txt):
                with open(out_txt, encoding="utf-8", errors="replace") as f:
                    return pno, f.read()
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError) as exc:
            log.debug("Bulk Tesseract page %s failed: %s", pno, exc)
        finally:
            shutil.rmtree(work, ignore_errors=True)
        return pno, ""

    n_workers = workers or max(1, min(os.cpu_count() or 4, len(page_numbers), 8))
    log.info(
        "Bulk OCR: Tesseract on %d pages with %d parallel workers (lang=%s dpi=%d) …",
        len(page_numbers), n_workers, lang, dpi,
    )
    results: dict[int, str] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=n_workers) as pool:
        for pno, text in pool.map(_ocr_one, page_numbers):
            results[pno] = text
    done = sum(1 for t in results.values() if t.strip())
    log.info("Bulk OCR: finished — %d/%d pages produced text", done, len(page_numbers))
    return results


def maybe_replace_reversed_pages(
    pdf_path: str,
    pages: list[tuple[int, str]],
    *,
    text_quality_score: Any,
    force_all: bool = False,
) -> tuple[list[tuple[int, str]], dict[str, Any]]:
    """
    For pages flagged as reversed/fragmented, replace extract with Tesseract OCR when it
    improves quality.

    When ``force_all=True`` (set by caller when the entire PDF has a corrupted text layer),
    all pages are OCR'd in parallel via :func:`_bulk_parallel_ocr_all_pages` and the slow
    per-page quality comparison is skipped.  This is the fast path for MOE PDFs where
    frag_max ≥ 0.48 / frag_mean ≥ 0.28.
    """
    meta: dict[str, Any] = {
        "reversal_ocr_pages": [],
        "reversal_ocr_skipped": [],
        "fragmentation_ocr_pages": [],
        "fragmentation_ocr_skipped": [],
    }

    mode = (os.getenv("RAG_PAGE_REVERSAL_OCR") or "auto").strip().lower()
    if mode in ("0", "false", "no", "off", "never") and not force_all:
        return pages, meta

    # ── Fast path: all pages corrupted → parallel bulk Tesseract ──────────────
    if force_all:
        bulk_dpi = int(os.getenv("RAG_BULK_OCR_DPI", "200"))
        bulk_workers = int(os.getenv("RAG_BULK_OCR_WORKERS", "0")) or None
        page_numbers = [pno for pno, _ in pages]
        bulk = _bulk_parallel_ocr_all_pages(
            pdf_path, page_numbers, dpi=bulk_dpi, workers=bulk_workers
        )
        out: list[tuple[int, str]] = []
        for pno, orig_txt in pages:
            ocr_clean = clean_page_text(bulk.get(pno, ""))
            if ocr_clean and len(ocr_clean) >= 20:
                meta["fragmentation_ocr_pages"].append(pno)
                out.append((pno, ocr_clean))
            else:
                meta["fragmentation_ocr_skipped"].append(pno)
                out.append((pno, orig_txt))
        return out, meta

    # ── Normal path: selectively OCR reversed / fragmented pages ──────────────
    frag_thr = float(os.getenv("RAG_PAGE_FRAGMENTATION_OCR_THRESHOLD", "0.18"))
    max_pages = max(1, int(os.getenv("RAG_PAGE_OCR_MAX_PAGES", "40")))
    frag_scores = {pno: arabic_text_layer_fragmentation_score(txt) for pno, txt in pages}
    frag_candidates = [
        pno for pno, s in sorted(frag_scores.items(), key=lambda it: it[1], reverse=True)
        if s >= frag_thr
    ]
    frag_allowed = set(frag_candidates[:max_pages])
    out = []
    for pno, txt in pages:
        is_reversed = page_text_looks_reversed(txt)
        frag_score = float(frag_scores.get(pno, 0.0))
        is_fragmented = (pno in frag_allowed and frag_score >= frag_thr)
        if not (is_reversed or is_fragmented):
            out.append((pno, txt))
            continue
        ocr_raw = ocr_pdf_page_tesseract(pdf_path, pno)
        ocr_clean = clean_page_text(ocr_raw)
        if not ocr_clean or len(ocr_clean) < 40:
            if is_reversed:
                meta["reversal_ocr_skipped"].append(pno)
            if is_fragmented:
                meta["fragmentation_ocr_skipped"].append(pno)
            out.append((pno, txt))
            continue
        q_old = float(text_quality_score(txt))
        q_new = float(text_quality_score(ocr_clean))
        frag_new = arabic_text_layer_fragmentation_score(ocr_clean)
        frag_improved = frag_new <= frag_score * 0.78 or (frag_score - frag_new) >= 0.08
        quality_ok = q_new >= q_old * 0.88 or (q_new >= 0.28 and q_new - q_old >= 0.08)
        if quality_ok or (is_fragmented and frag_improved):
            if is_reversed:
                meta["reversal_ocr_pages"].append(pno)
            if is_fragmented:
                meta["fragmentation_ocr_pages"].append(pno)
            out.append((pno, ocr_clean))
            why = []
            if is_reversed:
                why.append("reversal")
            if is_fragmented:
                why.append(f"fragmentation={frag_score:.3f}")
            log.info(
                "Page %s: replaced extract with Tesseract (%s) q %.2f→%.2f frag %.3f→%.3f",
                pno, ",".join(why), q_old, q_new, frag_score, frag_new,
            )
        else:
            if is_reversed:
                meta["reversal_ocr_skipped"].append(pno)
            if is_fragmented:
                meta["fragmentation_ocr_skipped"].append(pno)
            out.append((pno, txt))
    return out, meta
