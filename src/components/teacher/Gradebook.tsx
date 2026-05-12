import { useMemo, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  ClipboardList, TrendingUp, TrendingDown,
  Loader2, Save, AlertCircle, FileText,
} from "lucide-react";
import {
  useMyTeacherClasses,
  useClassStudents,
  useClassGrades,
  useSubmitGrade,
} from "@/hooks/useTeacherData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Fetch assignments for a class (optionally filtered by subject) */
function useClassAssignments(classId: string, subjectId: string) {
  return useQuery({
    queryKey: ["class_assignments_gb", classId, subjectId],
    queryFn: async () => {
      if (!classId) return [];
      let q = (supabase as any)
        .from("assignments")
        .select("id, title, title_ar, assignment_type, max_score, subject_id")
        .eq("class_id", classId)
        .order("created_at", { ascending: true });
      if (subjectId) q = q.eq("subject_id", subjectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!classId,
  });
}

/** Fetch all grades for a class keyed by student_id + assignment_id */
function useClassGradesMap(classId: string, subjectId: string) {
  return useQuery({
    queryKey: ["class_grades_map", classId, subjectId],
    queryFn: async () => {
      if (!classId) return {};
      let q = (supabase as any)
        .from("grades")
        .select("id, student_id, assignment_id, subject_id, score, max_score")
        .eq("class_id", classId)
        .not("subject_id", "is", null);
      if (subjectId) q = q.eq("subject_id", subjectId);
      const { data, error } = await q;
      if (error) throw error;
      const map: Record<string, Record<string, { id: string; score: number | null; max_score: number | null }>> = {};
      for (const g of data || []) {
        const sid = g.student_id;
        const aid = g.assignment_id || "__general__";
        if (!map[sid]) map[sid] = {};
        map[sid][aid] = { id: g.id, score: g.score, max_score: g.max_score };
      }
      return map;
    },
    enabled: !!classId,
  });
}

export function Gradebook() {
  const { isAr } = useTranslation();
  const { data: classes = [] } = useMyTeacherClasses();
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [editScores, setEditScores] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: students = [] } = useClassStudents(selectedClassId || undefined);
  const { data: grades = [], isLoading: gradesLoading } = useClassGrades(selectedClassId || undefined, selectedSubjectId || undefined);
  const { data: assignments = [], isLoading: assignLoading } = useClassAssignments(selectedClassId, selectedSubjectId);
  const { data: gradesMap = {} } = useClassGradesMap(selectedClassId, selectedSubjectId);
  const submitGrade = useSubmitGrade();

  const availableSubjects = useMemo(
    () => classes.filter((c) => c.class_id === selectedClassId && c.subject_id),
    [classes, selectedClassId]
  );
  const selectedClass = classes.find((c) => c.class_id === selectedClassId);

  // Per-student summary (all grades for this class/subject)
  const summaryMap = useMemo(() => {
    const m: Record<string, { score: number | null; max_score: number | null }> = {};
    grades.forEach((g) => { m[g.student_id] = { score: g.score, max_score: g.max_score }; });
    return m;
  }, [grades]);

  const handleSave = async (studentId: string, assignmentId: string | null, maxScore: number) => {
    const key = `${studentId}:${assignmentId ?? "gen"}`;
    const raw = editScores[key];
    const score = raw !== undefined ? Number(raw) : NaN;
    if (isNaN(score)) return;
    if (!selectedSubjectId) {
      toast.error(isAr ? "يجب اختيار مادة قبل تسجيل الدرجة" : "Please select a subject before saving a grade");
      return;
    }
    setSavingId(key);
    try {
      await submitGrade.mutateAsync({
        student_id: studentId,
        class_id: selectedClassId,
        subject_id: selectedSubjectId,
        score,
        assignment_id: assignmentId || undefined,
        max_score: maxScore,
      });
      toast.success(isAr ? "تم حفظ الدرجة ✓" : "Grade saved ✓");
      setEditScores((p) => { const n = { ...p }; delete n[key]; return n; });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingId(null);
    }
  };

  const pctBadge = (score: number | null, max: number | null) => {
    if (score === null || !max) return <span className="text-muted-foreground">—</span>;
    const pct = Math.round((score / max) * 100);
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${pct >= 85 ? "text-green-600" : pct >= 60 ? "text-blue-600" : "text-red-600"}`}>
        {pct >= 70 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {pct}%
      </span>
    );
  };

  const isLoading = gradesLoading || assignLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "سجل الدرجات" : "Gradebook"}</h2>
      </div>

      {/* Selectors */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "الفصل" : "Class"}</label>
          <select
            value={selectedClassId}
            onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSubjectId(""); setEditScores({}); }}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{isAr ? "-- اختر فصلاً --" : "-- Select a class --"}</option>
            {[...new Map(classes.map((c) => [c.class_id, c])).values()].map((c) => (
              <option key={c.class_id} value={c.class_id}>{c.classes?.name || c.class_id}</option>
            ))}
          </select>
        </div>
        {availableSubjects.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "المادة (مطلوب للحفظ)" : "Subject (required to save)"}</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">{isAr ? "-- اختر مادة --" : "-- Select subject --"}</option>
              {availableSubjects.map((c) => (
                <option key={c.id} value={c.subject_id!}>{isAr ? c.subjects?.name_ar || c.subjects?.name : c.subjects?.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Warning: no subject selected */}
      {selectedClassId && !selectedSubjectId && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {isAr ? "اختر مادة لتتمكن من حفظ درجة لأي طالب" : "Select a subject to be able to save grades"}
        </div>
      )}

      {!selectedClassId ? (
        <div className="bg-muted/30 rounded-lg p-8 text-center">
          <ClipboardList className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{isAr ? "اختر فصلاً لعرض الدرجات" : "Select a class to view grades"}</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Assignment columns table ── */}
          {assignments.length > 0 && (
            <div className="bg-surface-elevated rounded-lg border border-border overflow-x-auto">
              <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  {isAr ? "الواجبات والتقييمات" : "Assignments & Assessments"}
                </h3>
                <span className="ms-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {assignments.length} {isAr ? "واجب" : "items"}
                </span>
              </div>
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-muted/5">
                    <th className="text-start p-3 text-xs font-medium text-muted-foreground sticky left-0 bg-muted/5 min-w-[140px]">
                      {isAr ? "الطالب" : "Student"}
                    </th>
                    {assignments.map((a) => (
                      <th key={a.id} className="text-center p-2 text-xs font-medium text-muted-foreground min-w-[100px]">
                        <div className="truncate max-w-[100px]" title={isAr ? a.title_ar || a.title : a.title}>
                          {isAr ? a.title_ar || a.title : a.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70 font-normal">
                          {a.assignment_type} · {a.max_score} {isAr ? "درجة" : "pts"}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => (
                    <tr key={s.student_id} className={`border-b border-border/50 ${idx % 2 === 0 ? "" : "bg-muted/5"}`}>
                      <td className="p-3 font-medium text-foreground sticky left-0 bg-inherit">
                        {s.full_name || (isAr ? "طالب" : "Student")}
                      </td>
                      {assignments.map((a) => {
                        const key = `${s.student_id}:${a.id}`;
                        const existing = gradesMap[s.student_id]?.[a.id];
                        const editVal = editScores[key];
                        return (
                          <td key={a.id} className="p-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={a.max_score}
                                value={editVal !== undefined ? editVal : (existing?.score ?? "")}
                                onChange={(e) => setEditScores((p) => ({ ...p, [key]: e.target.value }))}
                                className="w-16 text-center px-1 py-1 border border-border rounded text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="—"
                                disabled={!selectedSubjectId}
                              />
                              {editVal !== undefined && (
                                <button
                                  onClick={() => handleSave(s.student_id, a.id, a.max_score)}
                                  disabled={savingId === key || !selectedSubjectId}
                                  className="px-2 py-0.5 bg-primary text-primary-foreground rounded text-[10px] hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                                >
                                  {savingId === key ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Save className="w-2.5 h-2.5" />}
                                  {isAr ? "حفظ" : "Save"}
                                </button>
                              )}
                              {existing && editVal === undefined && pctBadge(existing.score, existing.max_score)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Summary table (overall per student) ── */}
          <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                {selectedClass?.classes?.name}
                {selectedSubjectId && ` — ${isAr ? availableSubjects.find(c => c.subject_id === selectedSubjectId)?.subjects?.name_ar : availableSubjects.find(c => c.subject_id === selectedSubjectId)?.subjects?.name}`}
              </h3>
            </div>
            {students.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">{isAr ? "لا يوجد طلاب في هذا الفصل" : "No students in this class"}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/5">
                    <th className="text-start p-3 text-xs font-medium text-muted-foreground">{isAr ? "الطالب" : "Student"}</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground">{isAr ? "إجمالى الدرجات" : "Total Score"}</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground">{isAr ? "النسبة" : "Percent"}</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground">{isAr ? "درجة عامة" : "General Grade"}</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground">{isAr ? "حفظ" : "Save"}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => {
                    const g = summaryMap[s.student_id];
                    const pct = g ? Math.round(((g.score ?? 0) / (g.max_score || 100)) * 100) : null;
                    const genKey = `${s.student_id}:gen`;
                    const genEdit = editScores[genKey];
                    return (
                      <tr key={s.student_id} className={`border-b border-border/50 ${idx % 2 === 0 ? "" : "bg-muted/5"}`}>
                        <td className="p-3 font-medium text-foreground">{s.full_name || (isAr ? "طالب" : "Student")}</td>
                        <td className="p-3 text-center text-xs">
                          {g?.score != null ? `${g.score} / ${g.max_score ?? 100}` : "—"}
                        </td>
                        <td className="p-3 text-center">{pct !== null ? pctBadge(g?.score ?? null, g?.max_score ?? null) : <span className="text-muted-foreground text-xs">—</span>}</td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={genEdit !== undefined ? genEdit : ""}
                            onChange={(e) => setEditScores((p) => ({ ...p, [genKey]: e.target.value }))}
                            className="w-16 text-center px-1 py-1 border border-border rounded text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder={isAr ? "أدخل" : "Enter"}
                            disabled={!selectedSubjectId}
                          />
                        </td>
                        <td className="p-3 text-center">
                          {genEdit !== undefined && (
                            <button
                              onClick={() => handleSave(s.student_id, null, 100)}
                              disabled={savingId === genKey || !selectedSubjectId}
                              className="p-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                              {savingId === genKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
