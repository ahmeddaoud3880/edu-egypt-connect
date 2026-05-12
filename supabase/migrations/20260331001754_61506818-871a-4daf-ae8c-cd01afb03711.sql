
-- Function to activate a user when registration request status changes to 'activated'
CREATE OR REPLACE FUNCTION public.activate_user_from_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when status changes to 'activated'
  IF NEW.request_status = 'activated' AND OLD.request_status != 'activated' THEN
    -- Only proceed if user_id is set
    IF NEW.user_id IS NOT NULL THEN
      -- Insert or update user_roles
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.user_id, NEW.requested_role::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      -- Update profile with national_id if provided
      UPDATE public.profiles
      SET national_id = COALESCE(NEW.national_id, national_id),
          full_name = COALESCE(NULLIF(NEW.full_name, ''), full_name),
          full_name_ar = COALESCE(NULLIF(NEW.full_name_ar, ''), full_name_ar),
          phone = COALESCE(NEW.phone, phone)
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on registration_requests
CREATE TRIGGER on_registration_activated
  BEFORE UPDATE ON public.registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_user_from_request();

-- Allow ministry to read all roles (needed for governance)
CREATE POLICY "Ministry reads all roles"
  ON public.user_roles
  FOR SELECT
  USING (has_role(auth.uid(), 'ministry'::app_role));

-- Allow administration/directorate to read roles
CREATE POLICY "Admin roles read all roles"
  ON public.user_roles
  FOR SELECT
  USING (has_role(auth.uid(), 'administration'::app_role) OR has_role(auth.uid(), 'directorate'::app_role) OR has_role(auth.uid(), 'school'::app_role));
