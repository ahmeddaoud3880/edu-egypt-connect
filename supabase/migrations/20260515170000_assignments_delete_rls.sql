-- Allow deleting class assignments (CASCADE clears submissions); teachers only for taught class/subject overlap.

DROP POLICY IF EXISTS "teacher deletes assignments in taught classes" ON public.assignments;
CREATE POLICY "teacher deletes assignments in taught classes"
  ON public.assignments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teacher_class_assignments tca
      JOIN public.teachers tt ON tt.id = tca.teacher_id AND tt.user_id = auth.uid()
      WHERE tca.class_id = assignments.class_id
        AND (
          assignments.subject_id IS NULL
          OR tca.subject_id IS NULL
          OR tca.subject_id = assignments.subject_id
        )
    )
  );

DROP POLICY IF EXISTS "support ministry directorate delete assignments" ON public.assignments;
CREATE POLICY "support ministry directorate delete assignments"
  ON public.assignments FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'support'::public.app_role)
    OR public.has_role(auth.uid(), 'ministry'::public.app_role)
    OR public.has_role(auth.uid(), 'directorate'::public.app_role)
  );

DROP POLICY IF EXISTS "school deletes assignments own school classes" ON public.assignments;
CREATE POLICY "school deletes assignments own school classes"
  ON public.assignments FOR DELETE TO authenticated
  USING (
    (
      public.has_role(auth.uid(), 'school'::public.app_role)
      OR public.has_role(auth.uid(), 'administration'::public.app_role)
    )
    AND EXISTS (
      SELECT 1
      FROM public.classes c
      JOIN public.user_scope_assignments usa
        ON usa.user_id = auth.uid()
        AND usa.school_id = c.school_id
        AND COALESCE(usa.is_active, true)
      WHERE c.id = assignments.class_id
        AND usa.role IN ('school', 'administration')
    )
  );
