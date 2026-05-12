import type { QuizQuestion } from "@/hooks/useQuizData";

/** Mirrors public.mcq_answer_equiv (Postgres). */
export function mcqAnswerEquiv(student: string, correct: string): boolean {
  return (student ?? "").trim().toUpperCase() === (correct ?? "").trim().toUpperCase();
}

/** Normalizes inputs like public.tf_answer_equiv. */
export function normalizeTfToken(raw: string): string {
  const x = (raw ?? "").trim().toLowerCase();
  if (["true", "t", "1", "yes", "y", "صواب", "صح", "نعم"].includes(x)) return "T";
  if (["false", "f", "0", "no", "n", "خطأ", "غلط", "لا"].includes(x)) return "F";
  return (raw ?? "").trim().toUpperCase();
}

/** Mirrors public.tf_answer_equiv — student empty after normalization → false. */
export function tfAnswerEquiv(student: string, correct: string): boolean {
  const sn = normalizeTfToken(student);
  const cn = normalizeTfToken(correct);
  return sn !== "" && sn === cn;
}

/** Mirrors open branch in submit_student_quiz when both sides non-empty. */
export function openAnswerEquiv(student: string, correct: string): boolean {
  const c = (correct ?? "").trim();
  const s = (student ?? "").trim();
  if (!c || !s) return false;
  return s.toLowerCase() === c.toLowerCase();
}

export function isQuizAnswerCorrect(q: QuizQuestion, studentRaw: string): boolean {
  const correct = q.answer ?? "";
  const student = studentRaw ?? "";
  if (q.question_type === "mcq") return mcqAnswerEquiv(student, correct);
  if (q.question_type === "true_false") return tfAnswerEquiv(student, correct);
  return openAnswerEquiv(student, correct);
}

/** Human-readable correct answer after submit (for review). */
export function formatCorrectAnswerDisplay(q: QuizQuestion, isAr: boolean): string {
  const a = (q.answer ?? "").trim();
  if (!a)
    return isAr
      ? "لا يوجد مفتاح إجابة آلية — ستُقيَّم إجابتك من المعلّم."
      : "No auto answer key — your answer may be graded by the teacher.";

  if (q.question_type === "mcq" && q.options_json?.length) {
    const key = a.trim().toUpperCase();
    const hit = q.options_json.find((o) => (o.key ?? "").trim().toUpperCase() === key);
    if (hit) return `${hit.key}. ${hit.text}`;
    return a;
  }

  if (q.question_type === "true_false") {
    const cn = normalizeTfToken(a);
    if (cn === "T") return isAr ? "صواب" : "True";
    if (cn === "F") return isAr ? "خطأ" : "False";
    return a;
  }

  return a;
}
