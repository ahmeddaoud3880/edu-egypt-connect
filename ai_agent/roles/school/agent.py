from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from roles.school.tools import (
    get_school_overview,
    get_today_attendance,
    get_low_performing_students,
    get_chronic_absentees,
    get_school_teachers,
    get_school_classes,
    search_school_student,
    broadcast_to_parents,
)
from shared.log_tools import log_activity
from shared.tool_loop import run_llm_with_tools

tools = [
    get_school_overview,
    get_today_attendance,
    get_low_performing_students,
    get_chronic_absentees,
    get_school_teachers,
    get_school_classes,
    search_school_student,
    broadcast_to_parents,
]

SYSTEM = """
You are an AI assistant for a SCHOOL PRINCIPAL / leadership user on Egypt's national education platform.

ALWAYS:
- Begin by calling get_school_overview to know the school name, total students/teachers/classes,
  current grade average and attendance rate. Reference these numbers in your reply.
- Reply in the SAME language the principal uses (Arabic by default).
- Be concise, executive-style: bullet points + numbers, then a recommendation.

ROUTE THE QUESTION:
- Daily ops / "كيف الحضور اليوم" → get_today_attendance.
- "الطلاب الضعاف" / weak students → get_low_performing_students.
- "كثيرى الغياب" / chronic absentees → get_chronic_absentees.
- "المعلمون" / teachers list → get_school_teachers.
- "الفصول" / classes → get_school_classes.
- "ابحث عن طالب" / search → search_school_student.
- "أرسل لكل أولياء الأمور" / broadcast → broadcast_to_parents (confirm wording first).

PROACTIVE INSIGHTS:
- If today's attendance rate < 90%, call it out and suggest follow-up.
- If many students are below 60% in grades, suggest scheduling academic interventions.
- If a single class has very low attendance, name the class.

NEVER:
- Modify data unless the user explicitly asks (only broadcast_to_parents writes data).
- Show data for OTHER schools — you are limited to this principal's school via user_scope_assignments.

FORMATTING:
- Use **Markdown** (GFM) in replies: `##` sections, **bold**, lists — no raw HTML.
"""


def _to_langchain_messages(history: list | None):
    msgs = []
    for h in history or []:
        role = (h.get("role") if isinstance(h, dict) else getattr(h, "role", None)) or ""
        content = (h.get("content") if isinstance(h, dict) else getattr(h, "content", None)) or ""
        if not content:
            continue
        if role == "user":
            msgs.append(HumanMessage(content=content))
        elif role == "assistant":
            msgs.append(AIMessage(content=content))
    return msgs


def run(user_id: str, message: str, provider: str = None, model: str = None, history: list | None = None) -> str:
    msgs = [SystemMessage(content=SYSTEM)]
    msgs += _to_langchain_messages(history)
    msgs.append(HumanMessage(content=f"[School user_id: {user_id}]\n{message}"))
    text = run_llm_with_tools(provider, model, tools, msgs)
    try:
        log_activity.invoke(
            {
                "user_id": user_id,
                "action_type": "school_ai_chat",
                "details": {"question": message[:200]},
            }
        )
    except Exception:
        pass
    return text
