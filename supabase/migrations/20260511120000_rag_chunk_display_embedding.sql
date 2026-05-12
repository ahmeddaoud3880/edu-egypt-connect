-- Separate display Arabic vs unstressed lexical text; FTS indexes content_for_embedding.

ALTER TABLE public.rag_chunks
  ADD COLUMN IF NOT EXISTS content_display text,
  ADD COLUMN IF NOT EXISTS content_for_embedding text;

UPDATE public.rag_chunks SET
  content_display = coalesce(nullif(btrim(content_display), ''), content),
  content_for_embedding = coalesce(nullif(btrim(content_for_embedding), ''), content);

ALTER TABLE public.rag_chunks
  ALTER COLUMN content_display SET NOT NULL,
  ALTER COLUMN content_for_embedding SET NOT NULL;

COMMENT ON COLUMN public.rag_chunks.content_display IS 'Clean Arabic text for citations and UI.';
COMMENT ON COLUMN public.rag_chunks.content_for_embedding IS 'Arabic without tashkeel; used for embeddings and lexical FTS matching.';

-- Rebuild tsvector source (was coalesce(content, '')).
DROP INDEX IF EXISTS idx_rag_chunks_content_tsv;
ALTER TABLE public.rag_chunks DROP COLUMN IF EXISTS content_tsv;

ALTER TABLE public.rag_chunks
  ADD COLUMN content_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(content_for_embedding, ''))
  ) STORED;

CREATE INDEX idx_rag_chunks_content_tsv ON public.rag_chunks USING gin (content_tsv);

-- Return display text as "content" for API compatibility.

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
    COALESCE(NULLIF(btrim(c.content_display), ''), c.content) AS content,
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
    COALESCE(NULLIF(btrim(c.content_display), ''), c.content) AS content,
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
