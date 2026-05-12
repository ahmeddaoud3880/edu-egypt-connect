from langchain_core.tools import tool
from db.client import supabase
from datetime import date
import shared.log_tools as log_tools


def _get_student_db_id(user_id: str) -> str | None:
    """Resolve auth user_id to students.id via student_profiles or students table."""
    # Try student_profiles first
    try:
        sp = supabase.table("student_profiles").select("user_id").eq("user_id", user_id).maybe_single().execute()
        if sp.data:
            # Find matching student by user_id
            s = supabase.table("students").select("id").eq("user_id", user_id).maybe_single().execute()
            if s.data:
                return s.data["id"]
    except Exception as e:
        log_tools.debug("student_profiles lookup failed: %s", e)
    # Fallback: directly from students
    try:
        s = supabase.table("students").select("id").eq("user_id", user_id).maybe_single().execute()
        return s.data["id"] if s.data else None
    except Exception as e:
        log_tools.debug("students lookup failed: %s", e)
        return None


@tool
def get_my_profile(user_id: str) -> dict:
    """
    Get the student's full profile including name, grade, stage, school.
    Use this to understand who the student is and their academic context.
    """
    try:
        # Try student_profiles first for richer data
        sp = supabase.table("student_profiles").select(
            "full_name, full_name_ar, national_id, grade_number, school_id, stage_id, academic_year"
        ).eq("user_id", user_id).maybe_single().execute()

        if sp.data:
            result = dict(sp.data)
            # Enrich with stage name
            if sp.data.get("stage_id"):
                stage = supabase.table("stages").select("name, name_ar").eq(
                    "id", sp.data["stage_id"]
                ).maybe_single().execute()
                result["stage_name"] = stage.data.get("name") if stage.data else None
                result["stage_name_ar"] = stage.data.get("name_ar") if stage.data else None
            # Enrich with school name
            if sp.data.get("school_id"):
                school = supabase.table("schools").select("name, name_ar").eq(
                    "id", sp.data["school_id"]
                ).maybe_single().execute()
                result["school_name"] = school.data.get("name") if school.data else None
            return result

        # Fallback: profiles table
        p = supabase.table("profiles").select(
            "full_name, full_name_ar, national_id"
        ).eq("id", user_id).maybe_single().execute()
        return p.data or {"error": "Profile not found"}
    except Exception as e:
        log_tools.debug("get_my_profile error: %s", e)
        return {"error": str(e)}


@tool
def get_my_grades(user_id: str) -> list:
    """
    Get all grades recorded for this student.
    Returns list of {subject_name, score, max_score, grade_date, term, class_name}.
    Use to answer questions about student performance, weak subjects, averages.
    """
    try:
        student_id = _get_student_db_id(user_id)
        if not student_id:
            return []
        result = supabase.table("grades").select(
            "score, max_score, grade_date, term, subjects(name, name_ar), classes(name, grade_number)"
        ).eq("student_id", student_id).order("grade_date", desc=True).execute()
        rows = []
        for g in (result.data or []):
            rows.append({
                "subject": g.get("subjects", {}).get("name_ar") or g.get("subjects", {}).get("name"),
                "score": g.get("score"),
                "max_score": g.get("max_score", 100),
                "percent": round((g["score"] / g.get("max_score", 100)) * 100, 1) if g.get("score") is not None else None,
                "date": g.get("grade_date"),
                "term": g.get("term"),
                "class": g.get("classes", {}).get("name"),
            })
        return rows
    except Exception as e:
        log_tools.debug("get_my_grades error: %s", e)
        return []


@tool
def get_my_attendance(user_id: str) -> dict:
    """
    Get attendance summary and recent records for this student.
    Returns {total, present, absent, late, attendance_rate, recent_absences}.
    """
    try:
        student_id = _get_student_db_id(user_id)
        if not student_id:
            return {}
        result = supabase.table("attendance_records").select(
            "date, status, classes(name)"
        ).eq("student_id", student_id).order("date", desc=True).limit(60).execute()
        records = result.data or []
        total = len(records)
        present = sum(1 for r in records if r["status"] == "present")
        absent = sum(1 for r in records if r["status"] == "absent")
        late = sum(1 for r in records if r["status"] == "late")
        rate = round((present / total) * 100, 1) if total > 0 else None
        recent_absences = [
            {"date": r["date"], "class": r.get("classes", {}).get("name") if r.get("classes") else None}
            for r in records if r["status"] == "absent"
        ][:5]
        return {
            "total_records": total,
            "present": present,
            "absent": absent,
            "late": late,
            "attendance_rate_percent": rate,
            "recent_absences": recent_absences,
        }
    except Exception as e:
        log_tools.debug("get_my_attendance error: %s", e)
        return {}


@tool
def get_my_assignments(user_id: str) -> list:
    """
    Get all upcoming and recent assignments for this student (via class enrollments).
    Returns list of {title, subject, due_date, type, class_name}.
    """
    try:
        student_id = _get_student_db_id(user_id)
        if not student_id:
            return []
        enrollments = supabase.table("enrollments").select("class_id").eq(
            "student_id", student_id
        ).execute()
        class_ids = [e["class_id"] for e in (enrollments.data or [])]
        if not class_ids:
            return []
        result = supabase.table("assignments").select(
            "title, title_ar, due_date, assignment_type, max_score, subjects(name, name_ar), classes(name)"
        ).in_("class_id", class_ids).order("due_date").execute()
        rows = []
        for a in (result.data or []):
            rows.append({
                "title": a.get("title_ar") or a.get("title"),
                "subject": a.get("subjects", {}).get("name_ar") if a.get("subjects") else None,
                "due_date": a.get("due_date"),
                "type": a.get("assignment_type"),
                "class": a.get("classes", {}).get("name") if a.get("classes") else None,
                "max_score": a.get("max_score"),
            })
        return rows
    except Exception as e:
        log_tools.debug("get_my_assignments error: %s", e)
        return []


@tool
def get_my_subjects(user_id: str) -> list:
    """
    Get all subjects the student is enrolled in based on their class assignments.
    Returns list of {subject_name, class_name, grade_number}.
    """
    try:
        student_id = _get_student_db_id(user_id)
        if not student_id:
            return []
        enrollments = supabase.table("enrollments").select(
            "class_id, classes(name, grade_number)"
        ).eq("student_id", student_id).execute()
        class_ids = [e["class_id"] for e in (enrollments.data or [])]
        if not class_ids:
            return []
        assignments = supabase.table("teacher_class_assignments").select(
            "class_id, subjects(name, name_ar), classes(name, grade_number)"
        ).in_("class_id", class_ids).execute()
        seen = set()
        result = []
        for a in (assignments.data or []):
            subj = a.get("subjects")
            if subj and subj.get("name") not in seen:
                seen.add(subj["name"])
                result.append({
                    "subject_name": subj.get("name_ar") or subj.get("name"),
                    "class_name": a.get("classes", {}).get("name"),
                    "grade_number": a.get("classes", {}).get("grade_number"),
                })
        return result
    except Exception as e:
        log_tools.debug("get_my_subjects error: %s", e)
        return []
