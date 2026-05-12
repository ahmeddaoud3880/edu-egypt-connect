-- Allow parents (linked to students) to resolve class teachers for messaging UX,
-- and expose school leadership recipients without granting broad scope table reads.

-- Students this auth user may act for as a parent (matches app useMyChildren logic).
CREATE OR REPLACE FUNCTION public.parent_linked_student_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  pid text;
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  SELECT p.national_id INTO pid FROM public.profiles p WHERE p.id = uid;

  RETURN QUERY
  SELECT s.id
  FROM public.students s
  WHERE s.parent_user_id = uid
  UNION
  SELECT s.id
  FROM public.students s
  WHERE pid IS NOT NULL
    AND s.parent_national_id IS NOT NULL
    AND trim(both upper(s.parent_national_id)) = trim(both upper(pid))
  UNION
  SELECT s.id
  FROM public.students s
  CROSS JOIN LATERAL (
    SELECT rr.national_id AS rn, rr.parent_national_id AS rpn
    FROM public.registration_requests rr
    WHERE rr.user_id = uid
    ORDER BY rr.created_at DESC NULLS LAST
    LIMIT 1
  ) r
  WHERE s.parent_national_id IS NOT NULL
    AND (
      (r.rn IS NOT NULL AND trim(both upper(s.parent_national_id)) = trim(both upper(r.rn)))
      OR (r.rpn IS NOT NULL AND trim(both upper(s.parent_national_id)) = trim(both upper(r.rpn)))
    );
END;
$$;

REVOKE ALL ON FUNCTION public.parent_linked_student_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.parent_linked_student_ids() TO authenticated;

-- School accounts to notify for a school the parent is linked to (via at least one child).
CREATE OR REPLACE FUNCTION public.parent_school_message_recipients(p_school_id uuid)
RETURNS TABLE (recipient_user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT q.recipient_user_id, q.display_name
  FROM (
    SELECT usa.user_id AS recipient_user_id,
           COALESCE(pr.full_name_ar, pr.full_name, ''::text) AS display_name
    FROM public.user_scope_assignments usa
    JOIN public.profiles pr ON pr.id = usa.user_id
    WHERE usa.school_id = p_school_id
      AND (usa.is_active IS NOT DISTINCT FROM true)
      AND public.has_role(usa.user_id, 'school'::public.app_role)
    UNION ALL
    SELECT pr2.id AS recipient_user_id,
           COALESCE(pr2.full_name_ar, pr2.full_name, ''::text) AS display_name
    FROM public.profiles pr2
    WHERE pr2.school_id = p_school_id
      AND public.has_role(pr2.id, 'school'::public.app_role)
  ) q
  WHERE EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.school_id = p_school_id
      AND s.id IN (SELECT public.parent_linked_student_ids())
  );
$$;

REVOKE ALL ON FUNCTION public.parent_school_message_recipients(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.parent_school_message_recipients(uuid) TO authenticated;

-- Parents see teacher/class/subject assignments only for classes their children are enrolled in.
DROP POLICY IF EXISTS "Parent reads TCA for child's classes" ON public.teacher_class_assignments;
CREATE POLICY "Parent reads TCA for child's classes" ON public.teacher_class_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.class_id = teacher_class_assignments.class_id
        AND e.student_id IN (SELECT public.parent_linked_student_ids())
    )
  );
