from fastapi import APIRouter, HTTPException
from db.client import supabase
from shared.llm_factory import get_llm
import logging
from datetime import date, timedelta
import json

router = APIRouter()
log = logging.getLogger("egypt_edu.student_summary")

# ── helpers ──────────────────────────────────────────────────────────────────

def _get_student_snapshot(user_id: str) -> dict:
    """Pull a lean data snapshot for the student — minimise tokens."""
    snap = {}

    # Profile
    try:
        sp = supabase.table("student_profiles").select(
            "full_name_ar, grade_number, stage_id"
        ).eq("user_id", user_id).maybe_single().execute()
        if sp.data:
            snap["name"] = sp.data.get("full_name_ar") or sp.data.get("full_name")
            snap["grade"] = sp.data.get("grade_number")
    except Exception as e:
        log.warning("summary profile fetch: %s", e)

    # Student DB id
    try:
        sr = supabase.table("students").select("id").eq("user_id", user_id).maybe_single().execute()
        student_id = sr.data["id"] if sr.data else None
    except Exception:
        student_id = None

    if student_id:
        # Last 5 grades
        try:
            gr = supabase.table("grades").select(
                "score, max_score, subjects(name_ar)"
            ).eq("student_id", student_id).not_.is_("subject_id", "null").order(
                "grade_date", desc=True
            ).limit(5).execute()
            snap["grades"] = [
                {
                    "subject": g.get("subjects", {}).get("name_ar"),
                    "pct": round((g["score"] / (g.get("max_score") or 100)) * 100)
                    if g.get("score") is not None else None,
                }
                for g in (gr.data or [])
            ]
        except Exception as e:
            log.warning("summary grades: %s", e)

        # Pending assignments (due in next 7 days)
        try:
            enr = supabase.table("enrollments").select("class_id").eq("student_id", student_id).execute()
            cids = [e["class_id"] for e in (enr.data or [])]
            if cids:
                today = date.today().isoformat()
                week = (date.today() + timedelta(days=7)).isoformat()
                asgn = supabase.table("assignments").select(
                    "title_ar, due_date"
                ).in_("class_id", cids).gte("due_date", today).lte("due_date", week).limit(3).execute()
                snap["due_soon"] = [
                    {"title": a.get("title_ar") or a.get("title"), "due": a.get("due_date")}
                    for a in (asgn.data or [])
                ]
        except Exception as e:
            log.warning("summary assignments: %s", e)

    return snap


def _build_summary_prompt(snap: dict) -> str:
    name = snap.get("name") or "الطالب"
    grade = snap.get("grade")
    grades = snap.get("grades", [])
    due = snap.get("due_soon", [])

    grades_txt = ""
    if grades:
        grades_txt = "الدرجات الأخيرة:\n" + "\n".join(
            f"- {g['subject']}: {g['pct']}%" if g.get("pct") is not None else f"- {g['subject']}: —"
            for g in grades
        )

    due_txt = ""
    if due:
        due_txt = "الواجبات القادمة:\n" + "\n".join(
            f"- {d['title']} (موعد التسليم: {d['due']})" for d in due
        )

    context = "\n".join(filter(None, [grades_txt, due_txt])) or "لا توجد بيانات بعد."

    return (
        f"أنت مساعد دراسى ذكى لمنصة Edupulse التعليمية المصرية.\n"
        f"اكتب ملخصاً دراسياً قصيراً (٣-٤ جمل بالعربية الفصحى البسيطة) للطالب {name} "
        f"{'(الصف الثالث الابتدائى)' if grade == 3 else f'(الصف {grade})' if grade else ''}.\n"
        f"البيانات المتاحة:\n{context}\n\n"
        f"القواعد:\n"
        f"- ابدأ بتحية قصيرة شخصية.\n"
        f"- ذكِّر بأقرب واجب إن وُجد.\n"
        f"- إن وجدت درجات: اذكر المتوسط وأفضل مادة وأضعف مادة بكلمتين.\n"
        f"- إن لم توجد بيانات كافية: اكتب جملة تشجيعية عامة.\n"
        f"- لا تستخدم bullet points أو markdown — نثر فقط.\n"
        f"الملخص:"
    )


# ── cache helpers ─────────────────────────────────────────────────────────────

def _load_cached_summary(user_id: str) -> str | None:
    try:
        res = supabase.table("student_ai_summaries").select(
            "summary, generated_at"
        ).eq("user_id", user_id).maybe_single().execute()
        if not res.data:
            return None
        gen_date = str(res.data.get("generated_at", ""))[:10]
        if gen_date == date.today().isoformat():
            return res.data.get("summary")
        return None
    except Exception:
        return None


def _save_summary(user_id: str, summary: str):
    try:
        supabase.table("student_ai_summaries").upsert(
            {"user_id": user_id, "summary": summary, "generated_at": date.today().isoformat()},
            on_conflict="user_id",
        ).execute()
    except Exception as e:
        log.warning("save summary failed: %s", e)


# ── endpoint ──────────────────────────────────────────────────────────────────

@router.get("/student/summary")
async def get_student_summary(user_id: str, provider: str = "openrouter", model: str = ""):
    if not user_id:
        raise HTTPException(400, "user_id required")

    # Check cache first (avoid LLM call if fresh)
    cached = _load_cached_summary(user_id)
    if cached:
        log.info("summary cache hit user=%s", user_id[:8])
        return {"summary": cached, "cached": True}

    snap = _get_student_snapshot(user_id)
    prompt = _build_summary_prompt(snap)

    try:
        llm = get_llm(provider or "openrouter", model or None)
        from langchain_core.messages import HumanMessage
        result = llm.invoke([HumanMessage(content=prompt)])
        text = (result.content if hasattr(result, "content") else str(result)).strip()
    except Exception as e:
        log.error("summary LLM failed: %s", e)
        raise HTTPException(503, f"AI unavailable: {e}")

    _save_summary(user_id, text)
    log.info("summary generated user=%s chars=%d", user_id[:8], len(text))
    return {"summary": text, "cached": False}


# ── RAG book TOC endpoint (for student practice) ─────────────────────────────

@router.get("/student/rag-books")
async def get_rag_books(grade_number: int = 0):
    """Return available RAG-indexed books for the student's grade."""
    try:
        q = supabase.table("rag_books").select(
            "id, title_ar, title, grade_number, subject_name, total_chunks, total_pages"
        )
        if grade_number:
            q = q.eq("grade_number", grade_number)
        res = q.order("grade_number").execute()
        return {"books": res.data or []}
    except Exception as e:
        raise HTTPException(503, str(e))


@router.get("/student/rag-toc")
async def get_rag_toc(book_id: str):
    """Return distinct lesson titles for a book (the TOC)."""
    try:
        res = supabase.table("rag_chunks").select(
            "lesson_title, activity_title, page_number"
        ).eq("book_id", book_id).not_.is_("lesson_title", "null").order("page_number").execute()

        seen = set()
        toc = []
        for r in (res.data or []):
            t = r.get("lesson_title")
            if t and t not in seen:
                seen.add(t)
                toc.append({
                    "title": t,
                    "page": r.get("page_number"),
                })
        return {"toc": toc}
    except Exception as e:
        raise HTTPException(503, str(e))
