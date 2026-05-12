from __future__ import annotations

import json
import logging
from typing import Any

from langchain_core.messages import HumanMessage, ToolMessage

from shared.llm_factory import get_llm

log = logging.getLogger("egypt_edu.tool_loop")

MAX_ROUNDS = 12
TOOL_MSG_CAP = 12_000

_FINAL_HINT = """Now write your **final reply** to the user in natural language (same language they used).
- Ground the reply in the tool results above; do not invent grades, attendance, or textbook facts.
- If textbook passages were retrieved, answer only from those and cite page numbers.
- Format the answer in **GitHub-Flavored Markdown** when it helps readability: short `##` headings, **bold** key terms, `-` or numbered lists, line breaks. No raw HTML.
No more tools — text-only response (markdown plain text)."""


def _tool_payload(out: Any) -> str:
    if isinstance(out, (dict, list)):
        return json.dumps(out, ensure_ascii=False)
    return str(out)


def run_llm_with_tools(
    provider: str | None,
    model: str | None,
    tools: list,
    messages: list,
    *,
    max_rounds: int = MAX_ROUNDS,
) -> str:
    llm = get_llm(provider, model, temperature=0).bind_tools(tools, parallel_tool_calls=False)
    tool_by_name = {t.name: t for t in tools}
    msgs = list(messages)

    for round_i in range(max_rounds):
        response = llm.invoke(msgs)
        msgs.append(response)
        tool_calls = getattr(response, "tool_calls", None) or []
        if not tool_calls:
            text = (response.content or "").strip()
            if text:
                return text
            break

        for tc in tool_calls:
            if isinstance(tc, dict):
                name = tc.get("name", "") or ""
                args = tc.get("args", {}) or {}
                tid = tc.get("id", "") or name
            else:
                name = getattr(tc, "name", "") or ""
                args = getattr(tc, "args", {}) or {}
                tid = getattr(tc, "id", "") or name

            tool_fn = tool_by_name.get(name)
            if tool_fn is None:
                msgs.append(ToolMessage(content=f"Unknown tool: {name}", tool_call_id=str(tid)))
                continue
            try:
                out = tool_fn.invoke(args)
                payload = _tool_payload(out)
                log.info("TOOL %s round=%s ok chars=%s", name, round_i, len(payload))
            except Exception as e:
                log.warning("TOOL %s round=%s error=%s", name, round_i, e)
                payload = f"Tool error ({name}): {e}"
            if len(payload) > TOOL_MSG_CAP:
                payload = payload[:TOOL_MSG_CAP] + "… [truncated]"
            msgs.append(ToolMessage(content=payload, tool_call_id=str(tid)))

    plain = get_llm(provider, model, temperature=0)
    final = plain.invoke(msgs + [HumanMessage(content=_FINAL_HINT)])
    text = (final.content or "").strip()
    return text or "تعذّر إكمال الرد بعد عدة خطوات. جرّب سؤالاً أبسط أو راجع سجلات الخادم."
