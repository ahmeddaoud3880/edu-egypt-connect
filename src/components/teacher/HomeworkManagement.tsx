import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { FileText, Plus, Calendar, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { useMyTeacherClasses, useClassAssignments, useCreateAssignment, type Assignment } from "@/hooks/useTeacherData";
import { TeacherAssignmentInspectModal } from "./TeacherAssignmentInspectModal";
import { TeacherAssignmentCardsList } from "./TeacherAssignmentCardsList";
import { parseQuestionsFromText, useSaveQuiz, useAssignQuiz } from "@/hooks/useQuizData";
import { QuizGeneratorAI } from "./QuizGeneratorAI";
import type { QuizResult } from "@/services/ragService";
import { toast } from "sonner";

const TYPES = [
  { value: "homework", labelAr: "واجب منزلى", labelEn: "Homework" },
  { value: "quiz", labelAr: "اختبار قصير", labelEn: "Quiz" },
  { value: "exam", labelAr: "امتحان", labelEn: "Exam" },
  { value: "project", labelAr: "مشروع", labelEn: "Project" },
];

export function HomeworkManagement() {
  const { isAr } = useTranslation();
  const { data: classes = [] } = useMyTeacherClasses();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showAiBookHomework, setShowAiBookHomework] = useState(false);
  const [aiHomeworkDue, setAiHomeworkDue] = useState("");
  const [aiSubjectId, setAiSubjectId] = useState("");
  const [inspectAssignment, setInspectAssignment] = useState<Assignment | null>(null);

  const { data: assignments = [], isLoading } = useClassAssignments(selectedClassId || undefined);
  const createAssignment = useCreateAssignment();
  const saveQuiz = useSaveQuiz();
  const assignQuizHomework = useAssignQuiz();

  const [form, setForm] = useState({
    title: "",
    title_ar: "",
    description: "",
    due_date: "",
    max_score: "100",
    assignment_type: "homework",
    subject_id: "",
  });

  const uniqueClasses = [...new Map(classes.map((c) => [c.class_id, c])).values()];
  const availableSubjects = classes.filter((c) => c.class_id === selectedClassId && c.subject_id);

  useEffect(() => {
    if (!selectedClassId) {
      setAiHomeworkDue("");
      setAiSubjectId("");
      return;
    }
    const first = classes.find((c) => c.class_id === selectedClassId && c.subject_id)?.subject_id;
    if (first) setAiSubjectId(first);
  }, [selectedClassId, classes]);

  const handleAiHomeworkFromBook = async (
    result: QuizResult,
    meta: { bookId?: string; lessonRef?: string; gradeNumber?: number; subjectId?: string; style: string },
  ) => {
    if (!selectedClassId) {
      toast.error(isAr ? "اختر فصلاً أولاً" : "Choose a class first");
      return;
    }
    const questions = parseQuestionsFromText(result.questions_text);
    if (questions.length === 0) {
      toast.error(
        isAr
          ? "لم نستطع استخراج أسئلة من النص — جرّب أنواع أسئلة أخرى أو عدّل الصياغة"
          : "Could not parse questions — try other question types or wording",
      );
      return;
    }
    const subj = aiSubjectId || meta.subjectId || undefined;
    const maxScore = questions.reduce((s, q) => s + (q.points ?? 1), 0);
    const refsLine =
      meta.lessonRefs && meta.lessonRefs.length > 0
        ? meta.lessonRefs.join(" | ")
        : meta.lessonRef?.trim() || undefined;
    const titleEn =
      meta.assignmentTitleEn?.trim() ||
      (meta.lessonRefs && meta.lessonRefs.length ? meta.lessonRefs.join(" + ") : undefined) ||
      refsLine ||
      "Homework from textbook";
    const titleAr =
      meta.assignmentTitleAr?.trim() ||
      (meta.lessonRefs && meta.lessonRefs.length ? meta.lessonRefs.join(" + ") : undefined) ||
      refsLine ||
      (isAr ? "واجب من الكتاب" : titleEn);

    try {
      const quizId = await saveQuiz.mutateAsync({
        title: titleEn,
        title_ar: titleAr,
        lesson_ref: refsLine || meta.lessonRef?.trim() || undefined,
        book_id: meta.bookId || undefined,
        subject_id: subj ?? null,
        questions,
      });
      await assignQuizHomework.mutateAsync({
        quizId,
        classId: selectedClassId,
        subjectId: subj,
        dueDate: aiHomeworkDue || undefined,
        title: titleEn,
        titleAr: titleAr,
        maxScore: maxScore > 0 ? maxScore : undefined,
        countsTowardGrade: true,
        assignment_type: "homework",
      });
    } catch (e: any) {
      toast.error(e?.message || String(e));
    }
  };

  const handleCreate = async () => {
    if (!selectedClassId || !form.title.trim()) {
      toast.error(isAr ? "الفصل والعنوان مطلوبان" : "Class and title are required");
      return;
    }
    try {
      await createAssignment.mutateAsync({
        class_id: selectedClassId,
        subject_id: form.subject_id || null,
        title: form.title.trim(),
        title_ar: form.title_ar.trim() || form.title.trim(),
        description: form.description || null,
        due_date: form.due_date || null,
        max_score: form.max_score ? Number(form.max_score) : 100,
        assignment_type: form.assignment_type,
      } as any);
      toast.success(isAr ? "تم إنشاء الواجب بنجاح" : "Assignment created successfully");
      setShowForm(false);
      setForm({ title: "", title_ar: "", description: "", due_date: "", max_score: "100", assignment_type: "homework", subject_id: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "إدارة الواجبات والامتحانات" : "Homework & Exams Management"}</h2>
      </div>

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "الفصل" : "Class"}</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{isAr ? "-- اختر فصلاً --" : "-- Select a class --"}</option>
            {uniqueClasses.map((c) => (
              <option key={c.class_id} value={c.class_id}>{c.classes?.name || c.class_id}</option>
            ))}
          </select>
        </div>
        {selectedClassId && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {isAr ? "إنشاء واجب جديد" : "New Assignment"}
          </button>
        )}
      </div>

      {/* AI homework from textbook (same submission + grading path as quizzes) */}
      {selectedClassId && (
        <div className="rounded-xl border border-gold/25 bg-gold-light/20 p-4 space-y-3">
          <button
            type="button"
            onClick={() => setShowAiBookHomework((v) => !v)}
            className="w-full flex items-center justify-between gap-2 text-start px-3 py-2 rounded-lg border border-gold/30 bg-background/80 hover:bg-background transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="w-4 h-4 text-gold shrink-0" />
              {isAr ? "واجب بالذكاء من الكتاب (نفس آلية الاختبار)" : "AI homework from textbook (same flow as quiz)"}
            </span>
            <span className="text-xs text-muted-foreground">{showAiBookHomework ? (isAr ? "إخفاء" : "Hide") : (isAr ? "إظهار" : "Show")}</span>
          </button>

          {showAiBookHomework && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "تاريخ التسليم للواجب" : "Due date"}</label>
                  <input
                    type="date"
                    value={aiHomeworkDue}
                    onChange={(e) => setAiHomeworkDue(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg text-sm bg-background"
                  />
                </div>
                {availableSubjects.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "المادة" : "Subject"}</label>
                    <select
                      value={aiSubjectId}
                      onChange={(e) => setAiSubjectId(e.target.value)}
                      className="px-3 py-2 border border-border rounded-lg text-sm bg-background min-w-[12rem]"
                    >
                      {availableSubjects.map((c) => (
                        <option key={c.subject_id!} value={c.subject_id!}>
                          {isAr ? c.subjects?.name_ar || c.subjects?.name : c.subjects?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "بعد توليد الأسئلة اضغط «إرسال كواجب للفصل». يظهر للطالب زر «بدء الواجب» ويُسجَّل في الدرجات مثل الاختبار."
                  : "After generating, use “Send as homework to class”. Students get “Start homework” and grades record like a quiz."}
              </p>
              <QuizGeneratorAI
                homeworkAssignEnabled={Boolean(selectedClassId)}
                onAssignHomework={handleAiHomeworkFromBook}
              />
            </div>
          )}
        </div>
      )}

      {/* Create form */}
      {showForm && selectedClassId && (
        <div className="bg-surface-elevated border border-primary/30 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">{isAr ? "إنشاء واجب / امتحان جديد" : "Create New Assignment / Exam"}</h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "العنوان (EN) *" : "Title (EN) *"}</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "العنوان (AR)" : "Title (AR)"}</label>
              <input type="text" dir="rtl" value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "نوع المهمة" : "Type"}</label>
              <select value={form.assignment_type} onChange={(e) => setForm({ ...form, assignment_type: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{isAr ? t.labelAr : t.labelEn}</option>)}
              </select>
            </div>

            {availableSubjects.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "المادة" : "Subject"}</label>
                <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">{isAr ? "-- اختر مادة --" : "-- Select subject --"}</option>
                  {availableSubjects.map((c) => <option key={c.subject_id!} value={c.subject_id!}>{isAr ? c.subjects?.name_ar || c.subjects?.name : c.subjects?.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "تاريخ التسليم" : "Due Date"}</label>
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "الدرجة الكاملة" : "Max Score"}</label>
              <input type="number" min={1} value={form.max_score} onChange={(e) => setForm({ ...form, max_score: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "وصف / تعليمات" : "Description / Instructions"}</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={createAssignment.isPending} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
              {createAssignment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isAr ? "إنشاء" : "Create"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
              {isAr ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* Assignments list */}
      {selectedClassId && (
        <TeacherAssignmentCardsList
          assignments={assignments}
          isLoading={isLoading}
          isAr={isAr}
          onInspect={setInspectAssignment}
          onDeleted={(id) => setInspectAssignment((cur) => (cur?.id === id ? null : cur))}
          emptyMessage={isAr ? "لا توجد واجبات لهذا الفصل" : "No assignments for this class"}
        />
      )}
      <TeacherAssignmentInspectModal assignment={inspectAssignment} isAr={isAr} open={!!inspectAssignment} onClose={() => setInspectAssignment(null)} />

      {!selectedClassId && (
        <div className="bg-muted/30 rounded-lg p-8 text-center">
          <p className="text-sm text-muted-foreground">{isAr ? "اختر فصلاً لعرض الواجبات" : "Select a class to view assignments"}</p>
        </div>
      )}
    </div>
  );
}
