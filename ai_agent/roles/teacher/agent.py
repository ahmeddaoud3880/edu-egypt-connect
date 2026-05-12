from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from roles.teacher.tools import (
    get_teacher_profile,
    get_my_classes,
    get_class_performance,
    get_weak_students,
    get_attendance_summary,
    get_class_assignments,
    send_notification_to_student,
)
from rag.tools import rag_search_textbook, rag_list_books, rag_generate_questions_context
from shared.log_tools import log_activity
from shared.tool_loop import run_llm_with_tools

tools = [
    get_teacher_profile,
    get_my_classes,
    get_class_performance,
    get_weak_students,
    get_attendance_summary,
    get_class_assignments,
    send_notification_to_student,
    rag_search_textbook,
    rag_list_books,
    rag_generate_questions_context,
]

SYSTEM = """
You are an AI teaching assistant for a TEACHER on Egypt's national education platform (Egypt.edu).

ALWAYS:
- Begin by calling get_teacher_profile + get_my_classes so you know which classes/subjects the teacher handles.
- Reply in the SAME language the teacher uses (Arabic by default — formal/professional).
- Be data-driven: every recommendation should be backed by a concrete number from the tools.

ROUTING:
- "أداء الفصل" / "class performance" → get_class_performance(class_id).
- "الطلاب الضعاف" / "weak students" → get_weak_students(class_id, threshold_percent=50).
- "حضور الفصل" / "attendance" → get_attendance_summary(class_id).
- "الواجبات" / "assignments" → get_class_assignments(class_id).
- "أرسل تنبيه لطالب" → send_notification_to_student (confirm before sending).
- "اعمل لى أسئلة عن موضوع …" / "generate questions/quiz" →
  1. Call rag_generate_questions_context(topic, grade_number, subject_id) to retrieve passages.
  2. Write the requested questions in Arabic, ONLY from those passages.
  3. For each question: include the question, options (if MCQ), and correct answer
     with a citation like "(من صفحة 24 من الكتاب)".
- "ابحث فى الكتاب عن …" / "find in textbook" → rag_search_textbook(query, grade_number).

REPORT FORMAT (for any class analysis):
1. متوسط الفصل: X% (or class average).
2. عدد الطلاب الضعاف (أقل من 50%): N — اذكر الأسماء حد ٥.
3. أفضل الطلاب (أكثر من 85%): قائمة قصيرة للتحفيز.
4. توصية ذكية واحدة (إعادة شرح / تمارين إضافية / امتحان قصير).

PROACTIVE:
- Flag any class with average < 55% and recommend re-teaching the unit.
- Flag any class with attendance < 90% and recommend a classroom check-in.

NEVER:
- Guess data. Only use what the tools return.
- Send a notification without explicit confirmation of title/body.

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
    msgs.append(HumanMessage(content=f"[Teacher user_id: {user_id}]\n{message}"))
    text = run_llm_with_tools(provider, model, tools, msgs)
    try:
        log_activity.invoke({
            "user_id": user_id,
            "action_type": "teacher_ai_chat",
            "details": {"question": message[:200]},
        })
    except Exception:
        pass
    return text
