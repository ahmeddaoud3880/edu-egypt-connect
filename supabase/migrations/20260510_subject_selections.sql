-- ==========================================
-- Migration: Subject selections & change requests
-- ==========================================

-- Student subject selections: tracks which optional subjects a student has chosen
CREATE TABLE IF NOT EXISTS public.student_subject_selections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id  UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      TEXT NOT NULL DEFAULT 'active',
  -- 'active' | 'pending' | 'rejected'
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_student_subject_selections_student
  ON public.student_subject_selections(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subject_selections_subject
  ON public.student_subject_selections(subject_id);

ALTER TABLE public.student_subject_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student sees own selections" ON public.student_subject_selections;
CREATE POLICY "student sees own selections" ON public.student_subject_selections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "student inserts own selection" ON public.student_subject_selections;
CREATE POLICY "student inserts own selection" ON public.student_subject_selections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "school admin manages selections" ON public.student_subject_selections;
CREATE POLICY "school admin manages selections" ON public.student_subject_selections
  FOR ALL USING (public.has_role(auth.uid(), 'school'))
  WITH CHECK (public.has_role(auth.uid(), 'school'));

DROP POLICY IF EXISTS "support manages selections" ON public.student_subject_selections;
CREATE POLICY "support manages selections" ON public.student_subject_selections
  FOR ALL USING (public.has_role(auth.uid(), 'support'))
  WITH CHECK (public.has_role(auth.uid(), 'support'));

-- Subject change requests: student requests to change an optional subject selection
CREATE TABLE IF NOT EXISTS public.subject_change_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  old_subject_id      UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  new_subject_id      UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  requested_by        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'support_approved' | 'school_approved' | 'approved' | 'rejected'
  support_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  school_approved_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes               TEXT,
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subject_change_requests_student
  ON public.subject_change_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_subject_change_requests_status
  ON public.subject_change_requests(status);

ALTER TABLE public.subject_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student sees own change requests" ON public.subject_change_requests;
CREATE POLICY "student sees own change requests" ON public.subject_change_requests
  FOR SELECT USING (
    auth.uid() = requested_by
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "student submits change request" ON public.subject_change_requests;
CREATE POLICY "student submits change request" ON public.subject_change_requests
  FOR INSERT WITH CHECK (auth.uid() = requested_by);

DROP POLICY IF EXISTS "school admin manages change requests" ON public.subject_change_requests;
CREATE POLICY "school admin manages change requests" ON public.subject_change_requests
  FOR ALL USING (public.has_role(auth.uid(), 'school'))
  WITH CHECK (public.has_role(auth.uid(), 'school'));

DROP POLICY IF EXISTS "support manages change requests" ON public.subject_change_requests;
CREATE POLICY "support manages change requests" ON public.subject_change_requests
  FOR ALL USING (public.has_role(auth.uid(), 'support'))
  WITH CHECK (public.has_role(auth.uid(), 'support'));
