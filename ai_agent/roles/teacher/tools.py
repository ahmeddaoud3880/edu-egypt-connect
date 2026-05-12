from langchain_core.tools import tool
from db.client import supabase
import shared.log_tools as log_tools


def _get_teacher_db_id(user_id: str) -> str | None:
    """Resolve auth user_id to teachers.id."""
    try:
        t = supabase.table("teachers").select("id").eq("user_id", user_id).maybe_single().execute()
        return t.data["id"] if t.data else None
    except Exception as e:
        log_tools.debug("teacher lookup failed: %s", e)
        return None


def _student_ids_in_class(class_id: str) -> list[str]:
    """Students enrolled in this class — ``public.grades`` links by student_id only."""
    try:
        r = supabase.table("enrollments").select("student_id").eq("class_id", class_id).execute()
        return [row["student_id"] for row in (r.data or []) if row.get("student_id")]
    except Exception as e:
        log_tools.debug("_student_ids_in_class: %s", e)
        return []


@tool
def get_teacher_profile(user_id: str) -> dict:
    """
    Get the teacher's full profile: name, school, specialty.
    """
    try:
        t = supabase.table("teachers").select(
            "id, full_name, specialization, school_id"
        ).eq("user_id", user_id).maybe_single().execute()
        if not t.data:
            return {"error": "Teacher not found"}
        result = dict(t.data)
        if t.data.get("school_id"):
            school = supabase.table("schools").select("name, name_ar").eq(
                "id", t.data["school_id"]
            ).maybe_single().execute()
            result["school_name"] = school.data.get("name") if school.data else None
        return result
    except Exception as e:
        return {"error": str(e)}


@tool
def get_my_classes(user_id: str) -> list:
    """
    Get all classes and subjects assigned to this teacher.
    Returns list of {class_name, grade_number, subject_name, academic_year}.
    """
    try:
        teacher_id = _get_teacher_db_id(user_id)
        if not teacher_id:
            return []
        result = supabase.table("teacher_class_assignments").select(
            "academic_year, classes(name, grade_number), subjects(name, name_ar)"
        ).eq("teacher_id", teacher_id).execute()
        rows = []
        for a in (result.data or []):
            rows.append({
                "class_name": a.get("classes", {}).get("name"),
                "grade_number": a.get("classes", {}).get("grade_number"),
                "subject_name": a.get("subjects", {}).get("name_ar") if a.get("subjects") else None,
                "academic_year": a.get("academic_year"),
            })
        return rows
    except Exception as e:
        log_tools.debug("get_my_classes error: %s", e)
        return []


@tool
def get_class_performance(class_id: str, subject_id: str = "") -> dict:
    """
    Analyze performance of all students in a class (optionally filtered by subject).
    Returns {average_percent, total_students, weak_count, excellent_count, 
             weak_students: [{name, score, percent}], summary_text}.
    Use this to give the teacher an AI performance insight.
    """
    try:
        sids = _student_ids_in_class(class_id)
        if not sids:
            return {
                "summary_text": "لا يوجد طلاب مسجّلون في هذا الفصل بعد.",
                "average_percent": None,
                "weak_students": [],
            }

        q = supabase.table("grades").select(
            "student_id, score, max_score, students(full_name)"
        ).in_("student_id", sids)
        if subject_id:
            q = q.eq("subject_id", subject_id)
        result = q.execute()
        grades = result.data or []
        if not grades:
            return {"summary_text": "No grades recorded yet for this class."}

        total = len(grades)
        percents = []
        weak = []
        excellent = []
        for g in grades:
            max_s = g.get("max_score") or 100
            pct = round((g["score"] / max_s) * 100, 1) if g.get("score") is not None else 0
            percents.append(pct)
            name = g.get("students", {}).get("full_name") if g.get("students") else "Unknown"
            if pct < 50:
                weak.append({"name": name, "score": g["score"], "percent": pct})
            elif pct >= 85:
                excellent.append({"name": name, "score": g["score"], "percent": pct})

        avg = round(sum(percents) / len(percents), 1)

        if avg >= 85:
            insight = "الفصل يؤدي بشكل ممتاز. استمر في نهجك التعليمي."
        elif avg >= 70:
            insight = f"أداء الفصل جيد. {len(weak)} طلاب يحتاجون متابعة إضافية."
        elif avg >= 55:
            insight = f"متوسط الفصل {avg}% — يُنصح بمراجعة شاملة للمادة. {len(weak)} طلاب أقل من 50%."
        else:
            insight = f"تحذير: متوسط الفصل منخفض ({avg}%). يُنصح بإعادة الشرح الكامل للمادة."

        return {
            "average_percent": avg,
            "total_students": total,
            "weak_count": len(weak),
            "excellent_count": len(excellent),
            "weak_students": weak[:10],
            "excellent_students": excellent[:5],
            "ai_insight": insight,
        }
    except Exception as e:
        log_tools.debug("get_class_performance error: %s", e)
        return {"error": str(e)}


@tool
def get_weak_students(class_id: str, subject_id: str = "", threshold_percent: float = 50.0) -> list:
    """
    Get list of students performing below the threshold (default 50%) in a class.
    Returns list of {name, score, percent, student_id}.
    Use to recommend targeted interventions to the teacher.
    """
    try:
        sids = _student_ids_in_class(class_id)
        if not sids:
            return []

        q = supabase.table("grades").select(
            "student_id, score, max_score, students(full_name)"
        ).in_("student_id", sids)
        if subject_id:
            q = q.eq("subject_id", subject_id)
        result = q.execute()
        weak = []
        for g in (result.data or []):
            max_s = g.get("max_score") or 100
            pct = round((g["score"] / max_s) * 100, 1) if g.get("score") is not None else 0
            if pct < threshold_percent:
                weak.append({
                    "student_id": g["student_id"],
                    "name": g.get("students", {}).get("full_name") if g.get("students") else "Unknown",
                    "score": g["score"],
                    "percent": pct,
                })
        return sorted(weak, key=lambda x: x["percent"])
    except Exception as e:
        log_tools.debug("get_weak_students error: %s", e)
        return []


@tool
def get_attendance_summary(class_id: str, date_from: str = "") -> dict:
    """
    Get attendance summary for a class.
    Returns {total_records, present_count, absent_count, late_count,
             attendance_rate_percent, students_with_most_absences}.
    """
    try:
        q = supabase.table("attendance_records").select(
            "student_id, status, date, students(full_name)"
        ).eq("class_id", class_id)
        if date_from:
            q = q.gte("date", date_from)
        result = q.execute()
        records = result.data or []
        if not records:
            return {"total_records": 0}

        total = len(records)
        present = sum(1 for r in records if r["status"] == "present")
        absent = sum(1 for r in records if r["status"] == "absent")
        late = sum(1 for r in records if r["status"] == "late")
        rate = round((present / total) * 100, 1)

        # Count absences per student
        absence_count: dict[str, dict] = {}
        for r in records:
            if r["status"] == "absent":
                sid = r["student_id"]
                if sid not in absence_count:
                    absence_count[sid] = {
                        "name": r.get("students", {}).get("full_name") if r.get("students") else "Unknown",
                        "absences": 0,
                    }
                absence_count[sid]["absences"] += 1

        top_absentees = sorted(absence_count.values(), key=lambda x: -x["absences"])[:5]
        return {
            "total_records": total,
            "present_count": present,
            "absent_count": absent,
            "late_count": late,
            "attendance_rate_percent": rate,
            "students_with_most_absences": top_absentees,
        }
    except Exception as e:
        log_tools.debug("get_attendance_summary error: %s", e)
        return {"error": str(e)}


@tool
def send_notification_to_student(student_user_id: str, title: str, title_ar: str, body: str = "", body_ar: str = "", sender_user_id: str = "") -> dict:
    """
    Send a notification directly to a student (or their parent).
    Args:
        student_user_id: auth user_id of the student
        title: notification title in English
        title_ar: notification title in Arabic
        body: optional body in English
        body_ar: optional body in Arabic
        sender_user_id: teacher's auth user_id (used as sender)
    Returns {"success": True} or {"error": ...}.
    """
    try:
        notif = {
            "recipient_id": student_user_id,
            "sender_id": sender_user_id or None,
            "sender_role": "teacher",
            "title": title,
            "title_ar": title_ar,
            "body": body or None,
            "body_ar": body_ar or None,
            "type": "general",
            "is_read": False,
        }
        supabase.table("notifications").insert(notif).execute()
        return {"success": True}
    except Exception as e:
        log_tools.debug("send_notification_to_student error: %s", e)
        return {"error": str(e)}


@tool
def get_class_assignments(class_id: str) -> list:
    """
    Get all assignments created for a specific class.
    Returns list of {title, type, due_date, max_score, subject_name}.
    """
    try:
        result = supabase.table("assignments").select(
            "title, title_ar, assignment_type, due_date, max_score, subjects(name, name_ar)"
        ).eq("class_id", class_id).order("due_date", desc=True).execute()
        rows = []
        for a in (result.data or []):
            rows.append({
                "title": a.get("title_ar") or a.get("title"),
                "type": a.get("assignment_type"),
                "due_date": a.get("due_date"),
                "max_score": a.get("max_score"),
                "subject": a.get("subjects", {}).get("name_ar") if a.get("subjects") else None,
            })
        return rows
    except Exception as e:
        log_tools.debug("get_class_assignments error: %s", e)
        return []
