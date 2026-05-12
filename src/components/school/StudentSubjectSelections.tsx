import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useSendNotification } from "@/hooks/useNotifications";
import {
  BookOpen, Loader2, Check, X, ChevronDown, ChevronUp,
  Users, Filter, AlertCircle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface ChangeRequest {
  id: string;
  student_id: string;
  old_subject_id: string | null;
  new_subject_id: string;
  requested_by: string;
  status: string;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  students: { full_name: string; grade_number: number | null };
  new_subject: { name_ar: string; name: string };
  old_subject: { name_ar: string; name: string } | null;
}

export function StudentSubjectSelections() {
  const { user, profile } = useAuth();
  const { isAr } = useTranslation();
  const qc = useQueryClient();
  const sendNotification = useSendNotification();
  const [filterGrade, setFilterGrade] = useState<number | "">("");
  const [rejectReason, setRejectReason] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const schoolId = (profile as { school_id?: string | null })?.school_id ?? null;

  // Load all students in this school with their subject selections
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["school_students_with_selections", schoolId, filterGrade],
    queryFn: async () => {
      if (!schoolId) return [];
      let q = (supabase as any)
        .from("students")
        .select(`
          id, full_name, grade_number, stage_id,
          student_subject_selections(
            id, subject_id, status, selected_at,
            subjects(id, name, name_ar, color)
          )
        `)
        .eq("school_id", schoolId);
      if (filterGrade !== "") q = q.eq("grade_number", filterGrade);
      const { data, error } = await q.order("grade_number").order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Load pending change requests for this school's students
  const { data: changeRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["school_subject_change_requests", schoolId],
    queryFn: async (): Promise<ChangeRequest[]> => {
      if (!schoolId) return [];
      const { data, error } = await (supabase as any)
        .from("subject_change_requests")
        .select(`
          *,
          students!subject_change_requests_student_id_fkey(full_name, grade_number, school_id),
          new_subject:subjects!subject_change_requests_new_subject_id_fkey(name_ar, name),
          old_subject:subjects!subject_change_requests_old_subject_id_fkey(name_ar, name)
        `)
        .in("status", ["pending", "support_approved"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Filter to this school's students
      return (data || []).filter(
        (r: any) => r.students?.school_id === schoolId
      );
    },
    enabled: !!schoolId,
  });

  const approveRequest = useMutation({
    mutationFn: async (req: ChangeRequest) => {
      if (!user?.id) throw new Error("Not authenticated");
      const now = new Date().toISOString();

      // Update request status
      const { error: updateError } = await (supabase as any)
        .from("subject_change_requests")
        .update({ status: "approved", school_approved_by: user.id, updated_at: now })
        .eq("id", req.id);
      if (updateError) throw updateError;

      // Update or insert student_subject_selections
      if (req.old_subject_id) {
        await (supabase as any)
          .from("student_subject_selections")
          .update({ subject_id: req.new_subject_id, status: "active", approved_by: user.id })
          .eq("student_id", req.student_id)
          .eq("subject_id", req.old_subject_id);
      } else {
        await (supabase as any)
          .from("student_subject_selections")
          .upsert({ student_id: req.student_id, subject_id: req.new_subject_id, status: "active", approved_by: user.id });
      }

      // Notify the student
      if (req.requested_by) {
        await sendNotification.mutateAsync({
          recipient_id: req.requested_by,
          title: `Subject change approved: ${req.new_subject?.name || ""}`,
          title_ar: `تمت الموافقة على تغيير المادة: ${req.new_subject?.name_ar || ""}`,
          body: "Your subject change request has been approved by the school principal.",
          body_ar: "وافق مدير المدرسة على طلب تغيير مادتك الاختيارية.",
          type: "general",
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["school_subject_change_requests"] });
      qc.invalidateQueries({ queryKey: ["school_students_with_selections"] });
      toast.success(isAr ? "تمت الموافقة على الطلب" : "Request approved");
      setActionId(null);
    },
    onError: () => toast.error(isAr ? "فشلت الموافقة" : "Approval failed"),
  });

  const rejectRequest = useMutation({
    mutationFn: async ({ req, reason }: { req: ChangeRequest; reason: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await (supabase as any)
        .from("subject_change_requests")
        .update({
          status: "rejected",
          school_approved_by: user.id,
          rejection_reason: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", req.id);
      if (error) throw error;

      // Notify the student
      if (req.requested_by) {
        await sendNotification.mutateAsync({
          recipient_id: req.requested_by,
          title: "Subject change request rejected",
          title_ar: "تم رفض طلب تغيير المادة",
          body: reason || "Your subject change request was not approved.",
          body_ar: reason || "لم تتم الموافقة على طلب تغيير مادتك.",
          type: "general",
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["school_subject_change_requests"] });
      toast.success(isAr ? "تم رفض الطلب" : "Request rejected");
      setActionId(null);
      setRejectReason("");
    },
    onError: () => toast.error(isAr ? "فشل الرفض" : "Rejection failed"),
  });

  const uniqueGrades = Array.from(
    new Set(students.map((s: any) => s.grade_number).filter(Boolean))
  ).sort((a: any, b: any) => a - b) as number[];

  return (
    <div className="space-y-6">
      {/* Change requests pending approval */}
      {changeRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-800">
                {isAr ? `${changeRequests.length} طلب تغيير مادة بانتظار موافقتك` : `${changeRequests.length} subject change request(s) awaiting your approval`}
              </h3>
              <p className="text-xs text-amber-700">
                {isAr ? "طلبات وافق عليها الدعم الفني وتحتاج موافقة المدير" : "Requests approved by support, awaiting principal approval"}
              </p>
            </div>
          </div>
          <div className="divide-y divide-amber-200 border-t border-amber-200">
            {changeRequests.map((req) => (
              <div key={req.id} className="px-5 py-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{req.students?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {isAr ? `الصف ${req.students?.grade_number ?? "—"}` : `Grade ${req.students?.grade_number ?? "—"}`}
                    </p>
                    <p className="text-xs text-amber-800 mt-1">
                      {isAr ? "من: " : "From: "}
                      <span className="font-medium">{isAr ? req.old_subject?.name_ar || "—" : req.old_subject?.name || "—"}</span>
                      {" → "}
                      {isAr ? req.new_subject?.name_ar : req.new_subject?.name}
                    </p>
                    {req.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{req.notes}"</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    req.status === "support_approved"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {req.status === "support_approved" ? (isAr ? "وافق الدعم" : "Support ✓") : (isAr ? "معلق" : "Pending")}
                  </span>
                </div>

                {actionId === req.id ? (
                  <div className="space-y-2">
                    <input
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder={isAr ? "سبب الرفض (اختياري)" : "Rejection reason (optional)"}
                      className="w-full text-sm bg-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary"
                      dir={isAr ? "rtl" : "ltr"}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={rejectRequest.isPending}
                        onClick={() => rejectRequest.mutate({ req, reason: rejectReason })}
                        className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded text-xs font-medium"
                      >
                        <X className="w-3 h-3" /> {isAr ? "رفض" : "Reject"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActionId(null); setRejectReason(""); }}
                        className="px-4 py-2 border border-border rounded text-xs text-muted-foreground"
                      >
                        {isAr ? "إلغاء" : "Cancel"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={approveRequest.isPending}
                      onClick={() => approveRequest.mutate(req)}
                      className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                    >
                      {approveRequest.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      {isAr ? "موافقة" : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionId(req.id)}
                      className="flex items-center gap-1 px-4 py-2 border border-red-200 text-red-600 rounded text-xs font-medium hover:bg-red-50"
                    >
                      <X className="w-3 h-3" /> {isAr ? "رفض" : "Reject"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter + Students list */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">
              {isAr ? "اختيارات الطلاب" : "Student Subject Selections"}
            </h3>
          </div>
          <div className="flex items-center gap-2 ms-auto">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={filterGrade}
              onChange={e => setFilterGrade(e.target.value === "" ? "" : Number(e.target.value))}
              className="text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
            >
              <option value="">{isAr ? "كل الصفوف" : "All grades"}</option>
              {uniqueGrades.map(g => (
                <option key={g} value={g}>{isAr ? `الصف ${g}` : `Grade ${g}`}</option>
              ))}
            </select>
          </div>
        </div>

        {studentsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-lg">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {!schoolId
                ? isAr
                  ? "حساب القيادة المدرسية غير مرتبط بمدرسة في النظام. تأكد من تفعيل الطلب وتعيين المدرسة، أو راجع الدعم الفني."
                  : "Your school-leadership account is not linked to a school in the system. Ensure your registration is activated with a school assigned."
                : isAr
                  ? "لا يوجد طلاب مسجّلون تحت معرّف هذه المدرسة في قاعدة البيانات. إن كان لديكم طلاب على أرض الواقع، قد تحتاجون لتفعيل طلبات التسجيل أو مزامنة بيانات المدرسة."
                  : "No student records are linked to this school ID. If you have students in real life, their accounts may still need activation or data sync."}
            </p>
          </div>
        ) : (
          <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="text-start p-3 text-xs font-medium text-muted-foreground">{isAr ? "الطالب" : "Student"}</th>
                  <th className="text-start p-3 text-xs font-medium text-muted-foreground">{isAr ? "الصف" : "Grade"}</th>
                  <th className="text-start p-3 text-xs font-medium text-muted-foreground">{isAr ? "المادة الاختيارية" : "Optional Subject"}</th>
                  <th className="text-center p-3 text-xs font-medium text-muted-foreground">{isAr ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student: any, idx: number) => {
                  const selections = student.student_subject_selections || [];
                  const hasSelection = selections.length > 0;
                  return (
                    <tr key={student.id} className={`border-b border-border/50 ${idx % 2 === 0 ? "" : "bg-muted/5"}`}>
                      <td className="p-3 font-medium text-foreground">{student.full_name}</td>
                      <td className="p-3 text-muted-foreground text-xs">{student.grade_number ?? "—"}</td>
                      <td className="p-3">
                        {hasSelection ? (
                          <div className="space-y-1">
                            {selections.map((sel: any) => (
                              <div key={sel.id} className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: sel.subjects?.color || "#4A90D9" }}
                                />
                                <span className="text-sm">
                                  {isAr ? sel.subjects?.name_ar || sel.subjects?.name : sel.subjects?.name || "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            {isAr ? "لم يختر بعد" : "Not selected yet"}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {hasSelection ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            selections[0].status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {selections[0].status === "active" ? (isAr ? "نشط" : "Active") : (isAr ? "معلق" : "Pending")}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
