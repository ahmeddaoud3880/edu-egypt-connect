-- Link assignments to quizzes + optional gradebook flag
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS quiz_id UUID REFERENCES public.quizzes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS counts_toward_grade BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_assignments_quiz_id ON public.assignments(quiz_id);

COMMENT ON COLUMN public.assignments.counts_toward_grade IS
  'When true, teacher-intended: this assessment counts toward the official grade record when scores are entered.';
