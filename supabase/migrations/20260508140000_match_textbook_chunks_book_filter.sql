-- Optional filter by rag_books.id for student "ask this book" flows.
-- Vector dim must match rag_chunks.embedding (1024 for BGE-M3).

DROP FUNCTION IF EXISTS public.match_textbook_chunks(vector(1024), int, int, uuid, uuid);
DROP FUNCTION IF EXISTS public.match_textbook_chunks(vector(768), int, int, uuid, uuid);

CREATE OR REPLACE FUNCTION public.match_textbook_chunks(
  query_embedding vector(1024),
  match_count     int   DEFAULT 5,
  filter_grade    int   DEFAULT NULL,
  filter_subject  uuid  DEFAULT NULL,
  filter_stage    uuid  DEFAULT NULL,
  filter_book_id  uuid  DEFAULT NULL
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
    c.page_number,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM rag_chunks c
  JOIN rag_books  b ON b.id = c.book_id
  WHERE c.embedding IS NOT NULL
    AND (filter_grade    IS NULL OR b.grade_number = filter_grade)
    AND (filter_subject  IS NULL OR b.subject_id   = filter_subject)
    AND (filter_stage    IS NULL OR b.stage_id     = filter_stage)
    AND (filter_book_id  IS NULL OR c.book_id      = filter_book_id)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_textbook_chunks(vector(1024), int, int, uuid, uuid, uuid)
  TO authenticated, service_role;
