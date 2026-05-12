-- Let school leadership delete only classes that belong to their assigned school.
DROP POLICY IF EXISTS "School deletes own classes" ON public.classes;
CREATE POLICY "School deletes own classes" ON public.classes
  FOR DELETE
  USING (
    (
      public.has_role(auth.uid(), 'school'::public.app_role)
      AND school_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_scope_assignments usa
        WHERE usa.user_id = auth.uid()
          AND usa.is_active = true
          AND usa.role = 'school'
          AND usa.school_id = public.classes.school_id
      )
    )
    OR public.has_role(auth.uid(), 'support'::public.app_role)
    OR public.has_role(auth.uid(), 'administration'::public.app_role)
  );

-- Bulk-delete enrollments: school must act on classes in their school only.
DROP POLICY IF EXISTS "School clears enrollments for own classes" ON public.enrollments;
CREATE POLICY "School clears enrollments for own classes" ON public.enrollments
  FOR DELETE
  USING (
    (
      public.has_role(auth.uid(), 'school'::public.app_role)
      AND EXISTS (
        SELECT 1
        FROM public.classes c
        JOIN public.user_scope_assignments usa ON usa.school_id = c.school_id
        WHERE c.id = enrollments.class_id
          AND usa.user_id = auth.uid()
          AND usa.is_active = true
          AND usa.role = 'school'
      )
    )
    OR public.has_role(auth.uid(), 'support'::public.app_role)
    OR public.has_role(auth.uid(), 'administration'::public.app_role)
  );
