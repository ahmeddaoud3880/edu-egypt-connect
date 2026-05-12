from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from db.client import supabase

log = logging.getLogger("egypt_edu.session_memory")

WINDOW_SIZE = 8          # number of recent messages to load verbatim
MAX_SEARCHED_USERS = 8   # max entries kept in searched_users list

_EMPTY_CTX: dict[str, Any] = {
    "turn_count": 0,
    "searched_users": [],
    "active_user_id": None,
    "open_clarifier_type": None,
    "thread_ar": "",
    "last_updated": None,
}


# ── DB helpers ────────────────────────────────────────────────────────────────

def load_chat_context(chat_id: str) -> dict[str, Any]:
    """
    Returns {messages: [...last WINDOW_SIZE], session_context: {...}}.
    Safe to call even if chat_id is None/empty (returns empty context).
    """
    if not chat_id or not str(chat_id).strip():
        return {"messages": [], "session_context": dict(_EMPTY_CTX)}
    try:
        # Load session_context
        chat_row = (
            supabase.table("ai_chats")
            .select("session_context")
            .eq("id", chat_id)
            .single()
            .execute()
        )
        raw_ctx: dict = {}
        if chat_row.data and isinstance(chat_row.data.get("session_context"), dict):
            raw_ctx = chat_row.data["session_context"]

        ctx = {**_EMPTY_CTX, **raw_ctx}

        # Load last WINDOW_SIZE messages
        msgs_row = (
            supabase.table("ai_messages")
            .select("role, content, created_at")
            .eq("chat_id", chat_id)
            .order("created_at", desc=True)
            .limit(WINDOW_SIZE)
            .execute()
        )
        messages = list(reversed(msgs_row.data or []))

        log.debug(
            "load_chat_context chat_id=%s window=%s turns=%s",
            chat_id[:8], len(messages), ctx.get("turn_count", 0),
        )
        return {"messages": messages, "session_context": ctx}

    except Exception as e:
        log.warning("load_chat_context failed chat_id=%s err=%s", chat_id, e)
        return {"messages": [], "session_context": dict(_EMPTY_CTX)}


def save_chat_context(chat_id: str, ctx: dict[str, Any]) -> None:
    """Persist updated session_context back to ai_chats."""
    if not chat_id or not str(chat_id).strip():
        return
    try:
        ctx["last_updated"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        supabase.table("ai_chats").update({"session_context": ctx}).eq("id", chat_id).execute()
        log.debug("save_chat_context ok chat_id=%s turns=%s", chat_id[:8], ctx.get("turn_count", 0))
    except Exception as e:
        log.warning("save_chat_context failed chat_id=%s err=%s", chat_id, e)


# ── Context updater (pure Python — no LLM call) ───────────────────────────────

def _extract_searched_user(match: dict) -> dict[str, Any] | None:
    """Convert a search_user match row into a compact memory entry."""
    name = (
        (match.get("full_name") or "").strip()
        or (match.get("full_name_ar") or "").strip()
        or (match.get("email") or "").strip()
    )
    if not name:
        return None
    role = (match.get("requested_role") or match.get("role") or "").strip()
    status = (match.get("request_status") or match.get("status") or "").strip()
    school = str(match.get("school_id") or "").strip() or None
    nat_id = str(match.get("national_id") or "").strip() or None
    summary_parts = [p for p in [role or None, status or None] if p]
    return {
        "user_id": match.get("user_id"),
        "name": name,
        "role": role,
        "status": status,
        "national_id": nat_id,
        "school": school,
        "summary": " · ".join(summary_parts) if summary_parts else name,
    }


def update_context_from_turn(
    ctx: dict[str, Any],
    *,
    last_search: dict | None,
    last_clarification: dict | None,
    assistant_reply: str,
) -> dict[str, Any]:
    """
    Deterministic (no LLM) update of session_context after each assistant turn.
    Returns the mutated ctx dict (same object).
    """
    ctx["turn_count"] = ctx.get("turn_count", 0) + 1

    # ── merge searched users ──────────────────────────────────────────────────
    if last_search and isinstance(last_search, dict) and last_search.get("ok"):
        existing_ids: set = {
            u["user_id"] for u in ctx.get("searched_users", []) if u.get("user_id")
        }
        existing_names: set = {
            u["name"].lower() for u in ctx.get("searched_users", [])
        }
        for m in last_search.get("matches") or []:
            entry = _extract_searched_user(m)
            if not entry:
                continue
            uid = entry.get("user_id")
            if uid and uid in existing_ids:
                continue
            if not uid and entry["name"].lower() in existing_names:
                continue
            ctx.setdefault("searched_users", []).append(entry)
            if uid:
                existing_ids.add(uid)
            existing_names.add(entry["name"].lower())
        # Trim to max
        ctx["searched_users"] = ctx["searched_users"][-MAX_SEARCHED_USERS:]

        # If exactly one match found, set as active user
        if last_search.get("count") == 1 and last_search.get("matches"):
            uid = last_search["matches"][0].get("user_id")
            if uid:
                ctx["active_user_id"] = uid

    # ── open clarifier ────────────────────────────────────────────────────────
    if last_clarification and isinstance(last_clarification, dict):
        ctx["open_clarifier_type"] = last_clarification.get("clarifier_type")
    else:
        # If assistant replied and no clarification pending, close it
        if assistant_reply and ctx.get("open_clarifier_type"):
            ctx["open_clarifier_type"] = None

    # ── thread summary (first 120 chars of latest reply) ─────────────────────
    if assistant_reply:
        ctx["thread_ar"] = assistant_reply.strip()[:120].replace("\n", " ")

    return ctx


def update_student_session_from_turn(ctx: dict[str, Any], *, assistant_reply: str) -> dict[str, Any]:
    """Lightweight session_context update for student AI (no support search tools)."""
    ctx["turn_count"] = ctx.get("turn_count", 0) + 1
    if assistant_reply:
        ctx["thread_ar"] = assistant_reply.strip()[:120].replace("\n", " ")
    return ctx


def build_memory_prompt_block(ctx: dict[str, Any], recent_messages: list[dict]) -> str:
    """
    Build a compact memory block to prepend to the system prompt.
    Token budget: ~200-350 tokens.
    """
    lines: list[str] = ["## SESSION MEMORY (compressed — do not re-search what is already here)"]

    book_id = ctx.get("active_rag_book_id")
    book_title = ctx.get("active_rag_book_title")
    if book_id and book_title:
        lines.append(f"\n### Active textbook for this chat: **{book_title}**")
        lines.append(f"→ book_id=`{book_id}` — when calling **rag_search_textbook**, always pass **book_id** as this exact string so retrieval stays in this book only.")

    turn = ctx.get("turn_count", 0)
    if turn:
        lines.append(f"Turn #{turn} of this conversation.")

    searched = ctx.get("searched_users") or []
    if searched:
        lines.append("\n### Users already found this session:")
        for u in searched:
            uid_str = f"user_id={u['user_id']}" if u.get("user_id") else "no_auth_id"
            parts = [f"**{u['name']}** ({uid_str})", u.get("summary", "")]
            if u.get("school"):
                parts.append(f"school_id={u['school']}")
            lines.append("- " + " | ".join(p for p in parts if p))

    active = ctx.get("active_user_id")
    if active:
        lines.append(f"\n### Currently discussing user_id: `{active}`")
        lines.append("→ Use this user_id directly for tool calls; no need to search again.")

    clarifier = ctx.get("open_clarifier_type")
    if clarifier:
        lines.append(f"\n### Awaiting clarifier answer: `{clarifier}` — staff has not yet replied.")

    thread = ctx.get("thread_ar", "").strip()
    if thread:
        lines.append(f"\n### Last agent action: {thread}")

    if recent_messages:
        lines.append(f"\n### Recent conversation ({len(recent_messages)} messages — verbatim below):")
        for msg in recent_messages:
            role_label = "Staff" if msg.get("role") == "user" else "Agent"
            content = (msg.get("content") or "").strip()[:400]
            lines.append(f"[{role_label}]: {content}")

    lines.append("\n---\nUse the above to answer without repeating searches. If active_user_id is set, call tools directly with it.")
    return "\n".join(lines)
