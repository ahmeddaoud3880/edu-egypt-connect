"""Build support_ui payload for the chat API from the last search_user tool result."""

from __future__ import annotations

import logging
from typing import Any

log = logging.getLogger("egypt_edu.support_ui")

_ROW_PREVIEW_KEYS = frozenset(
    {
        "full_name",
        "full_name_ar",
        "email",
        "national_id",
        "phone",
        "request_status",
        "requested_role",
        "school_id",
        "grade_number",
        "stage_id",
        "governorate_id",
        "district_id",
    }
)

# Tables commonly joined logically by auth user id in this product (informational for support staff).
RELATED_WHEN_AUTH_LINKED = [
    "profiles",
    "user_roles",
    "student_profiles",
    "student_grades",
    "student_attendance",
    "student_assignments",
    "student_notifications",
    "ai_chats",
    "user_activity_logs",
]

# Role label map for display
_ROLE_LABELS_AR: dict[str, str] = {
    "student": "طالب",
    "teacher": "معلم",
    "parent": "ولي أمر",
    "school": "مدرسة",
    "directorate": "مديرية",
    "ministry": "وزارة",
    "support": "دعم",
}


def _pick_name(m: dict) -> str:
    """Return the best display name from a match row."""
    return (
        (m.get("full_name") or "").strip()
        or (m.get("full_name_ar") or "").strip()
        or (m.get("email") or "").strip()
        or "—"
    )


def _role_label_ar(m: dict) -> str:
    role = (m.get("requested_role") or m.get("role") or "").strip().lower()
    return _ROLE_LABELS_AR.get(role, role or "مستخدم")


def _source_badge_ar(source_table: str) -> str:
    return {
        "profiles": "حساب نشط",
        "student_profiles": "ملف طالب",
        "registration_requests": "طلب تسجيل",
    }.get(source_table, source_table)


def _build_disambiguation_list(matches: list[dict]) -> list[dict[str, Any]]:
    """Compact list for the picker UI — one row per match, minimal info."""
    items: list[dict[str, Any]] = []
    for idx, m in enumerate(matches):
        if not isinstance(m, dict):
            continue
        name = _pick_name(m)
        email = (m.get("email") or "").strip()
        # Mask email for privacy: show only first 3 chars + domain
        if "@" in email:
            local, domain = email.split("@", 1)
            masked_email = local[:3] + "***@" + domain
        else:
            masked_email = ""
        role_ar = _role_label_ar(m)
        source = m.get("source_table", "")
        uid = m.get("user_id")
        reg_id = m.get("registration_request_id")
        # Pick-message is what the UI sends when staff picks this item
        if uid:
            pick_msg = f"اخترت الشخص رقم {idx + 1}: {name} (user_id: {uid})"
        elif reg_id:
            pick_msg = f"اخترت الشخص رقم {idx + 1}: {name} (registration_request_id: {reg_id})"
        else:
            pick_msg = f"اخترت الشخص رقم {idx + 1}: {name}"
        items.append(
            {
                "n": idx + 1,
                "name": name,
                "role_ar": role_ar,
                "masked_email": masked_email,
                "source_badge_ar": _source_badge_ar(source),
                "source_table": source,
                "auth_user_id": uid,
                "registration_request_id": reg_id,
                "pick_message": pick_msg,
            }
        )
    return items


def build_support_ui(last_search: dict | None, last_clarification: dict | None = None) -> dict | None:
    if not last_search or not last_search.get("ok"):
        return None
    matches = last_search.get("matches") or []
    if not matches:
        return None

    clarify_first = bool(last_search.get("clarify_first"))
    disambiguation_needed = bool(last_search.get("disambiguation_needed"))

    cards: list[dict[str, Any]] = []
    for m in matches:
        if not isinstance(m, dict):
            continue
        uid = m.get("user_id")
        preview = {k: m.get(k) for k in _ROW_PREVIEW_KEYS if m.get(k) is not None and str(m.get(k)).strip() != ""}

        via = m.get("profile_linked_via")
        cards.append(
            {
                "source_table": m.get("source_table"),
                "source_label_en": m.get("source_label"),
                "source_label_ar": m.get("source_label_ar"),
                "auth_user_id": uid,
                "auth_linked": bool(uid),
                "profile_linked_via": via,
                "registration_request_id": m.get("registration_request_id"),
                "row_preview": preview,
                "related_tables_hint": RELATED_WHEN_AUTH_LINKED if uid else ["registration_requests"],
            }
        )

    result: dict[str, Any] = {
        "match_cards": [],
        "search_query": last_search.get("search_query"),
        "searched_sources": last_search.get("searched_sources"),
        "count": last_search.get("count"),
        "disambiguation_needed": disambiguation_needed,
        "clarify_first": clarify_first,
        "at_result_cap": bool(last_search.get("at_result_cap")),
        "short_query": bool(last_search.get("short_query")),
    }

    show_cards = True
    if clarify_first and not last_clarification:
        result["clarify_first_pending"] = True
        show_cards = False
    elif last_clarification and isinstance(last_clarification, dict):
        # Focus on the clarification card; avoid duplicating long match lists in the UI
        show_cards = False

    if show_cards:
        result["match_cards"] = cards

    # Compact pick-list — only when not in "clarify first" mode and small ambiguity
    if disambiguation_needed and not clarify_first and 1 < len(matches) <= 5:
        result["disambiguation_list"] = _build_disambiguation_list(matches)

    # Add clarification question card when the agent called request_clarification
    if last_clarification and isinstance(last_clarification, dict):
        ctype = last_clarification.get("clarifier_type") or "general"
        result["clarification_question"] = {
            "clarifier_type": ctype,
            "question_ar": last_clarification.get("question_ar", ""),
            "question_en": last_clarification.get("question_en", ""),
            "hint_options": last_clarification.get("hint_options") or [],
            "matches_analyzed": last_clarification.get("matches_analyzed", 0),
        }

    return result
