import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { MoeBook } from "@/utils/moeEllibrary";

export const MOE_BOOKS_JSON_LIVE = "https://ellibrary.moe.gov.eg/books/books.json";

export interface Subject {
  id: string;
  name: string;
  name_ar: string;
  subject_code: string | null;
  color: string | null;
  icon: string | null;
  grade_number: number | null;
  stage_id: string | null;
}

export interface Textbook {
  id: string;
  subject_id: string;
  name: string;
  name_ar: string;
  academic_year: string | null;
  semester: number | null;
  cover_color: string | null;
  pdf_url: string | null;
  viewer_url: string | null;
  is_available: boolean | null;
}

export interface StudentRegistrationInfo {
  full_name: string;
  full_name_ar: string;
  national_id: string | null;
  stage_id: string | null;
  /** Display grade (1–6 primary, etc.) from registration */
  grade_number: number | null;
  school_id: string | null;
  request_status: string;
  /** From `stages.name_ar` — used to map to MOE e-library */
  stage_name_ar: string | null;
}

/**
 * Fetch the student's profile from student_profiles (preferred after approval)
 * or fall back to registration_requests if student_profiles row doesn't exist yet.
 */
export function useStudentRegistrationInfo() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["student_registration_info", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Primary source: student_profiles (populated on approval)
      const { data: sp } = await (supabase as any)
        .from("student_profiles")
        .select("full_name, full_name_ar, national_id, stage_id, grade_number, school_id, academic_year")
        .eq("user_id", user.id)
        .maybeSingle();

      if (sp) {
        let stage_name_ar: string | null = null;
        if (sp.stage_id) {
          const { data: st } = await supabase.from("stages").select("name_ar").eq("id", sp.stage_id).maybeSingle();
          stage_name_ar = (st as any)?.name_ar ?? null;
        }
        return {
          full_name: sp.full_name,
          full_name_ar: sp.full_name_ar,
          national_id: sp.national_id,
          stage_id: sp.stage_id,
          grade_number: sp.grade_number,
          school_id: sp.school_id,
          request_status: "activated",
          stage_name_ar,
        } as StudentRegistrationInfo;
      }

      // Fallback: registration_requests (user is approved but student_profiles not yet created)
      const { data, error } = await supabase
        .from("registration_requests")
        .select("full_name, full_name_ar, national_id, stage_id, grade_number, school_id, request_status")
        .eq("user_id", user.id)
        .in("request_status", ["approved", "activated"])
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      let stage_name_ar: string | null = null;
      const sid = (data as { stage_id?: string | null }).stage_id;
      if (sid) {
        const { data: st } = await supabase.from("stages").select("name_ar").eq("id", sid).maybeSingle();
        stage_name_ar = (st as { name_ar?: string } | null)?.name_ar ?? null;
      }

      return {
        ...(data as unknown as Omit<StudentRegistrationInfo, "stage_name_ar">),
        stage_name_ar,
      };
    },
    enabled: !!user,
  });
}

export interface StudentAssignmentHandIn {
  score: number | null;
  max_score: number | null;
  status: string | null;
  submitted_at: string | null;
}

export interface StudentAssignmentRow {
  id: string;
  title: string;
  title_ar: string | null;
  due_date: string | null;
  assignment_type: string | null;
  class_id: string;
  quiz_id: string | null;
  counts_toward_grade: boolean | null;
  subject_id: string | null;
  subjects?: { name_ar: string | null; name: string | null } | null;
  /** Present when the student has a submission row for this assignment (merge in hook). */
  hand_in?: StudentAssignmentHandIn | null;
}

function handInComplete(sub: {
  status?: string | null;
  submitted_at?: string | null;
} | null): boolean {
  if (!sub) return false;
  const st = String(sub.status ?? "").trim().toLowerCase();
  if (st === "submitted" || st === "graded") return true;
  return sub.submitted_at != null && String(sub.submitted_at).trim() !== "";
}

export { handInComplete as isStudentAssignmentHandInComplete };

/** Homework / quizzes / exams assigned to the student's classes */
export function useStudentAssignments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["student_assignments", user?.id],
    queryFn: async (): Promise<StudentAssignmentRow[]> => {
      if (!user) return [];
      const { data: st, error: e1 } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
      if (e1) throw e1;
      if (!st) return [];
      const studentId = (st as { id: string }).id;
      const { data: ens, error: e2 } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("student_id", studentId);
      if (e2) throw e2;
      const classIds = [...new Set((ens || []).map((r: { class_id: string }) => r.class_id).filter(Boolean))];
      if (!classIds.length) return [];
      const { data: rows, error: e3 } = await (supabase as any)
        .from("assignments")
        .select("id, title, title_ar, due_date, assignment_type, class_id, quiz_id, counts_toward_grade, subject_id, subjects(name_ar, name)")
        .in("class_id", classIds)
        .order("created_at", { ascending: false });
      if (e3) throw e3;
      const list = (rows || []) as StudentAssignmentRow[];
      const assignmentIds = list.map((r) => r.id).filter(Boolean);
      if (assignmentIds.length === 0) return list;

      const [{ data: subs }, { data: grs }] = await Promise.all([
        (supabase as any)
          .from("student_assignment_submissions")
          .select("assignment_id, score, status, submitted_at")
          .eq("student_id", studentId)
          .in("assignment_id", assignmentIds)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("grades")
          .select("assignment_id, score, max_score")
          .eq("student_id", studentId)
          .in("assignment_id", assignmentIds)
          .order("created_at", { ascending: false }),
      ]);

      const subByAid = new Map<string, { score: number | null; status: string | null; submitted_at: string | null }>();
      for (const s of subs || []) {
        if (!s?.assignment_id || subByAid.has(s.assignment_id)) continue;
        subByAid.set(s.assignment_id, {
          score: s.score ?? null,
          status: s.status ?? null,
          submitted_at: s.submitted_at ?? null,
        });
      }

      const gradeByAid = new Map<string, { score: number | null; max_score: number | null }>();
      for (const g of grs || []) {
        if (!g?.assignment_id || gradeByAid.has(g.assignment_id)) continue;
        gradeByAid.set(g.assignment_id, {
          score: g.score ?? null,
          max_score: g.max_score ?? null,
        });
      }

      return list.map((a) => {
        const sub = subByAid.get(a.id);
        const gr = gradeByAid.get(a.id);
        if (!sub && !gr) return { ...a, hand_in: null };
        return {
          ...a,
          hand_in: {
            score: sub?.score ?? gr?.score ?? null,
            max_score: gr?.max_score ?? null,
            status: sub?.status ?? null,
            submitted_at: sub?.submitted_at ?? null,
          },
        };
      });
    },
    enabled: !!user,
  });
}

function submissionRowHasHandIn(s: { status?: string | null; submitted_at?: string | null }): boolean {
  const st = String(s.status ?? "").trim().toLowerCase();
  if (st === "submitted" || st === "graded") return true;
  return s.submitted_at != null && String(s.submitted_at).trim() !== "";
}

async function quizMaxTotalsByQuizId(quizIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const uniq = [...new Set(quizIds)].filter(Boolean);
  if (!uniq.length) return out;
  const { data } = await (supabase as any).from("quiz_questions").select("quiz_id, points").in("quiz_id", uniq);
  for (const row of data || []) {
    const qid = row.quiz_id as string;
    if (!qid) continue;
    out.set(qid, (out.get(qid) ?? 0) + (Number(row.points) > 0 ? Number(row.points) : 1));
  }
  return out;
}

export interface StudentGradeDisplayRow {
  id: string;
  score: number | null;
  max_score: number | null;
  term: string | null;
  grade_date: string | null;
  created_at: string | null;
  subject_id: string | null;
  subjects?: { name_ar: string | null; name: string | null } | null;
  class_id?: string | null;
  assignment_id: string | null;
  assignments?: {
    id: string;
    title?: string | null;
    title_ar?: string | null;
    assignment_type?: string | null;
    counts_toward_grade?: boolean | null;
  } | null;
  grade_type: string | null;
  /** From ``grades`` table vs quiz hand-in row only */
  source: "gradebook" | "submission";
}

/**
 * Gradebook rows + quiz/homework hand-ins missing a ``grades`` row (practice items, retries, latency).
 */
export function useStudentGrades() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["student_grades", user?.id],
    queryFn: async (): Promise<StudentGradeDisplayRow[]> => {
      if (!user) return [];
      const { data: st, error: e1 } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
      if (e1) throw e1;
      if (!st) return [];
      const sid = (st as { id: string }).id;

      let gradeRows: any[] = [];
      const grRes = await (supabase as any)
        .from("grades")
        .select(
          `
          id, score, max_score, term, grade_date, created_at,
          subject_id, assignment_id,
          subjects(name_ar, name),
          class_id,
          classes(name, name_ar),
          assignments(id, title, title_ar, assignment_type, counts_toward_grade)
        `,
        )
        .eq("student_id", sid)
        .not("subject_id", "is", null)
        .order("created_at", { ascending: false });

      if (grRes.error) {
        const gr2 = await (supabase as any)
          .from("grades")
          .select("id, score, max_score, term, grade_date, created_at, subject_id, assignment_id, class_id, grade_type")
          .eq("student_id", sid)
          .not("subject_id", "is", null)
          .order("created_at", { ascending: false });
        if (gr2.error) throw gr2.error;
        gradeRows = gr2.data || [];
      } else {
        gradeRows = grRes.data || [];
      }

      const fromGrades: StudentGradeDisplayRow[] = gradeRows.map((g: any) => ({
        id: String(g.id),
        score: g.score ?? null,
        max_score: g.max_score ?? null,
        term: g.term ?? null,
        grade_date: g.grade_date ?? null,
        created_at: g.created_at ?? null,
        subject_id: g.subject_id ?? null,
        subjects: g.subjects ?? null,
        class_id: g.class_id ?? null,
        assignment_id: g.assignment_id ?? null,
        assignments: g.assignments ?? null,
        grade_type: g.grade_type ?? null,
        source: "gradebook" as const,
      }));

      const gradedAssignmentIds = new Set<string>();
      for (const g of fromGrades) {
        if (g.assignment_id) gradedAssignmentIds.add(g.assignment_id);
      }

      const { data: subsRaw, error: se } = await (supabase as any)
        .from("student_assignment_submissions")
        .select(
          `
          id, score, submitted_at, status,
          assignments(id, title, title_ar, quiz_id, assignment_type, counts_toward_grade, subject_id,
            subjects(name_ar, name))
        `,
        )
        .eq("student_id", sid)
        .order("created_at", { ascending: false });

      if (se) throw se;

      const submissionCandidates =
        (subsRaw || []).filter((s: any) => {
          if (!submissionRowHasHandIn(s)) return false;
          const qz = s.assignments?.quiz_id;
          return Boolean(qz);
        }) ?? [];

      const synthIds = submissionCandidates.filter((s: any) => {
        const aId = s.assignments?.id;
        return aId ? !gradedAssignmentIds.has(aId) : true;
      });
      const qids = synthIds.map((s: any) => s.assignments?.quiz_id as string).filter(Boolean);
      const maxByQz = await quizMaxTotalsByQuizId(qids);

      const fromSubs: StudentGradeDisplayRow[] = synthIds.map((s: any) => {
        const a = s.assignments;
        const qzId = a?.quiz_id as string | undefined;
        const max = qzId ? maxByQz.get(qzId) ?? null : null;
        const subjId = (a?.subject_id as string | null) ?? null;
        return {
          id: `submission-${String(s.id)}`,
          score: s.score ?? null,
          max_score: max,
          term: null,
          grade_date: null,
          created_at: s.submitted_at ?? null,
          subject_id: subjId,
          subjects: a?.subjects ?? null,
          assignment_id: s.assignment_id ?? null,
          assignments: a
            ? {
                id: String(a.id),
                title: a.title ?? null,
                title_ar: a.title_ar ?? null,
                assignment_type: a.assignment_type ?? null,
                counts_toward_grade: a.counts_toward_grade ?? null,
              }
            : null,
          grade_type: "quiz",
          source: "submission" as const,
        };
      });

      const combined = [...fromGrades, ...fromSubs];
      combined.sort((a, b) => {
        const ta = Date.parse(String(a.created_at || a.grade_date || 0)) || 0;
        const tb = Date.parse(String(b.created_at || b.grade_date || 0)) || 0;
        return tb - ta;
      });

      return combined;
    },
    enabled: !!user,
    refetchOnMount: "always",
    staleTime: 0,
  });
}

/** Daily attendance rows for the logged-in student (same source as parent view). */
export function useStudentAttendance() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["student_attendance", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: st, error: e1 } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
      if (e1) throw e1;
      if (!st) return [];
      const { data, error } = await (supabase as any)
        .from("attendance_records")
        .select("id, date, status, notes, class_id, classes(name, name_ar)")
        .eq("student_id", (st as { id: string }).id)
        .order("date", { ascending: false })
        .limit(120);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

/** Single assignment row if the student is enrolled in that assignment's class. */
export function useStudentAssignment(assignmentId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["student_assignment_detail", user?.id, assignmentId],
    queryFn: async () => {
      if (!user || !assignmentId) return null;
      const { data: st, error: e1 } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
      if (e1) throw e1;
      if (!st) return null;
      const { data: a, error } = await (supabase as any)
        .from("assignments")
        .select("id, title, title_ar, due_date, assignment_type, class_id, quiz_id, counts_toward_grade, subject_id, subjects(name_ar, name)")
        .eq("id", assignmentId)
        .maybeSingle();
      if (error) throw error;
      if (!a) return null;
      const { data: en } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", (st as { id: string }).id)
        .eq("class_id", (a as { class_id: string }).class_id)
        .maybeSingle();
      if (!en) return null;
      return a as StudentAssignmentRow;
    },
    enabled: !!user && !!assignmentId,
  });
}

export interface StudentQuizSubmissionRow {
  id: string;
  assignment_id: string;
  student_id: string;
  score: number | null;
  submitted_at: string | null;
  status: string | null;
  answers_json: Record<string, string> | null;
  grading_details?: Record<string, unknown> | null;
}

/** True when this hand-in counts as locked / reviewable (shows score UI, disables inputs). */
export function isQuizSubmissionDone(s: StudentQuizSubmissionRow | null | undefined): boolean {
  if (!s) return false;
  const st = String(s.status ?? "").trim().toLowerCase();
  if (st === "submitted" || st === "graded") return true;
  // Legacy / partial rows: timestamp set but status not normalized
  if (s.submitted_at != null && String(s.submitted_at).trim() !== "") return true;
  return false;
}

/** Latest submission for this assignment (if any). */
export function useStudentQuizSubmission(assignmentId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["student_quiz_submission", user?.id, assignmentId],
    queryFn: async (): Promise<StudentQuizSubmissionRow | null> => {
      if (!user || !assignmentId) return null;
      const { data: st, error: e1 } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
      if (e1) throw e1;
      if (!st) return null;
      const sid = (st as { id: string }).id;
      const sel =
        "id, assignment_id, student_id, score, submitted_at, status, answers_json, grading_details";
      const res = await supabase
        .from("student_assignment_submissions")
        .select(sel)
        .eq("assignment_id", assignmentId)
        .eq("student_id", sid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (
        res.error &&
        (String(res.error.message ?? "").includes("grading_details") ||
          String(res.error.code ?? "") === "42703")
      ) {
        const res2 = await (supabase as any)
          .from("student_assignment_submissions")
          .select("id, assignment_id, student_id, score, submitted_at, status, answers_json")
          .eq("assignment_id", assignmentId)
          .eq("student_id", sid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (res2.error) throw res2.error;
        return res2.data as StudentQuizSubmissionRow | null;
      }
      if (res.error) throw res.error;
      return res.data as StudentQuizSubmissionRow | null;
    },
    enabled: !!user && !!assignmentId,
    refetchOnMount: "always",
    staleTime: 0,
  });
}

export function useSubmitStudentQuiz() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, answers }: { assignmentId: string; answers: Record<string, string> }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any).rpc("submit_student_quiz", {
        p_assignment_id: assignmentId,
        p_answers: answers,
      });
      if (error) throw error;
      return data as {
        score: number;
        max_score: number | null;
        counts_toward_grade: boolean;
        submission_id?: string | null;
        already_submitted?: boolean;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student_assignments", user?.id] });
      qc.invalidateQueries({ queryKey: ["student_grades", user?.id] });
      qc.invalidateQueries({ queryKey: ["quiz_questions"] });
    },
  });
}

/**
 * Fetch subjects for a given stage and grade
 */
export function useSubjectsByStage(stageId: string | null | undefined, gradeNumber?: number | null) {
  return useQuery({
    queryKey: ["subjects", stageId, gradeNumber],
    queryFn: async () => {
      if (!stageId) return [];
      let q = (supabase.from("subjects") as any)
        .select("*")
        .eq("stage_id", stageId)
        .order("grade_number", { ascending: true })
        .order("name_ar", { ascending: true });
      if (gradeNumber) q = q.eq("grade_number", gradeNumber);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Subject[];
    },
    enabled: !!stageId,
  });
}

/**
 * Fetch textbooks for a given subject ID
 */
export function useTextbooksBySubject(subjectId: string | null | undefined) {
  return useQuery({
    queryKey: ["textbooks", subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      const { data, error } = await (supabase.from("textbooks") as any)
        .select("*")
        .eq("subject_id", subjectId)
        .order("semester", { ascending: true });
      if (error) throw error;
      return (data || []) as Textbook[];
    },
    enabled: !!subjectId,
  });
}

/**
 * Fetch ALL textbooks for a given stage (for the student's library)
 */
export function useTextbooksByStage(stageId: string | null | undefined, gradeNumber?: number | null) {
  return useQuery({
    queryKey: ["textbooks_by_stage", stageId, gradeNumber],
    queryFn: async () => {
      if (!stageId) return [];
      // Get subjects first
      let subQ = (supabase.from("subjects") as any)
        .select("id")
        .eq("stage_id", stageId);
      if (gradeNumber) subQ = subQ.eq("grade_number", gradeNumber);
      const { data: subjects, error: subErr } = await subQ;
      if (subErr) throw subErr;
      const subjectIds = (subjects || []).map((s: any) => s.id);
      if (subjectIds.length === 0) return [];
      // Then get textbooks for those subjects
      const { data, error } = await (supabase.from("textbooks") as any)
        .select("*, subjects(name, name_ar, color, icon)")
        .in("subject_id", subjectIds)
        .order("semester", { ascending: true });
      if (error) throw error;
      return (data || []) as (Textbook & { subjects: Pick<Subject, "name" | "name_ar" | "color" | "icon"> })[];
    },
    enabled: !!stageId,
  });
}

/**
 * Official MOE e-library catalog (books.json). Tries live CDN; falls back to `public/moe-books-fallback.json`.
 */
export function useMoeEllibraryBooks() {
  return useQuery({
    queryKey: ["moe_ellibrary_books_json"],
    queryFn: async (): Promise<MoeBook[]> => {
      const read = async (url: string) => {
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<MoeBook[]>;
      };
      try {
        return await read(MOE_BOOKS_JSON_LIVE);
      } catch {
        const base = import.meta.env.BASE_URL ?? "/";
        const prefix = base.endsWith("/") ? base : `${base}/`;
        return read(`${prefix}moe-books-fallback.json`);
      }
    },
    staleTime: 1000 * 60 * 60 * 6,
    gcTime: 1000 * 60 * 60 * 24,
  });
}

/**
 * Fetch students linked to a parent's national ID or a specific child's national ID
 */
export function useChildrenByParentNationalId(parentNationalId?: string | null, childNationalId?: string | null) {
  return useQuery({
    queryKey: ["children_by_parent_national_id", parentNationalId, childNationalId],
    queryFn: async () => {
      if (!parentNationalId && !childNationalId) return [];
      let q = (supabase as any)
        .from("students")
        .select("*, schools(name, name_ar)");
      
      if (parentNationalId && childNationalId) {
        q = q.or(`parent_national_id.eq.${parentNationalId},national_id.eq.${childNationalId}`);
      } else if (parentNationalId) {
        q = q.eq("parent_national_id", parentNationalId);
      } else if (childNationalId) {
        q = q.eq("national_id", childNationalId);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!parentNationalId || !!childNationalId,
  });
}

/**
 * Robust hook for parents to get all their children, handles profile fallback
 */
export function useParentChildren() {
  const { user, profile } = useAuth();

  // 1. Fetch parent's registration data as fallback for national_id
  const { data: regData } = useQuery({
    queryKey: ["parent_reg_data_fallback", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("registration_requests")
        .select("national_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !profile?.national_id
  });

  const effectiveNationalId = profile?.national_id || (regData as any)?.national_id;

  // 2. Use the standard query with the effective ID
  return useChildrenByParentNationalId(effectiveNationalId, profile?.parent_national_id);
}
