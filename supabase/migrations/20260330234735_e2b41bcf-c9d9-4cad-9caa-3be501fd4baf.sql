
-- Fix permissive INSERT/UPDATE policies
DROP POLICY IF EXISTS "Teachers insert attendance" ON public.attendance_records;
CREATE POLICY "Teachers insert attendance" ON public.attendance_records FOR INSERT TO authenticated 
WITH CHECK (
  public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'school') OR public.has_role(auth.uid(), 'support')
);

DROP POLICY IF EXISTS "Authenticated insert tickets" ON public.support_tickets;
CREATE POLICY "Authenticated insert tickets" ON public.support_tickets FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = submitted_by);
