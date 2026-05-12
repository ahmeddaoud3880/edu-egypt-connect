-- Multiple quiz/assignment grades on the same calendar day for the same class+subject
-- must be allowed. The legacy UNIQUE (student_id, class_id, subject_id, grade_date) blocks that.
--
-- Strategy: one logical grade row per assignment when assignment_id is set;
-- preserve "one legacy row per day" only for rows without assignment_id.

WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY student_id, assignment_id
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.grades
  WHERE assignment_id IS NOT NULL
)
DELETE FROM public.grades g
USING ranked r
WHERE g.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY student_id, class_id, subject_id, grade_date
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.grades
  WHERE assignment_id IS NULL
    AND class_id IS NOT NULL
    AND subject_id IS NOT NULL
    AND grade_date IS NOT NULL
)
DELETE FROM public.grades g
USING ranked r
WHERE g.id = r.id AND r.rn > 1;

ALTER TABLE public.grades
  DROP CONSTRAINT IF EXISTS grades_student_id_class_id_subject_id_grade_date_key;

DROP INDEX IF EXISTS public.idx_grades_student_assignment;

CREATE UNIQUE INDEX grades_student_assignment_unique
  ON public.grades (student_id, assignment_id)
  WHERE assignment_id IS NOT NULL;

CREATE UNIQUE INDEX grades_student_class_subject_date_without_assignment_unique
  ON public.grades (student_id, class_id, subject_id, grade_date)
  WHERE assignment_id IS NULL
    AND class_id IS NOT NULL
    AND subject_id IS NOT NULL
    AND grade_date IS NOT NULL;
