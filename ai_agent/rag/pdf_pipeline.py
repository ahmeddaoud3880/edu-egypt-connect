"""Optional preprocessing: OCRmyPDF (+ Arabic/English Tesseract), Docling → Markdown."""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

log = logging.getLogger("egypt_edu.rag.pdf_pipeline")

RAG_OCRMYPDF = (os.getenv("RAG_OCRMYPDF") or "auto").strip().lower()
RAG_PDF_CONVERTER = (os.getenv("RAG_PDF_CONVERTER") or "pymupdf").strip().lower()
RAG_DOCLING_DEVICE = (os.getenv("RAG_DOCLING_DEVICE") or "cpu").strip().lower()
AUTO_OCR_MAX_CHARS_PER_PAGE = float(os.getenv("RAG_OCR_AUTO_CHARS_PER_PAGE", "38"))
_AUTO_DOCLING_MIN_AVG = float(os.getenv("RAG_AUTO_DOCLING_MIN_CHARS_PER_PAGE", "32"))
FRAG_SAMPLE_PAGES = max(4, int(os.getenv("RAG_OCR_FRAG_SAMPLE_PAGES", "14")))
FRAG_MAX = float(os.getenv("RAG_OCR_FRAG_MAX", "0.17"))
FRAG_MEAN = float(os.getenv("RAG_OCR_FRAG_MEAN", "0.10"))
FRAG_FRAC_HIGH = float(os.getenv("RAG_OCR_FRAG_FRAC_HIGH", "0.35"))
OCR_GLOBAL_ON_BAD_LAYER = (os.getenv("RAG_OCR_GLOBAL_ON_BAD_LAYER") or "0").strip().lower() in (
    "1",
    "true",
    "yes",
    "on",
)
OCR_JOBS = max(1, int(os.getenv("RAG_OCR_JOBS", "4")))
OCR_GLOBAL_FORCE_SEVERE_MEAN = float(os.getenv("RAG_OCR_GLOBAL_FORCE_SEVERE_MEAN", "0.28"))
OCR_GLOBAL_FORCE_SEVERE_MAX = float(os.getenv("RAG_OCR_GLOBAL_FORCE_SEVERE_MAX", "0.48"))
# When 1: severely fragmented Arabic layer triggers full-PDF OCRmyPDF (--redo-ocr) even if
# RAG_OCR_GLOBAL_ON_BAD_LAYER=0. This is accurate but very slow on 100+ page books.
# Default 0: skip global OCR and rely on ingest's capped per-page Tesseract fallback (faster).
OCR_FORCE_SEVERE_ENABLED = (os.getenv("RAG_OCR_FORCE_SEVERE_ENABLED") or "0").strip().lower() in (
    "1",
    "true",
    "yes",
    "on",
)


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


def _docling_device_str() -> str:
    d = RAG_DOCLING_DEVICE
    if d in ("cpu", "cuda", "auto", "mps", "xpu"):
        return d
    if d.startswith("cuda:"):
        return d
    return "cpu"


def _suppress_noisy_docling_loggers() -> None:
    for name in (
        "docling",
        "docling_core",
        "RapidOCR",
        "rapidocr",
        "docling_ibm_models",
        "transformers.models",
    ):
        logging.getLogger(name).setLevel(logging.WARNING)


def _build_docling_converter():
    from docling.datamodel.base_models import InputFormat  # type: ignore
    from docling.document_converter import DocumentConverter, PdfFormatOption  # type: ignore
    from docling.pipeline.standard_pdf_pipeline import StandardPdfPipeline  # type: ignore

    pipe_opts = StandardPdfPipeline.get_default_options()
    pipe_opts.accelerator_options.device = _docling_device_str()
    tsec = os.getenv("RAG_DOCLING_TIMEOUT_SEC", "").strip()
    if tsec:
        try:
            pipe_opts.document_timeout = float(tsec)
        except ValueError:
            pass
    return DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipe_opts),
        },
    )


def _avg_chars_per_page_pdf(path: str, *, sample_pages: int = 5) -> float:
    try:
        import fitz  # PyMuPDF
    except Exception:
        return 999.0
    doc = fitz.open(path)
    try:
        n = doc.page_count
        if n <= 0:
            return 0.0
        total = 0
        take = min(n, sample_pages)
        for i in range(take):
            t = doc.load_page(i).get_text("text") or ""
            total += len(t.strip())
        return total / max(take, 1)
    finally:
        doc.close()


def _pdf_text_layer_fragmentation_audit(path: str) -> dict[str, Any]:
    """Detect MOE-style PDFs whose text layer is present but unusable (glyph order / encoding)."""
    from rag.arabic_text import arabic_text_layer_fragmentation_score

    try:
        import fitz  # PyMuPDF
    except Exception:
        return {"bad": False, "reason": "fitz_unavailable"}
    doc = fitz.open(path)
    try:
        n = doc.page_count
        if n <= 0:
            return {"bad": False, "pages": 0, "sampled": 0}
        step = max(1, n // max(1, FRAG_SAMPLE_PAGES))
        scores: list[float] = []
        for i in range(0, n, step):
            if len(scores) >= FRAG_SAMPLE_PAGES:
                break
            raw = doc.load_page(i).get_text("text", sort=True) or ""
            scores.append(arabic_text_layer_fragmentation_score(raw))
        if not scores:
            return {"bad": False, "pages": n, "sampled": 0}
        mean = sum(scores) / len(scores)
        mx = max(scores)
        frac_high = sum(1 for s in scores if s >= FRAG_MAX) / len(scores)
        bad = mx >= FRAG_MAX or mean >= FRAG_MEAN or frac_high >= FRAG_FRAC_HIGH
        return {
            "bad": bad,
            "pages": n,
            "sampled": len(scores),
            "frag_mean": round(mean, 4),
            "frag_max": round(mx, 4),
            "frag_frac_high": round(frac_high, 4),
        }
    finally:
        doc.close()


def maybe_ocr_pdf(src_path: str, *, force: bool = False) -> tuple[str, dict]:
    """
    Return (path_to_use, meta). When OCR is skipped, path_to_use == src_path.
    OCR writes a temp file; caller may delete when done with ingest.
    """
    meta: dict = {"ocr_applied": False, "ocr_reason": "disabled"}
    mode = RAG_OCRMYPDF
    if mode in ("0", "false", "no", "never", "off"):
        return src_path, meta

    frag = _pdf_text_layer_fragmentation_audit(src_path)
    bad_layer = bool(frag.get("bad"))
    meta["text_layer_fragmentation"] = frag

    avg = _avg_chars_per_page_pdf(src_path)
    severe_bad_layer = bool(
        bad_layer
        and OCR_FORCE_SEVERE_ENABLED
        and (
            float(frag.get("frag_mean") or 0.0) >= OCR_GLOBAL_FORCE_SEVERE_MEAN
            or float(frag.get("frag_max") or 0.0) >= OCR_GLOBAL_FORCE_SEVERE_MAX
        )
    )
    should = force or mode in ("always", "yes")
    if mode == "auto":
        should = avg < AUTO_OCR_MAX_CHARS_PER_PAGE or (bad_layer and OCR_GLOBAL_ON_BAD_LAYER) or severe_bad_layer

    if not should:
        if bad_layer:
            log.warning(
                "Bad Arabic text layer detected; skipping full-document OCRmyPDF in auto mode. "
                "Ingest will use capped per-page OCR (or set RAG_OCR_GLOBAL_ON_BAD_LAYER=1 "
                "or RAG_OCR_FORCE_SEVERE_ENABLED=1 for slow --redo-ocr on the whole PDF)."
            )
            meta["ocr_reason"] = (
                f"auto_skip_global_bad_layer avg_chars_per_page~{avg:.1f}; "
                "use page OCR fallback"
            )
        else:
            meta["ocr_reason"] = f"auto_skip avg_chars_per_page~{avg:.1f}; text_layer_ok"
        return src_path, meta

    if bad_layer:
        if severe_bad_layer and not OCR_GLOBAL_ON_BAD_LAYER and mode == "auto":
            log.warning(
                "Arabic text layer is severely corrupted (frag_max=%s, frag_mean=%s): "
                "forcing global OCR despite RAG_OCR_GLOBAL_ON_BAD_LAYER=0.",
                frag.get("frag_max"),
                frag.get("frag_mean"),
            )
        log.warning(
            "PDF text layer appears unusable for Arabic RAG "
            "(fragmentation frag_max=%s frag_mean=%s sampled=%s pages=%s). "
            "Running OCRmyPDF with --redo-ocr (slow but fixes bad copy-paste layers).",
            frag.get("frag_max"),
            frag.get("frag_mean"),
            frag.get("sampled"),
            frag.get("pages"),
        )

    ocrm = shutil.which("ocrmypdf")
    if not ocrm:
        log.warning(
            "ocrmypdf not on PATH — install OCRmyPDF + Tesseract (ara+eng). "
            "Cannot repair corrupted Arabic text layers; skipping OCR"
        )
        meta["ocr_reason"] = "ocrmypdf_missing_bad_layer_unfixed" if bad_layer else "ocrmypdf_missing"
        return src_path, meta

    skip_existing = (os.getenv("RAG_OCR_SKIP_EXISTING_TEXT") or "0").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    if bad_layer and skip_existing:
        log.warning("RAG_OCR_SKIP_EXISTING_TEXT ignored: broken text layer needs --redo-ocr")
        skip_existing = False

    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    tmp.close()
    out_path = tmp.name
    cmd = [
        ocrm,
        "-j",
        str(OCR_JOBS),
        "--language",
        os.getenv("RAG_OCR_LANGUAGE", "ara+eng"),
        "--optimize",
        "0",
        "--invalidate-digital-signatures",
        src_path,
        out_path,
    ]
    ocr_strategy = "--skip-text" if skip_existing else "--redo-ocr"
    cmd.insert(-2, ocr_strategy)
    log.info(
        "Starting OCRmyPDF: strategy=%s jobs=%s lang=%s pages=%s (watch terminal for live progress)",
        ocr_strategy,
        OCR_JOBS,
        os.getenv("RAG_OCR_LANGUAGE", "ara+eng"),
        frag.get("pages"),
    )
    try:
        # Keep stdout/stderr attached so OCRmyPDF progress is visible live in terminal logs.
        subprocess.run(
            cmd,
            check=True,
            text=True,
            timeout=3600,
            env=_ocr_env_with_known_bins(),
        )
        meta["ocr_applied"] = True
        meta["ocr_reason"] = "ok_frag_bad_layer" if bad_layer else "ok"
        meta["ocr_avg_chars_before"] = avg
        meta["ocr_strategy"] = ocr_strategy
        return out_path, meta
    except subprocess.CalledProcessError as e:
        log.warning("ocrmypdf failed (%s) — using original PDF. stderr=%s", e, (e.stderr or "")[:400])
        meta["ocr_reason"] = f"failed: {e.stderr or e}"
        try:
            os.unlink(out_path)
        except OSError:
            pass
        return src_path, meta
    except subprocess.TimeoutExpired:
        log.warning("ocrmypdf timed out — using original PDF")
        meta["ocr_reason"] = "timeout"
        try:
            os.unlink(out_path)
        except OSError:
            pass
        return src_path, meta


def pdf_to_markdown_via_docling(path: str) -> tuple[str, dict]:
    """Return (markdown, meta). Empty string if Docling unavailable or failed."""
    meta: dict = {"converter": "none", "error": None}
    conv = RAG_PDF_CONVERTER
    if conv in ("pymupdf", "none", "off"):
        meta["converter"] = conv
        return "", meta

    if conv not in ("auto", "docling"):
        meta["converter"] = conv
        return "", meta

    if conv == "auto":
        avg = _avg_chars_per_page_pdf(path)
        if avg >= _AUTO_DOCLING_MIN_AVG:
            meta["converter"] = "auto_skip_sparse_check"
            meta["avg_chars_per_page_sample"] = round(avg, 2)
            meta["hint"] = "text layer looks usable — PyMuPDF path; set RAG_PDF_CONVERTER=docling to force Docling"
            log.info(
                "RAG auto: skipping Docling (avg_chars/page~%.1f >= %.1f). Use docling converter to force.",
                avg,
                _AUTO_DOCLING_MIN_AVG,
            )
            return "", meta

    try:
        import docling  # noqa: F401
    except ModuleNotFoundError as e:
        meta["converter"] = "docling_unavailable"
        meta["error"] = str(e)
        if conv == "docling":
            log.warning(
                "RAG_PDF_CONVERTER=docling but the package is missing. "
                "Run: pip install docling   — or set RAG_PDF_CONVERTER=pymupdf. (%s)",
                e,
            )
        else:
            log.debug(
                "Docling not installed — ingest uses PyMuPDF extract + headings. "
                "Optional: pip install docling",
            )
        return "", meta

    try:
        meta["converter"] = "docling"
        meta["docling_device"] = _docling_device_str()
        _suppress_noisy_docling_loggers()
        converter = _build_docling_converter()
        result = converter.convert(path)
        doc = getattr(result, "document", None)
        if doc is None:
            err = getattr(result, "errors", None) or getattr(result, "error", None) or "conversion_no_document"
            log.warning(
                "Docling returned no document for %s (device=%s): %s",
                Path(path).name,
                meta["docling_device"],
                str(err)[:800],
            )
            meta["converter"] = "docling_failed"
            meta["error"] = str(err)[:4000]
            return "", meta
        md = doc.export_to_markdown()
        return (md or "").strip(), meta
    except Exception as e:
        msg = str(e)
        log.warning(
            "Docling convert failed (%s, device=%s): %s",
            Path(path).name,
            _docling_device_str(),
            msg[:500] + ("…" if len(msg) > 500 else ""),
        )
        meta["converter"] = "docling_failed"
        meta["error"] = msg[:2000]
        return "", meta


def cleanup_temp(path: str | None, *, original: str) -> None:
    if path and path != original:
        try:
            os.unlink(path)
        except OSError:
            pass
