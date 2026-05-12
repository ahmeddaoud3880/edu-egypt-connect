from __future__ import annotations

SEARCH_ENTITIES: list[dict] = [
    {
        "table": "profiles",
        "label_en": "Platform account (profiles)",
        "label_ar": "حساب المنصة (profiles)",
        # Must match auth.users.id — NOT profiles.id (PK may differ from auth)
        "auth_user_field": "user_id",
        "select_candidates": (
            "id,user_id,full_name,full_name_ar,email,national_id",
            "id,user_id,full_name,email,national_id",
            "id,user_id,full_name,national_id",
            "user_id,full_name,full_name_ar,email,national_id",
            "id,full_name,full_name_ar,email,national_id",
        ),
        "ilike_columns": ("full_name", "full_name_ar"),
        "priority": 0,
    },
    {
        "table": "student_profiles",
        "label_en": "Student academic file (student_profiles)",
        "label_ar": "ملف طالب (student_profiles)",
        "auth_user_field": "user_id",
        "select_candidates": (
            "id,user_id,full_name,full_name_ar,national_id,school_id",
            "id,user_id,full_name,full_name_ar,national_id",
            "id,user_id,full_name,national_id",
            "id,user_id,full_name",
        ),
        "ilike_columns": ("full_name", "full_name_ar"),
        "priority": 1,
    },
    {
        "table": "registration_requests",
        "label_en": "Registration request (registration_requests)",
        "label_ar": "طلب تسجيل (registration_requests)",
        "auth_user_field": "user_id",
        "select_candidates": (
            "id,user_id,full_name,full_name_ar,email,national_id,request_status,requested_role,phone",
            "id,user_id,full_name,full_name_ar,email,request_status,requested_role",
            "id,user_id,full_name,email,request_status,requested_role",
            "id,full_name,email,request_status,requested_role",
        ),
        "ilike_columns": ("full_name", "full_name_ar"),
        "priority": 2,
    },
]

KNOWN_PUBLIC_TABLES: tuple[str, ...] = (
    "profiles",
    "user_roles",
    "ai_chats",
    "ai_messages",
    "support_tickets",
    "support_ai_api_credentials",
    "registration_requests",
    "student_profiles",
    "student_subjects",
    "subjects",
    "textbooks",
    "governorates",
    "administrations",
    "districts",
    "stages",
    "schools",
)

TABLES_REF_PROMPT = """
## Public schema reference (understanding only — use tools to read data)
Known tables in generated typings: """ + ", ".join(KNOWN_PUBLIC_TABLES) + """

- **Name search** runs automatically inside `search_user` across: profiles → student_profiles → registration_requests, adapting to real columns.
- **`user_id` sent to tools** is the **auth account id** (`auth.users.id`): use `profiles.user_id` when that column exists, otherwise **`profiles.id`** (common Supabase pattern).
- **`registration_requests.user_id`** may be empty before approval; use email/status from that row and do not assume an activated account.
"""


def search_entities_prompt_block() -> str:
    lines = ["## Name-search sources (`search_user` runs these; do not pick a table manually)"]
    for e in SEARCH_ENTITIES:
        cols = "/".join(e["ilike_columns"])
        lines.append(
            f"- **{e['table']}** — {e['label_en']}; case-insensitive match on: {cols}"
        )
    lines.append(
        "If one source fails (missing table/columns), others continue. Do not repeat the same `search_user` "
        "call after a result that already includes `searched_sources`."
    )
    return "\n".join(lines)


def full_support_schema_prompt() -> str:
    return TABLES_REF_PROMPT.strip() + "\n\n" + search_entities_prompt_block().strip()
