-- ==========================================
-- Migration: Teacher-Class-Subject assignments
-- Enhances classes table and adds the linking table.
-- ==========================================

-- 1. Enhance classes table
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS grade_number INTEGER,
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 40,
  ADD COLUMN IF NOT EXISTS class_code TEXT;

-- 2. Enhance assignments table  
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS title_ar TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS max_score NUMERIC(5,2) DEFAULT 100,
  ADD COLUMN IF NOT EXISTS assignment_type TEXT DEFAULT 'homework';
  -- 'homework' | 'quiz' | 'exam' | 'project'

-- 3. Grade submissions table (student answers / scores per assignment)
CREATE TABLE IF NOT EXISTS public.student_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  submitted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  -- 'pending' | 'submitted' | 'graded' | 'late'
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

ALTER TABLE public.student_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teacher manages student_assignments" ON public.student_assignments;
CREATE POLICY "teacher manages student_assignments" ON public.student_assignments
  FOR ALL USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'school') OR public.has_role(auth.uid(), 'support'));
DROP POLICY IF EXISTS "student reads own assignments" ON public.student_assignments;
CREATE POLICY "student reads own assignments" ON public.student_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id AND s.user_id = auth.uid()
    )
  );

-- 4. Teacher-class-subject linking table
CREATE TABLE IF NOT EXISTS public.teacher_class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  academic_year TEXT NOT NULL DEFAULT '2025-2026',
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id, class_id, subject_id, academic_year)
);

CREATE INDEX IF NOT EXISTS tca_teacher_idx ON public.teacher_class_assignments (teacher_id);
CREATE INDEX IF NOT EXISTS tca_class_idx ON public.teacher_class_assignments (class_id);

ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher reads own assignments" ON public.teacher_class_assignments;
CREATE POLICY "teacher reads own assignments" ON public.teacher_class_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'school')
    OR public.has_role(auth.uid(), 'support')
    OR public.has_role(auth.uid(), 'ministry')
  );

DROP POLICY IF EXISTS "school manages teacher_class_assignments" ON public.teacher_class_assignments;
CREATE POLICY "school manages teacher_class_assignments" ON public.teacher_class_assignments
  FOR ALL USING (
    public.has_role(auth.uid(), 'school') OR public.has_role(auth.uid(), 'administration')
  );

-- 5. Add enrollments RLS policies if not exist
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school manages enrollments" ON public.enrollments;
CREATE POLICY "school manages enrollments" ON public.enrollments
  FOR ALL USING (
    public.has_role(auth.uid(), 'school') OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'support')
  );

DROP POLICY IF EXISTS "student reads own enrollment" ON public.enrollments;
CREATE POLICY "student reads own enrollment" ON public.enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()
    )
  );

-- 6. Add RLS for attendance_records if missing
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher manages attendance" ON public.attendance_records;
CREATE POLICY "teacher manages attendance" ON public.attendance_records
  FOR ALL USING (
    public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'school') OR public.has_role(auth.uid(), 'support')
  );

DROP POLICY IF EXISTS "student reads own attendance" ON public.attendance_records;
CREATE POLICY "student reads own attendance" ON public.attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()
    )
  );

-- 7. Add RLS for grades
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher manages grades" ON public.grades;
CREATE POLICY "teacher manages grades" ON public.grades
  FOR ALL USING (
    public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'school') OR public.has_role(auth.uid(), 'support')
  );

DROP POLICY IF EXISTS "student reads own grades" ON public.grades;
CREATE POLICY "student reads own grades" ON public.grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()
    )
  );
