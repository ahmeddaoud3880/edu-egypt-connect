-- SQL script to optimize the schema for scraping the Egyptian Schools Directory

-- 1. Ensure we have the 'stages' table (المراحل الدراسية)
CREATE TABLE IF NOT EXISTS public.stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common stages
INSERT INTO public.stages (name_ar) VALUES 
('رياض أطفال'),
('ابتدائي'),
('إعدادي'),
('ثانوي عام'),
('ثانوي فني'),
('تربية خاصة')
ON CONFLICT (name_ar) DO NOTHING;

-- 2. Ensure 'districts' table exists and acts as 'القسم / المركز'
CREATE TABLE IF NOT EXISTS public.districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    governorate_id UUID REFERENCES public.governorates(id) ON DELETE CASCADE,
    name_ar TEXT NOT NULL,
    UNIQUE(governorate_id, name_ar)
);

-- 3. Modify 'schools' table to add the correct foreign keys
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.districts(id),
ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.stages(id),
ADD COLUMN IF NOT EXISTS gender_type TEXT; -- (بنين، بنات، مشترك)

-- 4. Create an index to make searches faster
CREATE INDEX IF NOT EXISTS idx_schools_admin_id ON public.schools(administration_id);
CREATE INDEX IF NOT EXISTS idx_schools_stage_id ON public.schools(stage_id);

-- 5. Enable RLS but allow service role to insert (already default in Supabase)
