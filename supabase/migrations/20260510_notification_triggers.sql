-- ==========================================
-- Migration: RAG TOC column + notification triggers
-- ==========================================

-- Add toc_json to rag_books
ALTER TABLE public.rag_books
  ADD COLUMN IF NOT EXISTS toc_json JSONB;

COMMENT ON COLUMN public.rag_books.toc_json IS
  'Array of {title, level, page} objects extracted from PDF outline/headings';

-- ─── Trigger: notify student + parent when grade is inserted ─────────────────
CREATE OR REPLACE FUNCTION public.notify_grade_posted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_user_id   UUID;
  v_student_name      TEXT;
  v_subject_name      TEXT;
  v_subject_name_ar   TEXT;
  v_parent_user_id    UUID;
BEGIN
  -- Resolve student user_id and name
  SELECT s.user_id, s.full_name
    INTO v_student_user_id, v_student_name
    FROM public.students s
   WHERE s.id = NEW.student_id
   LIMIT 1;

  -- Resolve subject names
  IF NEW.subject_id IS NOT NULL THEN
    SELECT sub.name, sub.name_ar
      INTO v_subject_name, v_subject_name_ar
      FROM public.subjects sub
     WHERE sub.id = NEW.subject_id
     LIMIT 1;
  END IF;

  -- Notify student
  IF v_student_user_id IS NOT NULL THEN
    INSERT INTO public.notifications
      (recipient_id, sender_id, sender_role, title, title_ar, body, body_ar, type, related_id, related_type)
    VALUES
      (
        v_student_user_id,
        COALESCE(NEW.created_by, v_student_user_id),
        'teacher',
        COALESCE('New grade posted: ' || COALESCE(v_subject_name, 'Subject'), 'New grade posted'),
        COALESCE('درجة جديدة: ' || COALESCE(v_subject_name_ar, v_subject_name, 'المادة'), 'درجة جديدة'),
        'Score: ' || COALESCE(NEW.score::text, '?') || ' / ' || COALESCE(NEW.max_score::text, '?'),
        'الدرجة: ' || COALESCE(NEW.score::text, '?') || ' من ' || COALESCE(NEW.max_score::text, '?'),
        'grade',
        NEW.id,
        'grade'
      );
  END IF;

  -- Notify parent via students.parent_national_id -> profiles.national_id -> profiles.id
  SELECT p.id
    INTO v_parent_user_id
    FROM public.students s
    JOIN public.profiles p ON p.national_id = s.parent_national_id
   WHERE s.id = NEW.student_id
   LIMIT 1;

  IF v_parent_user_id IS NOT NULL THEN
    INSERT INTO public.notifications
      (recipient_id, sender_id, sender_role, title, title_ar, body, body_ar, type, related_id, related_type)
    VALUES
      (
        v_parent_user_id,
        COALESCE(NEW.created_by, v_parent_user_id),
        'teacher',
        COALESCE('Grade posted for ' || v_student_name, 'New grade posted'),
        COALESCE('درجة لـ ' || v_student_name || ': ' || COALESCE(v_subject_name_ar, v_subject_name, ''), 'درجة جديدة'),
        'Score: ' || COALESCE(NEW.score::text, '?') || ' / ' || COALESCE(NEW.max_score::text, '?') || COALESCE(' (' || v_subject_name || ')', ''),
        'الدرجة: ' || COALESCE(NEW.score::text, '?') || ' من ' || COALESCE(NEW.max_score::text, '?') || COALESCE(' (' || v_subject_name_ar || ')', ''),
        'grade',
        NEW.id,
        'grade'
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_grade_posted ON public.grades;
CREATE TRIGGER trg_notify_grade_posted
  AFTER INSERT ON public.grades
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_grade_posted();

-- ─── Trigger: notify enrolled students when assignment is created ─────────────
CREATE OR REPLACE FUNCTION public.notify_assignment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject_name    TEXT;
  v_subject_name_ar TEXT;
BEGIN
  IF NEW.subject_id IS NOT NULL THEN
    SELECT sub.name, sub.name_ar
      INTO v_subject_name, v_subject_name_ar
      FROM public.subjects sub
     WHERE sub.id = NEW.subject_id
     LIMIT 1;
  END IF;

  -- Insert notification for each enrolled student in the class
  INSERT INTO public.notifications
    (recipient_id, sender_id, sender_role, title, title_ar, body, body_ar, type, related_id, related_type)
  SELECT
    s.user_id,
    COALESCE(NEW.created_by, s.user_id),
    'teacher',
    COALESCE('New assignment: ' || NEW.title, 'New assignment'),
    COALESCE('واجب جديد: ' || COALESCE(NEW.title_ar, NEW.title), 'واجب جديد'),
    CASE WHEN NEW.due_date IS NOT NULL
         THEN 'Due: ' || to_char(NEW.due_date::date, 'DD Mon YYYY')
         ELSE NULL END,
    CASE WHEN NEW.due_date IS NOT NULL
         THEN 'الموعد النهائي: ' || to_char(NEW.due_date::date, 'DD Mon YYYY')
         ELSE NULL END,
    'assignment',
    NEW.id,
    'assignment'
  FROM public.enrollments e
  JOIN public.students s ON s.id = e.student_id
  WHERE e.class_id = NEW.class_id
    AND s.user_id IS NOT NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_assignment_created ON public.assignments;
CREATE TRIGGER trg_notify_assignment_created
  AFTER INSERT ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_assignment_created();
