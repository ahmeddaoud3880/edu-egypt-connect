-- 1. Students can read their own student row (needed for submission RLS nested check)
DROP POLICY IF EXISTS "Students read own student row" ON public.students;
CREATE POLICY "Students read own student row"
  ON public.students FOR SELECT
  USING (user_id = auth.uid());

-- 2. Parents can read enrollments of their linked children (via parent_linked_student_ids)
DROP POLICY IF EXISTS "Parent reads child enrollments" ON public.enrollments;
CREATE POLICY "Parent reads child enrollments"
  ON public.enrollments FOR SELECT
  USING (
    student_id IN (SELECT public.parent_linked_student_ids())
  );

-- 3. Parents can read assignments for their child's classes
DROP POLICY IF EXISTS "Parent reads child assignments" ON public.assignments;
CREATE POLICY "Parent reads child assignments"
  ON public.assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.class_id = assignments.class_id
        AND e.student_id IN (SELECT public.parent_linked_student_ids())
    )
  );

-- 4. Students can read their own submissions
DROP POLICY IF EXISTS "student reads own quiz submissions" ON public.student_assignment_submissions;
CREATE POLICY "student reads own quiz submissions"
  ON public.student_assignment_submissions FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- 5. submit_student_quiz: return existing score instead of throwing already_submitted
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
  v_submission_id uuid;
  v_existing jsonb;
  rec RECORD;
  student_ans text;
  correct_ans text;
  ok boolean;
BEGIN
  IF p_answers IS NULL THEN p_answers := '{}'::jsonb; END IF;

  SELECT s.id INTO v_student_id FROM public.students s WHERE s.user_id = auth.uid();
  IF v_student_id IS NULL THEN RAISE EXCEPTION 'not_a_student' USING ERRCODE = '42501'; END IF;

  SELECT a.quiz_id, a.class_id, a.subject_id, COALESCE(a.counts_toward_grade, true)
  INTO v_quiz_id, v_class_id, v_subject_id, v_counts_toward
  FROM public.assignments a WHERE a.id = p_assignment_id;

  v_academic_year := '2025-2026';

  IF v_quiz_id IS NULL THEN RAISE EXCEPTION 'assignment_has_no_quiz'; END IF;

  -- Return existing result if already submitted
  SELECT jsonb_build_object(
    'score', sas.score,
    'max_score', (SELECT NULLIF(SUM(COALESCE(qq.points,1)),0) FROM public.quiz_questions qq WHERE qq.quiz_id = v_quiz_id),
    'counts_toward_grade', v_counts_toward,
    'submission_id', sas.id,
    'already_submitted', true
  ) INTO v_existing
  FROM public.student_assignment_submissions sas
  WHERE sas.assignment_id = p_assignment_id AND sas.student_id = v_student_id
    AND sas.status IN ('submitted', 'graded')
  LIMIT 1;

  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments e WHERE e.student_id = v_student_id AND e.class_id = v_class_id
  ) THEN RAISE EXCEPTION 'not_enrolled_in_class'; END IF;

  FOR rec IN
    SELECT qq.id, qq.question_type, qq.answer, qq.points
    FROM public.quiz_questions qq WHERE qq.quiz_id = v_quiz_id
    ORDER BY qq.sort_order, qq.created_at
  LOOP
    v_max := v_max + COALESCE(rec.points, 1);
    student_ans := p_answers ->> rec.id::text;
    correct_ans := rec.answer;
    ok := false;
    IF rec.question_type = 'mcq' THEN ok := public.mcq_answer_equiv(student_ans, correct_ans);
    ELSIF rec.question_type = 'true_false' THEN ok := public.tf_answer_equiv(student_ans, correct_ans);
    END IF;
    IF ok THEN v_earned := v_earned + COALESCE(rec.points, 1); END IF;
  END LOOP;

  INSERT INTO public.student_assignment_submissions (
    assignment_id, student_id, score, submitted_at, status, answers_json
  ) VALUES (
    p_assignment_id, v_student_id, v_earned, now(), 'graded', p_answers
  )
  ON CONFLICT (assignment_id, student_id) DO UPDATE SET
    score = EXCLUDED.score, submitted_at = EXCLUDED.submitted_at,
    status = 'graded', answers_json = EXCLUDED.answers_json
  RETURNING id INTO v_submission_id;

  IF v_counts_toward THEN
    DELETE FROM public.grades g WHERE g.student_id = v_student_id AND g.assignment_id = p_assignment_id;
    INSERT INTO public.grades (student_id, class_id, subject_id, assignment_id, score, max_score, grade_type, academic_year, grade_date)
    VALUES (v_student_id, v_class_id, v_subject_id, p_assignment_id, v_earned, NULLIF(v_max, 0), 'quiz', v_academic_year, CURRENT_DATE);
  END IF;

  RETURN jsonb_build_object(
    'score', v_earned, 'max_score', NULLIF(v_max, 0),
    'counts_toward_grade', v_counts_toward, 'submission_id', v_submission_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_student_quiz(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_student_quiz(uuid, jsonb) TO authenticated;
