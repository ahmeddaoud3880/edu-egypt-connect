"""Split textbook text into lesson / activity oriented segments (then sub-chunk by size)."""
from __future__ import annotations

import re
from typing import Any

PAGE_MARK = re.compile(r"^__PDF_PAGE_(\d+)__$", re.MULTILINE)
_HEADING_LINE = re.compile(
    r"""^(?:
        \#{1,3}\s*.+ |
        الوحدة\s+ال(?:أولى|ثانية|ثالثة|رابعة|خامسة|سادسة|\d+)\b.* |
        الوحدة\s+\d+\b.* |
        الدرس\s+[^:]+.* |
        (?:نشاط|النشاط)\s*[:\.]?\s*.+
    )\s*$""",
    re.VERBOSE | re.MULTILINE,
)


def annotate_pages_markers(pages: list[tuple[int, str]]) -> str:
    parts: list[str] = []
    for pn, txt in pages:
        parts.append(f"\n__PDF_PAGE_{pn}__\n")
        parts.append(txt)
    return "\n".join(parts).strip()


def _pages_in_slice(chunk: str) -> tuple[int | None, int | None]:
    hits = [int(m.group(1)) for m in PAGE_MARK.finditer(chunk)]
    if not hits:
        return None, None
    return min(hits), max(hits)


def _classify_heading(line: str) -> tuple[str | None, str | None, str]:
    s = line.strip().lstrip("#").strip()
    lesson = None
    activity = None
    kind = "subsection"

    if "النشاط" in s or s.lower().startswith("نشاط"):
        activity = s
        kind = "activity"
    if "الدرس" in s:
        lesson = s
        kind = "lesson"
    elif "الوحدة" in s:
        lesson = s
        kind = "section"

    return lesson, activity, kind


def _split_headings(blob: str) -> list[tuple[int, str, str]]:
    lines = blob.splitlines()
    head_idxs: list[int] = []
    for i, line in enumerate(lines):
        raw = line.strip()
        if PAGE_MARK.match(raw):
            continue
        if _HEADING_LINE.match(raw):
            head_idxs.append(i)

    segments: list[tuple[int, str, str]] = []

    if head_idxs and head_idxs[0] > 0:
        intro = "\n".join(lines[: head_idxs[0]]).strip()
        if intro:
            segments.append((0, "", intro))

    if not head_idxs:
        return segments or [(0, "", blob)]

    for j, start_line in enumerate(head_idxs):
        end_line = head_idxs[j + 1] if j + 1 < len(head_idxs) else len(lines)
        block = "\n".join(lines[start_line:end_line]).strip()
        heading = lines[start_line].strip()
        char_off = sum(len(x) + 1 for x in lines[:start_line])
        segments.append((char_off, heading, block))
    return segments


def _paragraph_chunks(text: str, max_chars: int, overlap: int) -> list[str]:
    text = re.sub(r"\n{3,}", "\n\n", text.strip())
    if len(text) <= max_chars:
        return [text] if text else []
    paras = re.split(r"\n\s*\n+", text)
    out: list[str] = []
    buf: list[str] = []
    buf_len = 0
    for p in paras:
        p = p.strip()
        if not p:
            continue
        if buf_len + len(p) + 2 <= max_chars:
            buf.append(p)
            buf_len += len(p) + 2
            continue
        if buf:
            out.append("\n\n".join(buf))
        if len(p) >= max_chars:
            i = 0
            while i < len(p):
                out.append(p[i : i + max_chars].strip())
                i += max_chars - overlap
            buf = []
            buf_len = 0
        else:
            buf = [p]
            buf_len = len(p)
    if buf:
        out.append("\n\n".join(buf))
    return [x for x in out if len(x.strip()) >= 48]


def build_lesson_sections(
    text_blob: str,
    *,
    pdf_page_bounds: tuple[int, int] | None = None,
    max_chunk_chars: int = 2600,
    chunk_overlap: int = 160,
) -> list[dict[str, Any]]:
    blob = text_blob.strip()
    if not blob:
        return []

    fb_lo, fb_hi = pdf_page_bounds if pdf_page_bounds else (None, None)
    raw_segments = _split_headings(blob)

    last_unit_or_lesson: str | None = None
    results: list[dict[str, Any]] = []

    for _, heading, block in raw_segments:
        lesson_t: str | None = None
        act_t: str | None = None
        kind = "misc"
        section_path: list[str] = []

        if heading:
            raw_h = heading.strip().lstrip("#").strip()
            lesson_t, act_t, kind = _classify_heading(heading)
            if "الوحدة" in raw_h or "الدرس" in raw_h:
                last_unit_or_lesson = raw_h
            if act_t:
                section_path = [x for x in [last_unit_or_lesson, raw_h] if x]
            elif last_unit_or_lesson and raw_h != last_unit_or_lesson:
                section_path = [last_unit_or_lesson, raw_h]
            elif raw_h:
                section_path = [raw_h]

        if not block.strip():
            continue

        for piece in _paragraph_chunks(block, max_chunk_chars, chunk_overlap):
            ps, pe = _pages_in_slice(piece)
            content = PAGE_MARK.sub("", piece)
            content = re.sub(r"\n{3,}", "\n\n", content).strip()
            if len(content) < 48:
                continue
            results.append({
                "content": content,
                "lesson_title": lesson_t or (last_unit_or_lesson if heading and not act_t else None),
                "activity_title": act_t,
                "chunk_kind": kind if heading else "misc",
                "section_path": section_path,
                "page_start": ps or fb_lo,
                "page_end": pe or ps or fb_hi or fb_lo,
            })

    if not results:
        for piece in _paragraph_chunks(blob, max_chunk_chars, chunk_overlap):
            ps, pe = _pages_in_slice(piece)
            content = PAGE_MARK.sub("", piece)
            content = re.sub(r"\n{3,}", "\n\n", content).strip()
            if len(content) < 48:
                continue
            results.append({
                "content": content,
                "lesson_title": None,
                "activity_title": None,
                "chunk_kind": "misc",
                "section_path": [],
                "page_start": ps or fb_lo,
                "page_end": pe or ps or fb_hi or fb_lo,
            })

    return results


def markdown_to_blob(md: str, pages_fallback: list[tuple[int, str]]) -> str:
    md = (md or "").strip()
    if len(md) >= 200:
        if "__PDF_PAGE_" not in md and pages_fallback:
            n_pages = len(pages_fallback)
            chunk = max(len(md) // max(n_pages, 1), 1)
            out: list[str] = []
            pos = 0
            for i, (pn, _) in enumerate(pages_fallback):
                end = len(md) if i == n_pages - 1 else min(len(md), pos + chunk)
                out.append(f"\n__PDF_PAGE_{pn}__\n")
                out.append(md[pos:end])
                pos = end
            return "\n".join(out)
        return md
    return annotate_pages_markers(pages_fallback)
