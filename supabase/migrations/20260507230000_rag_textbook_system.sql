-- ─── RAG textbook system ───────────────────────────────────────────────────
-- pgvector + tables + retrieval RPC.

CREATE EXTENSION IF NOT EXISTS vector;

-- ─── rag_books (catalog of ingested books) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rag_books (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  title_ar     text,
  stage_id     uuid REFERENCES public.stages(id) ON DELETE SET NULL,
  grade_number int,
  subject_id   uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  subject_name text,
  source_file  text,
  file_hash    text UNIQUE,
  total_pages  int,
  total_chunks int DEFAULT 0,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rag_books_grade_subject
  ON public.rag_books(grade_number, subject_id);

-- ─── rag_chunks (text + 768d Gemini embedding) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.rag_chunks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     uuid NOT NULL REFERENCES public.rag_books(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  page_number int,
  content     text NOT NULL,
  content_tokens_est int,
  embedding   vector(768),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_book
  ON public.rag_chunks(book_id);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_hnsw
  ON public.rag_chunks USING hnsw (embedding vector_cosine_ops);

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.rag_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rag_books_read_all" ON public.rag_books;
CREATE POLICY "rag_books_read_all" ON public.rag_books
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rag_chunks_read_all" ON public.rag_chunks;
CREATE POLICY "rag_chunks_read_all" ON public.rag_chunks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rag_books_write_admin" ON public.rag_books;
CREATE POLICY "rag_books_write_admin" ON public.rag_books
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'support'::public.app_role)
         OR public.has_role(auth.uid(), 'ministry'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'support'::public.app_role)
              OR public.has_role(auth.uid(), 'ministry'::public.app_role));

DROP POLICY IF EXISTS "rag_chunks_write_admin" ON public.rag_chunks;
CREATE POLICY "rag_chunks_write_admin" ON public.rag_chunks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'support'::public.app_role)
         OR public.has_role(auth.uid(), 'ministry'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'support'::public.app_role)
              OR public.has_role(auth.uid(), 'ministry'::public.app_role));

-- ─── RPC: match_textbook_chunks (semantic search) ──────────────────────────
CREATE OR REPLACE FUNCTION public.match_textbook_chunks(
  query_embedding vector(768),
  match_count     int   DEFAULT 5,
  filter_grade    int   DEFAULT NULL,
  filter_subject  uuid  DEFAULT NULL,
  filter_stage    uuid  DEFAULT NULL
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
    AND (filter_grade   IS NULL OR b.grade_number = filter_grade)
    AND (filter_subject IS NULL OR b.subject_id   = filter_subject)
    AND (filter_stage   IS NULL OR b.stage_id     = filter_stage)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_textbook_chunks(vector, int, int, uuid, uuid)
  TO authenticated, service_role;
