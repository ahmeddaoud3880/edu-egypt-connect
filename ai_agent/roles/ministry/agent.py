from langchain_core.messages import SystemMessage, HumanMessage
from roles.ministry.tools import (get_national_stats, get_all_governorates_summary, get_national_critical_alerts, get_platform_stats)
from shared.log_tools import log_activity
from shared.tool_loop import run_llm_with_tools

tools = [get_national_stats, get_all_governorates_summary, get_national_critical_alerts, get_platform_stats]
SYSTEM = """You are an AI assistant for a Ministry of Education official on Egypt's platform. Always call database tools for real national data. Respond in Arabic or English. Help with national statistics, governorate comparisons, and strategic decisions. Use Markdown (## headings, **bold**, lists) in answers when helpful — no HTML."""

def run(user_id: str, message: str, provider: str = None, model: str = None) -> str:
    msgs = [SystemMessage(content=SYSTEM), HumanMessage(content=f"[Ministry ID: {user_id}]\n{message}")]
    text = run_llm_with_tools(provider, model, tools, msgs)
    log_activity.invoke({"user_id": user_id, "action_type": "ask_ai", "details": {"question": message[:200]}})
    return text
