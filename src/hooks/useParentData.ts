import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChildProfile {
  student_id: string;
  user_id: string | null;
  full_name: string | null;
  national_id: string | null;
  grade_number: number | null;
  stage_id: string | null;
  school_id: string | null;
  school_name: string | null;
}

// Unified hook: checks profiles.national_id first, falls back to registration_requests
export function useMyChildren() {
  const { user, profile } = useAuth();
  const parentNationalId = (profile as any)?.national_id;

  return useQuery({
    queryKey: ["parent_children_unified", user?.id, parentNationalId],
    queryFn: async (): Promise<ChildProfile[]> => {
      if (!user) return [];

      const toProfile = (s: any): ChildProfile => ({
        student_id: s.id,
        user_id: s.user_id,
        full_name: s.full_name,
        national_id: s.national_id,
        grade_number: s.grade_number,
        stage_id: s.stage_id,
        school_id: s.school_id,
        school_name: s.schools?.name || null,
      });

      // Attempt 1: direct national_id match on students table
      if (parentNationalId) {
        const { data, error } = await (supabase as any)
          .from("students")
          .select("id, user_id, full_name, national_id, grade_number, stage_id, school_id, schools(name)")
          .eq("parent_national_id", parentNationalId);
        if (!error && data && data.length > 0) {
          return data.map(toProfile);
        }
      }

      // Attempt 2: look up parent_national_id from registration_requests
      const { data: regData } = await (supabase as any)
        .from("registration_requests")
        .select("national_id, parent_national_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      const fallbackNationalId = regData?.national_id || regData?.parent_national_id;
      if (fallbackNationalId && fallbackNationalId !== parentNationalId) {
        const { data, error } = await (supabase as any)
          .from("students")
          .select("id, user_id, full_name, national_id, grade_number, stage_id, school_id, schools(name)")
          .eq("parent_national_id", fallbackNationalId);
        if (!error && data && data.length > 0) {
          return data.map(toProfile);
        }
      }



      return [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Get grades for a child ───────────────────────────────────────────────────

export function useChildGrades(studentId: string | undefined) {
  return useQuery({
    queryKey: ["child_grades", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await (supabase as any)
        .from("grades")
        .select(`
          id, student_id, subject_id, score, max_score,
          grade_date, grade_type, term, assignment_id,
          subjects(name, name_ar),
          assignments(
            id, title, title_ar, class_id,
            classes(
              id, name,
              teacher_class_assignments(
                subject_id,
                teachers(full_name)
              )
            )
          )
        `)
        .eq("student_id", studentId)
        .not("subject_id", "is", null)
        .order("grade_date", { ascending: false });
      if (error) throw error;
      return (data || []).map((g: any) => {
        const resolvedClass = g.assignments?.classes || null;
        const tcas = resolvedClass?.teacher_class_assignments || [];
        const teacherName = tcas[0]?.teachers?.full_name || null;
        return {
          ...g,
          _resolved_class: resolvedClass,
          teacher_name: teacherName,
        };
      });
    },
    enabled: !!studentId,
    staleTime: 1000 * 60 * 3,
  });
}

// ─── Get attendance for a child ───────────────────────────────────────────────

export function useChildAttendance(studentId: string | undefined) {
  return useQuery({
    queryKey: ["child_attendance", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await (supabase as any)
        .from("attendance_records")
        .select(`
          *,
          classes(
            id,
            name,
            teacher_class_assignments(
              subject_id,
              subjects(id, name, name_ar)
            )
          )
        `)
        .eq("student_id", studentId)
        .order("date", { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!studentId,
  });
}

// ─── Get assignments for a child (via enrollments) ───────────────────────────

export function useChildAssignments(studentId: string | undefined) {
  return useQuery({
    queryKey: ["child_assignments", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      // Find class IDs via enrollments
      const { data: enrollments } = await (supabase as any)
        .from("enrollments")
        .select("class_id")
        .eq("student_id", studentId);
      const classIds = (enrollments || []).map((e: any) => e.class_id);
      if (classIds.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from("assignments")
        .select("*, subjects(name, name_ar)")
        .in("class_id", classIds)
        .order("due_date", { ascending: true });
      if (error) throw error;
      const assignments = (data || []) as any[];
      if (assignments.length === 0) return assignments;

      // Fetch submission status + score for this student
      const assignmentIds = assignments.map((a: any) => a.id);
      const { data: subs } = await (supabase as any)
        .from("student_assignment_submissions")
        .select("assignment_id, score, status, submitted_at")
        .eq("student_id", studentId)
        .in("assignment_id", assignmentIds);
      const subMap = new Map<string, any>(
        (subs || []).map((s: any) => [s.assignment_id, s])
      );

      // Fetch grades for this student (for grade count)
      const { data: gradeRows } = await (supabase as any)
        .from("grades")
        .select("assignment_id, score, max_score")
        .eq("student_id", studentId)
        .in("assignment_id", assignmentIds);
      const gradeMap = new Map<string, any>(
        (gradeRows || []).map((g: any) => [g.assignment_id, g])
      );

      return assignments.map((a: any) => ({
        ...a,
        submission: subMap.get(a.id) || null,
        grade: gradeMap.get(a.id) || null,
      }));
    },
    enabled: !!studentId,
  });
}

/** Teacher + subject rows for parent→teacher notifications (RLS allows parent TCA read for child classes). */
export interface ChildTeacherRecipient {
  assignmentKey: string;
  teacherUserId: string;
  teacherName: string | null;
  subjectLabel: string;
  className: string | null;
}

export function useChildTeachersForMessaging(studentId: string | undefined) {
  return useQuery({
    queryKey: ["child_teachers_messaging", studentId],
    queryFn: async (): Promise<ChildTeacherRecipient[]> => {
      if (!studentId) return [];
      const { data: enrollments, error } = await (supabase as any)
        .from("enrollments")
        .select(
          `
          class_id,
          classes (
            id,
            name,
            teacher_class_assignments (
              subject_id,
              subjects (id, name, name_ar),
              teachers (user_id, full_name)
            )
          )
        `,
        )
        .eq("student_id", studentId);
      if (error) throw error;

      const out: ChildTeacherRecipient[] = [];
      const seen = new Set<string>();

      for (const row of enrollments || []) {
        const cls = row.classes;
        if (!cls?.teacher_class_assignments?.length) continue;
        for (const a of cls.teacher_class_assignments) {
          const sub = a.subjects;
          const tea = a.teachers;
          const uid = tea?.user_id as string | undefined;
          if (!uid) continue;
          const subName = sub?.name_ar?.trim() || sub?.name?.trim() || "?";
          const key = `${cls.id}:${a.subject_id ?? "ns"}:${uid}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({
            assignmentKey: key,
            teacherUserId: uid,
            teacherName: tea?.full_name ?? null,
            subjectLabel: subName,
            className: cls.name ?? null,
          });
        }
      }

      out.sort((a, b) => a.subjectLabel.localeCompare(b.subjectLabel, "ar"));
      return out;
    },
    enabled: !!studentId,
    staleTime: 1000 * 60 * 2,
  });
}

export interface SchoolStaffRecipient {
  recipient_user_id: string;
  display_name: string | null;
  school_name: string | null;
}

/** School leadership user IDs the parent may message (SECURITY DEFINER RPC). */
export function useParentSchoolStaffContacts(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["parent_school_staff_msg", schoolId],
    queryFn: async (): Promise<SchoolStaffRecipient[]> => {
      if (!schoolId) return [];
      const { data, error } = await (supabase as any).rpc("parent_school_message_recipients", {
        p_school_id: schoolId,
      });
      if (error) throw error;
      return (data || []) as SchoolStaffRecipient[];
    },
    enabled: !!schoolId,
    staleTime: 1000 * 60 * 5,
  });
}
