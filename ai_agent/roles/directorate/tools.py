from langchain_core.tools import tool
from db.client import supabase


@tool
def get_directorate_schools(user_id: str) -> list:
    """Get all schools in this directorate's district."""
    p = supabase.table("profiles").select("district_id").eq("id", user_id).single().execute()
    district_id = p.data.get("district_id")
    return supabase.table("schools").select("id, name").eq("district_id", district_id).execute().data or []


@tool
def get_directorate_summary(user_id: str) -> dict:
    """Get total schools and students count in this directorate."""
    p = supabase.table("profiles").select("district_id").eq("id", user_id).single().execute()
    district_id = p.data.get("district_id")
    schools = supabase.table("schools").select("id", count="exact").eq("district_id", district_id).execute()
    students = supabase.table("profiles").select("id", count="exact").eq("district_id", district_id).execute()
    return {"district_id": district_id, "total_schools": schools.count or 0, "total_students": students.count or 0}


@tool
def get_directorate_open_alerts(user_id: str) -> list:
    """Get all open alerts across schools in this directorate."""
    p = supabase.table("profiles").select("district_id").eq("id", user_id).single().execute()
    district_id = p.data.get("district_id")
    return supabase.table("school_issues").select("*, schools(name)").eq("district_id", district_id).eq("status", "open").order("created_at", desc=True).limit(20).execute().data or []


@tool
def get_directorate_low_performing_schools(user_id: str) -> list:
    """Get schools in this directorate with highest number of failing students."""
    p = supabase.table("profiles").select("district_id").eq("id", user_id).single().execute()
    district_id = p.data.get("district_id")
    return supabase.table("student_grades").select("school_id, schools(name)").eq("district_id", district_id).lt("avg", 60).execute().data or []
