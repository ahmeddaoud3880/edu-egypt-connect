-- Add source metadata columns to schools table for EMIS import tracking
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS source_system text DEFAULT NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS source_url text DEFAULT NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS source_governorate_name text DEFAULT NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS source_administration_name text DEFAULT NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS source_center_name text DEFAULT NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS source_stage text DEFAULT NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS source_school_type text DEFAULT NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS import_batch_id text DEFAULT NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS imported_at timestamptz DEFAULT NULL;

-- Add source metadata to administrations
ALTER TABLE public.administrations ADD COLUMN IF NOT EXISTS source_system text DEFAULT NULL;
ALTER TABLE public.administrations ADD COLUMN IF NOT EXISTS import_batch_id text DEFAULT NULL;
ALTER TABLE public.administrations ADD COLUMN IF NOT EXISTS imported_at timestamptz DEFAULT NULL;

-- Add source metadata to governorates
ALTER TABLE public.governorates ADD COLUMN IF NOT EXISTS source_system text DEFAULT NULL;
ALTER TABLE public.governorates ADD COLUMN IF NOT EXISTS import_batch_id text DEFAULT NULL;
ALTER TABLE public.governorates ADD COLUMN IF NOT EXISTS imported_at timestamptz DEFAULT NULL;

-- Add import coverage tracking table
CREATE TABLE IF NOT EXISTS public.import_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL DEFAULT 'emis',
  governorate_name text NOT NULL,
  governorate_id uuid REFERENCES public.governorates(id),
  administration_count integer DEFAULT 0,
  school_count integer DEFAULT 0,
  import_status text NOT NULL DEFAULT 'pending',
  import_batch_id text,
  imported_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_coverage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads import coverage" ON public.import_coverage FOR SELECT USING (true);