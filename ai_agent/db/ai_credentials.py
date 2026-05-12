import os
import time
from typing import Any

from dotenv import load_dotenv

load_dotenv(override=True)

_cache: tuple[float, dict[str, Any] | None] | None = None
_CACHE_TTL_SEC = 3.0


def invalidate_active_credential_cache() -> None:
    global _cache
    _cache = None


def _admin_client():
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
    if not url or not key:
        return None
    from supabase import create_client

    return create_client(url, key)


def _fetch_active_credential_uncached() -> dict[str, Any] | None:
    """Row used by the AI agent when is_active; requires service role."""
    client = _admin_client()
    if not client:
        return None
    try:
        res = (
            client.table("support_ai_api_credentials")
            .select("provider, model, api_key")
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        rows = res.data or []
        if not rows:
            return None
        row = rows[0]
        prov = row.get("provider") or ""
        key = (row.get("api_key") or "").strip()
        if prov != "ollama" and not key:
            return None
        return {
            "provider": prov,
            "model": row.get("model") or "",
            "api_key": key if prov != "ollama" else "ollama",
        }
    except Exception:
        return None


def fetch_active_credential() -> dict[str, Any] | None:
    global _cache
    now = time.monotonic()
    if _cache is not None and (now - _cache[0]) < _CACHE_TTL_SEC:
        return _cache[1]
    data = _fetch_active_credential_uncached()
    _cache = (now, data)
    return data
