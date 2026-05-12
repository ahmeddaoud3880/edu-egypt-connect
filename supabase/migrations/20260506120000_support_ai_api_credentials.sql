-- Stored AI provider credentials managed by support (multiple keys, one active for the agent)

CREATE TABLE public.support_ai_api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  api_key TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT support_ai_api_credentials_provider_allowed CHECK (
    provider IN ('agentrouter', 'openrouter', 'openai', 'groq', 'gemini', 'ollama')
  ),
  CONSTRAINT support_ai_api_credentials_key_non_empty CHECK (
    provider = 'ollama' OR length(trim(api_key)) > 0
  )
);

CREATE UNIQUE INDEX support_ai_api_credentials_one_active
  ON public.support_ai_api_credentials (is_active)
  WHERE is_active;

CREATE INDEX support_ai_api_credentials_created_at_idx
  ON public.support_ai_api_credentials (created_at DESC);

COMMENT ON TABLE public.support_ai_api_credentials IS 'Support-managed LLM API keys; agent uses the row where is_active = true';

CREATE TRIGGER support_ai_api_credentials_updated_at
  BEFORE UPDATE ON public.support_ai_api_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.support_ai_api_credentials_single_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active IS TRUE THEN
    UPDATE public.support_ai_api_credentials
    SET is_active = false
    WHERE id IS DISTINCT FROM NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER support_ai_api_credentials_enforce_single_active
  BEFORE INSERT OR UPDATE OF is_active ON public.support_ai_api_credentials
  FOR EACH ROW
  WHEN (NEW.is_active IS TRUE)
  EXECUTE FUNCTION public.support_ai_api_credentials_single_active();

ALTER TABLE public.support_ai_api_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Support full access support_ai_api_credentials"
  ON public.support_ai_api_credentials
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'support'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'support'::public.app_role));
