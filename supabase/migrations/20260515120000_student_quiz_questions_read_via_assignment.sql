-- Students need read access to quiz question *points* to compute totals for their own grade views,
-- including quizzes surfaced only through assignments (``quizzes.assigned`` may be false).

DROP POLICY IF EXISTS "student reads quiz question points via assignment" ON public.quiz_questions;
CREATE POLICY "student reads quiz question points via assignment"
  ON public.quiz_questions FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.assignments a
      JOIN public.enrollments e ON e.class_id = a.class_id AND e.student_id IN (
        SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
      )
      WHERE a.quiz_id = quiz_questions.quiz_id
    )
  );
