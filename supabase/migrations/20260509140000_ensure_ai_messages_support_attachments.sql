-- Ensures loadChatMessages can SELECT support_attachments (PostgREST fails if column missing).
ALTER TABLE public.ai_messages
  ADD COLUMN IF NOT EXISTS support_attachments jsonb;

COMMENT ON COLUMN public.ai_messages.support_attachments IS
  'Assistant UI payload JSON, e.g. { support_ui: { match_cards, clarification_question } }';
