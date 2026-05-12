import os

# Reduce TensorFlow C++/oneDNN chatter when optional deps pull TF in (common on Windows + ST).
for _k, _v in (
    ("TF_CPP_MIN_LOG_LEVEL", "2"),
    ("TF_ENABLE_ONEDNN_OPTS", "0"),
):
    os.environ.setdefault(_k, _v)

import re
import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv, set_key
from openai import APIStatusError, RateLimitError
from graph.workflow import run_agent
from db.ai_credentials import fetch_active_credential, invalidate_active_credential_cache
from shared.llm_factory import PROVIDERS, AVAILABLE_MODELS, get_current_config
from shared.openrouter_free_models import (
    DEFAULT_TTL_SECONDS,
    get_openrouter_models_for_provider,
    get_openrouter_free_models_meta,
    refresh_openrouter_free_models,
)

load_dotenv(override=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s [%(name)s] %(message)s",
)
if (os.getenv("RAG_SILENT_HTTPX") or "1").strip().lower() not in ("0", "false", "no", "off"):
    for _h in ("httpx", "httpcore", "hpack"):
        logging.getLogger(_h).setLevel(logging.WARNING)
if (os.getenv("RAG_SILENT_TF") or "1").strip().lower() not in ("0", "false", "no", "off"):
    for _lg in ("tensorflow", "tf_keras", "keras", "absl"):
        logging.getLogger(_lg).setLevel(logging.ERROR)
api_log = logging.getLogger("egypt_edu.api")

_OPENROUTER_REFRESH_INTERVAL_S = DEFAULT_TTL_SECONDS


async def _openrouter_free_models_periodic():
    while True:
        try:
            await asyncio.to_thread(refresh_openrouter_free_models)
        except Exception:
            api_log.exception("OpenRouter free models refresh failed")
        await asyncio.sleep(_OPENROUTER_REFRESH_INTERVAL_S)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_openrouter_free_models_periodic())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="Egypt.edu AI Agent", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HistoryEntry(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    user_id: str
    role: str
    message: str
    provider: str = None
    model: str = None
    chat_id: str = None
    history: list[HistoryEntry] | None = None


class ChatResponse(BaseModel):
    response: str
    user_id: str
    role: str
    provider: str
    model: str
    support_ui: dict | None = None


class ProviderConfig(BaseModel):
    provider: str
    model: str
    api_key: str = None


@app.get("/")
def health():
    return {"status": "ok", "service": "Egypt.edu AI Agent v2", "version": "2.0.0"}


# ─── RAG endpoints ────────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    file_path: str
    title: str
    title_ar: str | None = None
    grade: int | None = None
    stage_name: str | None = None
    subject_name: str | None = None
    force: bool = False
    #: 1-based PDF page where body text starts (skip pages before this, e.g. 6 for MOE TOC).
    content_first_pdf_page: int = 1
    #: If set, rag_chunks.page_number = pdf_page - citation_starts_at_pdf_page + 1 (printed book page).
    citation_starts_at_pdf_page: int | None = None
    #: Skip this many PDF pages at the end (back-of-book index / ذيل الفهرس).
    skip_trailing_pdf_pages: int = 0
    #: Optional path (under ai_agent/) to TOC JSON — or rely on ``<pdf>.toc.json`` sidecar.
    toc_json_path: str | None = None


class GenerateQuizRequest(BaseModel):
    topic: str
    grade_number: int | None = None
    subject_id: str | None = None
    book_id: str | None = None
    num_questions: int = 5
    style: str = "mcq"  # mcq / true_false / open — used if styles is empty
    styles: list[str] | None = None  # e.g. ["mcq","true_false","open"] for mixed quiz
    provider: str | None = None
    model: str | None = None
    # Previous questions to avoid repeating (plain text list)
    excluded_context: str | None = None


class RagEvalRunRequest(BaseModel):
    book_id: str
    fixture: str = "prim3_grade3_suite_50.json"
    grade: int | None = None
    top_k: int = 5
    no_hybrid: bool = False
    no_rerank: bool = False


@app.get("/rag/books")
def rag_books_list(grade: int | None = None, subject_id: str | None = None, stage_id: str | None = None):
    """Catalog of ingested books (no auth — front-end already gates access)."""
    from rag.search import list_books
    return {"books": list_books(grade_number=grade, subject_id=subject_id, stage_id=stage_id)}


@app.post("/rag/ingest")
def rag_ingest_endpoint(req: IngestRequest):
    """Ingest a PDF that already lives under ai_agent/ (e.g. uploaded earlier or
    downloaded with rag.download_books). Returns book_id + chunks count."""
    from rag.ingest import ingest_pdf
    try:
        out = ingest_pdf(
            file=req.file_path,
            title=req.title,
            title_ar=req.title_ar,
            grade_number=req.grade,
            stage_name=req.stage_name,
            stage_id=None,
            subject_name=req.subject_name,
            subject_id=None,
            force=req.force,
            content_first_pdf_page=req.content_first_pdf_page,
            citation_starts_at_pdf_page=req.citation_starts_at_pdf_page,
            skip_trailing_pdf_pages=req.skip_trailing_pdf_pages,
            toc_json_path=req.toc_json_path,
        )
        return out
    except Exception as e:
        api_log.exception("rag_ingest failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/rag/books/{book_id}/toc")
def rag_book_toc(book_id: str):
    """Return the table of contents for a specific book.

    If the book was ingested before toc_json was added, builds a synthetic TOC
    from ``lesson_title`` / ``activity_title`` / ``section_path`` columns on ``rag_chunks``
    (the previous implementation incorrectly read a non-existent ``metadata`` JSON column).
    """
    from db.client import supabase as _sb
    from rag.toc_local import normalize_toc_entries

    try:
        book = _sb.table("rag_books").select("id, title, title_ar, toc_json").eq("id", book_id).maybe_single().execute()
        if not book or not book.data:
            raise HTTPException(status_code=404, detail="Book not found")

        raw_toc = book.data.get("toc_json")
        toc = normalize_toc_entries(raw_toc) if raw_toc is not None else []

        # Fallback: build synthetic TOC from chunk columns (ingest stores titles on rag_chunks rows)
        if not toc:
            chunks_r = (
                _sb.table("rag_chunks")
                .select("page_number, lesson_title, activity_title, section_path")
                .eq("book_id", book_id)
                .order("page_number")
                .limit(800)
                .execute()
            )
            seen: set[str] = set()
            synthetic: list[dict] = []
            for row in chunks_r.data or []:
                page = row.get("page_number")
                sp = row.get("section_path")
                if isinstance(sp, list):
                    for idx, segment in enumerate(sp[:4]):
                        t = str(segment or "").strip()
                        if not t:
                            continue
                        key = f"u:{t}"
                        if key in seen:
                            continue
                        seen.add(key)
                        synthetic.append({"title": t, "level": min(1 + idx, 4), "page": page})
                for key, lvl in (
                    ("lesson_title", 2),
                    ("activity_title", 3),
                ):
                    title = str(row.get(key) or "").strip()
                    if not title:
                        continue
                    dk = f"{key}:{title}"
                    if dk in seen:
                        continue
                    seen.add(dk)
                    synthetic.append({"title": title, "level": lvl, "page": page})
            toc = synthetic

        return {"book_id": book_id, "title": book.data.get("title_ar") or book.data.get("title"), "toc": toc}
    except HTTPException:
        raise
    except Exception as e:
        api_log.exception("rag_book_toc failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.delete("/rag/books/{book_id}")
def rag_delete_book(book_id: str):
    from db.client import supabase
    try:
        supabase.table("rag_chunks").delete().eq("book_id", book_id).execute()
        supabase.table("rag_books").delete().eq("id", book_id).execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/rag/generate-quiz")
def rag_generate_quiz(req: GenerateQuizRequest):
    """Teacher endpoint: generate Arabic quiz questions grounded in the textbook.

    Retrieval: defaults to a **fast vector-only** branch (``RAG_QUIZ_FAST=1``) — one ``match_textbook_chunks``
    RPC, no lexical fusion. Set ``RAG_QUIZ_FAST=0`` + ``RAG_QUIZ_HYBRID=1`` for slower hybrid search.

    LLM: ``invoke_llm_messages`` tries multiple API keys: primary env variable (comma/pipe list) then
    ``<PROVIDER>_API_KEY_FALLBACKS`` (comma-separated).
    """
    from rag.search import search_textbook_chunks
    from shared.llm_factory import invoke_llm_messages
    from langchain_core.messages import SystemMessage, HumanMessage

    config = get_current_config()
    provider = req.provider or config["provider"]
    model = req.model or config["model"]

    quiz_fast = (os.getenv("RAG_QUIZ_FAST") or "1").strip().lower() in ("1", "true", "yes", "on")
    quiz_hybrid = (os.getenv("RAG_QUIZ_HYBRID") or "0").strip().lower() in ("1", "true", "yes", "on")
    quiz_top_k = max(3, min(20, int(os.getenv("RAG_QUIZ_TOP_K", "8"))))
    quiz_rerank = (os.getenv("RAG_QUIZ_RERANK") or "0").strip().lower() in ("1", "true", "yes", "on")

    raw_styles = req.styles if req.styles else [req.style]
    norm: list[str] = []
    for s in raw_styles:
        x = (s or "").strip().lower()
        if x in ("mcq", "true_false", "open") and x not in norm:
            norm.append(x)
    if not norm:
        norm = ["mcq"]

    style_labels = {
        "mcq": "اختيار من متعدد (4 خيارات)",
        "true_false": "صواب أو خطأ",
        "open": "أسئلة مقالية مفتوحة",
    }
    if len(norm) == 1:
        style_label = style_labels[norm[0]]
        style_instruction = f"نوع الأسئلة: {style_label}"
    else:
        parts = [style_labels[s] for s in norm]
        style_label = " + ".join(parts)
        style_instruction = (
            "امزج في نفس الاختبار الأنواع التالية: " + "؛ ".join(parts) + ".\n"
            "وزّع الأسئلة بين هذه الأنواع بالتساوي قدر الإمكان."
        )

    passages = search_textbook_chunks(
        req.topic,
        grade_number=req.grade_number,
        subject_id=req.subject_id,
        book_id=req.book_id,
        top_k=quiz_top_k,
        hybrid=quiz_hybrid if not quiz_fast else False,
        rerank=quiz_rerank if not quiz_fast else False,
        fast_path=quiz_fast,
    )
    if not passages:
        return {"questions_text": "(لا توجد فقرات مطابقة في الكتب المُستوعبة لهذا الفلتر)"}

    context = "\n\n".join(
        f"[{i+1}] {p.get('book_title')} — صفحة {p.get('page_number')}\n{p.get('content')}"
        for i, p in enumerate(passages)
    )

    sys_prompt = (
        "أنت معلم خبير. اكتب أسئلة اختبار قصيرة بالعربية الفصحى مستندة فقط للنصوص المرجعة. "
        "لكل سؤال اذكر الإجابة الصحيحة وإشارة لرقم الصفحة بين قوسين. "
        "لا تخترع معلومة خارج النصوص."
    )
    user_prompt = (
        f"الموضوع: {req.topic}\n"
        f"عدد الأسئلة: {req.num_questions}\n"
        f"{style_instruction}\n\n"
        f"النصوص المرجعة من الكتاب الرسمي:\n{context}\n\n"
    )
    if req.excluded_context and req.excluded_context.strip():
        excl = req.excluded_context.strip()[:2000]  # cap to avoid token overflow
        user_prompt += (
            f"\n⚠️ الأسئلة التالية موجودة مسبقاً — لا تكررها ولا تُنشئ أسئلة مشابهة لها:\n{excl}\n\n"
        )
    user_prompt += (
        "\n\n⚠️ تنسيق مطلوب حتى تعمل الأسئلة في التطبيق (لا تستخدم # أو عنوان markdown):\n"
        "- اكتب الأسئلة مرقّمة بالأرقام اللاتينية فقط: 1. 2. 3. … (كل رقم مع نقطة).\n"
        "- لكل نص أسئلة اختيار من متعدد اكتب أربعة أسطر متتالية تبدأ بـ: أ. وب. وج. د.\n"
        "- لأسئلة صواب/خطأ لا تكتب أسطر أ/ب؛ فقط نص السؤال ثم سطر الإجابة كما المعتاد.\n"
        "- بعد كل سؤال ضع على سطر جديد: الإجابة: … (صفحة N)\n\n"
        "اكتب الأسئلة الآن مرقمة، وبعد كل سؤال اكتب: الإجابة: … (صفحة X)."
    )
    resp = invoke_llm_messages(
        [SystemMessage(content=sys_prompt), HumanMessage(content=user_prompt)],
        provider=provider,
        model=model,
    )
    return {
        "questions_text": getattr(resp, "content", str(resp)),
        "passages_used": [
            {"book_title": p.get("book_title"), "page_number": p.get("page_number"),
             "similarity": p.get("similarity")}
            for p in passages
        ],
        "provider": provider,
        "model": model,
    }


@app.get("/rag/eval/fixtures")
def rag_eval_fixtures():
    from rag.eval import fixture_paths

    return {"fixtures": fixture_paths()}


@app.post("/rag/eval/run")
def rag_eval_run(req: RagEvalRunRequest):
    """Run scripted retrieval checks (JSON suites under rag/eval/fixtures/)."""
    from rag.eval import FIXTURE_DIR, evaluate_book_questions, load_fixture, normalize_questions
    from rag.search import list_books

    fp = Path(req.fixture)
    if not fp.is_absolute():
        fp = FIXTURE_DIR / req.fixture
    try:
        doc = load_fixture(fp)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    items = normalize_questions(doc.get("questions") or doc.get("items") or [])
    if not items:
        raise HTTPException(status_code=400, detail="fixture has no questions/items")

    grade = req.grade
    subj = None
    stg = None
    for b in list_books():
        if str(b.get("id")) == str(req.book_id):
            grade = grade if grade is not None else b.get("grade_number")
            subj = b.get("subject_id")
            stg = b.get("stage_id")
            break

    report = evaluate_book_questions(
        book_id=req.book_id,
        grade_number=grade,
        subject_id=subj,
        stage_id=stg,
        questions=items,
        top_k=max(1, min(req.top_k, 15)),
        hybrid=False if req.no_hybrid else None,
        rerank=not req.no_rerank,
        min_similarity=None,
    )
    report["fixture_used"] = req.fixture
    report["fixture_title"] = doc.get("title")
    return report


@app.get("/rag/downloaded-files")
def rag_downloaded_files():
    """List PDFs downloaded under ai_agent/rag/books/ (helper for the admin UI)."""
    base = os.path.join(os.path.dirname(__file__), "rag", "books")
    out = []
    if not os.path.isdir(base):
        return {"root": base, "files": []}
    for root, _dirs, files in os.walk(base):
        for f in files:
            if f.lower().endswith(".pdf"):
                full = os.path.join(root, f)
                try:
                    rel = os.path.relpath(full, os.path.dirname(__file__)).replace("\\", "/")
                    out.append({"path": rel, "name": f, "size": os.path.getsize(full)})
                except Exception:
                    pass
    out.sort(key=lambda x: x["path"])
    return {"root": base, "files": out}


class RegradeOpenSubmissionBody(BaseModel):
    submission_id: str


@app.post("/assignments/regrade-open-submission")
def post_regrade_open_submission(
    body: RegradeOpenSubmissionBody,
    authorization: str | None = Header(None),
):
    """
    Re-score a quiz submission (MCQ/TF + open-ended via LLM). Requires the student's Supabase JWT.
    """
    from quiz_open_grading import regrade_open_submission as _regrade

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization: Bearer <jwt> required")
    jwt = authorization.split(" ", 1)[1].strip()
    try:
        out = _regrade(submission_id=str(body.submission_id).strip(), jwt=jwt)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        api_log.exception("regrade-open-submission failed: %s", e)
        raise HTTPException(status_code=500, detail="regrade failed") from e
    return out


def _rate_limit_http_detail(exc: Exception) -> str:
    """Short user-facing message; full error is logged separately."""
    raw = str(exc)
    retry_hint = ""
    m = re.search(r"Please try again in ([^.]+)", raw, re.IGNORECASE)
    if m:
        retry_hint = m.group(1).strip()

    lines_ar = [
        "تم بلوغ الحد اليومي لرموز Groq على خطتك الحالية.",
        "يمكنك: الانتظار ثم إعادة المحاولة، أو تغيير المزوّد/النموذج من إعدادات الذكاء، أو ترقية الخطة:",
        "https://console.groq.com/settings/billing",
    ]
    if retry_hint:
        lines_ar.append(f"Groq يقترح إعادة المحاولة بعد حوالي: {retry_hint}")

    lines_en = [
        "Daily Groq token limit reached for your plan.",
        "Wait and retry, switch provider/model in AI settings, or upgrade:",
        "https://console.groq.com/settings/billing",
    ]
    if retry_hint:
        lines_en.append(f"Groq suggests retry after about: {retry_hint}")

    return "\n".join(lines_ar) + "\n\n—\n\n" + "\n".join(lines_en)


@app.get("/student/summary")
def student_ai_summary(user_id: str, provider: str = "", model: str = ""):
    """
    Lightweight AI study summary for student dashboard.
    Single LLM call (no tool loop). Cached once per day per student.
    """
    from roles.student.summary_api import get_student_summary as _do_summary
    import asyncio
    
    config = get_current_config()
    final_provider = provider if provider else config["provider"]
    final_model = model if model else config["model"]

    return asyncio.run(_do_summary(user_id=user_id, provider=final_provider, model=final_model))


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    valid_roles = ["student", "teacher", "parent", "school", "directorate", "ministry", "support"]
    if req.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    if req.provider and req.provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Choose: {list(PROVIDERS.keys())}")

    config = get_current_config()
    provider = req.provider or config["provider"]
    model = req.model or config["model"]

    api_log.info(
        "POST /chat role=%s provider=%s model=%s user=%s msg_chars=%s",
        req.role,
        provider,
        model,
        (req.user_id or "")[:12] + "…" if req.user_id and len(req.user_id) > 12 else (req.user_id or ""),
        len(req.message or ""),
    )
    try:
        history_payload = (
            [{"role": h.role, "content": h.content} for h in (req.history or [])]
            if req.history
            else None
        )
        out = run_agent(
            user_id=req.user_id,
            role=req.role,
            message=req.message,
            provider=provider,
            model=model,
            chat_id=req.chat_id,
            history=history_payload,
        )
    except RateLimitError as e:
        api_log.warning("POST /chat rate limited (full): %s", e)
        raise HTTPException(status_code=429, detail=_rate_limit_http_detail(e)) from e
    except APIStatusError as e:
        if getattr(e, "status_code", None) == 429:
            api_log.warning("POST /chat rate limited (full): %s", e)
            raise HTTPException(status_code=429, detail=_rate_limit_http_detail(e)) from e
        api_log.exception("POST /chat upstream error: %s", e)
        raise HTTPException(status_code=502, detail=str(e) or "Upstream LLM error") from e

    return ChatResponse(
        response=out["response"],
        user_id=req.user_id,
        role=req.role,
        provider=provider,
        model=model,
        support_ui=out.get("support_ui"),
    )


@app.get("/providers")
def list_providers():
    active = fetch_active_credential()
    result = []
    for name, config in PROVIDERS.items():
        if name == "ollama":
            has_key = True
        elif active and active.get("provider") == name:
            has_key = bool((active.get("api_key") or "").strip()) or name == "ollama"
        else:
            api_key = os.getenv(config["env_key"], "")
            has_key = bool(api_key and api_key != "ollama")
        models = AVAILABLE_MODELS.get(name, [])
        openrouter_free = None
        if name == "openrouter":
            models, openrouter_free = get_openrouter_models_for_provider()
        row = {
            "id": name,
            "name": name.capitalize(),
            "configured": has_key or name == "ollama",
            "default_model": config["default_model"],
            "models": models,
        }
        if openrouter_free is not None:
            row["openrouter_free_models"] = openrouter_free
        result.append(row)
    return {"providers": result}


@app.get("/providers/current")
def get_current_provider():
    config = get_current_config()
    provider = config["provider"]
    models = AVAILABLE_MODELS.get(provider, [])
    if provider == "openrouter":
        models, _ = get_openrouter_models_for_provider()
    return {
        "provider": provider,
        "model": config["model"],
        "available_models": models,
    }


@app.post("/providers/set")
def set_provider(cfg: ProviderConfig):
    if cfg.provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {cfg.provider}")

    env_path = os.path.join(os.path.dirname(__file__), ".env")
    set_key(env_path, "AI_PROVIDER", cfg.provider)
    set_key(env_path, "AI_MODEL", cfg.model)

    if cfg.api_key:
        key_map = {
            "agentrouter": "AGENTROUTER_API_KEY",
            "openrouter": "OPENROUTER_API_KEY",
            "openai": "OPENAI_API_KEY",
            "groq": "GROQ_API_KEY",
            "gemini": "GEMINI_API_KEY",
        }
        env_key = key_map.get(cfg.provider)
        if env_key:
            set_key(env_path, env_key, cfg.api_key)
            os.environ[env_key] = cfg.api_key

    os.environ["AI_PROVIDER"] = cfg.provider
    os.environ["AI_MODEL"] = cfg.model

    invalidate_active_credential_cache()

    return {"success": True, "provider": cfg.provider, "model": cfg.model}


@app.post("/providers/refresh-cache")
def refresh_credentials_cache():
    invalidate_active_credential_cache()
    return {"ok": True}


@app.get("/providers/openrouter/free-models")
def openrouter_free_models_list():
    """OpenRouter free-tier model ids (cached; use POST …/refresh to force fetch)."""
    models, meta = get_openrouter_models_for_provider()
    return {"models": models, "meta": meta}


@app.post("/providers/openrouter/free-models/refresh")
def openrouter_free_models_refresh():
    """Force-refresh list from OpenRouter /api/v1/models (free = $0 prompt & completion, or id ending in :free)."""
    meta = refresh_openrouter_free_models()
    return {"ok": True, "openrouter_free_models": meta}


@app.get("/providers/openrouter/free-models/status")
def openrouter_free_models_status():
    return {"openrouter_free_models": get_openrouter_free_models_meta()}


@app.get("/roles")
def list_roles():
    return {"roles": [
        {"role": "student", "description": "Student learning portal"},
        {"role": "teacher", "description": "Teacher workspace"},
        {"role": "parent", "description": "Parent follow-up portal"},
        {"role": "school", "description": "School management"},
        {"role": "directorate", "description": "District directorate"},
        {"role": "ministry", "description": "Ministry of Education"},
        {"role": "support", "description": "Customer support — full access to all user data"},
    ]}
