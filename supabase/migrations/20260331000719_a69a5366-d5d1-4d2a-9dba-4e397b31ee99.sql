
-- Registration requests table
CREATE TABLE public.registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  full_name_ar text NOT NULL DEFAULT '',
  email text NOT NULL,
  phone text,
  national_id text,
  requested_role text NOT NULL,
  governorate_id uuid REFERENCES public.governorates(id),
  administration_id uuid REFERENCES public.administrations(id),
  school_id uuid REFERENCES public.schools(id),
  request_status text NOT NULL DEFAULT 'submitted',
  notes text,
  rejection_reason text,
  supporting_docs_placeholder text,
  approved_by uuid,
  approved_at timestamptz,
  escalation_target text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Role change requests table
CREATE TABLE public.role_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_role text NOT NULL,
  requested_role text NOT NULL,
  scope_governorate_id uuid REFERENCES public.governorates(id),
  scope_administration_id uuid REFERENCES public.administrations(id),
  scope_school_id uuid REFERENCES public.schools(id),
  reason text,
  request_status text NOT NULL DEFAULT 'submitted',
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Transfer requests table
CREATE TABLE public.transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type text NOT NULL, -- 'student', 'teacher', 'staff', 'principal'
  entity_id uuid NOT NULL,
  current_school_id uuid REFERENCES public.schools(id),
  target_school_id uuid REFERENCES public.schools(id),
  current_administration_id uuid REFERENCES public.administrations(id),
  target_administration_id uuid REFERENCES public.administrations(id),
  reason text,
  request_status text NOT NULL DEFAULT 'submitted',
  current_scope_approved boolean DEFAULT false,
  target_scope_approved boolean DEFAULT false,
  higher_level_approved boolean DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Parent-child link requests table
CREATE TABLE public.parent_child_link_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL,
  parent_name text NOT NULL,
  parent_national_id text,
  child_name text NOT NULL,
  child_student_code text,
  child_school_id uuid REFERENCES public.schools(id),
  relation_type text NOT NULL DEFAULT 'parent',
  verification_status text NOT NULL DEFAULT 'pending',
  request_status text NOT NULL DEFAULT 'submitted',
  review_notes text,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Approval actions / audit trail table
CREATE TABLE public.approval_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL, -- 'registration', 'role_change', 'transfer', 'parent_child_link'
  request_id uuid NOT NULL,
  action_type text NOT NULL, -- 'approve', 'reject', 'return', 'escalate', 'reassign', 'suspend', 'activate'
  performed_by uuid NOT NULL,
  performer_role text,
  performer_name text,
  old_status text,
  new_status text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_child_link_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;

-- RLS policies for registration_requests
CREATE POLICY "Users read own registration" ON public.registration_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Ministry reads all registrations" ON public.registration_requests FOR SELECT USING (has_role(auth.uid(), 'ministry'));
CREATE POLICY "Support reads all registrations" ON public.registration_requests FOR SELECT USING (has_role(auth.uid(), 'support'));
CREATE POLICY "School reads school registrations" ON public.registration_requests FOR SELECT USING (has_role(auth.uid(), 'school'));
CREATE POLICY "Administration reads admin registrations" ON public.registration_requests FOR SELECT USING (has_role(auth.uid(), 'administration'));
CREATE POLICY "Directorate reads directorate registrations" ON public.registration_requests FOR SELECT USING (has_role(auth.uid(), 'directorate'));
CREATE POLICY "Anyone can insert registration" ON public.registration_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Approvers update registrations" ON public.registration_requests FOR UPDATE USING (
  has_role(auth.uid(), 'ministry') OR has_role(auth.uid(), 'directorate') OR has_role(auth.uid(), 'administration') OR has_role(auth.uid(), 'school') OR has_role(auth.uid(), 'support')
);

-- RLS policies for role_change_requests
CREATE POLICY "Users read own role changes" ON public.role_change_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Higher roles read role changes" ON public.role_change_requests FOR SELECT USING (
  has_role(auth.uid(), 'ministry') OR has_role(auth.uid(), 'directorate') OR has_role(auth.uid(), 'administration') OR has_role(auth.uid(), 'school') OR has_role(auth.uid(), 'support')
);
CREATE POLICY "Auth users insert role changes" ON public.role_change_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Approvers update role changes" ON public.role_change_requests FOR UPDATE USING (
  has_role(auth.uid(), 'ministry') OR has_role(auth.uid(), 'directorate') OR has_role(auth.uid(), 'administration') OR has_role(auth.uid(), 'school') OR has_role(auth.uid(), 'support')
);

-- RLS policies for transfer_requests
CREATE POLICY "Users read own transfers" ON public.transfer_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Higher roles read transfers" ON public.transfer_requests FOR SELECT USING (
  has_role(auth.uid(), 'ministry') OR has_role(auth.uid(), 'directorate') OR has_role(auth.uid(), 'administration') OR has_role(auth.uid(), 'school') OR has_role(auth.uid(), 'support')
);
CREATE POLICY "Auth users insert transfers" ON public.transfer_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Approvers update transfers" ON public.transfer_requests FOR UPDATE USING (
  has_role(auth.uid(), 'ministry') OR has_role(auth.uid(), 'directorate') OR has_role(auth.uid(), 'administration') OR has_role(auth.uid(), 'school') OR has_role(auth.uid(), 'support')
);

-- RLS policies for parent_child_link_requests
CREATE POLICY "Users read own link requests" ON public.parent_child_link_requests FOR SELECT USING (auth.uid() = parent_user_id);
CREATE POLICY "School reads link requests" ON public.parent_child_link_requests FOR SELECT USING (
  has_role(auth.uid(), 'school') OR has_role(auth.uid(), 'administration') OR has_role(auth.uid(), 'ministry') OR has_role(auth.uid(), 'support')
);
CREATE POLICY "Parents insert link requests" ON public.parent_child_link_requests FOR INSERT WITH CHECK (auth.uid() = parent_user_id);
CREATE POLICY "Approvers update link requests" ON public.parent_child_link_requests FOR UPDATE USING (
  has_role(auth.uid(), 'school') OR has_role(auth.uid(), 'administration') OR has_role(auth.uid(), 'ministry') OR has_role(auth.uid(), 'support')
);

-- RLS policies for approval_actions
CREATE POLICY "Higher roles read actions" ON public.approval_actions FOR SELECT USING (
  auth.uid() = performed_by OR has_role(auth.uid(), 'ministry') OR has_role(auth.uid(), 'directorate') OR has_role(auth.uid(), 'administration') OR has_role(auth.uid(), 'school') OR has_role(auth.uid(), 'support')
);
CREATE POLICY "Approvers insert actions" ON public.approval_actions FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'ministry') OR has_role(auth.uid(), 'directorate') OR has_role(auth.uid(), 'administration') OR has_role(auth.uid(), 'school') OR has_role(auth.uid(), 'support')
);

-- Triggers for updated_at
CREATE TRIGGER update_registration_requests_updated_at BEFORE UPDATE ON public.registration_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_role_change_requests_updated_at BEFORE UPDATE ON public.role_change_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transfer_requests_updated_at BEFORE UPDATE ON public.transfer_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parent_child_link_requests_updated_at BEFORE UPDATE ON public.parent_child_link_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
