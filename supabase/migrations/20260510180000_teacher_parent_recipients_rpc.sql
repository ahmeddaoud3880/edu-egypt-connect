-- Teachers teaching a class can resolve parent user_ids for notification recipients
-- (no manual UUID). SECURITY DEFINER with class+assignment guard.

CREATE OR REPLACE FUNCTION public.teacher_parent_recipients_for_class(p_class_id uuid)
RETURNS TABLE (
  recipient_user_id uuid,
  parent_display_name text,
  student_id uuid,
  student_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id AS recipient_user_id,
    COALESCE(
      NULLIF(trim(both from COALESCE(p.full_name_ar, p.full_name, '')), ''),
      '?'
    )::text AS parent_display_name,
    s.id AS student_id,
    COALESCE(NULLIF(trim(both from s.full_name), ''), s.id::text)::text AS student_name
  FROM public.enrollments e
  JOIN public.students s ON s.id = e.student_id
  JOIN public.profiles p
    ON s.parent_national_id IS NOT NULL
    AND p.national_id IS NOT NULL
    AND trim(both upper(p.national_id)) = trim(both upper(s.parent_national_id))
  WHERE e.class_id = p_class_id
    AND EXISTS (
      SELECT 1
      FROM public.teacher_class_assignments tca
      JOIN public.teachers t ON t.id = tca.teacher_id
      WHERE tca.class_id = p_class_id
        AND t.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.teacher_parent_recipients_for_class(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_parent_recipients_for_class(uuid) TO authenticated;
