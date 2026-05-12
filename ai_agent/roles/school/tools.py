from datetime import date, timedelta
from langchain_core.tools import tool
from db.client import supabase
import shared.log_tools as log_tools


def _user_school_id(user_id: str) -> str | None:
    """Resolve school principal/admin → their assigned school_id."""
    try:
        r = (
            supabase.table("user_scope_assignments")
            .select("school_id")
            .eq("user_id", user_id)
            .eq("role", "school")
            .eq("is_active", True)
            .order("assigned_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = r.data or []
        return rows[0]["school_id"] if rows and rows[0].get("school_id") else None
    except Exception as e:
        log_tools.debug("user_scope_assignments lookup failed: %s", e)
        return None


@tool
def get_school_overview(user_id: str) -> dict:
    """
    School-wide summary: name, total students, total teachers, total classes,
    overall grade average and current attendance rate (last 30 days).
    """
    school_id = _user_school_id(user_id)
    if not school_id:
        return {"error": "no_school_assignment"}
    try:
        school = (
            supabase.table("schools")
            .select("name, name_ar")
            .eq("id", school_id)
            .maybe_single()
            .execute()
        )
        students = (
            supabase.table("students").select("id", count="exact").eq("school_id", school_id).execute()
        )
        teachers = (
            supabase.table("teachers").select("id", count="exact").eq("school_id", school_id).execute()
        )
        classes = (
            supabase.table("classes").select("id", count="exact").eq("school_id", school_id).execute()
        )

        student_ids = [s["id"] for s in (students.data or [])]
        avg_pct = None
        if student_ids:
            grades = (
                supabase.table("grades")
                .select("score, max_score")
                .in_("student_id", student_ids)
                .execute()
            )
            pcts = []
            for g in grades.data or []:
                m = g.get("max_score") or 100
                if g.get("score") is not None and m:
                    pcts.append(g["score"] / m * 100)
            avg_pct = round(sum(pcts) / len(pcts), 1) if pcts else None

        att_rate = None
        if student_ids:
            since = (date.today() - timedelta(days=30)).isoformat()
            att = (
                supabase.table("attendance_records")
                .select("status")
                .in_("student_id", student_ids)
                .gte("date", since)
                .execute()
            )
            recs = att.data or []
            if recs:
                pres = sum(1 for r in recs if r["status"] == "present")
                att_rate = round(pres / len(recs) * 100, 1)

        return {
            "school_name": (school.data or {}).get("name_ar")
            or (school.data or {}).get("name"),
            "total_students": students.count or 0,
            "total_teachers": teachers.count or 0,
            "total_classes": classes.count or 0,
            "avg_grade_percent": avg_pct,
            "attendance_rate_last_30d_percent": att_rate,
        }
    except Exception as e:
        log_tools.debug("get_school_overview error: %s", e)
        return {"error": str(e)}


@tool
def get_today_attendance(user_id: str) -> dict:
    """Today's attendance summary: present / absent / late + by-class breakdown."""
    school_id = _user_school_id(user_id)
    if not school_id:
        return {"error": "no_school_assignment"}
    try:
        students = (
            supabase.table("students").select("id").eq("school_id", school_id).execute()
        )
        sids = [s["id"] for s in (students.data or [])]
        if not sids:
            return {"total": 0}
        today = date.today().isoformat()
        att = (
            supabase.table("attendance_records")
            .select("status, student_id, class_id, classes(name)")
            .in_("student_id", sids)
            .eq("date", today)
            .execute()
        )
        recs = att.data or []
        total = len(recs)
        present = sum(1 for r in recs if r["status"] == "present")
        absent = sum(1 for r in recs if r["status"] == "absent")
        late = sum(1 for r in recs if r["status"] == "late")
        by_class: dict[str, dict] = {}
        for r in recs:
            cn = (r.get("classes") or {}).get("name") or "—"
            if cn not in by_class:
                by_class[cn] = {"present": 0, "absent": 0, "late": 0}
            by_class[cn][r["status"]] = by_class[cn].get(r["status"], 0) + 1
        return {
            "date": today,
            "total_records": total,
            "present": present,
            "absent": absent,
            "late": late,
            "rate_percent": round(present / total * 100, 1) if total else None,
            "by_class": by_class,
        }
    except Exception as e:
        log_tools.debug("get_today_attendance error: %s", e)
        return {"error": str(e)}


@tool
def get_low_performing_students(user_id: str, threshold_percent: float = 60.0) -> list:
    """
    Students at this school whose AVERAGE grade percent is below the threshold (default 60%).
    Returns list of {full_name, grade_number, avg_percent, num_grades}.
    """
    school_id = _user_school_id(user_id)
    if not school_id:
        return []
    try:
        students = (
            supabase.table("students")
            .select("id, full_name, grade_number")
            .eq("school_id", school_id)
            .execute()
        )
        rows = students.data or []
        out = []
        for s in rows:
            g = (
                supabase.table("grades")
                .select("score, max_score")
                .eq("student_id", s["id"])
                .execute()
            )
            pcts = []
            for r in g.data or []:
                m = r.get("max_score") or 100
                if r.get("score") is not None and m:
                    pcts.append(r["score"] / m * 100)
            if not pcts:
                continue
            avg = round(sum(pcts) / len(pcts), 1)
            if avg < threshold_percent:
                out.append(
                    {
                        "student_id": s["id"],
                        "full_name": s.get("full_name"),
                        "grade_number": s.get("grade_number"),
                        "avg_percent": avg,
                        "num_grades": len(pcts),
                    }
                )
        return sorted(out, key=lambda x: x["avg_percent"])[:30]
    except Exception as e:
        log_tools.debug("get_low_performing_students error: %s", e)
        return []


@tool
def get_chronic_absentees(user_id: str, threshold_rate: float = 80.0, days: int = 30) -> list:
    """
    Students whose attendance rate over the last N days is below threshold (default 80%).
    Returns list of {full_name, grade_number, attendance_rate_percent, absent_count}.
    """
    school_id = _user_school_id(user_id)
    if not school_id:
        return []
    try:
        students = (
            supabase.table("students")
            .select("id, full_name, grade_number")
            .eq("school_id", school_id)
            .execute()
        )
        rows = students.data or []
        since = (date.today() - timedelta(days=days)).isoformat()
        out = []
        for s in rows:
            att = (
                supabase.table("attendance_records")
                .select("status")
                .eq("student_id", s["id"])
                .gte("date", since)
                .execute()
            )
            recs = att.data or []
            if not recs:
                continue
            pres = sum(1 for r in recs if r["status"] == "present")
            absent = sum(1 for r in recs if r["status"] == "absent")
            rate = round(pres / len(recs) * 100, 1)
            if rate < threshold_rate:
                out.append(
                    {
                        "student_id": s["id"],
                        "full_name": s.get("full_name"),
                        "grade_number": s.get("grade_number"),
                        "attendance_rate_percent": rate,
                        "absent_count": absent,
                    }
                )
        return sorted(out, key=lambda x: x["attendance_rate_percent"])[:30]
    except Exception as e:
        log_tools.debug("get_chronic_absentees error: %s", e)
        return []


@tool
def get_school_teachers(user_id: str) -> list:
    """All teachers at this school: {full_name, specialization}."""
    school_id = _user_school_id(user_id)
    if not school_id:
        return []
    try:
        result = (
            supabase.table("teachers")
            .select("id, full_name, specialization, user_id")
            .eq("school_id", school_id)
            .order("full_name")
            .execute()
        )
        return result.data or []
    except Exception as e:
        log_tools.debug("get_school_teachers error: %s", e)
        return []


@tool
def get_school_classes(user_id: str) -> list:
    """All classes at this school with current enrollment counts."""
    school_id = _user_school_id(user_id)
    if not school_id:
        return []
    try:
        classes = (
            supabase.table("classes")
            .select("id, name, grade_number, capacity, stages(name, name_ar)")
            .eq("school_id", school_id)
            .execute()
        )
        rows = classes.data or []
        out = []
        for c in rows:
            enr = (
                supabase.table("enrollments")
                .select("id", count="exact")
                .eq("class_id", c["id"])
                .execute()
            )
            out.append(
                {
                    "class_id": c["id"],
                    "name": c.get("name"),
                    "grade_number": c.get("grade_number"),
                    "stage": (c.get("stages") or {}).get("name_ar")
                    or (c.get("stages") or {}).get("name"),
                    "enrolled": enr.count or 0,
                    "capacity": c.get("capacity"),
                }
            )
        return out
    except Exception as e:
        log_tools.debug("get_school_classes error: %s", e)
        return []


@tool
def search_school_student(user_id: str, query: str) -> list:
    """
    Search a student inside this school by name or national_id (substring match).
    Returns matches with their key info.
    """
    school_id = _user_school_id(user_id)
    if not school_id or not query:
        return []
    try:
        q = (query or "").strip()
        result = (
            supabase.table("students")
            .select(
                "id, full_name, national_id, grade_number, "
                "stages(name_ar, name), schools(name, name_ar)"
            )
            .eq("school_id", school_id)
            .or_(f"full_name.ilike.%{q}%,national_id.ilike.%{q}%")
            .limit(20)
            .execute()
        )
        return result.data or []
    except Exception as e:
        log_tools.debug("search_school_student error: %s", e)
        return []


@tool
def broadcast_to_parents(
    user_id: str,
    title_ar: str,
    body_ar: str,
    grade_number: int = 0,
) -> dict:
    """
    Send a notification to ALL parents whose children are at this school.
    Optionally restrict by grade_number (e.g. only Grade 6 parents).
    Returns {"success": True, "delivered_to": N}.
    """
    school_id = _user_school_id(user_id)
    if not school_id:
        return {"error": "no_school_assignment"}
    try:
        q = supabase.table("students").select("parent_national_id").eq("school_id", school_id)
        if grade_number:
            q = q.eq("grade_number", grade_number)
        students = q.execute()
        nids = list({s["parent_national_id"] for s in (students.data or []) if s.get("parent_national_id")})
        if not nids:
            return {"success": True, "delivered_to": 0}

        parents = (
            supabase.table("profiles").select("id").in_("national_id", nids).execute()
        )
        parent_ids = [p["id"] for p in (parents.data or [])]
        if not parent_ids:
            return {"success": True, "delivered_to": 0}

        rows = [
            {
                "recipient_id": pid,
                "sender_id": user_id,
                "sender_role": "school",
                "title": title_ar,
                "title_ar": title_ar,
                "body": body_ar,
                "body_ar": body_ar,
                "type": "general",
                "is_read": False,
            }
            for pid in parent_ids
        ]
        supabase.table("notifications").insert(rows).execute()
        return {"success": True, "delivered_to": len(rows)}
    except Exception as e:
        log_tools.debug("broadcast_to_parents error: %s", e)
        return {"error": str(e)}
