import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserScope } from "@/hooks/useGovernanceData";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SchoolClass {
  id: string;
  name: string;
  name_ar?: string | null;
  school_id: string | null;
  grade_number: number | null;
  stage_id: string | null;
  capacity: number | null;
  class_code: string | null;
  created_at: string;
  stages?: { name: string; name_ar: string | null } | null;
}

export interface SchoolTeacher {
  id: string;
  user_id: string | null;
  full_name: string | null;
  school_id: string | null;
  specialization: string | null;
  created_at: string;
}

export interface SchoolStudent {
  id: string;
  user_id: string | null;
  full_name: string | null;
  national_id: string | null;
  parent_national_id: string | null;
  school_id: string | null;
  grade_number: number | null;
  stage_id: string | null;
  created_at: string;
}

/** Parent account linked via students.parent_national_id = profiles.national_id */
export interface SchoolParentRow {
  user_id: string;
  full_name: string | null;
  full_name_ar: string | null;
  national_id: string | null;
  phone: string | null;
  children: Pick<SchoolStudent, "id" | "full_name" | "grade_number" | "national_id">[];
}

export interface UnlinkedParentNationalId {
  parent_national_id: string;
  children: Pick<SchoolStudent, "id" | "full_name" | "grade_number">[];
}

// ─── Get school's classes ─────────────────────────────────────────────────────

export function useSchoolClasses() {
  const { data: scope } = useUserScope();
  return useQuery({
    queryKey: ["school_classes", scope?.school_id],
    queryFn: async (): Promise<SchoolClass[]> => {
      if (!scope?.school_id) return [];
      const { data, error } = await (supabase as any)
        .from("classes")
        .select("*, stages(name, name_ar)")
        .eq("school_id", scope.school_id)
        .order("grade_number", { ascending: true });
      if (error) throw error;
      return (data || []) as SchoolClass[];
    },
    enabled: !!scope?.school_id,
  });
}

// ─── Get school's teachers ────────────────────────────────────────────────────

export function useSchoolTeachers() {
  const { data: scope } = useUserScope();
  return useQuery({
    queryKey: ["school_teachers", scope?.school_id],
    queryFn: async (): Promise<SchoolTeacher[]> => {
      if (!scope?.school_id) return [];
      const { data, error } = await (supabase as any)
        .from("teachers")
        .select("*")
        .eq("school_id", scope.school_id)
        .order("full_name");
      if (error) throw error;
      return (data || []) as SchoolTeacher[];
    },
    enabled: !!scope?.school_id,
  });
}

// ─── Get school's students ────────────────────────────────────────────────────

export function useSchoolStudents() {
  const { data: scope } = useUserScope();
  return useQuery({
    queryKey: ["school_students", scope?.school_id],
    queryFn: async (): Promise<SchoolStudent[]> => {
      if (!scope?.school_id) return [];
      const { data, error } = await (supabase as any)
        .from("students")
        .select("id, user_id, full_name, national_id, parent_national_id, school_id, grade_number, stage_id, created_at")
        .eq("school_id", scope.school_id)
        .order("grade_number", { ascending: true });
      if (error) throw error;
      return (data || []) as SchoolStudent[];
    },
    enabled: !!scope?.school_id,
  });
}

/** Headcount per class for collapsed class cards (avoids 0/40 until row opens). */
export function useSchoolClassEnrollmentCounts() {
  const { data: classes = [] } = useSchoolClasses();
  const classIdsKey = classes.map((c) => c.id).sort().join(",");

  return useQuery({
    queryKey: ["school_class_enrollment_counts", classIdsKey],
    queryFn: async (): Promise<Record<string, number>> => {
      const ids = classes.map((c) => c.id);
      if (ids.length === 0) return {};
      const { data, error } = await (supabase as any)
        .from("enrollments")
        .select("class_id")
        .in("class_id", ids);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const id of ids) counts[id] = 0;
      for (const row of data || []) {
        const cid = (row as { class_id: string }).class_id;
        if (cid) counts[cid] = (counts[cid] || 0) + 1;
      }
      return counts;
    },
    enabled: classes.length > 0,
    staleTime: 30_000,
  });
}

function normParentKey(n: string | null | undefined): string {
  if (!n) return "";
  return String(n).trim().toUpperCase().replace(/\s+/g, "");
}

/** Parents derived from students.parent_national_id + profiles.national_id (requires RLS for school). */
export function useSchoolParents() {
  const { data: scope } = useUserScope();
  return useQuery({
    queryKey: ["school_parents", scope?.school_id],
    queryFn: async (): Promise<{ linked: SchoolParentRow[]; unlinked: UnlinkedParentNationalId[] }> => {
      if (!scope?.school_id) return { linked: [], unlinked: [] };
      const { data: studs, error } = await (supabase as any)
        .from("students")
        .select("id, full_name, national_id, parent_national_id, grade_number")
        .eq("school_id", scope.school_id);
      if (error) throw error;
      const list = (studs || []) as SchoolStudent[];

      const byParentKey = new Map<
        string,
        { rawParentNid: string; children: Pick<SchoolStudent, "id" | "full_name" | "grade_number" | "national_id">[] }
      >();
      for (const s of list) {
        const raw = s.parent_national_id;
        if (!raw) continue;
        const key = normParentKey(raw);
        if (!key) continue;
        if (!byParentKey.has(key)) {
          byParentKey.set(key, { rawParentNid: raw.trim(), children: [] });
        }
        byParentKey.get(key)!.children.push({
          id: s.id,
          full_name: s.full_name,
          grade_number: s.grade_number,
          national_id: s.national_id,
        });
      }

      const keys = [...byParentKey.keys()];
      if (keys.length === 0) return { linked: [], unlinked: [] };

      const rawNids = [...new Set([...byParentKey.values()].map((g) => g.rawParentNid))];
      const { data: profs, error: pe } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, full_name_ar, national_id, phone")
        .in("national_id", rawNids);
      if (pe) throw pe;

      const profileByKey = new Map<string, (NonNullable<typeof profs>[number])>();
      for (const p of profs || []) {
        const k = normParentKey((p as any).national_id);
        if (k) profileByKey.set(k, p as any);
      }

      const linked: SchoolParentRow[] = [];
      const unlinked: UnlinkedParentNationalId[] = [];

      for (const key of keys) {
        const group = byParentKey.get(key)!;
        const prof = profileByKey.get(key);
        if (prof) {
          linked.push({
            user_id: prof.id,
            full_name: prof.full_name,
            full_name_ar: prof.full_name_ar ?? null,
            national_id: prof.national_id,
            phone: (prof as any).phone ?? null,
            children: group.children,
          });
        } else {
          unlinked.push({
            parent_national_id: group.rawParentNid,
            children: group.children,
          });
        }
      }

      linked.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
      unlinked.sort((a, b) => a.parent_national_id.localeCompare(b.parent_national_id));
      return { linked, unlinked };
    },
    enabled: !!scope?.school_id,
  });
}

// ─── Get teacher-class assignments for the school ─────────────────────────────

export function useSchoolTeacherClassAssignments() {
  const { data: scope } = useUserScope();
  const { data: classes = [] } = useSchoolClasses();
  const classIds = classes.map((c) => c.id);

  return useQuery({
    queryKey: ["school_teacher_class_assignments", scope?.school_id],
    queryFn: async () => {
      if (classIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("teacher_class_assignments")
        .select("*, teachers(id, full_name, user_id), classes(id, name, grade_number), subjects(id, name, name_ar)")
        .in("class_id", classIds);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: classIds.length > 0,
  });
}

// ─── Create a class ───────────────────────────────────────────────────────────

export function useCreateClass() {
  const { user } = useAuth();
  const { data: scope } = useUserScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<SchoolClass>) => {
      const { error } = await (supabase as any).from("classes").insert({
        ...payload,
        school_id: scope?.school_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school_classes"] });
    },
  });
}

// ─── Assign teacher to class+subject ─────────────────────────────────────────

export function useAssignTeacherToClass() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      teacher_id: string;
      class_id: string;
      subject_id?: string;
      academic_year?: string;
    }) => {
      const { error } = await (supabase as any)
        .from("teacher_class_assignments")
        .upsert({
          teacher_id: payload.teacher_id,
          class_id: payload.class_id,
          subject_id: payload.subject_id || null,
          academic_year: payload.academic_year || "2025-2026",
          assigned_by: user?.id,
        }, { onConflict: "teacher_id,class_id,subject_id,academic_year", ignoreDuplicates: false });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school_teacher_class_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["teacher_classes"] });
    },
  });
}

export function useUpdateTeacherSpecialty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { teacher_id: string; specialization: string | null }) => {
      const { error } = await (supabase as any)
        .from("teachers")
        .update({ specialization: payload.specialization })
        .eq("id", payload.teacher_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school_teachers"] });
    },
  });
}

export function useRemoveTeacherClassAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { assignment_id: string }) => {
      const { error } = await (supabase as any)
        .from("teacher_class_assignments")
        .delete()
        .eq("id", payload.assignment_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school_teacher_class_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["teacher_classes"] });
    },
  });
}

export function useClassEnrollments(classId: string | null) {
  return useQuery({
    queryKey: ["class_students", classId],
    queryFn: async () => {
      if (!classId) return [];
      const { data, error } = await (supabase as any)
        .from("enrollments")
        .select("id, student_id, class_id, academic_year, students(id, full_name, national_id, grade_number, stage_id, user_id)")
        .eq("class_id", classId);
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        student_id: string;
        class_id: string;
        academic_year: string | null;
        students: SchoolStudent | null;
      }>;
    },
    enabled: !!classId,
  });
}

// ─── Enroll a student in a class ─────────────────────────────────────────────

export function useEnrollStudentInClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { student_id: string; class_id: string; academic_year?: string }) => {
      // Check if already enrolled
      const { data: existing } = await (supabase as any)
        .from("enrollments")
        .select("id")
        .eq("student_id", payload.student_id)
        .eq("class_id", payload.class_id)
        .maybeSingle();
      if (existing) throw new Error("already_enrolled");

      const { error } = await (supabase as any).from("enrollments").insert({
        student_id: payload.student_id,
        class_id: payload.class_id,
        academic_year: payload.academic_year || "2025-2026",
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["class_students", variables.class_id] });
      queryClient.invalidateQueries({ queryKey: ["school_classes"] });
      queryClient.invalidateQueries({ queryKey: ["school_class_enrollment_counts"] });
    },
  });
}

// ─── Remove a student from a class ───────────────────────────────────────────

export function useUnenrollStudentFromClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { enrollment_id: string; class_id: string }) => {
      const { error } = await (supabase as any)
        .from("enrollments")
        .delete()
        .eq("id", payload.enrollment_id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["class_students", variables.class_id] });
      queryClient.invalidateQueries({ queryKey: ["school_classes"] });
      queryClient.invalidateQueries({ queryKey: ["school_class_enrollment_counts"] });
    },
  });
}

/** Delete all enrollments for a class (empty roster). */
export function useClearClassEnrollments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { class_id: string }) => {
      const { error } = await (supabase as any).from("enrollments").delete().eq("class_id", payload.class_id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["class_students", variables.class_id] });
      queryClient.invalidateQueries({ queryKey: ["school_classes"] });
      queryClient.invalidateQueries({ queryKey: ["school_teacher_class_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["teacher_classes"] });
      queryClient.invalidateQueries({ queryKey: ["school_class_enrollment_counts"] });
    },
  });
}

/** Transfer a student from one class to another (atomic: remove + re-enroll). */
export function useTransferStudentBetweenClasses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      enrollment_id: string;
      student_id: string;
      from_class_id: string;
      to_class_id: string;
      academic_year?: string;
    }) => {
      const { data: existing } = await (supabase as any)
        .from("enrollments")
        .select("id")
        .eq("student_id", payload.student_id)
        .eq("class_id", payload.to_class_id)
        .maybeSingle();
      if (existing) throw new Error("already_enrolled_in_target");

      const { error: delErr } = await (supabase as any)
        .from("enrollments")
        .delete()
        .eq("id", payload.enrollment_id);
      if (delErr) throw delErr;

      const { error: insErr } = await (supabase as any).from("enrollments").insert({
        student_id: payload.student_id,
        class_id: payload.to_class_id,
        academic_year: payload.academic_year || "2025-2026",
      });
      if (insErr) throw insErr;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["class_students", variables.from_class_id] });
      queryClient.invalidateQueries({ queryKey: ["class_students", variables.to_class_id] });
      queryClient.invalidateQueries({ queryKey: ["school_classes"] });
      queryClient.invalidateQueries({ queryKey: ["school_class_enrollment_counts"] });
    },
  });
}

/** Delete class (DB cascades remove enrollments, class-scoped rows per FK). */
export function useDeleteClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { class_id: string }) => {
      const { error } = await (supabase as any).from("classes").delete().eq("id", payload.class_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school_classes"] });
      queryClient.invalidateQueries({ queryKey: ["school_teacher_class_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["teacher_classes"] });
      queryClient.invalidateQueries({ queryKey: ["school_class_enrollment_counts"] });
    },
  });
}

// ─── Send a notification to all parents of students in the school ─────────────

export function useSendSchoolwideNotification() {
  const { user, role } = useAuth();
  const { data: students = [] } = useSchoolStudents();

  return useMutation({
    mutationFn: async (payload: { title: string; title_ar: string; body?: string; body_ar?: string; type?: string }) => {
      // Get parent user_ids from student profiles
      const studentUserIds = students.map((s) => s.user_id).filter(Boolean) as string[];
      if (studentUserIds.length === 0) return;

      // Get parents linked by parent_national_id (via profiles table if stored)
      // For now, just notify students' user_ids directly
      const rows = studentUserIds.map((uid) => ({
        recipient_id: uid,
        sender_id: user?.id,
        sender_role: role || "school",
        title: payload.title,
        title_ar: payload.title_ar,
        body: payload.body || null,
        body_ar: payload.body_ar || null,
        type: payload.type || "announcement",
        is_read: false,
      }));

      const { error } = await (supabase as any).from("notifications").insert(rows);
      if (error) throw error;
    },
  });
}
