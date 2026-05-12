-- Scope support assistant threads; optional provider/model on messages

ALTER TABLE public.ai_chats ADD COLUMN IF NOT EXISTS assistant_scope text NOT NULL DEFAULT 'general';
COMMENT ON COLUMN public.ai_chats.assistant_scope IS 'Which assistant UI owns this thread, e.g. support, student';

ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS model text;
