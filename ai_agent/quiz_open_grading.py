"""Score open-ended quiz answers with LLM; recompute full submission score (MCQ/TF + open)."""

from __future__ import annotations

import json
import logging
import os
import re
import urllib.error
import urllib.request
from typing import Any

from db.client import supabase as sb
from langchain_core.messages import HumanMessage, SystemMessage
from shared.llm_factory import invoke_llm_messages

log = logging.getLogger("egypt_edu.quiz_open_grading")


def _mcq_equiv(student: str, correct: str) -> bool:
    return (student or "").strip().upper() == (correct or "").strip().upper()


def _tf_equiv(student: str, correct: str) -> bool:
    def norm(x: str) -> str:
        t = (x or "").strip().lower()
        if t in ("true", "t", "1", "yes", "y", "صواب", "صح", "نعم"):
            return "T"
        if t in ("false", "f", "0", "no", "n", "خطأ", "غلط", "لا"):
            return "F"
        return (x or "").strip().upper()

    sn, cn = norm(student), norm(correct)
    return bool(sn) and sn == cn


def _extract_json_object(text: str) -> dict[str, Any] | None:
    if not text:
        return None
    t = text.strip()
    m = re.search(r"\{[\s\S]*\}", t)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def _grade_one_open(*, question_text: str, model_answer: str, student_answer: str, max_points: int) -> tuple[float, str]:
    """Returns (points_earned, feedback_ar)."""
    sys = SystemMessage(
        content=(
            "أنت مصحّح تربوي عادل للغة العربية. قارن إجابة الطالب بإجابة نموذجية قصيرة. "
            "أعطِ درجة كسرية من 0 إلى 1 حسب اكتمال المعنى الصحيح (ليس تطابق النص حرفياً). "
            "أجب بكائن JSON فقط بدون markdown، بالشكل: "
            '{"fraction": <رقم بين 0 و1>, "feedback_ar": "<جملة أو جملتان بالعربية>"}'
        )
    )
    human = HumanMessage(
        content=(
            f"السؤال:\n{question_text}\n\n"
            f"الإجابة النموذجية:\n{model_answer}\n\n"
            f"إجابة الطالب:\n{student_answer}\n"
        )
    )
    try:
        resp = invoke_llm_messages([sys, human])
        raw = getattr(resp, "content", str(resp))
    except Exception as e:
        log.warning("LLM open grade failed: %s", e)
        return 0.0, "تعذّر تقييم المقالي آلياً — راجع معلمك."

    data = _extract_json_object(raw) or {}
    try:
        fr = float(data.get("fraction", 0))
    except (TypeError, ValueError):
        fr = 0.0
    fr = max(0.0, min(1.0, fr))
    fb = str(data.get("feedback_ar") or "").strip() or ("جزئياً صحيح." if fr > 0 else "غير كافٍ.")

    pts = round(fr * max(1, max_points), 2)
    return pts, fb


def _verify_supabase_user_jwt(jwt: str) -> str:
    base = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
    if not base or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    req = urllib.request.Request(
        f"{base}/auth/v1/user",
        headers={"Authorization": f"Bearer {jwt}", "apikey": key, "Accept": "application/json"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
    except urllib.error.HTTPError:
        raise PermissionError("Invalid session") from None
    data = json.loads(raw)
    uid = data.get("id")
    if not uid:
        raise PermissionError("Invalid session user")
    return str(uid)


def regrade_open_submission(*, submission_id: str, jwt: str) -> dict[str, Any]:
    """
    Recompute scores including open-ended via LLM. Caller passes the student's JWT.
    """
    user_id = _verify_supabase_user_jwt(jwt)

    sub_res = sb.table("student_assignment_submissions").select("*").eq("id", submission_id).limit(1).execute()
    rows = getattr(sub_res, "data", None) or []
    row = rows[0] if rows else None
    if not row:
        raise ValueError("submission_not_found")

    st_res = sb.table("students").select("id, user_id").eq("id", row["student_id"]).limit(1).execute()
    st_rows = getattr(st_res, "data", None) or []
    st = st_rows[0] if st_rows else None
    if not st or str(st["user_id"]) != str(user_id):
        raise PermissionError("not_owner")

    asn_res = sb.table("assignments").select("id, quiz_id, class_id, subject_id, counts_toward_grade").eq(
        "id", row["assignment_id"]
    ).limit(1).execute()
    asn_rows = getattr(asn_res, "data", None) or []
    asn = asn_rows[0] if asn_rows else None
    if not asn or not asn.get("quiz_id"):
        raise ValueError("assignment_without_quiz")

    qq_res = (
        sb.table("quiz_questions")
        .select("id, question_text, question_type, answer, points")
        .eq("quiz_id", asn["quiz_id"])
        .order("sort_order")
        .execute()
    )
    questions = qq_res.data or []

    answers: dict[str, str] = row.get("answers_json") or {}
    if isinstance(answers, str):
        try:
            answers = json.loads(answers)
        except json.JSONDecodeError:
            answers = {}

    earned = 0.0
    v_max = 0.0
    open_details: list[dict[str, Any]] = []

    for q in questions:
        pts = float(q.get("points") or 1)
        v_max += pts
        qid = str(q["id"])
        qtype = (q.get("question_type") or "mcq").lower()
        key = ((q.get("answer") or "") or "").strip()
        sans = answers.get(qid)
        sans_s = sans if isinstance(sans, str) else (json.dumps(sans) if sans is not None else "")
        sans_s = (sans_s or "").strip()

        if qtype == "mcq":
            if _mcq_equiv(sans_s, key):
                earned += pts
        elif qtype == "true_false":
            if _tf_equiv(sans_s, key):
                earned += pts
        elif qtype == "open":
            if key and sans_s:
                op_pts, fb = _grade_one_open(
                    question_text=q.get("question_text") or "",
                    model_answer=key,
                    student_answer=sans_s,
                    max_points=int(pts),
                )
                earned += op_pts
                open_details.append(
                    {
                        "question_id": qid,
                        "points_earned": op_pts,
                        "max_points": pts,
                        "feedback_ar": fb,
                    }
                )
            elif key and not sans_s:
                open_details.append(
                    {
                        "question_id": qid,
                        "points_earned": 0,
                        "max_points": pts,
                        "feedback_ar": "لم تُرسَل إجابة.",
                    }
                )

    grading_details = {"open_grading": open_details, "regraded": True}

    sb.table("student_assignment_submissions").update(
        {
            "score": round(earned, 2),
            "grading_details": grading_details,
        }
    ).eq("id", submission_id).execute()

    counts_toward = asn.get("counts_toward_grade")
    if counts_toward is not False:
        sb.table("grades").delete().eq("student_id", row["student_id"]).eq("assignment_id", row["assignment_id"]).execute()
        if v_max > 0:
            sb.table("grades").insert(
                {
                    "student_id": row["student_id"],
                    "class_id": asn.get("class_id"),
                    "subject_id": asn.get("subject_id"),
                    "assignment_id": row["assignment_id"],
                    "score": round(earned, 2),
                    "max_score": v_max if v_max else None,
                    "grade_type": "quiz",
                    "academic_year": "2025-2026",
                }
            ).execute()

    return {
        "score": round(earned, 2),
        "max_score": v_max if v_max else None,
        "open_graded": len(open_details),
        "submission_id": submission_id,
    }
