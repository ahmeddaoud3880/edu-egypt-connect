from langchain_core.messages import SystemMessage, HumanMessage
from roles.directorate.tools import (get_directorate_schools, get_directorate_summary, get_directorate_open_alerts, get_directorate_low_performing_schools)
from shared.log_tools import log_activity
from shared.tool_loop import run_llm_with_tools

tools = [get_directorate_schools, get_directorate_summary, get_directorate_open_alerts, get_directorate_low_performing_schools]
SYSTEM = """You are an AI assistant for a district education official on Egypt's platform. Always call database tools for real data. Respond in Arabic or English. Help monitor school performance and district-level issues. Use Markdown (## headings, **bold**, lists) in answers when helpful — no HTML."""

def run(user_id: str, message: str, provider: str = None, model: str = None) -> str:
    msgs = [SystemMessage(content=SYSTEM), HumanMessage(content=f"[Directorate ID: {user_id}]\n{message}")]
    text = run_llm_with_tools(provider, model, tools, msgs)
    log_activity.invoke({"user_id": user_id, "action_type": "ask_ai", "details": {"question": message[:200]}})
    return text
