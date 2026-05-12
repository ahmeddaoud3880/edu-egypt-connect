
-- Add is_demo column to all major tables that don't have it yet
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.parent_students ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.parent_child_link_requests ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.role_change_requests ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.transfer_requests ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_scope_assignments ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.approval_actions ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.request_status_history ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
