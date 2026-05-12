import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Users, BookOpen, Loader2, Plus, CheckCircle2, Pencil, X, Save } from "lucide-react";
import {
  useSchoolTeachers,
  useSchoolClasses,
  useAssignTeacherToClass,
  useSchoolTeacherClassAssignments,
  useUpdateTeacherSpecialty,
  useRemoveTeacherClassAssignment,
} from "@/hooks/useSchoolAdminData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function TeacherMonitoring() {
  const { isAr } = useTranslation();
  const { data: teachers = [], isLoading: teachersLoading } = useSchoolTeachers();
  const { data: classes = [] } = useSchoolClasses();
  const { data: assignments = [] } = useSchoolTeacherClassAssignments();
  const assignTeacher = useAssignTeacherToClass();
  const updateSpecialty = useUpdateTeacherSpecialty();
  const removeAssignment = useRemoveTeacherClassAssignment();
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects_all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("subjects").select("id, name, name_ar").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({ teacher_id: "", class_id: "", subject_id: "" });
  const [editingSpecialtyId, setEditingSpecialtyId] = useState<string | null>(null);
  const [specialtyDraft, setSpecialtyDraft] = useState("");

  const handleAssign = async () => {
    if (!assignForm.teacher_id || !assignForm.class_id) {
      toast.error(isAr ? "المعلم والفصل مطلوبان" : "Teacher and class are required");
      return;
    }
    try {
      await assignTeacher.mutateAsync({
        teacher_id: assignForm.teacher_id,
        class_id: assignForm.class_id,
        subject_id: assignForm.subject_id || undefined,
      });
      toast.success(isAr ? "تم تعيين المعلم بنجاح" : "Teacher assigned successfully");
      setShowAssignForm(false);
      setAssignForm({ teacher_id: "", class_id: "", subject_id: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveSpecialty = async (teacherId: string) => {
    try {
      await updateSpecialty.mutateAsync({
        teacher_id: teacherId,
        specialization: specialtyDraft.trim() || null,
      });
      toast.success(isAr ? "تم حفظ التخصص" : "Specialty saved");
      setEditingSpecialtyId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const startEditSpecialty = (teacherId: string, current: string | null) => {
    setEditingSpecialtyId(teacherId);
    setSpecialtyDraft(current || "");
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">{isAr ? "إدارة المعلمين وتعيينهم" : "Teacher Management & Assignments"}</h2>
          </div>
          <button
            onClick={() => setShowAssignForm(!showAssignForm)}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {isAr ? "تعيين معلم" : "Assign Teacher"}
          </button>
        </div>

        {/* Assign Form */}
        {showAssignForm && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold text-foreground">{isAr ? "تعيين معلم على فصل / مادة" : "Assign Teacher to Class / Subject"}</h3>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "المعلم *" : "Teacher *"}</label>
                <select value={assignForm.teacher_id} onChange={(e) => setAssignForm({ ...assignForm, teacher_id: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background focus:outline-none">
                  <option value="">{isAr ? "اختر معلماً" : "Select teacher"}</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name || t.id}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "الفصل *" : "Class *"}</label>
                <select value={assignForm.class_id} onChange={(e) => setAssignForm({ ...assignForm, class_id: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background focus:outline-none">
                  <option value="">{isAr ? "اختر فصلاً" : "Select class"}</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.grade_number ? ` (${isAr ? "ص" : "G"}${c.grade_number})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "المادة (اختياري)" : "Subject (optional)"}</label>
                <select value={assignForm.subject_id} onChange={(e) => setAssignForm({ ...assignForm, subject_id: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background focus:outline-none">
                  <option value="">{isAr ? "كل المواد" : "All subjects"}</option>
                  {(subjects as any[]).map((s: any) => <option key={s.id} value={s.id}>{isAr ? s.name_ar || s.name : s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAssign} disabled={assignTeacher.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50">
                {assignTeacher.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {isAr ? "تأكيد التعيين" : "Confirm"}
              </button>
              <button onClick={() => setShowAssignForm(false)} className="px-4 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:bg-muted">
                {isAr ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        )}

        {/* Teachers table */}
        {teachersLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : teachers.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border rounded-lg">
            <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{isAr ? "لا يوجد معلمون مسجلون في هذه المدرسة" : "No teachers registered for this school"}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="text-start p-3 text-xs font-medium text-muted-foreground">{isAr ? "اسم المعلم" : "Teacher Name"}</th>
                  <th className="text-start p-3 text-xs font-medium text-muted-foreground">{isAr ? "التخصص" : "Specialty"}</th>
                  <th className="text-start p-3 text-xs font-medium text-muted-foreground">{isAr ? "الفصول المعيّنة" : "Assigned Classes"}</th>
                  <th className="w-24 p-3 text-xs font-medium text-muted-foreground text-center">{isAr ? "تعديل" : "Edit"}</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t, idx) => {
                  const teacherAssignments = assignments.filter((a: any) => a.teacher_id === t.id);
                  return (
                    <tr key={t.id} className={`border-b border-border/50 ${idx % 2 === 0 ? "" : "bg-muted/5"}`}>
                      <td className="p-3 font-medium text-foreground">{t.full_name || (isAr ? "معلم" : "Teacher")}</td>
                      <td className="p-3 text-muted-foreground text-xs align-top">
                        {editingSpecialtyId === t.id ? (
                          <div className="space-y-2 max-w-[220px]">
                            <select
                              className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
                              value=""
                              onChange={(e) => {
                                const s = (subjects as any[]).find((x) => x.id === e.target.value);
                                if (s) setSpecialtyDraft(isAr ? s.name_ar || s.name : s.name);
                              }}
                            >
                              <option value="">{isAr ? "— اختيار مادة —" : "— Pick subject —"}</option>
                              {(subjects as any[]).map((s: any) => (
                                <option key={s.id} value={s.id}>{isAr ? s.name_ar || s.name : s.name}</option>
                              ))}
                            </select>
                            <input
                              className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
                              value={specialtyDraft}
                              onChange={(e) => setSpecialtyDraft(e.target.value)}
                              placeholder={isAr ? "نص التخصص" : "Specialty text"}
                              dir={isAr ? "rtl" : "ltr"}
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => saveSpecialty(t.id)}
                                disabled={updateSpecialty.isPending}
                                className="flex-1 flex items-center justify-center gap-1 py-1 bg-primary text-primary-foreground rounded text-[10px] font-medium"
                              >
                                <Save className="w-3 h-3" /> {isAr ? "حفظ" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSpecialtyId(null)}
                                className="px-2 py-1 border border-border rounded text-[10px] text-muted-foreground"
                              >
                                {isAr ? "إلغاء" : "Cancel"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          t.specialization || "—"
                        )}
                      </td>
                      <td className="p-3 align-top">
                        {teacherAssignments.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">{isAr ? "غير معيّن" : "Not assigned"}</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {teacherAssignments.map((a: any) => (
                              <span
                                key={a.id}
                                className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full flex items-center gap-1 group"
                              >
                                <BookOpen className="w-2.5 h-2.5" />
                                {a.classes?.name} {a.subjects ? `— ${isAr ? a.subjects.name_ar || a.subjects.name : a.subjects.name}` : ""}
                                <button
                                  type="button"
                                  title={isAr ? "إزالة التعيين" : "Remove assignment"}
                                  onClick={() => {
                                    if (!confirm(isAr ? "إزالة هذا التعيين؟" : "Remove this assignment?")) return;
                                    removeAssignment.mutate({ assignment_id: a.id }, {
                                      onSuccess: () => toast.success(isAr ? "تمت الإزالة" : "Removed"),
                                      onError: (e: any) => toast.error(e.message),
                                    });
                                  }}
                                  className="ms-0.5 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center align-top">
                        {editingSpecialtyId !== t.id && (
                          <button
                            type="button"
                            onClick={() => startEditSpecialty(t.id, t.specialization)}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <Pencil className="w-3 h-3" />
                            {isAr ? "تخصص" : "Specialty"}
                          </button>
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
