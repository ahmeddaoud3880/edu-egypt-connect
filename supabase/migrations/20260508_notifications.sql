-- ==========================================
-- Migration: Notifications system
-- ==========================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role TEXT,
  -- 'teacher' | 'school' | 'support' | 'parent' | 'system'
  title TEXT NOT NULL,
  title_ar TEXT NOT NULL DEFAULT '',
  body TEXT,
  body_ar TEXT,
  type TEXT NOT NULL DEFAULT 'general',
  -- 'grade' | 'attendance' | 'assignment' | 'meeting' | 'announcement' | 'general'
  related_id UUID,
  related_type TEXT,
  -- 'class' | 'assignment' | 'student' | 'teacher'
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON public.notifications (recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_sender_idx ON public.notifications (sender_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- User reads own notifications
DROP POLICY IF EXISTS "user reads own notifications" ON public.notifications;
CREATE POLICY "user reads own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_id);

-- Any authenticated user can send (insert) notifications
DROP POLICY IF EXISTS "authenticated sends notifications" ON public.notifications;
CREATE POLICY "authenticated sends notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = sender_id
  );

-- User marks own notifications as read
DROP POLICY IF EXISTS "user updates own notifications" ON public.notifications;
CREATE POLICY "user updates own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Support reads all
DROP POLICY IF EXISTS "support reads all notifications" ON public.notifications;
CREATE POLICY "support reads all notifications" ON public.notifications
  FOR SELECT USING (public.has_role(auth.uid(), 'support'));

-- System/service can insert (for automated notifications from DB triggers)
DROP POLICY IF EXISTS "service manages notifications" ON public.notifications;
CREATE POLICY "service manages notifications" ON public.notifications
  FOR ALL USING (true) WITH CHECK (true);
