from langchain_core.tools import tool
from db.client import supabase
import shared.log_tools as log_tools


def _parent_national_id(user_id: str) -> str | None:
    """Return the parent's national_id from profiles (used to find their children)."""
    try:
        p = supabase.table("profiles").select("national_id").eq("id", user_id).maybe_single().execute()
        return (p.data or {}).get("national_id")
    except Exception as e:
        log_tools.debug("parent national_id lookup failed: %s", e)
        return None


def _children_rows(user_id: str) -> list[dict]:
    """Return raw students rows linked to this parent."""
    nid = _parent_national_id(user_id)
    if not nid:
        return []
    try:
        result = (
            supabase.table("students")
            .select(
                "id, user_id, full_name, national_id, grade_number, stage_id, school_id, "
                "stages(name, name_ar), schools(name, name_ar)"
            )
            .eq("parent_national_id", nid)
            .execute()
        )
        return result.data or []
    except Exception as e:
        log_tools.debug("children lookup failed: %s", e)
        return []


@tool
def get_parent_profile(user_id: str) -> dict:
    """
    Return the parent's basic profile (name, phone, governorate). Useful for personalization.
    """
    try:
        p = (
            supabase.table("profiles")
            .select("full_name, full_name_ar, phone, national_id, governorate_id, district_id")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        return p.data or {"error": "Parent profile not found"}
    except Exception as e:
        return {"error": str(e)}


@tool
def get_my_children(user_id: str) -> list:
    """
    Get all children linked to this parent via students.parent_national_id.
    Returns list of {child_user_id, student_id, full_name, grade_number, stage, school}.
    """
    rows = _children_rows(user_id)
    result = []
    for c in rows:
        result.append(
            {
                "student_id": c.get("id"),
                "child_user_id": c.get("user_id"),
                "full_name": c.get("full_name"),
                "national_id": c.get("national_id"),
                "grade_number": c.get("grade_number"),
                "stage": (c.get("stages") or {}).get("name_ar")
                or (c.get("stages") or {}).get("name"),
                "school": (c.get("schools") or {}).get("name_ar")
                or (c.get("schools") or {}).get("name"),
            }
        )
    return result


@tool
def get_children_grades(user_id: str) -> list:
    """
    Get grades for all children of this parent.
    Returns list of {child_name, subject, score, max_score, percent, term, date}.
    """
    rows = _children_rows(user_id)
    out = []
    for c in rows:
        sid = c.get("id")
        if not sid:
            continue
        try:
            res = (
                supabase.table("grades")
                .select("score, max_score, grade_date, term, subjects(name, name_ar)")
                .eq("student_id", sid)
                .order("grade_date", desc=True)
                .execute()
            )
            for g in res.data or []:
                max_s = g.get("max_score") or 100
                pct = (
                    round((g["score"] / max_s) * 100, 1)
                    if g.get("score") is not None
                    else None
                )
                out.append(
                    {
                        "child_name": c.get("full_name"),
                        "subject": (g.get("subjects") or {}).get("name_ar")
                        or (g.get("subjects") or {}).get("name"),
                        "score": g.get("score"),
                        "max_score": max_s,
                        "percent": pct,
                        "term": g.get("term"),
                        "date": g.get("grade_date"),
                    }
                )
        except Exception as e:
            log_tools.debug("get_children_grades child=%s err=%s", sid, e)
    return out


@tool
def get_children_attendance(user_id: str) -> dict:
    """
    Aggregate attendance per child for the last 60 records.
    Returns {child_name: {present, absent, late, rate, recent_absences[5]}, ...}.
    """
    rows = _children_rows(user_id)
    out: dict = {}
    for c in rows:
        sid = c.get("id")
        if not sid:
            continue
        try:
            res = (
                supabase.table("attendance_records")
                .select("date, status, classes(name)")
                .eq("student_id", sid)
                .order("date", desc=True)
                .limit(60)
                .execute()
            )
            records = res.data or []
            total = len(records)
            present = sum(1 for r in records if r["status"] == "present")
            absent = sum(1 for r in records if r["status"] == "absent")
            late = sum(1 for r in records if r["status"] == "late")
            rate = round((present / total) * 100, 1) if total else None
            recent_absences = [
                {
                    "date": r["date"],
                    "class": (r.get("classes") or {}).get("name"),
                }
                for r in records
                if r["status"] == "absent"
            ][:5]
            out[c.get("full_name") or sid] = {
                "total_records": total,
                "present": present,
                "absent": absent,
                "late": late,
                "attendance_rate_percent": rate,
                "recent_absences": recent_absences,
            }
        except Exception as e:
            log_tools.debug("get_children_attendance child=%s err=%s", sid, e)
    return out


@tool
def get_children_assignments(user_id: str) -> list:
    """
    Get upcoming and recent assignments for all children (via their class enrollments).
    Returns list of {child_name, title, subject, type, due_date, max_score, class}.
    """
    rows = _children_rows(user_id)
    out = []
    for c in rows:
        sid = c.get("id")
        if not sid:
            continue
        try:
            enr = (
                supabase.table("enrollments").select("class_id").eq("student_id", sid).execute()
            )
            class_ids = [e["class_id"] for e in (enr.data or [])]
            if not class_ids:
                continue
            res = (
                supabase.table("assignments")
                .select(
                    "title, title_ar, due_date, assignment_type, max_score, "
                    "subjects(name, name_ar), classes(name)"
                )
                .in_("class_id", class_ids)
                .order("due_date")
                .execute()
            )
            for a in res.data or []:
                out.append(
                    {
                        "child_name": c.get("full_name"),
                        "title": a.get("title_ar") or a.get("title"),
                        "subject": (a.get("subjects") or {}).get("name_ar")
                        or (a.get("subjects") or {}).get("name"),
                        "type": a.get("assignment_type"),
                        "due_date": a.get("due_date"),
                        "max_score": a.get("max_score"),
                        "class": (a.get("classes") or {}).get("name"),
                    }
                )
        except Exception as e:
            log_tools.debug("get_children_assignments child=%s err=%s", sid, e)
    return out


@tool
def get_my_notifications(user_id: str, limit: int = 20) -> list:
    """
    Recent notifications addressed to this parent (school notices, teacher messages, alerts).
    Returns list of {title, body, sender_role, type, is_read, created_at}.
    """
    try:
        res = (
            supabase.table("notifications")
            .select(
                "title, title_ar, body, body_ar, sender_role, type, is_read, created_at"
            )
            .eq("recipient_id", user_id)
            .order("created_at", desc=True)
            .limit(max(1, min(limit, 50)))
            .execute()
        )
        out = []
        for n in res.data or []:
            out.append(
                {
                    "title": n.get("title_ar") or n.get("title"),
                    "body": n.get("body_ar") or n.get("body"),
                    "sender_role": n.get("sender_role"),
                    "type": n.get("type"),
                    "is_read": n.get("is_read"),
                    "created_at": n.get("created_at"),
                }
            )
        return out
    except Exception as e:
        log_tools.debug("get_my_notifications error: %s", e)
        return []


@tool
def send_message_to_school(user_id: str, title_ar: str, body_ar: str, child_student_id: str = "") -> dict:
    """
    Create a notification addressed to the parent's child's school leadership.
    The school principal(s) of the child's school will receive it via user_scope_assignments.
    Args:
        user_id: parent auth user_id (sender).
        title_ar: subject in Arabic.
        body_ar: body in Arabic.
        child_student_id: optional — restrict to a specific child's school.
    Returns {"success": True, "delivered_to": N} or {"error": ...}.
    """
    try:
        rows = _children_rows(user_id)
        if child_student_id:
            rows = [r for r in rows if r.get("id") == child_student_id]
        school_ids = list({r.get("school_id") for r in rows if r.get("school_id")})
        if not school_ids:
            return {"error": "no_linked_schools"}

        admins_q = (
            supabase.table("user_scope_assignments")
            .select("user_id")
            .eq("role", "school")
            .in_("school_id", school_ids)
            .eq("is_active", True)
            .execute()
        )
        admin_ids = list({a["user_id"] for a in (admins_q.data or [])})
        if not admin_ids:
            return {"error": "no_school_admins"}

        rows_to_insert = [
            {
                "recipient_id": admin_id,
                "sender_id": user_id,
                "sender_role": "parent",
                "title": title_ar,
                "title_ar": title_ar,
                "body": body_ar,
                "body_ar": body_ar,
                "type": "general",
                "is_read": False,
            }
            for admin_id in admin_ids
        ]
        supabase.table("notifications").insert(rows_to_insert).execute()
        return {"success": True, "delivered_to": len(rows_to_insert)}
    except Exception as e:
        log_tools.debug("send_message_to_school error: %s", e)
        return {"error": str(e)}
