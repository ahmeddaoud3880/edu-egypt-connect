import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Sparkles, Loader2, AlertCircle, BookOpen, Copy, CheckCircle2, ChevronDown, ChevronUp, BookMarked, Save } from "lucide-react";
import {
  ragGenerateQuiz,
  ragListBooks,
  ragGetBookToc,
  fetchBookTocFromSupabase,
  type RagBook,
  type QuizResult,
  type TocEntry,
} from "@/services/ragService";
import { toast } from "sonner";

const QUESTION_STYLES = [
  { value: "mcq", labelAr: "اختيار من متعدد (MCQ)", labelEn: "Multiple choice" },
  { value: "true_false", labelAr: "صواب أو خطأ", labelEn: "True / False" },
  { value: "open", labelAr: "أسئلة مقالية مفتوحة", labelEn: "Open-ended" },
] as const;

interface QuizGeneratorMeta {
  bookId?: string;
  lessonRef?: string;
  /** Selected TOC entries combined for RAG + metadata */
  lessonRefs?: string[];
  assignmentTitleEn?: string;
  assignmentTitleAr?: string;
  gradeNumber?: number;
  subjectId?: string;
  style: string;
}

interface QuizGeneratorProps {
  /** Called when the teacher wants to save the generated questions to the quiz bank */
  onSaveToQuiz?: (result: QuizResult, meta: QuizGeneratorMeta) => void;
  /**
   * When set, shows "Send as homework" after generation (e.g. from Homework tab when a class is selected).
   */
  onAssignHomework?: (result: QuizResult, meta: QuizGeneratorMeta) => void | Promise<void>;
  /** Must be true to enable the homework-assign button when ``onAssignHomework`` is set */
  homeworkAssignEnabled?: boolean;
}

export function QuizGeneratorAI({
  onSaveToQuiz,
  onAssignHomework,
  homeworkAssignEnabled,
}: QuizGeneratorProps) {
  const { isAr } = useTranslation();
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState<number | "">("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [bookId, setBookId] = useState<string>("");
  const [lessonRef, setLessonRef] = useState<string>("");
  const [selectedTocTitles, setSelectedTocTitles] = useState<string[]>([]);
  const [assignmentTitleEn, setAssignmentTitleEn] = useState("");
  const [assignmentTitleAr, setAssignmentTitleAr] = useState("");
  const [num, setNum] = useState(5);
  const [selectedStyles, setSelectedStyles] = useState<Set<"mcq" | "true_false" | "open">>(
    () => new Set(["mcq"])
  );
  const [books, setBooks] = useState<RagBook[]>([]);
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [tocLoading, setTocLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    ragListBooks().then(setBooks).catch(() => {});
  }, []);

  // Load TOC when book changes: AI backend first; if empty or unreachable, Supabase toc_json fallback
  useEffect(() => {
    if (!bookId) {
      setToc([]);
      setSelectedTocTitles([]);
      return;
    }
    setTocLoading(true);
    setTocOpen(false);
    let cancelled = false;

    void (async () => {
      let entries: TocEntry[] = [];
      try {
        const data = await ragGetBookToc(bookId);
        entries = data.toc || [];
      } catch {
        entries = [];
      }
      if (!cancelled && entries.length === 0) {
        try {
          entries = await fetchBookTocFromSupabase(bookId);
        } catch {
          entries = [];
        }
      }
      if (!cancelled) {
        setToc(entries);
        if (entries.length > 0) setTocOpen(true);
      }
      if (!cancelled) setTocLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  // Subjects derived from ingested books for the chosen grade
  const subjectsForGrade = books
    .filter((b) => (grade ? b.grade_number === grade : true))
    .reduce<Record<string, string>>((acc, b) => {
      if (b.subject_id && b.subject_name) acc[b.subject_id] = b.subject_name;
      return acc;
    }, {});
  const subjectOptions = Object.entries(subjectsForGrade);

  // Books filtered by grade+subject
  const filteredBooks = books.filter((b) => {
    if (grade && b.grade_number !== grade) return false;
    if (subjectId && b.subject_id !== subjectId) return false;
    return true;
  });

  const grades = Array.from(new Set(books.map((b) => b.grade_number).filter(Boolean))) as number[];
  grades.sort((a, b) => a - b);

  const toggleTocLesson = useCallback((entry: TocEntry) => {
    const title = entry.title.trim();
    if (!title) return;
    setSelectedTocTitles((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  }, []);

  const generate = async () => {
    if (!topic.trim() && selectedTocTitles.length === 0) {
      toast.error(isAr ? "اكتب موضوع الأسئلة أو اختر دروساً من الفهرس" : "Enter a topic or pick lessons from the TOC");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const stylesArr = Array.from(selectedStyles);
      const scopeParts = [topic.trim(), ...selectedTocTitles].filter(Boolean);
      const scopeTopic = scopeParts.join("\n---\n").slice(0, 12000);
      const refsJoined =
        selectedTocTitles.length > 0 ? selectedTocTitles.join(" | ") : lessonRef.trim() || undefined;
      const r = await ragGenerateQuiz({
        topic: scopeTopic,
        grade_number: grade || undefined,
        subject_id: subjectId || undefined,
        book_id: bookId || undefined,
        lesson_ref: refsJoined,
        num_questions: num,
        style: stylesArr[0] || "mcq",
        styles: stylesArr.length > 1 ? stylesArr : undefined,
      });
      setResult(r);
      if (!r.passages_used || r.passages_used.length === 0) {
        toast.message(isAr ? "لم نجد فقرات مطابقة" : "No matching passages found");
      }
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result?.questions_text) return;
    await navigator.clipboard.writeText(result.questions_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface-elevated rounded-lg border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">
              {isAr ? "مولد الأسئلة من الكتاب" : "Textbook Quiz Generator"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "أسئلة مستندة فقط للكتاب الرسمي مع رقم الصفحة"
                : "Questions grounded in the official textbook with page citations"}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {/* Grade */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "الصف" : "Grade"}</label>
            <select
              value={grade}
              onChange={(e) => { setGrade(e.target.value ? Number(e.target.value) : ""); setSubjectId(""); setBookId(""); }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
            >
              <option value="">{isAr ? "كل الصفوف" : "All grades"}</option>
              {grades.map((g) => <option key={g} value={g}>{isAr ? `الصف ${g}` : `Grade ${g}`}</option>)}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "المادة" : "Subject"}</label>
            <select
              value={subjectId}
              onChange={(e) => { setSubjectId(e.target.value); setBookId(""); }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
              disabled={subjectOptions.length === 0}
            >
              <option value="">{isAr ? "كل المواد" : "All subjects"}</option>
              {subjectOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>

          {/* Book */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "الكتاب" : "Book"}</label>
            <select
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
              disabled={filteredBooks.length === 0}
            >
              <option value="">{isAr ? "اختر كتاباً للاقتراح من درس محدد" : "Choose a book to select a specific lesson"}</option>
              {filteredBooks.map((b) => (
                <option key={b.id} value={b.id}>{b.title_ar || b.title}</option>
              ))}
            </select>
          </div>

          {/* TOC Lesson Picker */}
          {bookId && (
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => setTocOpen(o => !o)}
                className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm bg-background hover:bg-muted/30 transition-colors"
                disabled={tocLoading}
              >
                <BookMarked className="w-4 h-4 text-primary shrink-0" />
                <span className="flex-1 text-start text-muted-foreground">
                  {tocLoading
                    ? (isAr ? "جارى تحميل فهرس الكتاب..." : "Loading table of contents...")
                    : selectedTocTitles.length > 0
                      ? `${isAr ? "دروس/وحدات مختارة (" : "Selected ("}${selectedTocTitles.length}${isAr ? ")" : ")"}: ${selectedTocTitles.slice(0, 2).join(" · ")}${selectedTocTitles.length > 2 ? " …" : ""}`
                      : isAr
                      ? "انقر لتوسيع الفهرس — يمكن تحديد أكثر من درس/وحدة"
                      : "Open TOC — select multiple lessons/units"}
                </span>
                {tocLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : tocOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {tocOpen && toc.length > 0 && (
                <div className="mt-1 border border-border rounded-lg bg-background max-h-64 overflow-y-auto shadow-md">
                  {toc.map((entry, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleTocLesson(entry)}
                      className={`w-full text-start px-3 py-2.5 hover:bg-primary/5 border-b border-border/50 last:border-0 transition-colors ${
                        selectedTocTitles.includes(entry.title.trim()) ? "bg-primary/15 ring-1 ring-primary/25" : ""
                      }`}
                      style={{ paddingInlineStart: `${(entry.level - 1) * 16 + 12}px` }}
                    >
                      <span className={`text-sm ${entry.level === 1 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {entry.title}
                      </span>
                      {entry.page != null && (
                        <span className="ms-2 text-xs text-muted-foreground/60">
                          {isAr ? `ص ${entry.page}` : `p.${entry.page}`}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {tocOpen && toc.length === 0 && !tocLoading && (
                <div className="mt-1 p-3 text-center text-xs text-muted-foreground border border-border rounded-lg">
                  {isAr ? "لا يوجد فهرس لهذا الكتاب. أدخل الموضوع يدوياً." : "No TOC for this book. Enter topic manually."}
                </div>
              )}
            </div>
          )}

          <div className="md:col-span-2 rounded-lg border border-dashed border-border bg-muted/15 p-3 space-y-2">
            <p className="text-xs font-medium text-foreground">
              {isAr ? "اسم الواجب/الاختبار كما يظهر للطلاب (اختياري — ليس عنوان الفهرس فقط)" : "Custom assignment title for students (optional)"}
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                value={assignmentTitleAr}
                onChange={(e) => setAssignmentTitleAr(e.target.value)}
                placeholder={isAr ? "العربية — مثل: ورقة تدريب الوحدة الثانية" : "Arabic title"}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
                dir="rtl"
              />
              <input
                value={assignmentTitleEn}
                onChange={(e) => setAssignmentTitleEn(e.target.value)}
                placeholder={isAr ? "الإنجليزية (اختياري)" : "English title (optional)"}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
                dir="ltr"
              />
            </div>
          </div>

          {selectedTocTitles.length > 0 ? (
            <div className="md:col-span-2 flex flex-wrap gap-1.5">
              {selectedTocTitles.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] text-foreground"
                >
                  {t}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={isAr ? `إزالة ${t}` : `Remove ${t}`}
                    onClick={() => setSelectedTocTitles((prev) => prev.filter((x) => x !== t))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {/* Topic */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-foreground mb-1">
              {isAr ? "المحتوى / الموضوع (أو اختر دروساً من الفهرس أعلاه)" : "Topic / scope (or pick TOC entries above)"}
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={isAr ? "مثال: الجملة الاسمية" : "e.g. Algebraic expressions"}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              dir={isAr ? "rtl" : "ltr"}
            />
          </div>

          {/* Count + style */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "عدد الأسئلة" : "Number of questions"}</label>
            <input
              type="number"
              min={1}
              max={20}
              value={num}
              onChange={(e) => setNum(Math.max(1, Math.min(20, Number(e.target.value) || 5)))}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-foreground mb-1">
              {isAr ? "أنواع الأسئلة (يمكن اختيار أكثر من نوع)" : "Question types (multi-select)"}
            </label>
            <div className="flex flex-wrap gap-3 p-2 border border-border rounded-lg bg-background">
              {QUESTION_STYLES.map((s) => (
                <label key={s.value} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedStyles.has(s.value)}
                    onChange={() => {
                      setSelectedStyles((prev) => {
                        const n = new Set(prev);
                        if (n.has(s.value)) {
                          if (n.size > 1) n.delete(s.value);
                        } else {
                          n.add(s.value);
                        }
                        return n;
                      });
                    }}
                    className="rounded border-border"
                  />
                  <span>{isAr ? s.labelAr : s.labelEn}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading || (!topic.trim() && selectedTocTitles.length === 0)}
          className="mt-4 w-full sm:w-auto px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {isAr ? "ولّد الأسئلة" : "Generate"}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="bg-surface-elevated rounded-lg border border-border p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              {isAr ? "الأسئلة المولّدة" : "Generated questions"}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {onSaveToQuiz && (
                <button
                  onClick={() =>
                    onSaveToQuiz(result, {
                      bookId: bookId || undefined,
                      lessonRef:
                        selectedTocTitles.length > 0
                          ? selectedTocTitles.join(" | ")
                          : lessonRef || topic || undefined,
                      lessonRefs: selectedTocTitles.length > 0 ? [...selectedTocTitles] : undefined,
                      assignmentTitleAr: assignmentTitleAr.trim() || undefined,
                      assignmentTitleEn: assignmentTitleEn.trim() || undefined,
                      gradeNumber: grade || undefined,
                      subjectId: subjectId || undefined,
                      style: Array.from(selectedStyles).join("+"),
                    })
                  }
                  className="text-xs px-3 py-1.5 bg-primary text-primary-foreground border border-primary rounded-lg flex items-center gap-1.5 hover:bg-primary/90"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isAr ? "حفظ في بنك الأسئلة" : "Save to Quiz Bank"}
                </button>
              )}
              {onAssignHomework && homeworkAssignEnabled && (
                <button
                  type="button"
                  onClick={() =>
                    void onAssignHomework(result, {
                      bookId: bookId || undefined,
                      lessonRef:
                        selectedTocTitles.length > 0
                          ? selectedTocTitles.join(" | ")
                          : lessonRef || topic || undefined,
                      lessonRefs: selectedTocTitles.length > 0 ? [...selectedTocTitles] : undefined,
                      assignmentTitleAr: assignmentTitleAr.trim() || undefined,
                      assignmentTitleEn: assignmentTitleEn.trim() || undefined,
                      gradeNumber: grade || undefined,
                      subjectId: subjectId || undefined,
                      style: Array.from(selectedStyles).join("+"),
                    })
                  }
                  className="text-xs px-3 py-1.5 border border-green-700/40 bg-green-600/15 text-green-800 dark:text-green-200 rounded-lg flex items-center gap-1.5 hover:bg-green-600/25"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {isAr ? "إرسال كواجب للفصل" : "Send as homework to class"}
                </button>
              )}
              <button
                onClick={copy}
                className="text-xs px-3 py-1.5 border border-border rounded-lg flex items-center gap-1.5 hover:bg-muted"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? (isAr ? "تم النسخ" : "Copied") : (isAr ? "نسخ" : "Copy")}
              </button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed bg-background p-4 rounded-lg border border-border" dir="rtl">
            {result.questions_text}
          </pre>
          {result.passages_used && result.passages_used.length > 0 && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">
                {isAr ? `المصادر (${result.passages_used.length} مقطع)` : `Sources (${result.passages_used.length} passages)`}
              </summary>
              <ul className="mt-2 space-y-1 ps-4">
                {result.passages_used.map((p, i) => (
                  <li key={i}>
                    {p.book_title} {p.page_number != null ? `· ${isAr ? `صفحة ${p.page_number}` : `p.${p.page_number}`}` : ""}
                    {" "}<span className="opacity-60">(sim={p.similarity?.toFixed(2)})</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
