-- Student quiz submit: auto-score + student_assignments + optional grades row
-- (Students cannot INSERT into grades under normal RLS; RPC runs as definer.)

ALTER TABLE public.student_assignments
  ADD COLUMN IF NOT EXISTS answers_json JSONB;

CREATE OR REPLACE FUNCTION public.mcq_answer_equiv(student text, correct text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT upper(trim(both from coalesce(student, ''))) = upper(trim(both from coalesce(correct, '')));
$$;

CREATE OR REPLACE FUNCTION public.tf_answer_equiv(student text, correct text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH sn AS (
    SELECT CASE
      WHEN lower(trim(both from coalesce(student, ''))) IN ('true','t','1','yes','y','صواب','صح','نعم') THEN 'T'
      WHEN lower(trim(both from coalesce(student, ''))) IN ('false','f','0','no','n','خطأ','غلط','لا') THEN 'F'
      ELSE upper(trim(both from coalesce(student, '')))
    END AS v
  ),
  cn AS (
    SELECT CASE
      WHEN lower(trim(both from coalesce(correct, ''))) IN ('true','t','1','yes','y','صواب','صح','نعم') THEN 'T'
      WHEN lower(trim(both from coalesce(correct, ''))) IN ('false','f','0','no','n','خطأ','غلط','لا') THEN 'F'
      ELSE upper(trim(both from coalesce(correct, '')))
    END AS v
  )
  SELECT (SELECT v FROM sn) = (SELECT v FROM cn)
    AND coalesce((SELECT v FROM sn), '') <> '';
$$;

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
    SELECT 1 FROM public.student_assignments sa
    WHERE sa.assignment_id = p_assignment_id
      AND sa.student_id = v_student_id
      AND sa.status IN ('submitted', 'graded')
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

  INSERT INTO public.student_assignments (
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
  'Student submits quiz answers; auto-scores MCQ/TF/open (open only if answer key set); writes student_assignments + grades when counts_toward_grade.';

REVOKE ALL ON FUNCTION public.submit_student_quiz(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_student_quiz(uuid, jsonb) TO authenticated;
