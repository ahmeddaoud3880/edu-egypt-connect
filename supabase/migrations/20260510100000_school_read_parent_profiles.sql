-- School leadership can read parent profiles when linked to a student via parent_national_id.
-- Uses a SECURITY DEFINER function to avoid infinite recursion between
-- profiles <-> students RLS policies.

CREATE OR REPLACE FUNCTION public.school_user_can_read_parent_profile(profile_national_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM students s
    JOIN user_scope_assignments usa
      ON usa.user_id = auth.uid()
      AND COALESCE(usa.is_active, true) = true
      AND usa.role = 'school'
      AND usa.school_id = s.school_id
    WHERE s.parent_national_id IS NOT NULL
      AND trim(both from upper(s.parent_national_id)) = trim(both from upper(profile_national_id))
  )
$$;

DROP POLICY IF EXISTS "School reads parent profiles for school students" ON public.profiles;
CREATE POLICY "School reads parent profiles for school students" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'school'::public.app_role)
    AND national_id IS NOT NULL
    AND public.school_user_can_read_parent_profile(national_id)
  );
