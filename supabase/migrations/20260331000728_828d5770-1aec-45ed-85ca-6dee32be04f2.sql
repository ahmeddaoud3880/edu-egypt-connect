
-- Fix overly permissive INSERT policy on registration_requests
DROP POLICY "Anyone can insert registration" ON public.registration_requests;
CREATE POLICY "Authenticated insert registration" ON public.registration_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
