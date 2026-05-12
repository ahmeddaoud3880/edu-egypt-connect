import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { BookOpen, Check, Loader2, Send, AlertCircle, RefreshCw, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Subject {
  id: string;
  name: string;
  name_ar: string;
  is_mandatory: boolean | null;
  color: string | null;
  grade_number: number | null;
}

interface Selection {
  id: string;
  subject_id: string;
  status: string;
}

export function SubjectSelection() {
  const { user } = useAuth();
  const { isAr } = useTranslation();
  const qc = useQueryClient();
  const [changeMode, setChangeMode] = useState(false);
  const [selectedForChange, setSelectedForChange] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState("");

  // Get student record
  const { data: student } = useQuery({
    queryKey: ["student_record", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("students")
        .select("id, grade_number, stage_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Get optional subjects for the student's grade
  const { data: optionalSubjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["optional_subjects", student?.stage_id, student?.grade_number],
    queryFn: async (): Promise<Subject[]> => {
      if (!student?.stage_id) return [];
      let q = (supabase as any)
        .from("subjects")
        .select("*")
        .eq("stage_id", student.stage_id)
        .eq("is_mandatory", false);
      if (student.grade_number != null) {
        q = q.eq("grade_number", student.grade_number);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!student?.stage_id,
  });

  // Get current selections for this student
  const { data: selections = [], isLoading: selectionsLoading } = useQuery({
    queryKey: ["my_subject_selections", student?.id],
    queryFn: async (): Promise<Selection[]> => {
      if (!student?.id) return [];
      const { data, error } = await (supabase as any)
        .from("student_subject_selections")
        .select("*")
        .eq("student_id", student.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!student?.id,
  });

  // Get pending change requests
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["my_change_requests", student?.id],
    queryFn: async () => {
      if (!student?.id) return [];
      const { data } = await (supabase as any)
        .from("subject_change_requests")
        .select("*, subjects!subject_change_requests_new_subject_id_fkey(name_ar)")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!student?.id,
  });

  const selectSubject = useMutation({
    mutationFn: async (subjectId: string) => {
      if (!student?.id) throw new Error("No student record");
      const { error } = await (supabase as any)
        .from("student_subject_selections")
        .insert({ student_id: student.id, subject_id: subjectId, status: "active" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_subject_selections"] });
      toast.success(isAr ? "تم اختيار المادة بنجاح" : "Subject selected successfully");
    },
    onError: () => toast.error(isAr ? "فشل الاختيار" : "Selection failed"),
  });

  const submitChangeRequest = useMutation({
    mutationFn: async ({
      oldSubjectId,
      newSubjectId,
    }: {
      oldSubjectId: string | null;
      newSubjectId: string;
    }) => {
      if (!student?.id || !user?.id) throw new Error("No student record");
      const { error } = await (supabase as any)
        .from("subject_change_requests")
        .insert({
          student_id: student.id,
          old_subject_id: oldSubjectId,
          new_subject_id: newSubjectId,
          requested_by: user.id,
          notes: changeNote.trim() || null,
          status: "pending",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_change_requests"] });
      toast.success(isAr ? "تم إرسال طلب التغيير" : "Change request submitted");
      setChangeMode(false);
      setSelectedForChange(null);
      setChangeNote("");
    },
    onError: () => toast.error(isAr ? "فشل إرسال الطلب" : "Request failed"),
  });

  const isLoading = subjectsLoading || selectionsLoading;
  const hasSelections = selections.length > 0;
  const selectedSubjectIds = new Set(selections.map((s) => s.subject_id));
  const activeSelection = selections.find((s) => s.status === "active");

  if (!student) {
    return (
      <div className="p-8 text-center bg-surface-elevated rounded-lg border border-border">
        <AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {isAr ? "لا يوجد سجل طالب مرتبط بهذا الحساب." : "No student record linked to this account."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">
          {isAr ? "اختيار المادة الاختيارية" : "Optional Subject Selection"}
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : optionalSubjects.length === 0 ? (
        <div className="p-8 text-center bg-surface-elevated rounded-lg border border-border">
          <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "لا توجد مواد اختيارية محددة لمرحلتك ودراستك حالياً."
              : "No optional subjects are configured for your grade yet."}
          </p>
        </div>
      ) : (
        <>
          {/* Current selection */}
          {hasSelections && !changeMode && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">
                  {isAr ? "اختيارك الحالي:" : "Your current selection:"}
                </p>
                {selections.map((sel) => {
                  const subj = optionalSubjects.find((s) => s.id === sel.subject_id);
                  return (
                    <p key={sel.id} className="text-sm text-green-700 mt-1">
                      {isAr ? subj?.name_ar || subj?.name : subj?.name || "—"}
                      <span className={`ms-2 text-xs px-2 py-0.5 rounded-full ${
                        sel.status === "active" ? "bg-green-200 text-green-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {sel.status === "active" ? (isAr ? "نشط" : "Active") : (isAr ? "معلق" : "Pending")}
                      </span>
                    </p>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setChangeMode(true)}
                className="text-xs text-primary hover:underline shrink-0 flex items-center gap-1"
              >
                {isAr ? "تغيير" : "Change"}
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Change mode — shows request form */}
          {changeMode ? (
            <div className="space-y-4 bg-amber-50 border border-amber-200 rounded-lg p-5">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-600" />
                <h3 className="font-medium text-amber-800 text-sm">
                  {isAr ? "طلب تغيير المادة الاختيارية" : "Request Optional Subject Change"}
                </h3>
              </div>
              <p className="text-xs text-amber-700">
                {isAr
                  ? "لتغيير اختيارك، يجب أن يوافق الدعم الفني والمدير أولاً. اختر المادة الجديدة وأرسل طلبك."
                  : "To change your selection, approval from support and your principal is required. Choose the new subject and submit."}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {optionalSubjects.map((subj) => (
                  <button
                    type="button"
                    key={subj.id}
                    disabled={selectedSubjectIds.has(subj.id)}
                    onClick={() => setSelectedForChange(subj.id)}
                    className={`p-3 rounded-lg border text-start text-sm transition-colors ${
                      selectedForChange === subj.id
                        ? "border-primary bg-primary/10"
                        : selectedSubjectIds.has(subj.id)
                        ? "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subj.color || "#4A90D9" }} />
                      <span className="font-medium text-foreground truncate">{isAr ? subj.name_ar : subj.name}</span>
                    </div>
                    {selectedSubjectIds.has(subj.id) && (
                      <span className="text-xs text-muted-foreground mt-1 block">{isAr ? "مختار حالياً" : "Current"}</span>
                    )}
                  </button>
                ))}
              </div>
              <textarea
                value={changeNote}
                onChange={e => setChangeNote(e.target.value)}
                placeholder={isAr ? "سبب طلب التغيير (اختياري)" : "Reason for change (optional)"}
                rows={2}
                className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-primary"
                dir={isAr ? "rtl" : "ltr"}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={!selectedForChange || submitChangeRequest.isPending}
                  onClick={() =>
                    submitChangeRequest.mutate({
                      oldSubjectId: activeSelection?.subject_id || null,
                      newSubjectId: selectedForChange!,
                    })
                  }
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {submitChangeRequest.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isAr ? "إرسال الطلب" : "Submit Request"}
                </button>
                <button
                  type="button"
                  onClick={() => { setChangeMode(false); setSelectedForChange(null); }}
                  className="px-5 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted/30"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>
          ) : !hasSelections ? (
            /* First-time selection */
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {isAr
                  ? "اختر المادة الاختيارية التي تريد دراستها (مرة واحدة فقط):"
                  : "Choose the optional subject you want to study (one-time selection):"}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {optionalSubjects.map((subj) => (
                  <button
                    type="button"
                    key={subj.id}
                    disabled={selectSubject.isPending}
                    onClick={() => selectSubject.mutate(subj.id)}
                    className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 text-start transition-colors group"
                  >
                    <div
                      className="w-3 h-3 rounded-full mb-2"
                      style={{ backgroundColor: subj.color || "#4A90D9" }}
                    />
                    <p className="text-sm font-medium text-foreground group-hover:text-primary">
                      {isAr ? subj.name_ar : subj.name}
                    </p>
                    {subj.name_ar !== subj.name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isAr ? subj.name : subj.name_ar}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Pending change requests */}
          {pendingRequests.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                {isAr ? "طلبات التغيير" : "Change Requests"}
              </h3>
              {pendingRequests.map((req: any) => (
                <div key={req.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-elevated text-sm">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    req.status === "approved" ? "bg-green-500" :
                    req.status === "rejected" ? "bg-red-500" : "bg-amber-500"
                  }`} />
                  <div className="flex-1">
                    <p className="text-foreground">{req.subjects?.name_ar || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-US")}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    req.status === "approved" ? "bg-green-100 text-green-700" :
                    req.status === "rejected" ? "bg-red-100 text-red-700" :
                    req.status === "support_approved" ? "bg-blue-100 text-blue-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {req.status === "pending" ? (isAr ? "قيد المراجعة" : "Pending") :
                     req.status === "support_approved" ? (isAr ? "وافق الدعم" : "Support Approved") :
                     req.status === "approved" ? (isAr ? "تمت الموافقة" : "Approved") :
                     (isAr ? "مرفوض" : "Rejected")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
