import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BrainCircuit,
  Plus,
  FileQuestion,
  Trash2,
  Save,
  Send,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  X,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { QuizGeneratorAI } from "./QuizGeneratorAI";
import {
  useMyQuizzes,
  useQuizQuestions,
  useSaveQuiz,
  useUpdateQuizQuestions,
  useAssignQuiz,
  parseQuestionsFromText,
  type QuizQuestion,
  type Quiz,
} from "@/hooks/useQuizData";
import type { QuizResult } from "@/services/ragService";
import { toast } from "sonner";
import { useMyTeacherClasses, useClassAssignments, type Assignment } from "@/hooks/useTeacherData";
import { TeacherAssignmentCardsList } from "./TeacherAssignmentCardsList";
import { TeacherAssignmentInspectModal } from "./TeacherAssignmentInspectModal";

// ─── EditableQuestion ─────────────────────────────────────────────────────────
function EditableQuestion({
  q,
  index,
  isAr,
  onChange,
  onDelete,
}: {
  q: QuizQuestion;
  index: number;
  isAr: boolean;
  onChange: (updated: QuizQuestion) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(q.question_text);
  const [answer, setAnswer] = useState(q.answer || "");

  if (!editing) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background group">
        <span className="text-xs font-bold text-muted-foreground w-5 shrink-0 mt-1">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">{q.question_text}</p>
          {q.options_json && q.options_json.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {q.options_json.map((opt) => (
                <span key={opt.key} className={`text-xs px-2 py-0.5 rounded border ${opt.key === q.answer ? "bg-green-100 border-green-300 text-green-700 font-semibold" : "border-border text-muted-foreground"}`}>
                  {opt.key}. {opt.text}
                </span>
              ))}
            </div>
          )}
          {q.answer && !q.options_json?.length && (
            <p className="text-xs text-green-700 mt-1">✓ {q.answer}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-2">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={3}
        className="w-full text-sm bg-background border border-border rounded px-3 py-2 resize-none focus:outline-none focus:border-primary"
        dir="rtl"
      />
      {q.question_type === "open" ? (
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={isAr ? "إجابة مقالية نموذجية للمقارنة والتصحيح الذكي" : "Model essay answer for AI comparison"}
          rows={5}
          className="w-full text-sm bg-background border border-border rounded px-3 py-2 resize-y focus:outline-none focus:border-primary"
          dir="rtl"
        />
      ) : (
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={isAr ? "الإجابة الصحيحة" : "Correct answer"}
          className="w-full text-sm bg-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary"
          dir="rtl"
        />
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { onChange({ ...q, question_text: text.trim(), answer: answer.trim() || null }); setEditing(false); }}
          disabled={!text.trim()}
          className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50"
        >
          <Check className="w-3 h-3" /> {isAr ? "حفظ" : "Save"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 border border-border rounded text-xs text-muted-foreground">
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── AssignDialog ─────────────────────────────────────────────────────────────
function AssignDialog({
  quiz,
  isAr,
  onClose,
}: {
  quiz: Quiz;
  isAr: boolean;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const [classId, setClassId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [countsTowardGrade, setCountsTowardGrade] = useState(true);
  const assignQuiz = useAssignQuiz();

  const { data: qForMax = [] } = useQuizQuestions(quiz?.id ?? null);
  const maxFromQuestions = useMemo(() => qForMax.reduce((s, q) => s + (q.points ?? 1), 0), [qForMax]);

  const schoolId = (profile as any)?.school_id;

  const { data: classes = [] } = useQuery({
    queryKey: ["teacher_classes_for_assign", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await (supabase as any)
        .from("classes")
        .select("id, name, grade_number")
        .eq("school_id", schoolId)
        .order("grade_number");
      return data || [];
    },
    enabled: !!schoolId,
  });

  const submit = async () => {
    if (!classId) { toast.error(isAr ? "اختر فصلاً" : "Choose a class"); return; }
    await assignQuiz.mutateAsync({
      quizId: quiz.id,
      classId,
      subjectId: quiz.subject_id || undefined,
      dueDate: dueDate || undefined,
      title: quiz.title,
      titleAr: quiz.title_ar || undefined,
      maxScore: maxFromQuestions > 0 ? maxFromQuestions : undefined,
      countsTowardGrade,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface-elevated rounded-xl border border-border shadow-xl p-6 w-full max-w-md space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          {isAr ? `إرسال "${quiz.title}" للطلاب` : `Assign "${quiz.title}" to students`}
        </h3>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{isAr ? "الفصل" : "Class"}</label>
          <select
            value={classId}
            onChange={e => setClassId(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
          >
            <option value="">{isAr ? "اختر فصلاً" : "Select a class"}</option>
            {classes.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name} ({isAr ? `الصف ${c.grade_number}` : `Grade ${c.grade_number}`})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" />
            {isAr ? "الموعد النهائي (اختياري)" : "Due date (optional)"}
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
          />
        </div>

        <div className="flex items-start gap-2">
          <input
            id="counts-grade"
            type="checkbox"
            checked={countsTowardGrade}
            onChange={(e) => setCountsTowardGrade(e.target.checked)}
            className="mt-1 rounded border-border"
          />
          <label htmlFor="counts-grade" className="text-sm text-foreground leading-snug cursor-pointer">
            {isAr
              ? "احتساب هذا الاختبار في سجل الدرجات الرسمي (عند إدخال الدرجات لاحقاً)"
              : "Count this quiz toward the official grade record (when scores are entered)"}
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={!classId || assignQuiz.isPending}
            onClick={submit}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {assignQuiz.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isAr ? "إرسال للطلاب" : "Send to Students"}
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted/30">
            {isAr ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SavedQuizCard ────────────────────────────────────────────────────────────
function SavedQuizCard({ quiz, isAr }: { quiz: Quiz; isAr: boolean }) {
  const [open, setOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const { data: questions = [] } = useQuizQuestions(open ? quiz.id : null);
  const [editableQs, setEditableQs] = useState<QuizQuestion[]>([]);
  const updateQs = useUpdateQuizQuestions();

  useEffect(() => { if (questions.length) setEditableQs(questions); }, [questions]);

  const addBlank = () =>
    setEditableQs(prev => [...prev, { question_text: "", question_type: "open", points: 1, sort_order: prev.length }]);

  const saveEdits = async () => {
    await updateQs.mutateAsync({ quizId: quiz.id, questions: editableQs.filter(q => q.question_text.trim()) });
    toast.success(isAr ? "تم الحفظ" : "Saved");
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 bg-surface-elevated hover:bg-muted/20 text-start transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <FileQuestion className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-medium text-foreground text-sm truncate block">{quiz.title}</span>
          {quiz.lesson_ref && <span className="text-xs text-muted-foreground">{quiz.lesson_ref}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {quiz.assigned && (
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
              {isAr ? "تم الإرسال" : "Assigned"}
            </span>
          )}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setAssigning(true); }}
            className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded-lg flex items-center gap-1 hover:bg-primary/90"
          >
            <Send className="w-3 h-3" />
            {isAr ? "إرسال" : "Assign"}
          </button>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="p-4 border-t border-border space-y-2">
          {editableQs.map((q, i) => (
            <EditableQuestion
              key={i}
              q={q}
              index={i}
              isAr={isAr}
              onChange={updated => setEditableQs(prev => prev.map((p, j) => j === i ? updated : p))}
              onDelete={() => setEditableQs(prev => prev.filter((_, j) => j !== i))}
            />
          ))}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={addBlank}
              className="flex items-center gap-1.5 text-xs px-3 py-2 border border-dashed border-border rounded-lg text-muted-foreground hover:border-primary/40 hover:text-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              {isAr ? "إضافة سؤال" : "Add question"}
            </button>
            <button
              type="button"
              disabled={updateQs.isPending}
              onClick={saveEdits}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              {updateQs.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {isAr ? "حفظ التعديلات" : "Save edits"}
            </button>
          </div>
        </div>
      )}

      {assigning && (
        <AssignDialog quiz={quiz} isAr={isAr} onClose={() => setAssigning(false)} />
      )}
    </div>
  );
}

function TeacherSentAssignmentsPanel({ isAr }: { isAr: boolean }) {
  const { data: classes = [] } = useMyTeacherClasses();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [inspectAssignment, setInspectAssignment] = useState<Assignment | null>(null);
  const { data: assignments = [], isLoading } = useClassAssignments(selectedClassId || undefined);

  const uniqueClasses = useMemo(() => [...new Map(classes.map((c) => [c.class_id, c])).values()], [classes]);

  useEffect(() => {
    if (!selectedClassId && uniqueClasses[0]?.class_id) {
      setSelectedClassId(uniqueClasses[0].class_id);
    }
  }, [uniqueClasses, selectedClassId]);

  return (
    <div className="mt-10 pt-8 border-t border-border space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Send className="w-4 h-4 text-primary" />
        {isAr ? "المهام المرسلة لفصولك (اختبارات وواجبات)" : "Assignments sent to your classes"}
      </h3>
      <p className="text-xs text-muted-foreground">
        {isAr
          ? "اعرض أسئلة كل مهمة وجدول درجات الطلاب بعد التسليم — نفس عرض تبويب الواجبات."
          : "Inspect questions and student scores — same layout as Homework tab."}
      </p>

      <div className="max-w-md">
        <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "الفصل" : "Class"}</label>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
        >
          {!uniqueClasses.length ? (
            <option value="">{isAr ? "لا توجد فصول مسندة إليك" : "No classes assigned"}</option>
          ) : (
            uniqueClasses.map((c) => (
              <option key={c.class_id} value={c.class_id}>
                {c.classes?.name || c.class_id}
              </option>
            ))
          )}
        </select>
      </div>

      <TeacherAssignmentCardsList
        assignments={assignments}
        isLoading={isLoading && !!selectedClassId}
        isAr={isAr}
        onInspect={setInspectAssignment}
        onDeleted={(id) => setInspectAssignment((cur) => (cur?.id === id ? null : cur))}
        emptyMessage={isAr ? "لا مهام لهذا الفصل بعد" : "No assignments for this class yet"}
      />

      <TeacherAssignmentInspectModal assignment={inspectAssignment} isAr={isAr} open={!!inspectAssignment} onClose={() => setInspectAssignment(null)} />
    </div>
  );
}

// ─── QuizBuilder (main component) ────────────────────────────────────────────
export function QuizBuilder() {
  const { isAr } = useTranslation();
  const { user } = useAuth();
  const { data: quizzes = [], isLoading } = useMyQuizzes();
  const saveQuiz = useSaveQuiz();
  const [activeTab, setActiveTab] = useState<"generator" | "bank">("generator");

  const handleSaveToQuiz = async (
    result: QuizResult,
    meta: { bookId?: string; lessonRef?: string; gradeNumber?: number; subjectId?: string; style: string }
  ) => {
    const questions = parseQuestionsFromText(result.questions_text);
    const title = meta.lessonRef || `Quiz — ${new Date().toLocaleDateString()}`;
    try {
      const quizId = await saveQuiz.mutateAsync({
        title,
        title_ar: meta.lessonRef || null,
        lesson_ref: meta.lessonRef || undefined,
        book_id: meta.bookId || undefined,
        subject_id: meta.subjectId || undefined,
        questions,
      });
      toast.success(isAr ? `تم حفظ ${questions.length} سؤال في بنك الأسئلة` : `Saved ${questions.length} questions to quiz bank`);
      setActiveTab("bank");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("generator")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "generator" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <span className="flex items-center gap-1.5">
            <BrainCircuit className="w-4 h-4" />
            {isAr ? "توليد بالذكاء" : "AI Generator"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bank")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === "bank" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <FileQuestion className="w-4 h-4" />
          {isAr ? "بنك الأسئلة" : "Quiz Bank"}
          {quizzes.length > 0 && (
            <span className="ms-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
              {quizzes.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "generator" && (
        <QuizGeneratorAI onSaveToQuiz={handleSaveToQuiz} />
      )}

      {activeTab === "bank" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-primary" />
              {isAr ? "بنك الأسئلة" : "Quiz Bank"}
            </h2>
            <span className="text-xs text-muted-foreground">
              {quizzes.length} {isAr ? "اختبار محفوظ" : "saved quizzes"}
            </span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : quizzes.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-border rounded-xl bg-muted/5">
              <FileQuestion className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <h3 className="font-medium text-foreground mb-1">{isAr ? "لا توجد اختبارات محفوظة" : "No quizzes saved yet"}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {isAr
                  ? "استخدم تبويب «توليد بالذكاء» لتوليد أسئلة وحفظها هنا."
                  : "Use the AI Generator tab to generate questions and save them here."}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("generator")}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
              >
                <BrainCircuit className="w-4 h-4" />
                {isAr ? "ابدأ التوليد" : "Start Generating"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <SavedQuizCard key={quiz.id} quiz={quiz} isAr={isAr} />
              ))}
            </div>
          )}
          <TeacherSentAssignmentsPanel isAr={isAr} />
        </div>
      )}
    </div>
  );
}
