"""CLI: python -m rag.eval --book-id UUID --fixture prim3_grade3_suite_50.json"""

from __future__ import annotations

import argparse
import json
import sys

from pathlib import Path

from dotenv import load_dotenv

_AI_AGENT_BASE = Path(__file__).resolve().parent.parent.parent
load_dotenv(_AI_AGENT_BASE / ".env", override=False)

if str(_AI_AGENT_BASE) not in sys.path:
    sys.path.insert(0, str(_AI_AGENT_BASE))


def main() -> None:
    from rag.eval import FIXTURE_DIR, evaluate_book_questions, load_fixture, normalize_questions

    ap = argparse.ArgumentParser(description="Evaluate RAG retrieval for one ingested book.")
    ap.add_argument("--book-id", required=True)
    ap.add_argument("--fixture", required=True, help=f"Filename under {FIXTURE_DIR} or absolute path")
    ap.add_argument("--grade", type=int, default=None)
    ap.add_argument("--top-k", type=int, default=5)
    ap.add_argument("--no-hybrid", action="store_true")
    ap.add_argument("--no-rerank", action="store_true")
    args = ap.parse_args()

    fp = Path(args.fixture)
    if not fp.is_absolute():
        fp = FIXTURE_DIR / fp
    doc = load_fixture(fp)
    items = normalize_questions(doc.get("questions") or doc.get("items") or [])
    report = evaluate_book_questions(
        book_id=args.book_id,
        grade_number=args.grade,
        subject_id=None,
        stage_id=None,
        questions=items,
        top_k=args.top_k,
        hybrid=False if args.no_hybrid else None,
        rerank=not args.no_rerank,
        min_similarity=None,
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
