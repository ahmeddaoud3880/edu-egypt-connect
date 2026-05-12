"""
Download Egyptian MOE textbook PDFs from the official ellibrary catalog
listed in `public/moe-books-fallback.json`, then save them under
`ai_agent/rag/books/<stage>/g<grade>/<subject>/...pdf`.

Examples
────────
# All Grade 3 Primary student books in Arabic + Math (AR) + English
python -m rag.download_books --grade 3 --stage primary \
    --subjects "اللغة العربية" "الرياضيات باللغة العربية" "اللغة الانجليزية"

# Everything for Grade 6 Primary
python -m rag.download_books --grade 6 --stage primary

# Only second term:
python -m rag.download_books --grade 3 --stage primary --term 2
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import urllib.request
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s [%(name)s] %(message)s")
log = logging.getLogger("egypt_edu.rag.download")

ROOT = Path(__file__).resolve().parent.parent.parent  # repo root
BOOKS_JSON = ROOT / "public" / "moe-books-fallback.json"
DEST_ROOT = Path(__file__).resolve().parent / "books"

STAGE_FOLDER = {
    "kg": "kg",
    "primary": "primary",
    "prep": "prep",
    "secondary": "secondary",
}

STAGE_TO_MOE = {
    "kg": ["رياض الاطفال", "رياض الأطفال"],
    "primary": ["الإبتدائية", "الابتدائية"],
    "prep": ["الإعدادية", "الاعدادية"],
    "secondary": ["الثانوي العام", "الثانوى العام"],
}

GRADE_LABELS = {
    "primary": {
        1: ["الصف الأول الإبتدائي", "الصف الاول الابتدائي"],
        2: ["الصف الثاني الابتدائي"],
        3: ["الصف الثالث الابتدائي"],
        4: ["الصف الرابع الابتدائي"],
        5: ["الصف الخامس الابتدائي"],
        6: ["الصف السادس الابتدائي"],
    },
    "prep": {
        1: ["الصف الأول الإعدادي", "الصف الاول الاعدادي"],
        2: ["الصف الثاني الإعدادي"],
        3: ["الصف الثالث الإعدادي"],
    },
    "secondary": {
        1: ["الصف الاول الثانوي", "الصف الأول الثانوي"],
        2: ["الصف الثاني الثانوي"],
        3: ["الصف الثالث الثانوي"],
    },
    "kg": {
        1: ["مستوى أول"],
        2: ["مستوي ثان", "مستوى ثان"],
    },
}


def load_books() -> list[dict]:
    if not BOOKS_JSON.exists():
        log.error("Books catalog not found: %s", BOOKS_JSON)
        sys.exit(2)
    raw = BOOKS_JSON.read_text(encoding="utf-8")
    # The JSON file has stray blank lines; json.loads requires valid JSON
    return json.loads(raw)


def slugify(text: str) -> str:
    t = (text or "").strip().lower()
    t = re.sub(r"[\\/:*?\"<>|]", "_", t)
    t = re.sub(r"\s+", "_", t)
    return t[:80]


def filter_books(
    catalog: list[dict],
    *,
    stage: str,
    grade: int | None,
    term: int | None,
    subjects: list[str] | None,
    student_book_only: bool,
) -> list[dict]:
    moe_stages = STAGE_TO_MOE.get(stage, [])
    grade_labels = (GRADE_LABELS.get(stage) or {}).get(grade) if grade else None

    out = []
    for b in catalog:
        if b.get("stage") not in moe_stages:
            continue
        if grade_labels and b.get("grade") not in grade_labels:
            continue
        if student_book_only and b.get("type") != "كتاب الطالب":
            continue
        if term:
            link = (b.get("link") or "").lower()
            if term == 1 and "/term1/" not in link:
                continue
            if term == 2 and "/term2/" not in link:
                continue
        if subjects:
            sub = (b.get("subject") or "").strip()
            if not any(s in sub for s in subjects):
                continue
        out.append(b)
    return out


def download_one(url: str, dest_path: Path) -> dict:
    if dest_path.exists() and dest_path.stat().st_size > 1000:
        return {"ok": True, "skipped": True, "path": str(dest_path), "bytes": dest_path.stat().st_size}
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest_path.with_suffix(dest_path.suffix + ".part")
    try:
        log.info("↓ %s", url)
        req = urllib.request.Request(url, headers={"User-Agent": "egypt-edu-ragbot/1.0"})
        with urllib.request.urlopen(req, timeout=120) as resp, open(tmp, "wb") as f:
            while True:
                chunk = resp.read(64 * 1024)
                if not chunk:
                    break
                f.write(chunk)
        size = tmp.stat().st_size
        tmp.replace(dest_path)
        return {"ok": True, "skipped": False, "path": str(dest_path), "bytes": size}
    except Exception as e:
        if tmp.exists():
            try:
                tmp.unlink()
            except Exception:
                pass
        return {"ok": False, "error": str(e), "url": url}


def main() -> int:
    p = argparse.ArgumentParser(description="Download MOE textbook PDFs into rag/books/")
    p.add_argument("--stage", choices=list(STAGE_FOLDER.keys()), required=True)
    p.add_argument("--grade", type=int, default=None,
                   help="Grade number (1..6 primary, 1..3 prep/secondary, 1..2 KG). Omit = all grades.")
    p.add_argument("--term", type=int, choices=[1, 2], default=None,
                   help="Restrict to 1st or 2nd semester.")
    p.add_argument("--subjects", nargs="+", default=None,
                   help="Substring match against MOE subject (e.g. 'اللغة العربية').")
    p.add_argument("--all-types", action="store_true",
                   help="Include teacher books / activity books too (default = student only).")
    p.add_argument("--list-only", action="store_true",
                   help="Only list matching books, don't download.")
    args = p.parse_args()

    catalog = load_books()
    books = filter_books(
        catalog,
        stage=args.stage,
        grade=args.grade,
        term=args.term,
        subjects=args.subjects,
        student_book_only=not args.all_types,
    )

    if not books:
        log.warning("No books matched the filter.")
        return 1

    log.info("Matched %d books", len(books))
    if args.list_only:
        for b in books:
            log.info("- [%s] %s | %s | %s",
                     b.get("type"), b.get("grade"), b.get("subject"), b.get("link"))
        return 0

    folder_root = DEST_ROOT / STAGE_FOLDER[args.stage]
    results = []
    for b in books:
        grade_label = b.get("grade", "")
        # Map back grade-label → numeric folder name
        gnum = None
        for stage_name, levels in GRADE_LABELS.items():
            for n, labels in levels.items():
                if grade_label in labels:
                    gnum = n
                    break
            if gnum:
                break
        gfolder = f"g{gnum}" if gnum else slugify(grade_label)
        sub_folder = slugify(b.get("subject", "subject"))
        url = b.get("link") or ""
        if not url.startswith("http"):
            continue
        fname = url.split("/")[-1].split("?")[0]
        dest = folder_root / gfolder / sub_folder / fname
        r = download_one(url, dest)
        r["meta"] = {
            "stage": b.get("stage"),
            "grade": b.get("grade"),
            "subject": b.get("subject"),
            "term": b.get("term"),
            "type": b.get("type"),
        }
        if r.get("ok"):
            log.info("✔ %s (%s bytes%s)", dest.relative_to(DEST_ROOT.parent),
                     r["bytes"], " — already had it" if r.get("skipped") else "")
        else:
            log.warning("✘ %s — %s", url, r.get("error"))
        results.append(r)

    ok = sum(1 for r in results if r.get("ok"))
    failed = [r for r in results if not r.get("ok")]
    log.info("Downloaded %d / %d", ok, len(results))
    for r in failed:
        log.warning("FAILED: %s — %s", r.get("url"), r.get("error"))
    return 0 if ok == len(results) else 3


if __name__ == "__main__":
    sys.exit(main())
