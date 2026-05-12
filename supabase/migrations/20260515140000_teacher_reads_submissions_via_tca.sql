-- Teachers often lack access to learner rows when embedding ``students()`` on submissions,
-- or ``has_role(..., 'teacher')`` may not mirror every ``teachers.user_id``.
-- Scoped policies via teacher_class_assignments unblock the grade inspector UI.

DROP POLICY IF EXISTS "teacher reads submissions taught class assignments" ON public.student_assignment_submissions;
CREATE POLICY "teacher reads submissions taught class assignments"
  ON public.student_assignment_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.assignments a
      JOIN public.teacher_class_assignments tca ON tca.class_id = a.class_id
      JOIN public.teachers tt ON tt.id = tca.teacher_id AND tt.user_id = auth.uid()
      WHERE a.id = student_assignment_submissions.assignment_id
    )
  );

DROP POLICY IF EXISTS "teacher updates submissions taught class assignments" ON public.student_assignment_submissions;
CREATE POLICY "teacher updates submissions taught class assignments"
  ON public.student_assignment_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.assignments a
      JOIN public.teacher_class_assignments tca ON tca.class_id = a.class_id
      JOIN public.teachers tt ON tt.id = tca.teacher_id AND tt.user_id = auth.uid()
      WHERE a.id = student_assignment_submissions.assignment_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.assignments a
      JOIN public.teacher_class_assignments tca ON tca.class_id = a.class_id
      JOIN public.teachers tt ON tt.id = tca.teacher_id AND tt.user_id = auth.uid()
      WHERE a.id = student_assignment_submissions.assignment_id
    )
  );

DROP POLICY IF EXISTS "teacher reads students in taught enrollments" ON public.students;
CREATE POLICY "teacher reads students in taught enrollments"
  ON public.students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.teacher_class_assignments tca ON tca.class_id = e.class_id
      JOIN public.teachers tt ON tt.id = tca.teacher_id AND tt.user_id = auth.uid()
      WHERE e.student_id = students.id
    )
  );
