-- Quiz / homework hand-ins must use student_assignment_submissions (assignment_id + student_id).
-- Legacy table public.student_assignments is a different entity (dashboard rows: user_id, title, …)
-- and often predates migrations; CREATE TABLE IF NOT EXISTS skipped adding assignment_id there,
-- which breaks submit_student_quiz (sa.assignment_id does not exist).

CREATE TABLE IF NOT EXISTS public.student_assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  submitted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  feedback TEXT,
  answers_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

ALTER TABLE public.student_assignment_submissions
  ADD COLUMN IF NOT EXISTS answers_json JSONB;

ALTER TABLE public.student_assignment_submissions
  ADD COLUMN IF NOT EXISTS feedback TEXT;

CREATE INDEX IF NOT EXISTS idx_student_assignment_submissions_assignment_id
  ON public.student_assignment_submissions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_student_assignment_submissions_student_id
  ON public.student_assignment_submissions (student_id);

ALTER TABLE public.student_assignment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher manages student_assignment_submissions" ON public.student_assignment_submissions;
CREATE POLICY "teacher manages student_assignment_submissions" ON public.student_assignment_submissions
  FOR ALL USING (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'school')
    OR public.has_role(auth.uid(), 'support')
  );

DROP POLICY IF EXISTS "student reads own quiz submissions" ON public.student_assignment_submissions;
CREATE POLICY "student reads own quiz submissions" ON public.student_assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_assignment_submissions.student_id AND s.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.submit_student_quiz(p_assignment_id uuid, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_quiz_id uuid;
  v_class_id uuid;
  v_subject_id uuid;
  v_counts_toward boolean;
  v_academic_year text;
  v_max numeric := 0;
  v_earned numeric := 0;
  rec RECORD;
  student_ans text;
  correct_ans text;
  ok boolean;
BEGIN
  IF p_answers IS NULL THEN
    p_answers := '{}'::jsonb;
  END IF;

  SELECT s.id INTO v_student_id FROM public.students s WHERE s.user_id = auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'not_a_student' USING ERRCODE = '42501';
  END IF;

  SELECT a.quiz_id, a.class_id, a.subject_id, COALESCE(a.counts_toward_grade, true)
  INTO v_quiz_id, v_class_id, v_subject_id, v_counts_toward
  FROM public.assignments a
  WHERE a.id = p_assignment_id;

  v_academic_year := '2025-2026';

  IF v_quiz_id IS NULL THEN
    RAISE EXCEPTION 'assignment_has_no_quiz';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = v_student_id AND e.class_id = v_class_id
  ) THEN
    RAISE EXCEPTION 'not_enrolled_in_class';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.student_assignment_submissions sas
    WHERE sas.assignment_id = p_assignment_id
      AND sas.student_id = v_student_id
      AND sas.status IN ('submitted', 'graded')
  ) THEN
    RAISE EXCEPTION 'already_submitted';
  END IF;

  FOR rec IN
    SELECT qq.id, qq.question_type, qq.answer, qq.points
    FROM public.quiz_questions qq
    WHERE qq.quiz_id = v_quiz_id
    ORDER BY qq.sort_order, qq.created_at
  LOOP
    v_max := v_max + COALESCE(rec.points, 1);
    student_ans := p_answers ->> rec.id::text;
    correct_ans := rec.answer;
    ok := false;

    IF rec.question_type = 'mcq' THEN
      ok := public.mcq_answer_equiv(student_ans, correct_ans);
    ELSIF rec.question_type = 'true_false' THEN
      ok := public.tf_answer_equiv(student_ans, correct_ans);
    ELSIF rec.question_type = 'open' THEN
      IF correct_ans IS NOT NULL AND trim(both from correct_ans) <> ''
         AND student_ans IS NOT NULL AND trim(both from student_ans) <> '' THEN
        ok := lower(trim(both from student_ans)) = lower(trim(both from correct_ans));
      ELSE
        ok := false;
      END IF;
    END IF;

    IF ok THEN
      v_earned := v_earned + COALESCE(rec.points, 1);
    END IF;
  END LOOP;

  INSERT INTO public.student_assignment_submissions (
    assignment_id, student_id, score, submitted_at, status, answers_json
  ) VALUES (
    p_assignment_id, v_student_id, v_earned, now(), 'graded', p_answers
  )
  ON CONFLICT (assignment_id, student_id) DO UPDATE SET
    score = EXCLUDED.score,
    submitted_at = EXCLUDED.submitted_at,
    status = 'graded',
    answers_json = EXCLUDED.answers_json;

  IF v_counts_toward THEN
    DELETE FROM public.grades g
    WHERE g.student_id = v_student_id AND g.assignment_id = p_assignment_id;

    INSERT INTO public.grades (
      student_id, subject_id, assignment_id, score, max_score, grade_type, academic_year
    ) VALUES (
      v_student_id,
      v_subject_id,
      p_assignment_id,
      v_earned,
      NULLIF(v_max, 0),
      'quiz',
      v_academic_year
    );
  END IF;

  RETURN jsonb_build_object(
    'score', v_earned,
    'max_score', NULLIF(v_max, 0),
    'counts_toward_grade', v_counts_toward
  );
END;
$$;

COMMENT ON FUNCTION public.submit_student_quiz(uuid, jsonb) IS
  'Student submits quiz answers; auto-scores MCQ/TF/open; writes student_assignment_submissions + grades when counts_toward_grade.';

REVOKE ALL ON FUNCTION public.submit_student_quiz(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_student_quiz(uuid, jsonb) TO authenticated;
