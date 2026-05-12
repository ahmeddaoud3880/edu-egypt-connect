-- Fix school dashboard: user_scope + profile school_id, RLS for staff seeding,
-- correct activation trigger (profiles.id, not profiles.user_id), backfill helper.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name_ar TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

DROP POLICY IF EXISTS "Staff manage students" ON public.students;
CREATE POLICY "Staff manage students" ON public.students
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'support'::public.app_role) OR
    public.has_role(auth.uid(), 'school'::public.app_role) OR
    public.has_role(auth.uid(), 'administration'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'support'::public.app_role) OR
    public.has_role(auth.uid(), 'school'::public.app_role) OR
    public.has_role(auth.uid(), 'administration'::public.app_role)
  );

DROP POLICY IF EXISTS "Staff manage teachers" ON public.teachers;
CREATE POLICY "Staff manage teachers" ON public.teachers
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'support'::public.app_role) OR
    public.has_role(auth.uid(), 'school'::public.app_role) OR
    public.has_role(auth.uid(), 'administration'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'support'::public.app_role) OR
    public.has_role(auth.uid(), 'school'::public.app_role) OR
    public.has_role(auth.uid(), 'administration'::public.app_role)
  );

DROP POLICY IF EXISTS "Staff manage student_profiles" ON public.student_profiles;
CREATE POLICY "Staff manage student_profiles" ON public.student_profiles
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'support'::public.app_role) OR
    public.has_role(auth.uid(), 'school'::public.app_role) OR
    public.has_role(auth.uid(), 'administration'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'support'::public.app_role) OR
    public.has_role(auth.uid(), 'school'::public.app_role) OR
    public.has_role(auth.uid(), 'administration'::public.app_role)
  );

CREATE UNIQUE INDEX IF NOT EXISTS user_scope_assignments_user_id_role_key
  ON public.user_scope_assignments (user_id, role);

CREATE OR REPLACE FUNCTION public.activate_user_from_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.request_status = 'activated' AND OLD.request_status IS DISTINCT FROM 'activated' THEN
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.user_id, NEW.requested_role::public.app_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      UPDATE public.profiles SET
        national_id = COALESCE(NEW.national_id, national_id),
        full_name = COALESCE(NULLIF(TRIM(NEW.full_name), ''), full_name),
        full_name_ar = COALESCE(NULLIF(TRIM(NEW.full_name_ar), ''), full_name_ar),
        phone = COALESCE(NEW.phone, phone),
        school_id = COALESCE(NEW.school_id, school_id),
        governorate_id = COALESCE(NEW.governorate_id, governorate_id)
      WHERE id = NEW.user_id;

      INSERT INTO public.user_scope_assignments
        (user_id, role, governorate_id, administration_id, school_id, assigned_by, notes, is_active)
      VALUES (
        NEW.user_id, NEW.requested_role,
        NEW.governorate_id, NEW.administration_id, NEW.school_id,
        NEW.approved_by, 'Auto-assigned on activation', true
      )
      ON CONFLICT (user_id, role) DO UPDATE SET
        governorate_id = EXCLUDED.governorate_id,
        administration_id = EXCLUDED.administration_id,
        school_id = EXCLUDED.school_id,
        assigned_by = EXCLUDED.assigned_by,
        notes = EXCLUDED.notes,
        is_active = true,
        updated_at = now();

      IF NEW.requested_role = 'student' THEN
        INSERT INTO public.student_profiles
          (user_id, full_name, full_name_ar, national_id, grade_number, stage_id, school_id, academic_year)
        VALUES (
          NEW.user_id, NEW.full_name, NEW.full_name_ar, NEW.national_id,
          NEW.grade_number, NEW.stage_id, NEW.school_id, '2025-2026'
        )
        ON CONFLICT (user_id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          full_name_ar = EXCLUDED.full_name_ar,
          national_id = EXCLUDED.national_id,
          grade_number = EXCLUDED.grade_number,
          stage_id = EXCLUDED.stage_id,
          school_id = EXCLUDED.school_id,
          updated_at = now();

        UPDATE public.students SET
          user_id = NEW.user_id,
          grade_number = NEW.grade_number,
          stage_id = NEW.stage_id,
          national_id = NEW.national_id,
          parent_national_id = NEW.parent_national_id,
          school_id = COALESCE(NEW.school_id, school_id)
        WHERE user_id = NEW.user_id;

        IF NOT FOUND THEN
          INSERT INTO public.students (user_id, full_name, national_id, parent_national_id, school_id, grade_number, stage_id)
          VALUES (NEW.user_id, NEW.full_name, NEW.national_id, NEW.parent_national_id, NEW.school_id, NEW.grade_number, NEW.stage_id);
        END IF;
      ELSIF NEW.requested_role = 'teacher' THEN
        INSERT INTO public.teachers (user_id, full_name, school_id, national_id)
        SELECT NEW.user_id, NEW.full_name, NEW.school_id, NEW.national_id
        WHERE NOT EXISTS (SELECT 1 FROM public.teachers t WHERE t.user_id = NEW.user_id);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
