from langchain_core.tools import tool
from db.client import supabase
from db.support_search_catalog import SEARCH_ENTITIES
from postgrest.exceptions import APIError
import json as _json
import logging
import re

log_tools = logging.getLogger("egypt_edu.support_tools")

_TABLE_SELECT_CACHE: dict[str, str] = {}
_PER_QUERY_LIMIT = 24

# Chip text / vague prompts — no concrete person name; agent must ask first, not search.
_VAGUE_SEARCH_MESSAGES = frozenset(
    {
        "ابحث عن طالب باسمه",
        "اعرض لي سجلات نشاط لمستخدم",
        "ما هى درجات هذا الطالب؟",
        "ما هي درجات هذا الطالب؟",
        "اعرض حضور الطالب",
        "search for a student by name",
        "show activity logs for a user",
        "what are this student's grades?",
        "show student attendance",
    }
)

_PLACEHOLDER_NAME_TOKENS = frozenset(
    {
        "اسم الطالب",
        "اسم طالب",
        "اسم الطالبة",
        "اسم الطالب الكامل",
        "طالب باسمه",
        "مستخدم",
        "student",
        "student name",
        "the student",
        "user name",
    }
)


def _normalize_query(q: str) -> str:
    return re.sub(r"\s+", " ", (q or "").strip())


def _is_vague_or_placeholder_search(q: str) -> bool:
    n = _normalize_query(q)
    if len(n) < 2:
        return True
    lower = n.lower()
    if n in _VAGUE_SEARCH_MESSAGES or lower in {m.lower() for m in _VAGUE_SEARCH_MESSAGES}:
        return True
    if n in _PLACEHOLDER_NAME_TOKENS or lower in {t.lower() for t in _PLACEHOLDER_NAME_TOKENS}:
        return True
    return False


def _resolve_select(table: str, candidates: tuple[str, ...]) -> str:
    if table in _TABLE_SELECT_CACHE:
        return _TABLE_SELECT_CACHE[table]
    for sel in candidates:
        try:
            supabase.table(table).select(sel).limit(1).execute()
            _TABLE_SELECT_CACHE[table] = sel
            log_tools.info("schema_select table=%s cols=%s", table, sel)
            return sel
        except Exception as e:
            log_tools.debug("schema_select probe fail table=%s cols=%s err=%s", table, sel, e)
    _TABLE_SELECT_CACHE[table] = "id"
    log_tools.warning("schema_select fallback table=%s → id only", table)
    return "id"


def _ilike_safe(table: str, select_str: str, column: str, pattern: str, limit: int):
    try:
        r = supabase.table(table).select(select_str).ilike(column, pattern).limit(limit).execute()
        return r.data or [], None
    except Exception as e:
        msg = str(e)
        if hasattr(e, "message"):
            msg = str(getattr(e, "message"))
        return None, msg


def _normalize_match(entity: dict, raw: dict) -> dict:
    table = entity["table"]
    if table == "profiles":
        # Schema A: separate user_id → auth; Schema B: only id (same as auth.users.id)
        uid = raw.get("user_id") or raw.get("id")
    else:
        uid = raw.get(entity["auth_user_field"])
    if table == "registration_requests" and not uid:
        uid = None

    out = dict(raw)
    out["user_id"] = str(uid) if uid else None
    out["source_table"] = table
    out["source_label"] = entity.get("label_en") or entity.get("label_ar") or table
    out["source_label_ar"] = entity.get("label_ar") or ""
    if table == "registration_requests":
        out["registration_request_id"] = raw.get("id")
    return out


def _row_text(row: dict) -> str:
    parts = []
    for k in ("full_name", "full_name_ar", "email"):
        v = row.get(k)
        if v:
            parts.append(str(v))
    return " ".join(parts).lower()


def _dedupe_matches(matches: list) -> list:
    priority = {"profiles": 0, "student_profiles": 1, "registration_requests": 2}
    by_uid: dict[str, dict] = {}
    no_uid: list[dict] = []
    for m in sorted(matches, key=lambda x: priority.get(x.get("source_table", ""), 9)):
        uid = m.get("user_id")
        if uid:
            if uid not in by_uid:
                by_uid[uid] = m
        else:
            no_uid.append(m)
    return list(by_uid.values()) + no_uid


def _profile_id_by_column(column: str, value: str) -> str | None:
    """Resolve auth id for user_roles: profiles.user_id if present, else profiles.id."""
    if not value or not str(value).strip():
        return None
    v = value.strip()
    try:
        r = supabase.table("profiles").select("user_id,id").eq(column, v).limit(1).execute()
    except APIError as err:
        if err.code == "42703" and "user_id" in (err.message or ""):
            try:
                r = supabase.table("profiles").select("id").eq(column, v).limit(1).execute()
            except Exception as e2:
                log_tools.debug("profile lookup %s (id only) failed: %s", column, e2)
                return None
        else:
            log_tools.debug("profile lookup %s skipped: %s", column, err)
            return None
    except Exception as e:
        log_tools.debug("profile lookup %s skipped: %s", column, e)
        return None
    rows = r.data or []
    if not rows:
        return None
    uid = rows[0].get("user_id") or rows[0].get("id")
    return str(uid) if uid else None


def _enrich_match_with_profile_email(match: dict) -> dict:
    if match.get("user_id"):
        return match
    email = (match.get("email") or "").strip()
    nid = (match.get("national_id") or "").strip()

    pid = None
    link_via = None
    if email:
        pid = _profile_id_by_column("email", email)
        if pid:
            link_via = "email_lookup"
    if not pid and nid:
        pid = _profile_id_by_column("national_id", nid)
        if pid:
            link_via = "national_id_lookup"

    if pid:
        out = dict(match)
        out["user_id"] = pid
        out["profile_linked_via"] = link_via
        log_tools.info(
            "search_user linked row to profiles user_id via %s table=%s",
            link_via,
            match.get("source_table"),
        )
        return out
    return match


def _dedupe_enriched_matches(matches: list) -> list:
    seen: set = set()
    out: list = []
    for m in matches:
        uid = m.get("user_id")
        if uid:
            if uid in seen:
                continue
            seen.add(uid)
        else:
            key = (
                m.get("source_table"),
                str(m.get("registration_request_id") or m.get("id") or ""),
            )
            if key in seen:
                continue
            seen.add(key)
        out.append(m)
    return out[:15]


def _search_all_entities(pattern: str, strategy_note: str) -> tuple[list, list[str], list[str]]:
    """Returns (normalized_matches, searched_paths, errors)."""
    matches: list = []
    searched: list[str] = []
    errors: list[str] = []

    for entity in sorted(SEARCH_ENTITIES, key=lambda e: e["priority"]):
        table = entity["table"]
        sel = _resolve_select(table, entity["select_candidates"])
        colset = {c.strip() for c in sel.split(",") if c.strip()}
        row_ids: set = set()

        for ic in entity["ilike_columns"]:
            if ic not in colset:
                continue
            rows, err = _ilike_safe(table, sel, ic, pattern, _PER_QUERY_LIMIT)
            if err:
                errors.append(f"{table}.{ic}:{err}")
                continue
            searched.append(f"{table}:{ic}")
            for r in rows:
                rid = r.get("id")
                if rid is not None and rid in row_ids:
                    continue
                if rid is not None:
                    row_ids.add(rid)
                matches.append(_normalize_match(entity, r))

    log_tools.info(
        "search_user strategy=%s pattern=%r sources_tried=%s hits_raw=%s",
        strategy_note,
        pattern,
        ",".join(searched) if searched else "(none)",
        len(matches),
    )
    return _dedupe_matches(matches), searched, errors


@tool
def search_user(query: str) -> dict:
    """
    Search people across profiles, student_profiles, and registration_requests (name columns adapt to your DB).
    Returns count, matches (each with user_id when linked to auth), searched_sources, disambiguation hints.
    """
    q = (query or "").strip()
    if len(q) < 2:
        log_tools.info("search_user skipped (short query) raw=%r", query)
        return {
            "ok": False,
            "count": 0,
            "matches": [],
            "disambiguation_needed": False,
            "strategy": "none",
            "hint": "Enter at least two characters (name fragment or distinctive part) to search official records.",
        }

    if _is_vague_or_placeholder_search(q):
        log_tools.info("search_user skipped (vague/placeholder) raw=%r", query)
        return {
            "ok": False,
            "reason": "vague_or_placeholder_query",
            "count": 0,
            "matches": [],
            "disambiguation_needed": False,
            "strategy": "none",
            "hint": (
                "No database query was executed (generic prompt without a concrete person name). "
                "Ask the staff member for full name, email, or account id — do not claim there is 'no match'."
            ),
        }

    safe = q.replace("%", "").strip()[:180]
    pat = f"%{safe}%"
    strategy = "multi_table_full_phrase"

    merged, searched, errors = _search_all_entities(pat, strategy)

    tokens = [
        t for t in safe.replace("،", " ").replace(",", " ").split() if len(t) >= 2
    ]
    if len(merged) > 14 and len(tokens) >= 2:

        def all_tokens_in_row(row: dict) -> bool:
            blob = _row_text(row)
            return all(tok.lower() in blob for tok in tokens)

        merged = [r for r in merged if all_tokens_in_row(r)]
        strategy = "multi_table_token_filter"

    if not merged and tokens:
        longest = max(tokens, key=len)
        if longest != safe:
            merged, searched2, err2 = _search_all_entities(f"%{longest}%", f"widened_longest:{longest}")
            searched = list(dict.fromkeys(searched + searched2))
            errors.extend(err2)

    if not merged and len(tokens) >= 2:
        w0 = tokens[0]
        merged, searched3, err3 = _search_all_entities(f"%{w0}%", f"widened_first:{w0}")
        searched = list(dict.fromkeys(searched + searched3))
        errors.extend(err3)

    matches = [_enrich_match_with_profile_email(dict(m)) for m in merged[:15]]
    matches = _dedupe_enriched_matches(matches)
    count = len(matches)
    MAX_SHOWN = 15
    word_tokens = [t for t in safe.replace("،", " ").replace(",", " ").split() if t.strip()]
    short_query = len(word_tokens) <= 2
    at_result_cap = count >= MAX_SHOWN
    # Short query + several matches, or we hit cap → ask clarifying questions before listing (scales to huge DBs)
    clarify_first = (short_query and count >= 3) or at_result_cap

    base: dict = {
        "ok": True,
        "search_query": safe,
        "strategy": strategy,
        "count": count,
        "matches": matches,
        "searched_sources": searched,
        "short_query": short_query,
        "at_result_cap": at_result_cap,
        "clarify_first": clarify_first,
    }
    if errors and not searched:
        base["ok"] = False
        base["reason"] = "db_schema_or_table_missing"
        base["hint"] = (
            "Name search could not run on any configured source; the table may be unavailable in PostgREST "
            "or permissions may be insufficient. Check the service role key and migrations."
        )
        base["errors"] = errors[:5]
        log_tools.warning("search_user failed all sources query=%r errors=%s", safe, errors[:3])
        return base

    if errors:
        base["partial_errors"] = errors[:5]

    if count == 0:
        base["disambiguation_needed"] = False
        base["hint"] = (
            "No match in scanned sources (profiles, student_profiles, registration_requests). "
            "Suggest another spelling, a distinctive name part, email, or confirm the account/request exists."
        )
        log_tools.info("search_user hit=0 strategy=%s query=%r sources=%s", strategy, safe, searched)
        return base

    if count > 1:
        base["disambiguation_needed"] = True
        if clarify_first:
            base["hint"] = (
                "Many matches (short query and/or result cap). "
                "Call request_clarification FIRST with matches JSON — do NOT list all names in prose. "
                "After staff answers, call search_user again with a refined query."
            )
        else:
            base["hint"] = "Multiple records match; ask for a clear discriminator (email, linked account id, or registration status)."
        log_tools.info(
            "search_user hit=%s (multi) strategy=%s query=%r clarify_first=%s",
            count,
            strategy,
            safe,
            clarify_first,
        )
        return base

    base["disambiguation_needed"] = False
    base["hint"] = (
        "Single match. Continue with other tools using `user_id` when present; otherwise use registration row fields."
    )
    log_tools.info(
        "search_user hit=1 strategy=%s query=%r user_id=%s",
        strategy,
        safe,
        matches[0].get("user_id") if matches else None,
    )
    return base


@tool
def request_clarification(query: str, matches_json: str) -> dict:
    """
    Analyze a list of search matches and decide the single best clarifying question to ask
    the support staff member to narrow down results.

    Call this tool when search_user returns clarify_first=true, OR count > 5 with a short query,
    OR you hit the 15-result cap (at_result_cap) — always before listing many names in chat.
    Do NOT call it if you already have a clarifier answer from staff.

    Args:
        query: the original searched name/fragment
        matches_json: JSON string of the 'matches' list from search_user output

    Returns: question_ar, question_en, clarifier_type, hint_options (list or null), matches_analyzed
    """
    try:
        matches = _json.loads(matches_json) if isinstance(matches_json, str) else list(matches_json)
    except Exception:
        matches = []

    if not matches:
        return {
            "question_ar": "يرجى توضيح الاسم الكامل أو البريد الإلكتروني.",
            "question_en": "Please provide the full name or email address.",
            "clarifier_type": "full_name",
            "hint_options": None,
            "matches_analyzed": 0,
        }

    n = len(matches)

    # ── field extractors ──────────────────────────────────────────────────────
    def _second_name(m: dict) -> str | None:
        name = (m.get("full_name") or m.get("full_name_ar") or "").strip()
        parts = name.split()
        return parts[1] if len(parts) >= 2 else None

    def _school(m: dict) -> str | None:
        return str(m["school_id"]).strip() if m.get("school_id") else None

    def _governorate(m: dict) -> str | None:
        return str(m["governorate_id"]).strip() if m.get("governorate_id") else None

    def _role(m: dict) -> str | None:
        v = m.get("requested_role") or m.get("role")
        return str(v).strip().lower() if v else None

    def _grade(m: dict) -> str | None:
        v = m.get("grade_number")
        return str(v).strip() if v is not None and str(v).strip() else None

    def _status(m: dict) -> str | None:
        v = m.get("request_status") or m.get("status")
        return str(v).strip().lower() if v else None

    # ── diversity score ────────────────────────────────────────────────────────
    def _score(getter) -> tuple[float, list[str]]:
        vals: set[str] = set()
        cov = 0
        for m in matches:
            v = getter(m)
            if v:
                cov += 1
                vals.add(v)
        ratio_cov = cov / n
        ratio_div = min(len(vals) / n, 1.0)
        return ratio_cov * ratio_div, sorted(vals)

    CANDIDATES = [
        ("second_name", _second_name,
         "ما اسم الأب (الاسم الثاني)؟",
         "What is the father's name (second/middle name)?",
         None),
        ("school", _school,
         "ما اسم المدرسة؟",
         "What is the school name?",
         None),
        ("governorate", _governorate,
         "ما المحافظة أو المنطقة؟",
         "What is the governorate or region?",
         None),
        ("role", _role,
         "ما دور المستخدم في المنصة؟",
         "What is the user's platform role?",
         ["طالب", "معلم", "ولي أمر", "مدرسة", "مديرية"]),
        ("grade", _grade,
         "ما الصف الدراسي؟",
         "What is the grade level?",
         [str(i) for i in range(1, 13)]),
        ("status", _status,
         "ما حالة الحساب أو الطلب؟",
         "What is the account or request status?",
         ["نشط", "معطل", "طلب تسجيل معلق", "approved", "suspended"]),
    ]

    best_key = None
    best_score = -1.0
    best_q_ar = ""
    best_q_en = ""
    best_fixed_opts: list[str] | None = None
    best_vals: list[str] = []

    for key, getter, q_ar, q_en, fixed_opts in CANDIDATES:
        sc, vals = _score(getter)
        if sc > best_score:
            best_score = sc
            best_key = key
            best_q_ar = q_ar
            best_q_en = q_en
            best_fixed_opts = fixed_opts
            best_vals = vals

    # Build hint_options: prefer fixed list; for open fields use discovered values (≤8)
    if best_fixed_opts:
        hint_options: list[str] | None = best_fixed_opts
    elif best_vals:
        hint_options = best_vals[:8]
    else:
        hint_options = None

    # If score is zero for everything → just ask for full name
    if best_score == 0:
        best_key = "full_name"
        best_q_ar = "يرجى كتابة الاسم الكامل (الاسم الأول والأب والعائلة) أو البريد الإلكتروني."
        best_q_en = "Please type the full name (first + father + family) or the email address."
        hint_options = None

    log_tools.info(
        "request_clarification query=%r n=%s best=%s score=%.3f",
        query, n, best_key, best_score,
    )

    return {
        "question_ar": best_q_ar,
        "question_en": best_q_en,
        "clarifier_type": best_key,
        "hint_options": hint_options,
        "matches_analyzed": n,
        "discriminator_score": round(best_score, 3),
    }


@tool
def get_full_user_info(user_id: str) -> dict:
    """Full profile + role + school/geo labels. `user_id` may be auth uuid or profiles.id (schema-dependent)."""
    uid = (user_id or "").strip()
    if not uid:
        return {
            "ok": False,
            "error": "empty_user_id",
            "hint": "Pass a non-empty UUID from search_user matches[].user_id.",
        }

    def _fetch_profile() -> dict | None:
        p = supabase.table("profiles").select("*").eq("id", uid).maybe_single().execute()
        if p.data:
            return p.data
        try:
            p2 = supabase.table("profiles").select("*").eq("user_id", uid).maybe_single().execute()
            return p2.data
        except APIError as err:
            if err.code == "42703" and "user_id" in (err.message or ""):
                return None
            raise

    def _name_row(tbl: str, row_id, name_col: str = "name"):
        if not row_id:
            return None
        try:
            r = supabase.table(tbl).select(name_col).eq("id", row_id).maybe_single().execute()
            if r.data and r.data.get(name_col):
                return r.data.get(name_col)
        except Exception as e:
            log_tools.debug("get_full_user_info join %s id=%s: %s", tbl, row_id, e)
        return None

    try:
        prof = _fetch_profile()
        if not prof:
            return {
                "ok": False,
                "error": "profile_not_found",
                "user_id": uid,
                "hint": (
                    "لا يوجد صف في profiles بهذا المعرف. "
                    "في بعض المشاريع يكون profiles.id هو نفس auth، ولا يوجد عمود user_id — جرّب uuid من نتائج البحث."
                ),
            }

        auth_uid = prof.get("user_id") or prof.get("id") or uid

        school = _name_row("schools", prof.get("school_id"))
        district = _name_row("districts", prof.get("district_id"))
        gov = _name_row("governorates", prof.get("governorate_id"))

        role_row = supabase.table("user_roles").select("role").eq("user_id", auth_uid).maybe_single().execute()
        rd = role_row.data if role_row and role_row.data else {}

        return {
            "ok": True,
            "profile": prof,
            "auth_user_id": auth_uid,
            "role": (rd.get("role") if isinstance(rd, dict) else None) or "user",
            "school": school,
            "district": district,
            "governorate": gov,
        }
    except Exception as e:
        log_tools.exception("get_full_user_info failed uid=%s", uid[:16])
        return {
            "ok": False,
            "error": str(e),
            "user_id": uid,
            "hint": "خطأ أثناء قراءة profiles أو الجداول المرتبطة — تحقق من مخطط قاعدة البيانات.",
        }


@tool
def get_user_activity_logs(user_id: str, limit: int = 50) -> list:
    """Get the activity logs for a specific user. Only support agents can use this."""
    return supabase.table("user_activity_logs").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute().data or []


@tool
def get_user_grades(user_id: str) -> list:
    """Get grades for any user — support visibility."""
    return supabase.table("student_grades").select("*").eq("user_id", user_id).execute().data or []


@tool
def get_user_attendance(user_id: str) -> dict:
    """Get attendance summary for any user — support visibility."""
    records = supabase.table("student_attendance").select("*").eq("user_id", user_id).order("date", desc=True).limit(30).execute().data or []
    total = len(records)
    present = sum(1 for r in records if r["status"] == "present")
    absent = sum(1 for r in records if r["status"] == "absent")
    rate = round((present / total) * 100) if total > 0 else 0
    return {"summary": {"total": total, "present": present, "absent": absent, "rate": rate}, "recent_log": records[:10]}


@tool
def get_user_assignments(user_id: str) -> list:
    """Get all assignments for any user — support visibility."""
    return supabase.table("student_assignments").select("*").eq("user_id", user_id).order("due_date").execute().data or []


@tool
def get_user_notifications(user_id: str) -> list:
    """Get all notifications for any user — support visibility."""
    return supabase.table("student_notifications").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(20).execute().data or []


@tool
def get_user_ai_chats(user_id: str) -> list:
    """Get AI chat history for any user — support visibility."""
    chats = supabase.table("ai_chats").select("id, title, created_at").eq("user_id", user_id).order("created_at", desc=True).limit(5).execute().data or []
    result = []
    for chat in chats:
        messages = supabase.table("ai_messages").select("role, content, created_at").eq("chat_id", chat["id"]).order("created_at").limit(10).execute().data or []
        result.append({"chat_title": chat["title"], "created_at": chat["created_at"], "messages": messages})
    return result
