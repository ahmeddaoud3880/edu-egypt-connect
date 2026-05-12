
-- 1. user_scope_assignments table
CREATE TABLE public.user_scope_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  governorate_id uuid REFERENCES public.governorates(id),
  administration_id uuid REFERENCES public.administrations(id),
  school_id uuid REFERENCES public.schools(id),
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_scope_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own scope" ON public.user_scope_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Higher roles read scopes" ON public.user_scope_assignments FOR SELECT USING (
  has_role(auth.uid(), 'ministry'::app_role) OR has_role(auth.uid(), 'directorate'::app_role) OR has_role(auth.uid(), 'administration'::app_role) OR has_role(auth.uid(), 'school'::app_role) OR has_role(auth.uid(), 'support'::app_role)
);
CREATE POLICY "Approvers insert scopes" ON public.user_scope_assignments FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'ministry'::app_role) OR has_role(auth.uid(), 'directorate'::app_role) OR has_role(auth.uid(), 'administration'::app_role) OR has_role(auth.uid(), 'school'::app_role) OR has_role(auth.uid(), 'support'::app_role)
);
CREATE POLICY "Approvers update scopes" ON public.user_scope_assignments FOR UPDATE USING (
  has_role(auth.uid(), 'ministry'::app_role) OR has_role(auth.uid(), 'directorate'::app_role) OR has_role(auth.uid(), 'administration'::app_role) OR has_role(auth.uid(), 'school'::app_role) OR has_role(auth.uid(), 'support'::app_role)
);

-- 2. request_status_history table
CREATE TABLE public.request_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL,
  request_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  note text
);

ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Higher roles read status history" ON public.request_status_history FOR SELECT USING (
  has_role(auth.uid(), 'ministry'::app_role) OR has_role(auth.uid(), 'directorate'::app_role) OR has_role(auth.uid(), 'administration'::app_role) OR has_role(auth.uid(), 'school'::app_role) OR has_role(auth.uid(), 'support'::app_role)
);
CREATE POLICY "Approvers insert status history" ON public.request_status_history FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'ministry'::app_role) OR has_role(auth.uid(), 'directorate'::app_role) OR has_role(auth.uid(), 'administration'::app_role) OR has_role(auth.uid(), 'school'::app_role) OR has_role(auth.uid(), 'support'::app_role)
);

-- 3. demo_config table for demo data toggle
CREATE TABLE public.demo_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.demo_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads demo config" ON public.demo_config FOR SELECT USING (true);
CREATE POLICY "Ministry updates demo config" ON public.demo_config FOR UPDATE USING (
  has_role(auth.uid(), 'ministry'::app_role) OR has_role(auth.uid(), 'support'::app_role)
);
CREATE POLICY "Ministry inserts demo config" ON public.demo_config FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'ministry'::app_role) OR has_role(auth.uid(), 'support'::app_role)
);

-- 4. Add is_demo flag to registration_requests
ALTER TABLE public.registration_requests ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- 5. Add supporting_docs_url to registration_requests
ALTER TABLE public.registration_requests ADD COLUMN IF NOT EXISTS supporting_docs_url text;

-- 6. Add supporting_docs_url to transfer_requests
ALTER TABLE public.transfer_requests ADD COLUMN IF NOT EXISTS supporting_docs_url text;

-- 7. Add supporting_docs_url to parent_child_link_requests
ALTER TABLE public.parent_child_link_requests ADD COLUMN IF NOT EXISTS supporting_docs_url text;

-- 8. Storage bucket for governance documents
INSERT INTO storage.buckets (id, name, public) VALUES ('governance-docs', 'governance-docs', false);

CREATE POLICY "Authenticated users upload governance docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'governance-docs');
CREATE POLICY "Authenticated users read governance docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'governance-docs');

-- 9. Update activate_user_from_request to also insert scope assignment
CREATE OR REPLACE FUNCTION public.activate_user_from_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.request_status = 'activated' AND OLD.request_status != 'activated' THEN
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.user_id, NEW.requested_role::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      UPDATE public.profiles
      SET national_id = COALESCE(NEW.national_id, national_id),
          full_name = COALESCE(NULLIF(NEW.full_name, ''), full_name),
          full_name_ar = COALESCE(NULLIF(NEW.full_name_ar, ''), full_name_ar),
          phone = COALESCE(NEW.phone, phone)
      WHERE user_id = NEW.user_id;

      INSERT INTO public.user_scope_assignments (user_id, role, governorate_id, administration_id, school_id, assigned_by, notes)
      VALUES (
        NEW.user_id,
        NEW.requested_role,
        NEW.governorate_id,
        NEW.administration_id,
        NEW.school_id,
        NEW.approved_by,
        'Auto-assigned on activation'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 10. Create trigger if not exists
DROP TRIGGER IF EXISTS on_registration_activated ON public.registration_requests;
CREATE TRIGGER on_registration_activated
  BEFORE UPDATE ON public.registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_user_from_request();

-- 11. Insert default demo config
INSERT INTO public.demo_config (key, value) VALUES ('show_demo_data', 'true') ON CONFLICT (key) DO NOTHING;
