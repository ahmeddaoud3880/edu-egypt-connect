import logging
import os
import re
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

from db.ai_credentials import fetch_active_credential

log = logging.getLogger("egypt_edu.llm_factory")

load_dotenv(override=True)

PROVIDERS = {
    "agentrouter": {
        "env_key": "AGENTROUTER_API_KEY",
        "base_url": os.getenv("AGENTROUTER_BASE_URL", "https://agentrouter.org/v1"),
        "default_model": "claude-opus-4-6",
    },
    "openrouter": {
        "env_key": "OPENROUTER_API_KEY",
        "base_url": os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        "default_model": "openrouter/free",
    },
    "openai": {
        "env_key": "OPENAI_API_KEY",
        "base_url": os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        "default_model": "gpt-4o-mini",
    },
    "groq": {
        "env_key": "GROQ_API_KEY",
        "base_url": os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
        # llama-3.1-70b-versatile and several others were retired by Groq — see deprecations
        "default_model": "llama-3.3-70b-versatile",
    },
    "gemini": {
        "env_key": "GEMINI_API_KEY",
        "base_url": os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai"),
        "default_model": "gemini-2.0-flash",
    },
    "ollama": {
        "env_key": "OLLAMA_API_KEY",
        "base_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
        "default_model": "llama3",
    },
}

AVAILABLE_MODELS = {
    "agentrouter": [
        {"id": "claude-opus-4-6", "name": "Claude Opus 4/6 (AgentRouter)"},
    ],
    "openrouter": [
        {"id": "openrouter/free", "name": "OpenRouter — free router (auto-picks a free model)"},
        {"id": "openai/gpt-4o-mini", "name": "GPT-4o Mini (may be paid — check OpenRouter)"},
        {"id": "google/gemini-2.0-flash-001:free", "name": "Gemini 2.0 Flash (:free if available)"},
        {"id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Llama 3.3 70B (:free if available)"},
    ],
    "openai": [
        {"id": "gpt-4o-mini", "name": "GPT-4o Mini"},
        {"id": "gpt-4o", "name": "GPT-4o"},
        {"id": "gpt-4-turbo", "name": "GPT-4 Turbo"},
    ],
    "groq": [
        {"id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B (recommended)"},
        {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B Instant"},
        {"id": "openai/gpt-oss-120b", "name": "GPT OSS 120B"},
        {"id": "openai/gpt-oss-20b", "name": "GPT OSS 20B"},
    ],
    "gemini": [
        {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash"},
        {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro"},
        {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash"},
    ],
    "ollama": [
        {"id": "llama3", "name": "Llama 3 (Local)"},
        {"id": "mistral", "name": "Mistral (Local)"},
        {"id": "phi3", "name": "Phi-3 (Local)"},
        {"id": "gemma2", "name": "Gemma 2 (Local)"},
    ],
}

# Groq periodically decommissions model IDs; map saved/old configs to a current ID.
GROQ_MODEL_FALLBACK = {
    "gemma2-9b-it": "llama-3.1-8b-instant",
    "llama-3.1-70b-versatile": "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768": "llama-3.3-70b-versatile",
}


def _split_key_blob(blob: str) -> list[str]:
    return [x.strip() for x in re.split(r"[,;|\n]+", (blob or "").strip()) if x.strip()]


def _api_keys_for_provider(provider: str) -> list[str]:
    """Ordered unique API keys: DB credential (matching provider), then env primary, then *_FALLBACKS."""
    if provider == "ollama":
        return ["ollama"]
    cfg = PROVIDERS.get(provider, PROVIDERS["agentrouter"])
    env_primary = cfg["env_key"]

    ordered: list[str] = []
    seen: set[str] = set()

    def push(raw: str | None):
        k = (raw or "").strip()
        if not k or k in seen:
            return
        seen.add(k)
        ordered.append(k)

    db = fetch_active_credential()
    if db and db.get("provider") == provider:
        push(db.get("api_key"))

    for x in _split_key_blob(os.getenv(env_primary, "")):
        push(x)

    fb_name = env_primary + "_FALLBACKS"
    for x in _split_key_blob(os.getenv(fb_name, "")):
        push(x)

    return ordered


def _is_retryable_api_error(exc: Exception) -> bool:
    s = str(exc).lower()
    needles = (
        "401",
        "403",
        "invalid_api_key",
        "incorrect api key",
        "unauthorized",
        "403 forbidden",
        "429",
        "rate limit",
        "quota",
        "insufficient_quota",
        "billing",
        "payment",
        "connection",
        "timeout",
        "timed out",
        "temporarily unavailable",
        "503",
        "502",
        "overloaded",
    )
    return any(n in s for n in needles)


def invoke_llm_messages(
    messages: list,
    *,
    provider: str | None = None,
    model: str | None = None,
    temperature: float = 0,
):
    cfg0 = get_current_config()
    provider = provider or cfg0["provider"]
    cfg = PROVIDERS.get(provider, PROVIDERS["agentrouter"])
    model = model or cfg0["model"] or cfg["default_model"]
    if provider == "groq":
        model = GROQ_MODEL_FALLBACK.get(model, model)

    chain = _api_keys_for_provider(provider)
    last_err: Exception | None = None

    if not chain:
        llm = get_llm(provider, model, temperature)
        return llm.invoke(messages)

    for idx, ak in enumerate(chain):
        llm = ChatOpenAI(
            model=model,
            api_key=ak,
            base_url=cfg["base_url"],
            temperature=temperature,
            default_headers={
                "HTTP-Referer": "https://egypt.edu.eg",
                "X-Title": "Egypt Edu Connect",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        )
        try:
            return llm.invoke(messages)
        except Exception as e:
            last_err = e
            if idx < len(chain) - 1 and _is_retryable_api_error(e):
                log.warning(
                    "LLM invoke failed for provider=%s (%s); trying fallback key #%s",
                    provider,
                    str(e)[:180],
                    idx + 2,
                )
                continue
            raise
    raise last_err or RuntimeError("LLM invocation failed")


def _api_key_for_provider(provider: str) -> str:
    keys = _api_keys_for_provider(provider)
    if keys:
        return keys[0]
    cfg = PROVIDERS.get(provider, PROVIDERS["agentrouter"])
    return os.getenv(cfg["env_key"], "") or ""


def get_llm(provider: str = None, model: str = None, temperature: float = 0):
    cfg = get_current_config()
    provider = provider or cfg["provider"]
    config = PROVIDERS.get(provider, PROVIDERS["agentrouter"])
    model = model or cfg["model"] or config["default_model"]
    if provider == "groq":
        model = GROQ_MODEL_FALLBACK.get(model, model)

    api_key = _api_key_for_provider(provider)

    return ChatOpenAI(
        model=model,
        api_key=api_key,
        base_url=config["base_url"],
        temperature=temperature,
        default_headers={
            "HTTP-Referer": "https://egypt.edu.eg",
            "X-Title": "Egypt Edu Connect",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
    )


def get_current_config() -> dict:
    db = fetch_active_credential()
    if db and db.get("provider") in PROVIDERS:
        p = db["provider"]
        m = (db.get("model") or "").strip() or PROVIDERS[p]["default_model"]
        if p == "groq":
            m = GROQ_MODEL_FALLBACK.get(m, m)
        return {"provider": p, "model": m}
    provider = os.getenv("AI_PROVIDER", "agentrouter")
    model = os.getenv("AI_MODEL", PROVIDERS[provider]["default_model"])
    if provider == "groq":
        model = GROQ_MODEL_FALLBACK.get(model, model)
    return {"provider": provider, "model": model}
