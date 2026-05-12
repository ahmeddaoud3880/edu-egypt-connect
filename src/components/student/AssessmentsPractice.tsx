import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useQuery } from "@tanstack/react-query";
import { FileText, Clock, AlertCircle, Brain, BookOpen, Loader2, Sparkles, ChevronDown } from "lucide-react";
import { useStudentRegistrationInfo, useStudentAssignments } from "@/hooks/useStudentData";
import { parseQuestionsFromText, QuizQuestion } from "@/hooks/useQuizData";
import { PracticeSession } from "@/components/student/PracticeSession";

const AI_BASE = import.meta.env.VITE_AI_AGENT_URL || "http://localhost:8000";

type QuestionStyle = "mcq" | "true_false" | "open" | "mixed";
interface TocEntry { title: string; page: number | null }
interface RagBook { id: string; title_ar: string | null; title: string; subject_name: string | null; grade_number: number }

function useRagBooks(gradeNumber: number) {
  return useQuery({
    queryKey: ["rag_books", gradeNumber],
    queryFn: async (): Promise<RagBook[]> => {
      const r = await fetch(`${AI_BASE}/rag/books${gradeNumber ? `?grade=${gradeNumber}` : ""}`);
      if (!r.ok) throw new Error("Cannot load books");
      const d = await r.json();
      return d.books || [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

function useBookToc(bookId: string | null) {
  return useQuery({
    queryKey: ["book_toc", bookId],
    queryFn: async (): Promise<TocEntry[]> => {
      if (!bookId) return [];
      const r = await fetch(`${AI_BASE}/rag/books/${bookId}/toc`);
      if (!r.ok) throw new Error("Cannot load TOC");
      const d = await r.json();
      return (d.toc || []).filter((e: TocEntry) => e.title && e.title.length > 3);
    },
    enabled: !!bookId,
    staleTime: 1000 * 60 * 10,
  });
}

// ── Assigned assessments (real quizzes from teacher) ─────────────────────────
// ── Practice Quiz Generator ───────────────────────────────────────────────────
function PracticeGenerator({ gradeNumber }: { gradeNumber: number | null }) {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { data: books = [], isLoading: booksLoading } = useRagBooks(gradeNumber ?? 0);
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [style, setStyle] = useState<QuestionStyle>("mcq");
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<QuizQuestion[] | null>(null);

  const { data: toc = [], isLoading: tocLoading } = useBookToc(selectedBook || null);

  const styleOptions: { value: QuestionStyle; labelAr: string; labelEn: string }[] = [
    { value: "mcq", labelAr: "اختيار من متعدد", labelEn: "Multiple Choice" },
    { value: "true_false", labelAr: "صواب أو خطأ", labelEn: "True / False" },
    { value: "open", labelAr: "مقالية مفتوحة", labelEn: "Open Questions" },
    { value: "mixed", labelAr: "مختلطة", labelEn: "Mixed" },
  ];

  const handleGenerate = async () => {
    if (!selectedBook || !selectedLesson) return;
    setGenerating(true); setError(null); setGeneratedText(null);
    try {
      const styles = style === "mixed" ? ["mcq", "true_false", "open"] : [style];
      const book = books.find(b => b.id === selectedBook);
      const body = {
        topic: selectedLesson,
        grade_number: gradeNumber ?? undefined,
        book_id: selectedBook,
        num_questions: numQuestions,
        styles,
      };
      const r = await fetch(`${AI_BASE}/rag/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const d = await r.json();
      setGeneratedText(d.questions_text || "");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const parsedQuestions = generatedText ? parseQuestionsFromText(generatedText) : [];

  // ── If session is active, show PracticeSession ──────────────────────────
  if (sessionQuestions && sessionQuestions.length > 0) {
    return (
      <PracticeSession
        bookId={selectedBook}
        lesson={selectedLesson}
        gradeNumber={gradeNumber}
        style={style}
        initialQuestions={sessionQuestions}
        onBack={() => { setSessionQuestions(null); setGeneratedText(null); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Book selector */}
      {booksLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          {isAr ? "جارى تحميل الكتب..." : "Loading books..."}
        </div>
      ) : books.length === 0 ? (
        <div className="bg-muted/20 rounded-lg p-6 text-center">
          <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {isAr ? "لا توجد كتب مفهرسة لصفّك حالياً." : "No indexed books for your grade yet."}
          </p>
        </div>
      ) : (
        <>
          {/* Book */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              {isAr ? "الكتاب" : "Book"}
            </label>
            <div className="relative">
              <select
                value={selectedBook}
                onChange={(e) => { setSelectedBook(e.target.value); setSelectedLesson(""); setGeneratedText(null); }}
                className="w-full appearance-none px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 pe-8"
              >
                <option value="">{isAr ? "-- اختر الكتاب --" : "-- Select Book --"}</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title_ar || b.title} {b.subject_name ? `(${b.subject_name})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute end-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* TOC (Lesson) */}
          {selectedBook && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                {isAr ? "الوحدة / الدرس" : "Unit / Lesson"}
              </label>
              {tocLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {isAr ? "تحميل الفهرس..." : "Loading TOC..."}
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedLesson}
                    onChange={(e) => { setSelectedLesson(e.target.value); setGeneratedText(null); }}
                    className="w-full appearance-none px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 pe-8"
                  >
                    <option value="">{isAr ? "-- اختر الدرس --" : "-- Select Lesson --"}</option>
                    {toc.map((entry, i) => (
                      <option key={i} value={entry.title}>
                        {entry.title} {entry.page ? `(ص ${entry.page})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute end-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              )}
            </div>
          )}

          {/* Options row */}
          {selectedBook && selectedLesson && (
            <div className="grid grid-cols-2 gap-3">
              {/* Question count */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  {isAr ? "عدد الأسئلة" : "# Questions"}
                </label>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {[3, 5, 8, 10, 15].map((n) => (
                    <option key={n} value={n}>{n} {isAr ? "أسئلة" : "questions"}</option>
                  ))}
                </select>
              </div>
              {/* Style */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  {isAr ? "شكل الأسئلة" : "Question Style"}
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value as QuestionStyle)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {styleOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {isAr ? s.labelAr : s.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Generate button */}
          {selectedBook && selectedLesson && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" />{isAr ? "جارى التوليد..." : "Generating..."}</>
                : <><Sparkles className="w-4 h-4" />{isAr ? "توليد التدريب" : "Generate Practice"}</>}
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {/* Preview + Start button */}
          {generatedText && parsedQuestions.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-green-700">
                  ✅ {isAr ? `تم توليد ${parsedQuestions.length} سؤال` : `${parsedQuestions.length} questions generated`}
                </p>
                <button
                  onClick={() => setSessionQuestions(parsedQuestions)}
                  className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                >
                  {isAr ? "ابدأ التدريب ▶" : "Start Practice ▶"}
                </button>
              </div>
              <p className="text-xs text-green-600">
                {isAr
                  ? `درس: ${selectedLesson.slice(0, 60)} • ${styleOptions.find(s=>s.value===style)?.labelAr}`
                  : `Lesson: ${selectedLesson.slice(0, 60)} • ${styleOptions.find(s=>s.value===style)?.labelEn}`}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AssessmentsPractice() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { data: regInfo, isLoading: regLoading } = useStudentRegistrationInfo();
  const { data: assignments = [], isLoading: assignLoading } = useStudentAssignments();
  const isLoading = regLoading || assignLoading;

  if (isLoading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
      <Clock className="w-4 h-4 animate-spin" /> {isAr ? "جارى التحميل..." : "Loading..."}
    </div>
  );

  if (!regInfo || !["approved", "activated"].includes(regInfo.request_status)) {
    return (
      <div className="bg-surface-elevated rounded-lg border border-amber-200 p-8 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <p className="text-sm text-muted-foreground">
          {isAr ? "ستظهر التقييمات والتدريبات فور تفعيل الحساب." : "Assessments and practice will appear after account activation."}
        </p>
      </div>
    );
  }

  const quizAssignments = assignments.filter((a) => a.quiz_id && a.assignment_type !== "homework");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "التقييمات والتدريبات" : "Assessments & Practice"}</h2>
      </div>

      {/* ── Official Assessments from Teacher ── */}
      <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{isAr ? "الاختبارات الرسمية" : "Official Assessments"}</h3>
          <span className="ms-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {quizAssignments.length}
          </span>
        </div>
        {quizAssignments.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {isAr ? "لا توجد اختبارات رسمية مُعيَّنة حتى الآن." : "No official assessments assigned yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {quizAssignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-4 hover:bg-muted/5 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isAr ? a.title_ar || a.title : a.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.due_date ? `📅 ${a.due_date}` : (isAr ? "بدون موعد تسليم" : "No due date")}
                  </p>
                </div>
                <a
                  href={`/dashboard/student/quiz/${a.id}`}
                  className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {isAr ? "ابدأ ▶" : "Start ▶"}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── AI Practice Generator ── */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200/60 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-foreground">{isAr ? "تدريب مقترح بالذكاء الاصطناعى" : "AI-Powered Practice"}</h3>
          <span className="ms-auto text-[10px] font-medium px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
            RAG
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          {isAr
            ? "اختر الكتاب والدرس وعدد الأسئلة وشكلها — سيولّد الذكاء الاصطناعى أسئلة من محتوى الكتاب الرسمى مباشرةً."
            : "Select a book, lesson, count, and style — AI generates questions directly from the official textbook content."}
        </p>
        <PracticeGenerator gradeNumber={regInfo.grade_number ?? null} />
      </div>
    </div>
  );
}
