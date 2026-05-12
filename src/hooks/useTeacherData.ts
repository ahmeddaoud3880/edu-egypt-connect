import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TeacherClassAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string | null;
  academic_year: string;
  assigned_by: string | null;
  created_at: string;
  classes?: { id: string; name: string; grade_number: number | null; stage_id: string | null; school_id: string | null };
  subjects?: { id: string; name: string; name_ar: string | null } | null;
}

export interface ClassStudent {
  enrollment_id: string;
  student_id: string;
  full_name: string | null;
  national_id: string | null;
  grade_number: number | null;
  user_id: string | null;
}

export interface StudentGrade {
  id: string;
  student_id: string;
  subject_id: string | null;
  score: number | null;
  max_score: number | null;
  grade_date: string | null;
  term: string | null;
  created_at: string;
  students?: { full_name: string | null } | null;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string | null;
  date: string;
  status: string;
  created_at: string;
  students?: { full_name: string | null } | null;
}

export interface Assignment {
  id: string;
  class_id: string;
  subject_id: string | null;
  quiz_id: string | null;
  title: string;
  title_ar: string | null;
  description: string | null;
  due_date: string | null;
  max_score: number | null;
  assignment_type: string | null;
  counts_toward_grade: boolean | null;
  created_at: string;
  created_by: string | null;
}

export interface AssignmentSubmissionRow {
  id: string;
  assignment_id: string;
  student_id: string;
  score: number | null;
  submitted_at: string | null;
  status: string | null;
  answers_json: unknown | null;
  grading_details?: Record<string, unknown> | null;
  students?: { full_name: string | null } | null;
}

export interface RosterStudent {
  student_id: string;
  full_name: string | null;
  national_id: string | null;
  grade_number: number | null;
  enrollments: { class_id: string; class_name: string }[];
}

export interface SubjectGradeAvg {
  subject_id: string | null;
  name: string | null;
  name_ar: string | null;
  avgPercent: number;
  count: number;
}

// ─── Get teacher's own DB record ─────────────────────────────────────────────

export function useMyTeacherRecord() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["teacher_record", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from("teachers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as any | null;
    },
    enabled: !!user,
  });
}

// ─── Get teacher's class assignments ─────────────────────────────────────────

export function useMyTeacherClasses() {
  const { data: teacher } = useMyTeacherRecord();

  return useQuery({
    queryKey: ["teacher_classes", teacher?.id],
    queryFn: async (): Promise<TeacherClassAssignment[]> => {
      if (!teacher?.id) return [];
      const { data, error } = await (supabase as any)
        .from("teacher_class_assignments")
        .select("*, classes(*), subjects(id, name, name_ar)")
        .eq("teacher_id", teacher.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TeacherClassAssignment[];
    },
    enabled: !!teacher?.id,
  });
}

// ─── Get students in a class ──────────────────────────────────────────────────

export function useClassStudents(classId: string | undefined) {
  return useQuery({
    queryKey: ["class_students", classId],
    queryFn: async (): Promise<ClassStudent[]> => {
      if (!classId) return [];
      const { data, error } = await (supabase as any)
        .from("enrollments")
        .select("id, student_id, students(id, full_name, national_id, grade_number, user_id)")
        .eq("class_id", classId);
      if (error) throw error;
      return (data || []).map((e: any) => ({
        enrollment_id: e.id,
        student_id: e.student_id,
        full_name: e.students?.full_name || null,
        national_id: e.students?.national_id || null,
        grade_number: e.students?.grade_number || null,
        user_id: e.students?.user_id || null,
      })) as ClassStudent[];
    },
    enabled: !!classId,
  });
}

// ─── Get grades for a class + subject ────────────────────────────────────────

export function useClassGrades(classId: string | undefined, subjectId?: string) {
  return useQuery({
    queryKey: ["class_grades", classId, subjectId],
    queryFn: async (): Promise<StudentGrade[]> => {
      if (!classId) return [];
      let q = (supabase as any)
        .from("grades")
        .select("*, students(full_name)")
        .eq("class_id", classId);
      if (subjectId) q = q.eq("subject_id", subjectId);
      q = q.order("created_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as StudentGrade[];
    },
    enabled: !!classId,
  });
}

// ─── Get attendance for a class on a date ────────────────────────────────────

export function useClassAttendance(classId: string | undefined, date?: string) {
  const today = date || new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["class_attendance", classId, today],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (!classId) return [];
      const { data, error } = await (supabase as any)
        .from("attendance_records")
        .select("*, students(full_name)")
        .eq("class_id", classId)
        .eq("date", today);
      if (error) throw error;
      return (data || []) as AttendanceRecord[];
    },
    enabled: !!classId,
  });
}

// ─── Get assignments for a class ─────────────────────────────────────────────

export function useClassAssignments(classId: string | undefined) {
  return useQuery({
    queryKey: ["class_assignments", classId],
    queryFn: async (): Promise<Assignment[]> => {
      if (!classId) return [];
      const { data, error } = await (supabase as any)
        .from("assignments")
        .select("*")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Assignment[];
    },
    enabled: !!classId,
  });
}

/** Rows in ``student_assignment_submissions`` per class assignment / quiz hand-in. */
export function useAssignmentSubmissions(assignmentId: string | undefined) {
  return useQuery({
    queryKey: ["assignment_submissions", assignmentId],
    queryFn: async (): Promise<AssignmentSubmissionRow[]> => {
      if (!assignmentId) return [];
      const order = "submitted_at";
      const full =
        "id, assignment_id, student_id, score, submitted_at, status, answers_json, grading_details, students(full_name)";
      const noDetails =
        "id, assignment_id, student_id, score, submitted_at, status, answers_json, students(full_name)";
      const bare =
        "id, assignment_id, student_id, score, submitted_at, status, answers_json";

      const attempt = async (sel: string) =>
        await (supabase as any).from("student_assignment_submissions").select(sel).eq("assignment_id", assignmentId).order(order, {
          ascending: false,
          nullsFirst: false,
        });

      let { data, error } = await attempt(full);
      if (error?.message?.includes("grading_details") || String(error?.code ?? "") === "42703") {
        ({ data, error } = await attempt(noDetails));
      }
      if (error) {
        ({ data, error } = await attempt(bare));
      }
      const rows = (data || []) as AssignmentSubmissionRow[];
      if (!error && rows.length && rows.some((r) => r.student_id && !r.students?.full_name)) {
        const ids = [...new Set(rows.map((r) => r.student_id).filter(Boolean))];
        const { data: studs, error: e2 } = await (supabase as any).from("students").select("id, full_name").in("id", ids);
        if (!e2 && studs?.length) {
          const nm = new Map<string, string | null>(
            (studs as { id: string; full_name: string | null }[]).map((s) => [s.id, s.full_name]),
          );
          return rows.map((r) =>
            r.students?.full_name ? r : { ...r, students: { full_name: nm.get(r.student_id) ?? null } },
          );
        }
      }
      if (error) throw error;
      return rows;
    },
    enabled: !!assignmentId,
  });
}

/** Teacher corrects total score (e.g. AI mistake on open-ended). Updates submission + grades row. */
export function useTeacherOverrideSubmissionScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      submissionId: string;
      studentId: string;
      assignmentId: string;
      score: number;
      gradingDetails?: Record<string, unknown> | null;
    }) => {
      const gd = {
        ...(p.gradingDetails || {}),
        teacher_override: true,
        teacher_override_at: new Date().toISOString(),
      };
      const { error: e1 } = await (supabase as any)
        .from("student_assignment_submissions")
        .update({ score: p.score, grading_details: gd })
        .eq("id", p.submissionId);
      if (e1) throw e1;
      const { error: e2 } = await (supabase as any)
        .from("grades")
        .update({ score: p.score })
        .eq("assignment_id", p.assignmentId)
        .eq("student_id", p.studentId);
      if (e2) throw e2;
    },
    onSuccess: (_, p) => {
      qc.invalidateQueries({ queryKey: ["assignment_submissions", p.assignmentId] });
    },
  });
}

/** Unique students across all classes this teacher is assigned to. */
export function useTeacherRoster() {
  const { data: tca } = useMyTeacherClasses();
  const classIds = useMemo(() => [...new Set((tca ?? []).map((x) => x.class_id).filter(Boolean))], [tca]);

  return useQuery({
    queryKey: ["teacher_roster", classIds.slice().sort().join(",")],
    enabled: classIds.length > 0,
    queryFn: async (): Promise<RosterStudent[]> => {
      if (!classIds.length) return [];
      const { data, error } = await (supabase as any)
        .from("enrollments")
        .select("student_id, class_id, students(id, full_name, national_id, grade_number), classes(id, name)")
        .in("class_id", classIds);
      if (error) throw error;

      const byStudent = new Map<string, RosterStudent>();
      for (const row of data || []) {
        const sid = row.student_id as string;
        const cname = (row.classes as { name?: string } | null)?.name || row.class_id;
        if (!byStudent.has(sid)) {
          byStudent.set(sid, {
            student_id: sid,
            full_name: (row.students as { full_name?: string })?.full_name ?? null,
            national_id: (row.students as { national_id?: string })?.national_id ?? null,
            grade_number: (row.students as { grade_number?: number })?.grade_number ?? null,
            enrollments: [],
          });
        }
        const rs = byStudent.get(sid)!;
        if (!rs.enrollments.some((e) => e.class_id === row.class_id)) {
          rs.enrollments.push({ class_id: row.class_id as string, class_name: cname });
        }
      }
      return Array.from(byStudent.values()).sort((a, b) =>
        (a.full_name || "").localeCompare(b.full_name || "", isArBiasedLocale()),
      );
    },
  });
}

function isArBiasedLocale(): string {
  try {
    if (typeof navigator !== "undefined" && navigator.language?.startsWith("ar")) return "ar";
  } catch {
    /* ignore */
  }
  return "und";
}

export function useStudentGradeSubjectBreakdown(studentId: string | undefined) {
  return useQuery({
    queryKey: ["student_grade_breakdown", studentId],
    queryFn: async (): Promise<SubjectGradeAvg[]> => {
      if (!studentId) return [];
      const { data, error } = await (supabase as any)
        .from("grades")
        .select("score, max_score, subject_id, subjects(name, name_ar)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const map = new Map<string | null, { sumPct: number; n: number; name: string | null; name_ar: string | null }>();

      for (const g of data || []) {
        const max = Math.max(Number(g.max_score ?? 100), 1);
        const pct = ((Number(g.score ?? 0) / max) * 100);
        const subj = g.subject_id as string | null;
        const name = g.subjects?.name ?? null;
        const name_ar = g.subjects?.name_ar ?? null;
        if (!map.has(subj)) map.set(subj, { sumPct: 0, n: 0, name, name_ar });
        const agg = map.get(subj)!;
        agg.sumPct += pct;
        agg.n++;
      }

      const out: SubjectGradeAvg[] = [];
      map.forEach((v, sid) => {
        out.push({
          subject_id: sid,
          name: v.name,
          name_ar: v.name_ar,
          avgPercent: v.n ? Math.round(v.sumPct / v.n) : 0,
          count: v.n,
        });
      });
      return out.sort((a, b) => b.avgPercent - a.avgPercent);
    },
    enabled: !!studentId,
  });
}

export function useStudentAttendanceInClasses(studentId: string | undefined, classIds: string[]) {
  const idsKey = useMemo(() => [...classIds].sort().join(","), [classIds]);

  return useQuery({
    queryKey: ["student_attendance_teacher_scope", studentId, idsKey],
    queryFn: async () => {
      if (!studentId || !classIds.length)
        return { present: 0, absent: 0, late: 0, total: 0, ratePct: null as number | null };
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { data, error } = await (supabase as any)
        .from("attendance_records")
        .select("status")
        .eq("student_id", studentId)
        .in("class_id", classIds)
        .gte("date", since.toISOString().split("T")[0]);

      if (error) throw error;
      let present = 0;
      let absent = 0;
      let late = 0;
      for (const r of data || []) {
        const st = String(r.status || "").toLowerCase();
        if (st === "present" || st === "حاضر") present++;
        else if (st.includes("late") || st.includes("متأخر")) late++;
        else absent++;
      }
      const total = present + absent + late;
      const ratePct = total ? Math.round((present / total) * 100) : null;
      return { present, absent, late, total, ratePct };
    },
    enabled: !!studentId && classIds.length > 0,
  });
}

// ─── Create an assignment ─────────────────────────────────────────────────────

export function useCreateAssignment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Omit<Assignment, "id" | "created_at" | "created_by">) => {
      const { error } = await (supabase as any).from("assignments").insert({
        ...payload,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["class_assignments", vars.class_id] });
    },
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (p: { id: string; classId: string }) => {
      const { error } = await (supabase as any).from("assignments").delete().eq("id", p.id);
      if (error) throw error;
      return p;
    },
    onSuccess: ({ classId }) => {
      queryClient.invalidateQueries({ queryKey: ["class_assignments", classId] });
      queryClient.invalidateQueries({ queryKey: ["class_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["student_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["assignment_submissions"] });
      queryClient.invalidateQueries({ queryKey: ["student_grades"] });
      queryClient.invalidateQueries({ queryKey: ["quiz_questions"] });
    },
  });
}

// ─── Submit / update grades ───────────────────────────────────────────────────

export function useSubmitGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      student_id: string;
      class_id: string;
      subject_id: string;      // now required
      score: number;
      max_score?: number;
      assignment_id?: string;
      grade_date?: string;
      term?: string;
    }) => {
      const row: any = {
        student_id: payload.student_id,
        class_id: payload.class_id,
        subject_id: payload.subject_id,
        score: payload.score,
        max_score: payload.max_score ?? 100,
        grade_date: payload.grade_date || new Date().toISOString().split("T")[0],
        term: payload.term || null,
      };
      if (payload.assignment_id) row.assignment_id = payload.assignment_id;

      // upsert on student+class+subject+date (+ assignment_id if present)
      const { error } = await (supabase as any).from("grades").upsert(row, {
        onConflict: payload.assignment_id
          ? "student_id,class_id,subject_id,assignment_id"
          : "student_id,class_id,subject_id,grade_date",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class_grades"] });
      queryClient.invalidateQueries({ queryKey: ["class_grades_map"] });
      queryClient.invalidateQueries({ queryKey: ["student_grades"] });
      queryClient.invalidateQueries({ queryKey: ["child_grades"] });
    },
  });
}

// ─── Record attendance ────────────────────────────────────────────────────────

export function useRecordAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (records: { student_id: string; class_id: string; date: string; status: string }[]) => {
      const { error } = await (supabase as any).from("attendance_records").upsert(records, {
        onConflict: "student_id,class_id,date",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class_attendance"] });
    },
  });
}

// ─── Class performance analysis (AI-ready summary) ───────────────────────────

export function useClassPerformanceSummary(classId: string | undefined, subjectId?: string) {
  const { data: grades } = useClassGrades(classId, subjectId);

  if (!grades || grades.length === 0) return { summary: null };

  const scores = grades.map((g) => ((g.score ?? 0) / (g.max_score ?? 100)) * 100);
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
  const weak = grades.filter((g) => ((g.score ?? 0) / (g.max_score ?? 100)) * 100 < 50);
  const excellent = grades.filter((g) => ((g.score ?? 0) / (g.max_score ?? 100)) * 100 >= 85);

  return {
    summary: {
      average: Math.round(avg),
      total: grades.length,
      weakCount: weak.length,
      excellentCount: excellent.length,
      weakStudents: weak.map((g) => ({ id: g.student_id, name: g.students?.full_name, score: g.score })),
    },
  };
}
