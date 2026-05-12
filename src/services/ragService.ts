/**
 * Frontend client for the AI agent's /rag/* endpoints.
 */
import { supabase } from "@/integrations/supabase/client";

const AI_BASE_URL = import.meta.env.VITE_AI_API_URL || "http://localhost:8000";

/** Normalize TOC stored in Postgres (handles odd shapes gracefully). */
function normalizeTocClient(raw: unknown): TocEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: TocEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const o = e as Record<string, unknown>;
    const title = String(o.title ?? "").trim();
    if (!title) continue;
    let level = Number(o.level ?? 2);
    if (!Number.isFinite(level) || level < 1) level = 2;
    if (level > 6) level = 6;
    let page: number | null = null;
    if (o.page != null) {
      const p = Number(o.page);
      if (Number.isFinite(p) && p > 0) page = Math.floor(p);
    }
    out.push({ title, level, page });
  }
  return out;
}

/** Fallback when AI API is offline: read ``toc_json`` from ``rag_books`` (authenticated SELECT allowed). */
export async function fetchBookTocFromSupabase(bookId: string): Promise<TocEntry[]> {
  const { data, error } = await (supabase as any)
    .from("rag_books")
    .select("toc_json")
    .eq("id", bookId)
    .maybeSingle();
  if (error) throw error;
  return normalizeTocClient(data?.toc_json);
}

export interface RagBook {
  id: string;
  title: string;
  title_ar: string | null;
  stage_id: string | null;
  grade_number: number | null;
  subject_id: string | null;
  subject_name: string | null;
  total_chunks: number;
  total_pages: number | null;
  /** Relative path under ai_agent/, when returned by agent API */
  source_file?: string | null;
}

export interface RagEvalReport {
  book_id: string;
  fixture_used?: string;
  fixture_title?: string | null;
  questions_evaluated: number;
  non_empty_rate: number;
  keyword_hit_rate: number | null;
  detail?: {
    i: number;
    query: string;
    chunks: number;
    hit_nonempty: boolean;
    hit_similarity?: boolean;
    hit_keywords?: boolean | null;
    top_page?: number | null;
  }[];
}

export interface DownloadedPdf {
  path: string; // relative to ai_agent/
  name: string;
  size: number;
}

export interface IngestResult {
  book_id?: string;
  pages?: number;
  chunks?: number;
  skipped?: boolean;
  error?: string;
}

export interface QuizResult {
  questions_text: string;
  passages_used?: { book_title: string; page_number: number | null; similarity: number }[];
  provider?: string;
  model?: string;
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function ragListBooks(filters?: {
  grade?: number;
  subject_id?: string;
  stage_id?: string;
}): Promise<RagBook[]> {
  const qs = new URLSearchParams();
  if (filters?.grade) qs.set("grade", String(filters.grade));
  if (filters?.subject_id) qs.set("subject_id", filters.subject_id);
  if (filters?.stage_id) qs.set("stage_id", filters.stage_id);
  const r = await fetch(`${AI_BASE_URL}/rag/books?${qs.toString()}`);
  const data = await jsonOrThrow<{ books: RagBook[] }>(r);
  return data.books || [];
}

export async function ragListDownloadedPdfs(): Promise<{ root: string; files: DownloadedPdf[] }> {
  const r = await fetch(`${AI_BASE_URL}/rag/downloaded-files`);
  return jsonOrThrow(r);
}

export async function ragIngestExisting(payload: {
  file_path: string;
  title: string;
  title_ar?: string;
  grade?: number;
  stage_name?: string;
  subject_name?: string;
  force?: boolean;
  /** 1-based PDF page where content starts (skip TOC). Default 1. */
  content_first_pdf_page?: number;
  /** If set, stored citation page = pdf_page - this + 1 (e.g. 6 when printed p.1 is PDF p.6). */
  citation_starts_at_pdf_page?: number | null;
  /** Skip last N PDF pages (back-of-book index). */
  skip_trailing_pdf_pages?: number;
}): Promise<IngestResult> {
  const r = await fetch(`${AI_BASE_URL}/rag/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(r);
}

export async function ragDeleteBook(bookId: string): Promise<{ ok: boolean }> {
  const r = await fetch(`${AI_BASE_URL}/rag/books/${bookId}`, { method: "DELETE" });
  return jsonOrThrow(r);
}

export async function ragListEvalFixtures(): Promise<{ fixtures: string[] }> {
  const r = await fetch(`${AI_BASE_URL}/rag/eval/fixtures`);
  return jsonOrThrow(r);
}

export async function ragRunEval(payload: {
  book_id: string;
  fixture?: string;
  grade?: number;
  top_k?: number;
  no_hybrid?: boolean;
  no_rerank?: boolean;
}): Promise<RagEvalReport> {
  const r = await fetch(`${AI_BASE_URL}/rag/eval/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      book_id: payload.book_id,
      fixture: payload.fixture ?? "prim3_grade3_suite_50.json",
      grade: payload.grade,
      top_k: payload.top_k ?? 5,
      no_hybrid: !!payload.no_hybrid,
      no_rerank: !!payload.no_rerank,
    }),
  });
  return jsonOrThrow<RagEvalReport>(r);
}

export async function ragGenerateQuiz(payload: {
  topic: string;
  grade_number?: number;
  subject_id?: string;
  book_id?: string;
  lesson_ref?: string;
  num_questions?: number;
  style?: "mcq" | "true_false" | "open";
  /** When set (1–3 items), generates a mixed quiz in one call */
  styles?: ("mcq" | "true_false" | "open")[];
}): Promise<QuizResult> {
  const r = await fetch(`${AI_BASE_URL}/rag/generate-quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(r);
}

export interface TocEntry {
  title: string;
  level: number;
  page: number | null;
}

export interface BookToc {
  book_id: string;
  title: string;
  toc: TocEntry[];
}

export async function ragGetBookToc(bookId: string): Promise<BookToc> {
  const r = await fetch(`${AI_BASE_URL}/rag/books/${bookId}/toc`);
  return jsonOrThrow<BookToc>(r);
}

/** Re-score submission (MCQ/TF + open via LLM on agent). Requires student JWT. */
export async function regradeOpenSubmission(submissionId: string, accessToken: string): Promise<{
  score: number;
  max_score: number | null;
  open_graded: number;
}> {
  const r = await fetch(`${AI_BASE_URL}/assignments/regrade-open-submission`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ submission_id: submissionId }),
  });
  return jsonOrThrow(r);
}
