-- Migrate legacy `metadata` jsonb (if present) into `support_attachments`, then remove `metadata`.

ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS support_attachments jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_messages'
      AND column_name = 'metadata'
  ) THEN
    UPDATE public.ai_messages
    SET support_attachments = metadata
    WHERE metadata IS NOT NULL AND support_attachments IS NULL;
    ALTER TABLE public.ai_messages DROP COLUMN metadata;
  END IF;
END $$;
