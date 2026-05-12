import json
import logging
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage

from roles.support.tools import (
    search_user,
    request_clarification,
    get_full_user_info,
    get_user_activity_logs,
    get_user_grades,
    get_user_attendance,
    get_user_assignments,
    get_user_notifications,
    get_user_ai_chats,
)
from shared.llm_factory import get_llm, get_current_config
from db.support_search_catalog import full_support_schema_prompt
from db.session_memory import (
    load_chat_context,
    save_chat_context,
    update_context_from_turn,
    build_memory_prompt_block,
)
from roles.support.ui_payload import build_support_ui

log = logging.getLogger("egypt_edu.support_agent")

tools = [
    search_user,
    request_clarification,
    get_full_user_info,
    get_user_activity_logs,
    get_user_grades,
    get_user_attendance,
    get_user_assignments,
    get_user_notifications,
    get_user_ai_chats,
]

tool_by_name = {t.name: t for t in tools}

TOOL_REGISTRY = """
Tool names must appear **exactly** as below inside JSON:
- search_user → {"query": "concrete person name or fragment only"}
- request_clarification → {"query": "original searched name", "matches_json": "<JSON string of matches array from search_user>"}
- get_full_user_info → {"user_id": "uuid: match.user_id (auth) or profiles row id; tool resolves both"}
- get_user_activity_logs → {"user_id": "uuid", "limit": optional number}
- get_user_grades → {"user_id": "uuid"}
- get_user_attendance → {"user_id": "uuid"}
- get_user_assignments → {"user_id": "uuid"}
- get_user_notifications → {"user_id": "uuid"}
- get_user_ai_chats → {"user_id": "uuid"}
"""

SYSTEM = """
## Role
You are the **Egypt digital education platform** support copilot. Instructions here are **English only** (including this system text).

## Language for replies (critical)
**Mirror the staff member's language.** If their message is in Arabic, reply in **formal Modern Standard Arabic** suited to a national education programme. If they write in English, reply in **clear professional English**. Never mix languages unless they did.

Use tool outputs as facts; do not invent records.

## Data access
You only read user data via tools — never guess.

""" + full_support_schema_prompt() + """

## `search_user` tool output — response rules
The tool returns: `searched_sources`, `partial_errors`, `count`, `matches`, `disambiguation_needed`, `strategy`, `hint`, sometimes `reason`, `profile_linked_via`.

**Case 1 — `reason == "vague_or_placeholder_query"`**: Do NOT say "not found". Ask for full name, email, or account id.
**Case 2 — `reason == "db_schema_or_table_missing"`**: Tell sources are unavailable; never repeat the same `search_user` call.
**Case 3 — `count == 0`**: Suggest different spelling, email, or id.
**Case 4 — `count == 1`**: Summarise and proceed. If `user_id` is null, warn the account link may be inconsistent.

**Case 5 — `count > 1` (disambiguation required)** — read `clarify_first`, `short_query`, `at_result_cap` from the tool.

  **A) `clarify_first` is true** (short query with **≥3** matches **or** `at_result_cap` is true because the tool returned **15** hits — **many more may exist in the database**):
  1. **Do NOT** paste a long numbered list of people in the answer.
  2. In the **next tool step**, call **`request_clarification`** with the same `search_query` and the full `matches` array as JSON string.
  3. Optionally one short sentence in Arabic: وجدت عدة نتائج للبحث؛ أحتاج سؤالاً واحداً لتضييق النطاق.
  4. After the staff member answers, call **`search_user` again** with a **longer** query (e.g. add father's name, email, phone, national id) — never rely on picking from a huge list.

  **B) `clarify_first` is false** and **count ≤ 5**:
  → Show a **compact numbered list** (name, role, masked email); staff may pick by number, then **`get_full_user_info`** with that `user_id`.

  **C) `clarify_first` is false** and **count > 5**:
  → Call **`request_clarification`** then refine search.

  **Picking by number** is only valid when you **already showed** a small list (clarify_first was false). If staff picked before clarification ran, ask them to answer the clarifier first or search again with more detail.

  **`get_full_user_info` output**: If `ok` is false (e.g. `profile_not_found`), explain honestly — the id may be wrong or the person exists only on `registration_requests`. Do not invent profile data.

## Rules
- One tool per step, then read the observation before the next step.
- In `matches`, **`user_id`** is the auth id when linked: `profiles.user_id` **or** `profiles.id` (if there is no `user_id` column), and `student_profiles.user_id` when present; it can be **null** on `registration_requests` until linked.
- For shortcut prompts **without a name**, do **not** call `search_user` — answer in text and ask for identifying details.
- **Never re-run `search_user` with the same query after already getting results.** If count > 0, work with what you have.
- If staff selects by number (١، ١، 1, 2, "الأول"…), map to the match in the last search results and call `get_full_user_info` directly — do not search again.

## Privacy
Showing masked email (first 3 chars + domain) to disambiguate multiple matches is allowed for support staff. Full national_id should only be shown when staff explicitly requests full profile.

""" + TOOL_REGISTRY

_MAX_TOOL_ROUNDS = 12
_TOOL_MSG_CAP = 12_000
_MAX_JSON_STEPS = 12

_FINAL_REPLY_HINT = """Write one **final reply** to the support staff member.
- Use the **same language** they used (Arabic → formal MSA; English → professional English).
- Ground the reply in tool results above; do not fabricate data.
- Format using **Markdown** (GFM) when it helps: `##` headings, **bold**, bullet lists — no raw HTML.
No more tools — text-only response."""


def _tool_payload(out) -> str:
    if isinstance(out, (dict, list)):
        return json.dumps(out, ensure_ascii=False)
    return str(out)


def _log_tool(name: str, args: dict, out, exc: Exception | None = None) -> None:
    preview = _tool_payload(out) if exc is None else ""
    if len(preview) > 800:
        preview = preview[:800] + "…"
    if exc is not None:
        log.warning("TOOL %s args=%s ERROR=%s", name, args, exc)
    else:
        log.info("TOOL %s args=%s → ok preview=%s", name, args, preview or "(empty)")


def _parse_json_object(text: str) -> dict:
    t = (text or "").strip()
    if t.startswith("```"):
        lines = t.split("\n")
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        t = "\n".join(lines)
        if "```" in t:
            t = t.rsplit("```", 1)[0]
    return json.loads(t)


def _build_system_with_memory(memory_block: str) -> str:
    return SYSTEM + "\n\n" + memory_block if memory_block.strip() else SYSTEM


def _run_bind_tools(message: str, provider: str, model: str, ctx: dict, memory_block: str = "") -> str:
    llm = get_llm(provider, model, temperature=0).bind_tools(tools, parallel_tool_calls=False)
    system_content = _build_system_with_memory(memory_block)
    messages: list = [SystemMessage(content=system_content), HumanMessage(content=message)]

    for _ in range(_MAX_TOOL_ROUNDS):
        response = llm.invoke(messages)
        messages.append(response)

        tool_calls = getattr(response, "tool_calls", None) or []
        if not tool_calls:
            return (response.content or "").strip() or "(No text response)"

        for tc in tool_calls:
            if isinstance(tc, dict):
                name = tc.get("name", "")
                args = tc.get("args", {}) or {}
                tid = tc.get("id", "") or name
            else:
                name = getattr(tc, "name", "") or ""
                args = getattr(tc, "args", {}) or {}
                tid = getattr(tc, "id", "") or name

            tool_fn = tool_by_name.get(name)
            if tool_fn is None:
                messages.append(ToolMessage(content=f"Unknown tool: {name}", tool_call_id=str(tid)))
                continue
            out = None
            try:
                out = tool_fn.invoke(args)
                if name == "search_user" and isinstance(out, dict):
                    ctx["last_search"] = out
                if name == "request_clarification" and isinstance(out, dict):
                    ctx["last_clarification"] = out
                _log_tool(name, args, out, None)
                payload = _tool_payload(out)
            except Exception as e:
                _log_tool(name, args, None, e)
                payload = f"Tool error ({name}): {e}"
            if len(payload) > _TOOL_MSG_CAP:
                payload = payload[:_TOOL_MSG_CAP] + "… [truncated]"
            if name == "search_user" and isinstance(out, dict) and out.get("clarify_first"):
                payload += (
                    "\n\n[REQUIRED NEXT STEP] clarify_first=true — call tool `request_clarification` "
                    "with args: query (string) and matches_json (stringified JSON array of matches). "
                    "Do not answer with a long list of all names first."
                )
                if out.get("at_result_cap"):
                    payload += (
                        " at_result_cap=true: the list is capped at 15 — many more matches may exist in the DB."
                    )
            messages.append(ToolMessage(content=payload, tool_call_id=str(tid)))

    plain = get_llm(provider, model, temperature=0)
    final = plain.invoke(messages + [HumanMessage(content=_FINAL_REPLY_HINT)])
    text = (final.content or "").strip()
    if text:
        return text
    return (
        "The model could not produce a final reply. Check server logs or try a simpler request (e.g. search by a specific name)."
    )


GROQ_JSON_RULES = """
## Mandatory JSON format (Groq provider)
Reply with **valid JSON only** each step (no XML, no `<function=...>`).

Two shapes only:

1) Single tool call:
{"step":"tool","tool":"search_user","args":{"query":"..."}}

2) Final answer to staff (after you have read prior tool results):
{"step":"answer","answer":"full reply text"}

The `answer` string may use **Markdown** (headings with ##, **bold**, bullet lists) for clarity — no HTML tags.

Rules: `tool` must be an English name from the tool list. `args` is a JSON object only.
If the user message is only a shortcut like «search for a student by name» **without a real name**, the only allowed step is `{"step":"answer",...}` — do **not** call `search_user` with placeholder text like "student name".
If they need `user_id` but gave no name, use `answer` to ask for name or id — no generic search tool call.
If `search_user` already returned `searched_sources` (or partial errors), **do not** repeat `search_user` with the same `query`; move to `answer` or another tool using `user_id` when present.
If staff replies with a number (١, ٢, 1, 2, "الأول"…), they are picking from the last disambiguation list — use the corresponding `user_id` from prior tool results and call `get_full_user_info` directly in a `step:tool` call.
When `search_user` returns **`clarify_first": true`**, the next `step` **must** be `request_clarification` — **never** `answer` that dumps all candidate names.
When **`at_result_cap": true`** (15 hits), tell staff briefly there may be **many more** matches in the system than shown; narrowing is required.
If staff picks "user_id" but `get_full_user_info` returns **`ok": false`**, explain the error from the tool and suggest `search_user` with email/national_id.
Format for request_clarification: {"step":"tool","tool":"request_clarification","args":{"query":"<original search query>","matches_json":"<single JSON string: stringify the matches array>"}}
"""


def _run_groq_json_agent(message: str, provider: str, model: str, ctx: dict, memory_block: str = "") -> str:
    """Groq Llama models often emit invalid native tool_calls; JSON-object steps are reliable."""
    llm = get_llm(provider, model, temperature=0).bind(response_format={"type": "json_object"})
    system_content = _build_system_with_memory(memory_block) + "\n" + GROQ_JSON_RULES
    messages: list = [
        SystemMessage(content=system_content),
        HumanMessage(content=message),
    ]

    last_search_sig = None
    search_repeat = 0

    for step_i in range(_MAX_JSON_STEPS):
        log.info("GROQ_JSON step=%s", step_i)
        resp = llm.invoke(messages)
        raw = (resp.content or "").strip()
        try:
            data = _parse_json_object(raw)
        except (json.JSONDecodeError, ValueError) as e:
            log.warning("GROQ_JSON parse error: %s raw=%s", e, raw[:400])
            messages.append(
                HumanMessage(
                    content="Invalid JSON. Reply with a single JSON object following the rules."
                )
            )
            continue

        step = data.get("step")
        if step == "answer":
            ans = (data.get("answer") or "").strip()
            if ans:
                return ans
            messages.append(HumanMessage(content='Field "answer" is empty; fill it with a full reply for staff.'))
            continue

        if step != "tool":
            messages.append(HumanMessage(content='step must be either "tool" or "answer".'))
            continue

        name = (data.get("tool") or "").strip()
        args = data.get("args") if isinstance(data.get("args"), dict) else {}
        if name == "search_user":
            sig = json.dumps(args or {}, sort_keys=True, ensure_ascii=False)
            if sig == last_search_sig:
                search_repeat += 1
            else:
                search_repeat = 1
                last_search_sig = sig
            if search_repeat >= 2:
                log.warning("GROQ_JSON stopping duplicate search_user args=%s", args)
                messages.append(
                    HumanMessage(
                        content=(
                            "Stop repeating search_user. Reply with only "
                            '{"step":"answer","answer":"..."} '
                            "based on the latest tool output above (including searched_sources and counts)."
                        )
                    )
                )
                search_repeat = 0
                last_search_sig = None
                continue
        else:
            search_repeat = 0
            last_search_sig = None

        tool_fn = tool_by_name.get(name)
        if tool_fn is None:
            messages.append(
                HumanMessage(
                    content=f"Unknown tool: {name!r}. Use a name from the system tool list."
                )
            )
            continue

        out = None
        try:
            out = tool_fn.invoke(args or {})
            if name == "search_user" and isinstance(out, dict):
                ctx["last_search"] = out
            if name == "request_clarification" and isinstance(out, dict):
                ctx["last_clarification"] = out
            _log_tool(name, args or {}, out, None)
            obs = _tool_payload(out)
        except Exception as e:
            _log_tool(name, args or {}, None, e)
            obs = json.dumps({"error": str(e)}, ensure_ascii=False)

        if len(obs) > _TOOL_MSG_CAP:
            obs = obs[:_TOOL_MSG_CAP] + "… [truncated]"

        next_hint = (
            f"Tool `{name}` result:\n{obs}\n\nNext: either another tool as JSON step=tool, or answer staff with step=answer."
        )
        if name == "search_user" and isinstance(out, dict) and out.get("clarify_first"):
            cap_note = ""
            if out.get("at_result_cap"):
                cap_note = (
                    " Note: result count is at the 15-row cap — **many more rows may exist** in the database; "
                    "you must narrow with clarifying questions before implying the list is complete.\n\n"
                )
            next_hint = (
                f"Tool `{name}` result:\n{obs}\n\n"
                f"{cap_note}"
                "**clarify_first is true** — your NEXT JSON must be "
                '`{"step":"tool","tool":"request_clarification",'
                '"args":{"query":"<same search_query from result>",'
                '"matches_json":"<a single JSON string: use json.dumps-style escaping of the matches array>"}}` '
                "**Do not** use step=answer to list every candidate name."
            )

        messages.append(HumanMessage(content=next_hint))

    plain = get_llm(provider, model, temperature=0)
    final = plain.invoke(messages + [HumanMessage(content=_FINAL_REPLY_HINT)])
    text = (final.content or "").strip()
    return text or "Could not finish after many steps; check tool logs on the server."


def run(message: str, chat_id: str = None, provider: str = None, model: str = None) -> dict:
    ctx: dict = {}
    cfg = get_current_config()
    prov = provider or cfg["provider"]

    # ── Load session memory ──────────────────────────────────────────────────
    chat_ctx = load_chat_context(chat_id) if chat_id else {"messages": [], "session_context": {}}
    session_ctx = chat_ctx["session_context"]
    recent_msgs = chat_ctx["messages"]
    memory_block = build_memory_prompt_block(session_ctx, recent_msgs)

    log.info(
        "support.run start provider=%s chat_id=%s turns=%s window=%s",
        prov, (chat_id or "")[:8], session_ctx.get("turn_count", 0), len(recent_msgs),
    )

    if prov == "groq":
        text = _run_groq_json_agent(message, provider, model, ctx, memory_block)
    else:
        text = _run_bind_tools(message, provider, model, ctx, memory_block)

    # ── Persist updated session context ──────────────────────────────────────
    if chat_id:
        updated_ctx = update_context_from_turn(
            session_ctx,
            last_search=ctx.get("last_search"),
            last_clarification=ctx.get("last_clarification"),
            assistant_reply=text,
        )
        save_chat_context(chat_id, updated_ctx)

    ui = build_support_ui(ctx.get("last_search"), ctx.get("last_clarification"))
    return {"response": text, "support_ui": ui}
