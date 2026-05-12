-- ==========================================
-- Migration: Quizzes and quiz questions
-- ==========================================

CREATE TABLE IF NOT EXISTS public.quizzes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id    UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  subject_id  UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  title_ar    TEXT,
  lesson_ref  TEXT,
  -- reference to the TOC lesson (title or page)
  book_id     UUID REFERENCES public.rag_books(id) ON DELETE SET NULL,
  due_date    TIMESTAMPTZ,
  assigned    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_teacher ON public.quizzes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_class ON public.quizzes(class_id);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id       UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'mcq',
  -- 'mcq' | 'true_false' | 'open'
  options_json  JSONB,
  -- for MCQ: [{"key": "A", "text": "..."}, ...]
  answer        TEXT,
  points        INT NOT NULL DEFAULT 1,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id, sort_order);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher manages own quizzes" ON public.quizzes;
CREATE POLICY "teacher manages own quizzes" ON public.quizzes
  FOR ALL USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "school reads quizzes" ON public.quizzes;
CREATE POLICY "school reads quizzes" ON public.quizzes
  FOR SELECT USING (public.has_role(auth.uid(), 'school'));

DROP POLICY IF EXISTS "support reads quizzes" ON public.quizzes;
CREATE POLICY "support reads quizzes" ON public.quizzes
  FOR SELECT USING (public.has_role(auth.uid(), 'support'));

DROP POLICY IF EXISTS "teacher manages own quiz questions" ON public.quiz_questions;
CREATE POLICY "teacher manages own quiz questions" ON public.quiz_questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.teacher_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "student reads assigned quiz questions" ON public.quiz_questions;
CREATE POLICY "student reads assigned quiz questions" ON public.quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.enrollments e ON e.class_id = q.class_id
      JOIN public.students s ON s.id = e.student_id
      WHERE q.id = quiz_id AND s.user_id = auth.uid() AND q.assigned = TRUE
    )
  );
