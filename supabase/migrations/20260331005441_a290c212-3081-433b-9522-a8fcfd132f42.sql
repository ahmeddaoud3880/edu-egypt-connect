-- Allow anonymous users to read governorates, administrations, and schools (public reference data for registration)
CREATE POLICY "Anon read governorates" ON public.governorates FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read administrations" ON public.administrations FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read schools" ON public.schools FOR SELECT TO anon USING (true);