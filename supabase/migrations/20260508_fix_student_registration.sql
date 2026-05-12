-- ==========================================
-- Migration: Fix student registration schema
-- Adds grade_number to registration_requests and students,
-- fixes students table columns, enhances activation trigger
-- to also populate student_profiles.
-- ==========================================

-- 1. Add grade_number to registration_requests
ALTER TABLE public.registration_requests
  ADD COLUMN IF NOT EXISTS grade_number INTEGER;

-- 2. Fix students table — add missing columns
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS grade_number INTEGER,
  ADD COLUMN IF NOT EXISTS national_id TEXT,
  ADD COLUMN IF NOT EXISTS parent_national_id TEXT;

-- 3. student_profiles table (if not already created via a previous migration)
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  full_name_ar TEXT,
  national_id TEXT,
  grade_number INTEGER,
  stage_id UUID REFERENCES public.stages(id) ON DELETE SET NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  academic_year TEXT DEFAULT '2025-2026',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student reads own profile" ON public.student_profiles;
CREATE POLICY "student reads own profile" ON public.student_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "support reads all student_profiles" ON public.student_profiles;
CREATE POLICY "support reads all student_profiles" ON public.student_profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'support'));

DROP POLICY IF EXISTS "school reads school student_profiles" ON public.student_profiles;
CREATE POLICY "school reads school student_profiles" ON public.student_profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'school'));

DROP POLICY IF EXISTS "teacher reads student_profiles" ON public.student_profiles;
CREATE POLICY "teacher reads student_profiles" ON public.student_profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'teacher'));

DROP POLICY IF EXISTS "ministry reads student_profiles" ON public.student_profiles;
CREATE POLICY "ministry reads student_profiles" ON public.student_profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'ministry'));

-- Service role can manage all
DROP POLICY IF EXISTS "service manages student_profiles" ON public.student_profiles;
CREATE POLICY "service manages student_profiles" ON public.student_profiles
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Replace activation trigger to also create student_profiles
CREATE OR REPLACE FUNCTION public.activate_user_from_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.request_status = 'activated' AND OLD.request_status != 'activated' THEN
    IF NEW.user_id IS NOT NULL THEN
      -- Assign role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.user_id, NEW.requested_role::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      -- Update profile
      UPDATE public.profiles
      SET national_id = COALESCE(NEW.national_id, national_id),
          full_name   = COALESCE(NULLIF(NEW.full_name, ''), full_name),
          full_name_ar = COALESCE(NULLIF(NEW.full_name_ar, ''), full_name_ar),
          phone        = COALESCE(NEW.phone, phone)
      WHERE user_id = NEW.user_id;

      -- Scope assignment
      INSERT INTO public.user_scope_assignments
        (user_id, role, governorate_id, administration_id, school_id, assigned_by, notes)
      VALUES (
        NEW.user_id, NEW.requested_role,
        NEW.governorate_id, NEW.administration_id, NEW.school_id,
        NEW.approved_by, 'Auto-assigned on activation'
      )
      ON CONFLICT DO NOTHING;

      -- If student: create student_profiles entry
      IF NEW.requested_role = 'student' THEN
        INSERT INTO public.student_profiles
          (user_id, full_name, full_name_ar, national_id, grade_number, stage_id, school_id, academic_year)
        VALUES (
          NEW.user_id,
          NEW.full_name,
          NEW.full_name_ar,
          NEW.national_id,
          NEW.grade_number,
          NEW.stage_id,
          NEW.school_id,
          '2025-2026'
        )
        ON CONFLICT (user_id) DO UPDATE SET
          full_name    = EXCLUDED.full_name,
          full_name_ar = EXCLUDED.full_name_ar,
          national_id  = EXCLUDED.national_id,
          grade_number = EXCLUDED.grade_number,
          stage_id     = EXCLUDED.stage_id,
          school_id    = EXCLUDED.school_id,
          updated_at   = now();

        -- Also update students table if record exists by user_id
        UPDATE public.students SET
          user_id    = NEW.user_id,
          grade_number = NEW.grade_number,
          stage_id   = NEW.stage_id,
          national_id = NEW.national_id,
          parent_national_id = NEW.parent_national_id
        WHERE user_id = NEW.user_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Re-create trigger (it may already exist from previous migrations)
DROP TRIGGER IF EXISTS on_registration_activated ON public.registration_requests;
CREATE TRIGGER on_registration_activated
  BEFORE UPDATE ON public.registration_requests
  FOR EACH ROW EXECUTE FUNCTION public.activate_user_from_request();

-- Unique constraint on student_profiles.user_id (safe to add)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_profiles_user_id_key'
  ) THEN
    ALTER TABLE public.student_profiles ADD CONSTRAINT student_profiles_user_id_key UNIQUE (user_id);
  END IF;
END$$;
