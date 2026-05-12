import logging
from langchain_core.tools import tool
from datetime import datetime
from db.client import supabase

# ── Module-level logger used by all role tools ─────────────────────────────
_log = logging.getLogger("egypt_edu.tool_debug")


def debug(msg: str, *args):
    """Convenience wrapper so tools can call log_tools.debug(...)."""
    _log.debug(msg, *args)


def info(msg: str, *args):
    """Convenience wrapper so tools can call log_tools.info(...)."""
    _log.info(msg, *args)


def warning(msg: str, *args):
    """Convenience wrapper so tools can call log_tools.warning(...)."""
    _log.warning(msg, *args)


def error(msg: str, *args):
    """Convenience wrapper so tools can call log_tools.error(...)."""
    _log.error(msg, *args)


def exception(msg: str, *args):
    """Convenience wrapper so tools can call log_tools.exception(...)."""
    _log.exception(msg, *args)


@tool
def log_activity(user_id: str, action_type: str, details: dict) -> bool:
    """Log any user action to the database so support can see it."""
    try:
        supabase.table("user_activity_logs").insert({
            "user_id": user_id,
            "action_type": action_type,
            "details": details,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        return True
    except Exception as e:
        _log.error("log_activity failed: %s", e)
        return False
