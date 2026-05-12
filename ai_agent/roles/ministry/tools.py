from langchain_core.tools import tool
from db.client import supabase


@tool
def get_national_stats() -> dict:
    """Get national education stats: total schools, students, governorates."""
    schools = supabase.table("schools").select("id", count="exact").execute()
    students = supabase.table("profiles").select("id", count="exact").execute()
    govs = supabase.table("governorates").select("id, name").execute()
    return {"total_schools": schools.count or 0, "total_students": students.count or 0, "governorates": govs.data or []}


@tool
def get_all_governorates_summary() -> list:
    """Get schools and students count per governorate."""
    govs = supabase.table("governorates").select("id, name").execute().data or []
    result = []
    for g in govs:
        schools = supabase.table("schools").select("id", count="exact").eq("governorate_id", g["id"]).execute()
        students = supabase.table("profiles").select("id", count="exact").eq("governorate_id", g["id"]).execute()
        result.append({"governorate": g["name"], "schools": schools.count or 0, "students": students.count or 0})
    return result


@tool
def get_national_critical_alerts() -> list:
    """Get all critical open issues across the country."""
    return supabase.table("school_issues").select("*, schools(name, districts(name, governorates(name)))").eq("severity", "critical").eq("status", "open").order("created_at", desc=True).limit(20).execute().data or []


@tool
def get_platform_stats() -> dict:
    """Get platform-wide statistics from the platform_stats table."""
    result = supabase.table("platform_stats").select("*").limit(1).execute()
    return result.data[0] if result.data else {}
