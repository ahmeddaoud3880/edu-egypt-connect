-- RLS policies for profile_change_requests
-- Allow users to insert their own requests
ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own profile change request" ON public.profile_change_requests;
CREATE POLICY "Users insert own profile change request"
  ON public.profile_change_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own requests
DROP POLICY IF EXISTS "Users read own profile change requests" ON public.profile_change_requests;
CREATE POLICY "Users read own profile change requests"
  ON public.profile_change_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Support role can read and update all requests
DROP POLICY IF EXISTS "Support reads all profile change requests" ON public.profile_change_requests;
CREATE POLICY "Support reads all profile change requests"
  ON public.profile_change_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'support'::public.app_role));

DROP POLICY IF EXISTS "Support updates profile change requests" ON public.profile_change_requests;
CREATE POLICY "Support updates profile change requests"
  ON public.profile_change_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'support'::public.app_role));

-- School role can read/update requests from users in their school
DROP POLICY IF EXISTS "School reads school profile change requests" ON public.profile_change_requests;
CREATE POLICY "School reads school profile change requests"
  ON public.profile_change_requests FOR SELECT
  USING (
    public.has_role(auth.uid(), 'school'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.profiles requester_profile
      JOIN public.profiles school_admin ON school_admin.id = auth.uid()
      WHERE requester_profile.id = profile_change_requests.user_id
        AND requester_profile.school_id = school_admin.school_id
        AND school_admin.school_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "School updates school profile change requests" ON public.profile_change_requests;
CREATE POLICY "School updates school profile change requests"
  ON public.profile_change_requests FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'school'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.profiles requester_profile
      JOIN public.profiles school_admin ON school_admin.id = auth.uid()
      WHERE requester_profile.id = profile_change_requests.user_id
        AND requester_profile.school_id = school_admin.school_id
        AND school_admin.school_id IS NOT NULL
    )
  );

-- Ministry and directorate can also read all
DROP POLICY IF EXISTS "Ministry reads all profile change requests" ON public.profile_change_requests;
CREATE POLICY "Ministry reads all profile change requests"
  ON public.profile_change_requests FOR SELECT
  USING (
    public.has_role(auth.uid(), 'ministry'::public.app_role)
    OR public.has_role(auth.uid(), 'directorate'::public.app_role)
    OR public.has_role(auth.uid(), 'administration'::public.app_role)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- RLS for user_activity_logs
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own activity log" ON public.user_activity_logs;
CREATE POLICY "Users insert own activity log"
  ON public.user_activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own activity log" ON public.user_activity_logs;
CREATE POLICY "Users read own activity log"
  ON public.user_activity_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Support reads all activity logs" ON public.user_activity_logs;
CREATE POLICY "Support reads all activity logs"
  ON public.user_activity_logs FOR SELECT
  USING (
    public.has_role(auth.uid(), 'support'::public.app_role)
    OR public.has_role(auth.uid(), 'ministry'::public.app_role)
  );
