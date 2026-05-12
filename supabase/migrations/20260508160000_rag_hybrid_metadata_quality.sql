-- RAG enhancements: lesson metadata, quality_score, FTS for hybrid search, optional min_quality filter.

ALTER TABLE public.rag_chunks
  ADD COLUMN IF NOT EXISTS quality_score double precision,
  ADD COLUMN IF NOT EXISTS lesson_title text,
  ADD COLUMN IF NOT EXISTS activity_title text,
  ADD COLUMN IF NOT EXISTS section_path text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS chunk_kind text,
  ADD COLUMN IF NOT EXISTS page_start int,
  ADD COLUMN IF NOT EXISTS page_end int,
  ADD COLUMN IF NOT EXISTS extra_metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.rag_chunks.quality_score IS '0–1 ingestion quality heuristic; low scores are skipped at ingest when below threshold.';
COMMENT ON COLUMN public.rag_chunks.chunk_kind IS 'lesson | activity | section | subsection | misc';

-- Backfill legacy rows so new filters behave predictably.
UPDATE public.rag_chunks
SET
  quality_score = COALESCE(quality_score, 0.85),
  page_start = COALESCE(page_start, page_number),
  page_end = COALESCE(page_end, page_number),
  extra_metadata = COALESCE(extra_metadata, '{}'::jsonb)
WHERE quality_score IS NULL OR page_start IS NULL OR page_end IS NULL OR extra_metadata IS NULL;

-- Full-text tokens (Arabic-safe: splits on punctuation; lexical leg for hybrid RRF).
ALTER TABLE public.rag_chunks
  ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, ''))) STORED;

DROP INDEX IF EXISTS idx_rag_chunks_content_tsv;
CREATE INDEX idx_rag_chunks_content_tsv ON public.rag_chunks USING gin (content_tsv);

-- ─── Semantic search (+ optional minimum quality 0–1) ─────────────────────

DROP FUNCTION IF EXISTS public.match_textbook_chunks(vector(1024), int, int, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.match_textbook_chunks(vector(1024), int, int, uuid, uuid, uuid, double precision);
DROP FUNCTION IF EXISTS public.match_textbook_chunks(vector(768), int, int, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.match_textbook_chunks(vector(768), int, int, uuid, uuid, uuid, double precision);

CREATE OR REPLACE FUNCTION public.match_textbook_chunks(
  query_embedding     vector(1024),
  match_count         int   DEFAULT 5,
  filter_grade        int   DEFAULT NULL,
  filter_subject      uuid  DEFAULT NULL,
  filter_stage        uuid  DEFAULT NULL,
  filter_book_id      uuid  DEFAULT NULL,
  filter_min_quality  double precision DEFAULT NULL
)
RETURNS TABLE (
  chunk_id     uuid,
  book_id      uuid,
  book_title   text,
  page_number  int,
  content      text,
  similarity   float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id           AS chunk_id,
    c.book_id,
    COALESCE(b.title_ar, b.title) AS book_title,
    COALESCE(c.page_start, c.page_number) AS page_number,
    c.content,
    (1 - (c.embedding <=> query_embedding))::float AS similarity
  FROM rag_chunks c
  JOIN rag_books  b ON b.id = c.book_id
  WHERE c.embedding IS NOT NULL
    AND (filter_grade       IS NULL OR b.grade_number = filter_grade)
    AND (filter_subject     IS NULL OR b.subject_id   = filter_subject)
    AND (filter_stage       IS NULL OR b.stage_id     = filter_stage)
    AND (filter_book_id     IS NULL OR c.book_id      = filter_book_id)
    AND (filter_min_quality IS NULL OR COALESCE(c.quality_score, 1.0) >= filter_min_quality)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_textbook_chunks(vector(1024), int, int, uuid, uuid, uuid, double precision)
  TO authenticated, service_role;

-- ─── Lexical (FTS) branch for hybrid RRF ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.match_textbook_chunks_fts(
  query_text           text,
  match_count          int   DEFAULT 40,
  filter_grade         int   DEFAULT NULL,
  filter_subject       uuid  DEFAULT NULL,
  filter_stage         uuid  DEFAULT NULL,
  filter_book_id       uuid  DEFAULT NULL,
  filter_min_quality   double precision DEFAULT NULL
)
RETURNS TABLE (
  chunk_id     uuid,
  book_id      uuid,
  book_title   text,
  page_number  int,
  content      text,
  rank         float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id           AS chunk_id,
    c.book_id,
    COALESCE(b.title_ar, b.title) AS book_title,
    COALESCE(c.page_start, c.page_number) AS page_number,
    c.content,
    ts_rank_cd(c.content_tsv, plainto_tsquery('simple', trim(query_text)))::float AS rank
  FROM rag_chunks c
  JOIN rag_books  b ON b.id = c.book_id
  WHERE c.content_tsv @@ plainto_tsquery('simple', trim(query_text))
    AND trim(query_text) <> ''
    AND (filter_grade       IS NULL OR b.grade_number = filter_grade)
    AND (filter_subject     IS NULL OR b.subject_id   = filter_subject)
    AND (filter_stage       IS NULL OR b.stage_id     = filter_stage)
    AND (filter_book_id     IS NULL OR c.book_id      = filter_book_id)
    AND (filter_min_quality IS NULL OR COALESCE(c.quality_score, 1.0) >= filter_min_quality)
  ORDER BY rank DESC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_textbook_chunks_fts(text, int, int, uuid, uuid, uuid, double precision)
  TO authenticated, service_role;
