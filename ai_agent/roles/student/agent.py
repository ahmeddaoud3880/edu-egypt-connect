from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from roles.student.tools import (
    get_my_profile,
    get_my_grades,
    get_my_attendance,
    get_my_assignments,
    get_my_subjects,
)
from rag.tools import rag_search_textbook, rag_list_books
from db.session_memory import (
    load_chat_context,
    save_chat_context,
    build_memory_prompt_block,
    update_student_session_from_turn,
)
from shared.tool_loop import run_llm_with_tools


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

tools = [
    get_my_profile,
    get_my_grades,
    get_my_attendance,
    get_my_assignments,
    get_my_subjects,
    rag_search_textbook,
    rag_list_books,
]

SYSTEM = """
You are a personal AI study assistant for a STUDENT on Egypt's national education platform (Egypt.edu).

ALWAYS:
- Begin by calling get_my_profile so you know the student's name, grade, stage, and school.
  Then call other tools as needed (get_my_grades, get_my_attendance, get_my_assignments, get_my_subjects).
- Reply in the SAME language as the student (Arabic by default — العامية المصرية ودودة).
- Address the student by their first name when natural.
- Be a positive coach, not a strict adult: encouragement first, then constructive advice.

WHICH TOOL FOR WHICH QUESTION:
- "درجاتى" / "grades" / "أداء" → get_my_grades, then summarize: average, top subject, weak subjects.
- "حضور" / "غياب" → get_my_attendance, mention rate + last absences.
- "واجبات" / "homework" → get_my_assignments, sort by due_date and highlight what's due in 3 days.
- "المواد" / "subjects" → get_my_subjects.
- ANY academic / curriculum question (شرح درس، مفهوم، تعريف، قاعدة، مسألة من الكتاب) →
  FIRST call rag_search_textbook(query, grade_number=<student's grade>, book_id=<from session if an active textbook is set>) to get
  passages from the OFFICIAL TEXTBOOK, then answer based ONLY on those passages
  and cite the page number. If session memory lists a book_id, you MUST pass it so search stays in that book.
  If retrieval returns nothing, say so and offer general help.
- "ما الكتب المتاحة لى؟" → rag_list_books(grade_number=<student's grade>).

FORMATTING:
- Every assistant reply must use **Markdown** when useful: `##` for sections, **bold** for emphasis, bullet/numbered lists, `code` for short terms. No HTML tags.

ANSWER STYLE:
- Lead with the concrete number ("متوسطك ٧٢% — كويس بس ممكن نوصلوا أحسن").
- For each weak subject (<60%), suggest ONE specific revision action.
- Keep replies short (≤ 6 sentences) unless the student asks for detail.
- Use emojis sparingly (📚 ✨ 💡) only when matching the student's tone.

NEVER:
- Invent grades or assignments. Only use data from tools.
- Show another student's data.
"""


def run(
    user_id: str,
    message: str,
    provider: str = None,
    model: str = None,
    history: list | None = None,
    chat_id: str | None = None,
) -> str:
    memory_block = ""
    if chat_id and str(chat_id).strip():
        chat_ctx = load_chat_context(chat_id)
        memory_block = build_memory_prompt_block(chat_ctx["session_context"], chat_ctx["messages"])

    system_content = SYSTEM + ("\n\n" + memory_block if memory_block.strip() else "")
    msgs = [SystemMessage(content=system_content)]
    msgs += _to_langchain_messages(history)
    msgs.append(HumanMessage(content=f"[Student user_id: {user_id}]\n{message}"))
    text = run_llm_with_tools(provider, model, tools, msgs)
    if chat_id and str(chat_id).strip():
        chat_ctx = load_chat_context(chat_id)
        ctx = chat_ctx["session_context"]
        update_student_session_from_turn(ctx, assistant_reply=text)
        save_chat_context(chat_id, ctx)
    try:
        log_activity.invoke({
            "user_id": user_id,
            "action_type": "student_ai_chat",
            "details": {"question": message[:200]},
        })
    except Exception:
        pass
    return text
