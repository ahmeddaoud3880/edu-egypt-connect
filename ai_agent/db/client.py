import os
from dotenv import load_dotenv

load_dotenv()

_url = os.getenv("SUPABASE_URL", "")
_key = os.getenv("SUPABASE_SERVICE_KEY", "")

if not _url or not _key:
    raise EnvironmentError(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file.\n"
        "Copy .env.example to .env and fill in your keys."
    )

from supabase import create_client
supabase = create_client(_url, _key)
