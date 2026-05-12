from __future__ import annotations

import json
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Any, TypedDict
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from db.ai_credentials import fetch_active_credential
from shared.llm_factory import AVAILABLE_MODELS

log = logging.getLogger("egypt_edu.openrouter_models")

OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
DEFAULT_TTL_SECONDS = 6 * 3600

_extra_var_lock = threading.Lock()
_extra_ttl_seconds: int = DEFAULT_TTL_SECONDS


class OpenRouterFreeMeta(TypedDict, total=False):
    fetched_at: str | None  # ISO8601 UTC
    count: int
    source: str  # e.g. live | fallback | stale_cache
    error: str | None
    ttl_seconds: int


_cache_lock = threading.Lock()
_cache_models: list[dict[str, str]] | None = None
_cache_meta: OpenRouterFreeMeta = {
    "fetched_at": None,
    "count": 0,
    "source": "fallback",
    "error": None,
    "ttl_seconds": DEFAULT_TTL_SECONDS,
}
_cache_time: float = 0.0


def set_openrouter_free_models_ttl_seconds(seconds: int) -> None:
    global _extra_ttl_seconds
    with _extra_var_lock:
        _extra_ttl_seconds = max(60, int(seconds))


def _effective_ttl() -> int:
    with _extra_var_lock:
        return _extra_ttl_seconds


def _parse_price(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        try:
            return float(str(value).strip())
        except (TypeError, ValueError):
            return None


def _is_free_model(row: dict[str, Any]) -> bool:
    mid = (row.get("id") or "").strip().lower()
    if mid.endswith(":free"):
        return True
    pr = row.get("pricing") or {}
    if not isinstance(pr, dict):
        return False
    p_prompt = _parse_price(pr.get("prompt"))
    p_compl = _parse_price(pr.get("completion"))
    if p_prompt is None or p_compl is None:
        return False
    return p_prompt == 0.0 and p_compl == 0.0


def _openrouter_authorization_header() -> str | None:
    import os

    key = (os.getenv("OPENROUTER_API_KEY") or "").strip()
    if not key:
        db = fetch_active_credential()
        if db and (db.get("provider") or "").strip() == "openrouter":
            key = (db.get("api_key") or "").strip()
    if not key:
        return None
    return f"Bearer {key}"


def _fallback_models() -> list[dict[str, str]]:
    raw = AVAILABLE_MODELS.get("openrouter", [])
    out = [{"id": x["id"], "name": x["name"]} for x in raw]
    special = {"id": "openrouter/free", "name": "OpenRouter — free router (auto-picks a free model)"}
    if not any(m["id"] == special["id"] for m in out):
        out.insert(0, special)
    return out


def _normalize_live_rows(data: list[dict[str, Any]]) -> list[dict[str, str]]:
    free_rows = [r for r in data if isinstance(r, dict) and _is_free_model(r)]
    seen: set[str] = set()
    models: list[dict[str, str]] = []
    router = {"id": "openrouter/free", "name": "OpenRouter — free router (auto-picks a free model)"}
    models.append(router)
    seen.add(router["id"])

    def sort_key(r: dict[str, Any]) -> tuple[int, str]:
        cid = r.get("id") or ""
        created = r.get("created")
        try:
            c = int(created) if created is not None else 0
        except (TypeError, ValueError):
            c = 0
        return (-c, cid)

    free_rows.sort(key=sort_key)

    for r in free_rows:
        mid = (r.get("id") or "").strip()
        if not mid or mid in seen:
            continue
        seen.add(mid)
        name = (r.get("name") or mid).strip() or mid
        if not mid.endswith(":free") and ":free" not in mid.lower():
            name = f"{name} (free)"
        models.append({"id": mid, "name": name})

    return models


def fetch_openrouter_free_models_from_api(timeout: float = 45.0) -> list[dict[str, str]]:
    headers = {"Accept": "application/json", "User-Agent": "EgyptEduConnect/2.0"}
    auth = _openrouter_authorization_header()
    if auth:
        headers["Authorization"] = auth

    req = Request(OPENROUTER_MODELS_URL, headers=headers, method="GET")
    with urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8", errors="replace")
    payload = json.loads(body)
    data = payload.get("data")
    if not isinstance(data, list):
        raise ValueError("OpenRouter /models: missing data array")
    return _normalize_live_rows(data)


def get_openrouter_free_models_meta() -> OpenRouterFreeMeta:
    with _cache_lock:
        return dict(_cache_meta)


def get_openrouter_models_for_provider(*, force_refresh: bool = False) -> tuple[list[dict[str, str]], OpenRouterFreeMeta]:
    """
    Live list when cache is fresh or after refresh; otherwise last good cache or static fallback.
    """
    global _cache_models, _cache_time, _cache_meta

    now = time.time()
    ttl = _effective_ttl()

    with _cache_lock:
        age = now - _cache_time
        if (
            not force_refresh
            and _cache_models is not None
            and age < ttl
        ):
            return list(_cache_models), dict(_cache_meta)

    err_msg: str | None = None
    live: list[dict[str, str]] | None = None
    try:
        live = fetch_openrouter_free_models_from_api()
    except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as e:
        err_msg = str(e)
        log.warning("OpenRouter free models fetch failed: %s", e)

    with _cache_lock:
        if live is not None:
            _cache_models = live
            _cache_time = now
            _cache_meta = {
                "fetched_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "count": len(live),
                "source": "live",
                "error": None,
                "ttl_seconds": ttl,
            }
            return list(_cache_models), dict(_cache_meta)

        if _cache_models is not None:
            _cache_meta = {
                **_cache_meta,
                "source": "stale_cache",
                "error": err_msg,
                "ttl_seconds": ttl,
            }
            return list(_cache_models), dict(_cache_meta)

        fb = _fallback_models()
        _cache_models = fb
        _cache_time = now
        _cache_meta = {
            "fetched_at": None,
            "count": len(fb),
            "source": "fallback",
            "error": err_msg,
            "ttl_seconds": ttl,
        }
        return list(_cache_models), dict(_cache_meta)


def refresh_openrouter_free_models() -> OpenRouterFreeMeta:
    _, meta = get_openrouter_models_for_provider(force_refresh=True)
    return meta
