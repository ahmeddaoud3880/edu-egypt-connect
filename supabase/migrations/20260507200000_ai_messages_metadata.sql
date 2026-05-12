-- Structured UI data for AI messages (e.g. support search match cards), separate from `content` text

ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS support_attachments jsonb;

COMMENT ON COLUMN public.ai_messages.support_attachments IS
  'Optional JSON: UI payloads bundled with the message (e.g. { "support_ui": { "match_cards": [...] } })';
