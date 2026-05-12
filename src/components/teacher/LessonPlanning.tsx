import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { BookOpen, Plus, FileText, Loader2, Save, Sparkles, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { useMyTeacherClasses, useMyTeacherRecord } from "@/hooks/useTeacherData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LessonPlan {
  id: string;
  class_id: string;
  subject_id: string | null;
  title: string;
  title_ar: string | null;
  objectives: string | null;
  activities: string | null;
  homework: string | null;
  lesson_date: string;
  status: string;
  ai_generated: boolean;
  classes?: { name: string } | null;
  subjects?: { name: string; name_ar: string | null } | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "text-amber-700 bg-amber-50 border-amber-200",
  ready: "text-blue-700 bg-blue-50 border-blue-200",
  completed: "text-green-700 bg-green-50 border-green-200",
};

export function LessonPlanning() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const qc = useQueryClient();
  const { data: teacher } = useMyTeacherRecord();
  const { data: classes = [] } = useMyTeacherClasses();
  const [showForm, setShowForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({
    class_id: "", subject_id: "", title: "", title_ar: "",
    objectives: "", activities: "", homework: "",
    lesson_date: new Date().toISOString().split("T")[0], status: "draft",
  });

  const uniqueClasses = [...new Map(classes.map((c) => [c.class_id, c])).values()];
  const availableSubjects = classes.filter((c) => c.class_id === form.class_id && c.subject_id);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["lesson_plans", teacher?.id],
    queryFn: async (): Promise<LessonPlan[]> => {
      if (!teacher?.id) return [];
      const { data, error } = await (supabase as any)
        .from("lesson_plans")
        .select("*, classes(name), subjects(name, name_ar)")
        .eq("teacher_id", teacher.id)
        .order("lesson_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!teacher?.id,
  });

  const createPlan = useMutation({
    mutationFn: async () => {
      if (!teacher?.id) throw new Error("No teacher record");
      const { error } = await (supabase as any).from("lesson_plans").insert({
        teacher_id: teacher.id,
        class_id: form.class_id || null,
        subject_id: form.subject_id || null,
        title: form.title,
        title_ar: form.title_ar || null,
        objectives: form.objectives || null,
        activities: form.activities || null,
        homework: form.homework || null,
        lesson_date: form.lesson_date,
        status: form.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lesson_plans"] });
      setShowForm(false);
      setForm({ class_id: "", subject_id: "", title: "", title_ar: "", objectives: "", activities: "", homework: "", lesson_date: new Date().toISOString().split("T")[0], status: "draft" });
      toast.success(isAr ? "تم حفظ خطة الدرس" : "Lesson plan saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lesson_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lesson_plans"] }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("lesson_plans").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lesson_plans"] }),
  });

  const handleAIGenerate = async () => {
    if (!form.class_id) { toast.error(isAr ? "اختر فصلاً أولاً" : "Select a class first"); return; }
    const subj = availableSubjects.find((c) => c.subject_id === form.subject_id);
    const subjName = isAr ? subj?.subjects?.name_ar || subj?.subjects?.name : subj?.subjects?.name;
    const cls = uniqueClasses.find((c) => c.class_id === form.class_id);
    setAiLoading(true);
    // Simulate AI generation with smart template
    await new Promise((r) => setTimeout(r, 1200));
    setForm((prev) => ({
      ...prev,
      title: isAr ? `درس ${subjName || "المادة"} - ${cls?.classes?.name || "الفصل"}` : `${subjName || "Subject"} Lesson - ${cls?.classes?.name || "Class"}`,
      title_ar: `درس ${subjName || "المادة"} - ${cls?.classes?.name || "الفصل"}`,
      objectives: isAr
        ? "١. أن يتعرف الطالب على المفاهيم الأساسية للدرس\n٢. أن يطبق ما تعلمه في سياق عملى\n٣. أن يحل تدريبات متنوعة بدقة"
        : "1. Student identifies key concepts of the lesson\n2. Student applies learning in practical context\n3. Student solves varied exercises accurately",
      activities: isAr
        ? "• مراجعة الدرس السابق (٥ دقائق)\n• شرح المفهوم الجديد بالأمثلة (١٥ دقيقة)\n• نشاط جماعى ومناقشة (١٠ دقائق)\n• تطبيق فردى وتصحيح (١٠ دقائق)\n• خلاصة وتقييم قصير (٥ دقائق)"
        : "• Review previous lesson (5 min)\n• Explain new concept with examples (15 min)\n• Group activity and discussion (10 min)\n• Individual practice and correction (10 min)\n• Summary and quick assessment (5 min)",
      homework: isAr ? "حل التمارين من ١ إلى ٥ من كتاب التدريبات" : "Complete exercises 1-5 from the workbook",
    }));
    setAiLoading(false);
    toast.success(isAr ? "تم توليد الخطة بالذكاء الاصطناعى ✨" : "Plan generated by AI ✨");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">{isAr ? "تخطيط الدروس" : "Lesson Planning"}</h2>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{plans.length}</span>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isAr ? "خطة درس جديدة" : "New Lesson Plan"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm">{isAr ? "إنشاء خطة درس" : "Create Lesson Plan"}</h3>
            <button
              onClick={handleAIGenerate}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {isAr ? "توليد بالذكاء الاصطناعى" : "AI Generate"}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "الفصل" : "Class"} *</label>
              <select value={form.class_id} onChange={(e) => setForm((p) => ({ ...p, class_id: e.target.value, subject_id: "" }))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">{isAr ? "-- اختر فصلاً --" : "-- Select class --"}</option>
                {uniqueClasses.map((c) => <option key={c.class_id} value={c.class_id}>{c.classes?.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "المادة" : "Subject"}</label>
              <select value={form.subject_id} onChange={(e) => setForm((p) => ({ ...p, subject_id: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">{isAr ? "-- اختر مادة --" : "-- Select subject --"}</option>
                {availableSubjects.map((c) => <option key={c.subject_id!} value={c.subject_id!}>{isAr ? c.subjects?.name_ar || c.subjects?.name : c.subjects?.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "عنوان الدرس" : "Lesson Title"} *</label>
              <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder={isAr ? "عنوان الدرس..." : "Lesson title..."} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "تاريخ الدرس" : "Date"}</label>
              <input type="date" value={form.lesson_date} onChange={(e) => setForm((p) => ({ ...p, lesson_date: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "الأهداف التعليمية" : "Learning Objectives"}</label>
            <textarea rows={3} value={form.objectives} onChange={(e) => setForm((p) => ({ ...p, objectives: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder={isAr ? "ما الذى سيتعلمه الطلاب؟" : "What will students learn?"} />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "أنشطة الدرس" : "Activities"}</label>
            <textarea rows={4} value={form.activities} onChange={(e) => setForm((p) => ({ ...p, activities: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder={isAr ? "خطوات الدرس والأنشطة..." : "Lesson steps and activities..."} />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "الواجب المنزلى" : "Homework"}</label>
            <input value={form.homework} onChange={(e) => setForm((p) => ({ ...p, homework: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={isAr ? "الواجب المنزلى..." : "Homework assignment..."} />
          </div>

          <div className="flex gap-3">
            <button onClick={() => createPlan.mutate()} disabled={!form.title || !form.class_id || createPlan.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {createPlan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isAr ? "حفظ الخطة" : "Save Plan"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted/50 transition-colors">
              {isAr ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* Plans List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted/30 rounded-lg animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-surface-elevated rounded-lg border border-border p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-1">{isAr ? "لا توجد خطط دروس بعد" : "No lesson plans yet"}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {isAr ? "أنشئ خطة درسك الأولى، أو اضغط على «توليد بالذكاء الاصطناعى» لتوليد خطة جاهزة." : "Create your first lesson plan or use AI to generate one instantly."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-surface-elevated rounded-lg border border-border p-5 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground text-sm">{isAr ? plan.title_ar || plan.title : plan.title}</h3>
                    {plan.ai_generated && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full">
                        <Sparkles className="w-2.5 h-2.5" />AI
                      </span>
                    )}
                    <span className={`text-[10px] border px-1.5 py-0.5 rounded-full ${STATUS_COLORS[plan.status] || STATUS_COLORS.draft}`}>
                      {isAr ? (plan.status === "draft" ? "مسودة" : plan.status === "ready" ? "جاهز" : "مكتمل") : plan.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>{plan.classes?.name}</span>
                    {plan.subjects && <span>• {isAr ? plan.subjects.name_ar || plan.subjects.name : plan.subjects.name}</span>}
                    <span>• {plan.lesson_date}</span>
                  </div>
                  {plan.objectives && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{plan.objectives}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {plan.status !== "completed" && (
                    <button
                      onClick={() => updateStatus.mutate({ id: plan.id, status: plan.status === "draft" ? "ready" : "completed" })}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                      title={isAr ? "تحديث الحالة" : "Update status"}
                    >
                      {plan.status === "draft" ? <Circle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 text-green-600" />}
                    </button>
                  )}
                  <button
                    onClick={() => { if (confirm(isAr ? "حذف الخطة؟" : "Delete plan?")) deletePlan.mutate(plan.id); }}
                    className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
