/**
 * PracticeSession — interactive practice viewer with:
 *  - self-correction (show correct answer after submit)
 *  - "Add more questions" that avoids repeating previous ones
 *  - localStorage save/load per book+lesson
 */
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { QuizQuestion, parseQuestionsFromText } from "@/hooks/useQuizData";
import {
  CheckCircle2, XCircle, Loader2,
  Sparkles, Save, RotateCcw, Plus, BookOpen, Trophy,
} from "lucide-react";

const AI_BASE = import.meta.env.VITE_AI_AGENT_URL || "http://localhost:8000";
const STORAGE_KEY = (bookId: string, lesson: string) =>
  `practice_session_${bookId}_${lesson.slice(0, 40)}`;

interface SavedSession {
  bookId: string;
  lesson: string;
  style: string;
  questions: QuizQuestion[];
  answers: Record<number, string>;
  submitted: boolean;
  savedAt: string;
}

interface Props {
  bookId: string;
  lesson: string;
  gradeNumber: number | null;
  style: string;
  initialQuestions: QuizQuestion[];
  onBack: () => void;
}

export function PracticeSession({ bookId, lesson, gradeNumber, style, initialQuestions, onBack }: Props) {
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [addingMore, setAddingMore] = useState(false);
  const [addMoreCount, setAddMoreCount] = useState(5);
  const [addError, setAddError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const storageKey = STORAGE_KEY(bookId, lesson);

  // ── Load saved session ────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const sess: SavedSession = JSON.parse(raw);
        if (sess.questions?.length) {
          setQuestions(sess.questions);
          setAnswers(sess.answers || {});
          setSubmitted(sess.submitted || false);
          setSaved(true);
        }
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  // ── Save session ──────────────────────────────────────────────────────────
  const saveSession = useCallback(() => {
    const sess: SavedSession = {
      bookId, lesson, style,
      questions, answers, submitted,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(sess));
    setSaved(true);
  }, [bookId, lesson, style, questions, answers, submitted, storageKey]);

  // Auto-save when submitted
  useEffect(() => { if (submitted) saveSession(); }, [submitted]);

  // ── Score calculation ─────────────────────────────────────────────────────
  const score = submitted
    ? questions.reduce((acc, q, i) => {
        const ans = answers[i] ?? "";
        const correct = q.answer ?? "";
        if (!correct || q.question_type === "open") return acc;
        const match = ans.trim().toLowerCase() === correct.trim().toLowerCase()
          || correct.toLowerCase().includes(ans.trim().toLowerCase().slice(0, 3));
        return acc + (match ? 1 : 0);
      }, 0)
    : 0;
  const gradable = questions.filter(q => q.question_type !== "open" && q.answer).length;

  // ── Add more questions ────────────────────────────────────────────────────
  const handleAddMore = async () => {
    setAddingMore(true); setAddError(null);
    try {
      const prevTexts = questions.map((q, i) => `${i + 1}. ${q.question_text}`).join("\n");
      const styles = style === "mixed" ? ["mcq", "true_false", "open"] : [style];
      const body = {
        topic: lesson,
        grade_number: gradeNumber ?? undefined,
        book_id: bookId,
        num_questions: addMoreCount,
        styles,
        // Pass previous questions to avoid repetition
        excluded_context: `الأسئلة السابقة (لا تكررها):\n${prevTexts}`,
      };
      const r = await fetch(`${AI_BASE}/rag/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const d = await r.json();
      const newQs = parseQuestionsFromText(d.questions_text || "");
      if (!newQs.length) throw new Error(isAr ? "لم يتم توليد أسئلة" : "No questions generated");
      setQuestions(prev => [...prev, ...newQs]);
      if (submitted) setSubmitted(false); // allow re-submit with new questions
    } catch (e: any) {
      setAddError(e.message);
    } finally {
      setAddingMore(false);
    }
  };

  // ── Answer helpers ────────────────────────────────────────────────────────
  const setAnswer = (idx: number, val: string) => {
    setAnswers(prev => ({ ...prev, [idx]: val }));
    setSaved(false);
  };

  const answeredCount = Object.keys(answers).filter(k => answers[+k]).length;

  // ── Check correctness helper ──────────────────────────────────────────────
  const isCorrectAnswer = (q: QuizQuestion, idx: number): boolean => {
    if (!q.answer) return false;
    const ans = (answers[idx] ?? "").trim().toLowerCase();
    const correct = q.answer.trim().toLowerCase();
    return ans === correct || correct.includes(ans.slice(0, 4)) || ans.includes(correct.slice(0, 4));
  };

  // ── Question result border color ──────────────────────────────────────────
  const getResultColor = (q: QuizQuestion, idx: number) => {
    if (!submitted || q.question_type === "open" || !q.answer) return "";
    return isCorrectAnswer(q, idx) ? "border-green-300 bg-green-50/60" : "border-red-300 bg-red-50/60";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
          <RotateCcw className="w-3.5 h-3.5" />
          {isAr ? "اختيار درس آخر" : "Choose another lesson"}
        </button>
        <div className="flex items-center gap-2">
          {submitted && gradable > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full text-sm font-semibold text-primary">
              <Trophy className="w-4 h-4" />
              {score}/{gradable}
            </div>
          )}
          <button
            onClick={saveSession}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              saved ? "bg-green-50 border-green-200 text-green-700" : "bg-surface-elevated border-border text-foreground hover:bg-muted"
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            {saved ? (isAr ? "محفوظ ✓" : "Saved ✓") : (isAr ? "حفظ" : "Save")}
          </button>
        </div>
      </div>

      {/* Session info */}
      <div className="bg-surface-elevated rounded-lg border border-border px-4 py-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          <span className="font-medium text-foreground">{lesson.slice(0, 60)}</span>
        </div>
        <span>{questions.length} {isAr ? "سؤال" : "questions"}</span>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div
            key={idx}
            className={`rounded-lg border p-4 transition-colors ${getResultColor(q, idx) || "bg-surface-elevated border-border"}`}
          >
            {/* Question header: number + text + verdict icon */}
            <div className="flex items-start gap-2 mb-3">
              <span className="text-primary font-bold text-sm shrink-0">{idx + 1}.</span>
              <p className="text-sm font-medium text-foreground leading-relaxed flex-1">{q.question_text}</p>
              {submitted && q.question_type !== "open" && q.answer && (
                <div className="shrink-0">
                  {isCorrectAnswer(q, idx)
                    ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                    : <XCircle className="w-5 h-5 text-red-500" />}
                </div>
              )}
            </div>

            {/* MCQ options */}
            {q.question_type === "mcq" && q.options_json && (
              <div className="space-y-1.5 ms-5">
                {q.options_json.map((opt) => {
                  const isSelected = answers[idx] === opt.key;
                  const isCorrect = submitted && q.answer?.startsWith(opt.key);
                  const isWrong = submitted && isSelected && !isCorrect;
                  return (
                    <label
                      key={opt.key}
                      className={`flex items-center gap-2 text-sm cursor-pointer px-3 py-1.5 rounded-lg transition-colors ${
                        isCorrect ? "bg-green-100 text-green-700 font-medium" :
                        isWrong  ? "bg-red-100 text-red-600" :
                        isSelected ? "bg-primary/10 text-primary" :
                        "hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="radio" name={`q${idx}`} value={opt.key}
                        checked={isSelected} disabled={submitted}
                        onChange={() => setAnswer(idx, opt.key)}
                        className="accent-primary"
                      />
                      <span><strong>{opt.key}.</strong> {opt.text}</span>
                      {isCorrect && submitted && <CheckCircle2 className="w-3.5 h-3.5 ms-auto shrink-0 text-green-500" />}
                      {isWrong  && submitted && <XCircle       className="w-3.5 h-3.5 ms-auto shrink-0 text-red-400"   />}
                    </label>
                  );
                })}
              </div>
            )}

            {/* True/False */}
            {q.question_type === "true_false" && (
              <div className="flex gap-3 ms-5">
                {[
                  { v: "صواب", e: "True" },
                  { v: "خطأ", e: "False" },
                ].map((o) => {
                  const val = isAr ? o.v : o.e;
                  const isSelected = answers[idx] === val;
                  const isCorrect = submitted && q.answer && (
                    q.answer.includes(o.v) || q.answer.toLowerCase().includes(o.e.toLowerCase())
                  );
                  const isWrong = submitted && isSelected && !isCorrect;
                  return (
                    <label
                      key={val}
                      className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm cursor-pointer border transition-colors ${
                        isCorrect ? "bg-green-100 border-green-300 text-green-700 font-medium" :
                        isWrong ? "bg-red-100 border-red-300 text-red-600" :
                        isSelected ? "bg-primary/10 border-primary/30 text-primary" :
                        "border-border hover:bg-muted/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q${idx}`}
                        value={val}
                        checked={isSelected}
                        disabled={submitted}
                        onChange={() => setAnswer(idx, val)}
                        className="accent-primary"
                      />
                      {val}
                    </label>
                  );
                })}
              </div>
            )}

            {/* Open */}
            {q.question_type === "open" && (
              <textarea
                rows={2} disabled={submitted}
                value={answers[idx] ?? ""}
                onChange={(e) => setAnswer(idx, e.target.value)}
                placeholder={isAr ? "اكتب إجابتك هنا..." : "Write your answer here..."}
                className="w-full ms-5 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none disabled:opacity-70"
              />
            )}

            {/* ── Correction panel — always visible after submit ── */}
            {submitted && (
              <div className={`mt-3 ms-1 rounded-lg border px-4 py-3 text-xs space-y-1.5 ${
                q.question_type === "open"
                  ? "bg-blue-50/60 border-blue-200"
                  : isCorrectAnswer(q, idx)
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
              }`}>
                {/* Verdict */}
                {q.question_type !== "open" && q.answer && (
                  <div className={`flex items-center gap-1.5 font-semibold ${
                    isCorrectAnswer(q, idx) ? "text-green-700" : "text-red-600"
                  }`}>
                    {isCorrectAnswer(q, idx)
                      ? <><CheckCircle2 className="w-3.5 h-3.5" />{isAr ? "إجابة صحيحة ✓" : "Correct ✓"}</>
                      : <><XCircle className="w-3.5 h-3.5" />{isAr ? "إجابة خاطئة ✗" : "Wrong ✗"}</>}
                  </div>
                )}
                {/* Student answer */}
                {answers[idx] && (
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <span className="font-medium shrink-0">{isAr ? "إجابتك:" : "Your answer:"}</span>
                    <span className={isCorrectAnswer(q, idx) ? "text-green-700" : "text-red-600"}>
                      {answers[idx]}
                    </span>
                  </div>
                )}
                {/* Correct answer */}
                {q.answer && (
                  <div className="flex items-start gap-1.5">
                    <span className="font-medium text-foreground shrink-0">{isAr ? "الإجابة الصحيحة:" : "Correct answer:"}</span>
                    <span className="text-green-700 font-medium">{q.answer}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit */}
      {!submitted ? (
        <button
          onClick={() => { setSubmitted(true); }}
          disabled={answeredCount === 0}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          {isAr ? `تسليم وتصحيح (${answeredCount}/${questions.filter(q=>q.question_type!=="open").length})` : `Submit & Check (${answeredCount}/${questions.filter(q=>q.question_type!=="open").length})`}
        </button>
      ) : (
        <div className="bg-surface-elevated rounded-lg border border-border p-4 space-y-3">
          {gradable > 0 && (
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {isAr ? `نتيجتك: ${score} من ${gradable}` : `Your score: ${score} / ${gradable}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((score / gradable) * 100)}%
                  {score === gradable ? (isAr ? " 🎉 ممتاز!" : " 🎉 Perfect!") :
                   score >= gradable * 0.7 ? (isAr ? " 👍 جيد جداً" : " 👍 Great job") :
                   (isAr ? " 💪 راجع الإجابات وحاول مجدداً" : " 💪 Review answers and try again")}
                </p>
              </div>
            </div>
          )}

          {/* Add more */}
          <div className="border-t border-border/50 pt-3">
            <p className="text-xs font-medium text-foreground mb-2">
              {isAr ? "إضافة أسئلة جديدة (مختلفة عن السابقة):" : "Add new questions (different from previous):"}
            </p>
            <div className="flex items-center gap-2">
              <select
                value={addMoreCount}
                onChange={(e) => setAddMoreCount(Number(e.target.value))}
                className="px-2 py-1.5 border border-border rounded text-xs bg-background"
              >
                {[3, 5, 8, 10].map(n => (
                  <option key={n} value={n}>{n} {isAr ? "أسئلة" : "Qs"}</option>
                ))}
              </select>
              <button
                onClick={handleAddMore}
                disabled={addingMore}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {addingMore
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{isAr ? "جارى التوليد..." : "Generating..."}</>
                  : <><Plus className="w-3.5 h-3.5" /><Sparkles className="w-3.5 h-3.5" />{isAr ? "إضافة أسئلة" : "Add Questions"}</>}
              </button>
            </div>
            {addError && (
              <p className="text-xs text-destructive mt-1.5">{addError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
