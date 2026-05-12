
-- ==========================================
-- PHASE 8: Core Database Schema
-- ==========================================

-- 1. Role enum
CREATE TYPE public.app_role AS ENUM (
  'ministry', 'directorate', 'administration', 'school', 'teacher', 'student', 'parent', 'support'
);

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  full_name_ar TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  national_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. User roles table (separate from profiles per security rules)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- 4. Governorates
CREATE TABLE public.governorates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  code TEXT UNIQUE,
  total_schools INT DEFAULT 0,
  total_students INT DEFAULT 0,
  total_teachers INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Administrations
CREATE TABLE public.administrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  governorate_id UUID NOT NULL REFERENCES public.governorates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  code TEXT UNIQUE,
  total_schools INT DEFAULT 0,
  total_students INT DEFAULT 0,
  total_teachers INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Schools
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administration_id UUID NOT NULL REFERENCES public.administrations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  code TEXT UNIQUE,
  school_type TEXT DEFAULT 'general',
  address TEXT,
  total_students INT DEFAULT 0,
  total_teachers INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Teachers
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  full_name_ar TEXT NOT NULL,
  subject_specialization TEXT,
  employee_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  full_name_ar TEXT NOT NULL,
  student_code TEXT,
  grade_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Parents
CREATE TABLE public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  full_name_ar TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Parent-Student link
CREATE TABLE public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'parent',
  UNIQUE(parent_id, student_id)
);

-- 11. Classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  grade_level TEXT,
  academic_year TEXT DEFAULT '2025-2026',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Subjects
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Enrollments
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  academic_year TEXT DEFAULT '2025-2026',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id, academic_year)
);

-- 14. Attendance Records
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'present',
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Assignments
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  title_ar TEXT NOT NULL DEFAULT '',
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Grades
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  score NUMERIC(5,2),
  max_score NUMERIC(5,2) DEFAULT 100,
  grade_type TEXT DEFAULT 'exam',
  academic_year TEXT DEFAULT '2025-2026',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. Support Tickets
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  submitted_by UUID REFERENCES auth.users(id),
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  subject TEXT NOT NULL,
  subject_ar TEXT DEFAULT '',
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- RLS Policies
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Support reads all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'support'));
CREATE POLICY "Ministry reads all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'ministry'));

-- User roles policies
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Support reads all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'support'));

-- Reference data readable by authenticated users
CREATE POLICY "Authenticated read governorates" ON public.governorates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read administrations" ON public.administrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read schools" ON public.schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read teachers" ON public.teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read parents" ON public.parents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Parent students link readable" ON public.parent_students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read enrollments" ON public.enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read attendance" ON public.attendance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers insert attendance" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated read assignments" ON public.assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read grades" ON public.grades FOR SELECT TO authenticated USING (true);

-- Support tickets policies
CREATE POLICY "Support reads all tickets" ON public.support_tickets FOR SELECT USING (public.has_role(auth.uid(), 'support'));
CREATE POLICY "Users read own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = submitted_by);
CREATE POLICY "Ministry reads all tickets" ON public.support_tickets FOR SELECT USING (public.has_role(auth.uid(), 'ministry'));
CREATE POLICY "Authenticated insert tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Support update tickets" ON public.support_tickets FOR UPDATE USING (public.has_role(auth.uid(), 'support'));

-- ==========================================
-- Triggers
-- ==========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
