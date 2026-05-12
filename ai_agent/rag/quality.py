"""Heuristic quality score for Arabic curriculum PDF extracts (0 = bad … 1 = good)."""
from __future__ import annotations

import re
import unicodedata


_REPLACEMENT = "\ufffd"
# Arabic letters + Latin letters + Arabic-indic digits
_LETTER_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFA-Za-z]")
_DIGIT_RUN = re.compile(r"[0-9٠-٩٬،]{4,}")


def text_quality_score(text: str) -> float:
    t = unicodedata.normalize("NFKC", (text or "").strip())
    if not t:
        return 0.0

    n = len(t)
    repl = t.count(_REPLACEMENT)
    repl_pen = max(0.0, min(1.0, repl / max(n * 0.02, 1)))

    letters = len(_LETTER_RE.findall(t))
    letter_ratio = letters / max(n, 1)

    # Penalise low information density / TOC-like punctuation walls
    non_space = sum(1 for c in t if not c.isspace())
    if non_space == 0:
        return 0.0
    punct = sum(1 for c in t if c in ".·•|,;:،؛!?-_…")
    punct_ratio = punct / max(non_space, 1)

    # Repeated single-character noise (often broken extract)
    if n >= 40:
        uniq = len(set(t)) / max(n**0.5, 1)
        uniq_pen = 0.15 if uniq < 0.35 else 0.0
    else:
        uniq_pen = 0.0

    long_digit = len(_DIGIT_RUN.findall(t))
    digit_pen = 0.1 if long_digit >= 8 else 0.0

    # Base score components
    s = 0.45 * letter_ratio
    if letter_ratio >= 0.38:
        s += 0.25
    if letter_ratio >= 0.5:
        s += 0.12

    s += 0.18 * max(0.0, 1.0 - punct_ratio * 2.8)
    s -= repl_pen
    s -= uniq_pen + digit_pen

    if letters < 30 and n >= 120:
        s -= 0.15
    return max(0.0, min(1.0, s))


def passes_quality_gate(text: str, *, min_score: float) -> bool:
    return text_quality_score(text) >= min_score
