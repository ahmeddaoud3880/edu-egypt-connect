import { useMemo, useState, Fragment, useEffect } from "react";
import { X, ClipboardList, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useQuizQuestions, type QuizQuestion } from "@/hooks/useQuizData";
import {
  useAssignmentSubmissions,
  useTeacherOverrideSubmissionScore,
  type Assignment,
  type AssignmentSubmissionRow,
} from "@/hooks/useTeacherData";

function ReadOnlyQuestionCard({ q, index, isAr }: { q: QuizQuestion; index: number; isAr: boolean }) {
  const n = index + 1;
  const typeLab =
    q.question_type === "mcq"
      ? isAr
        ? "اختيار من متعدد"
        : "MCQ"
      : q.question_type === "true_false"
        ? isAr
          ? "صح / خطأ"
          : "T / F"
        : isAr
          ? "مقالي"
          : "Open";

  return (
    <div className="rounded-xl border border-border bg-gradient-to-b from-surface-elevated to-background p-4 space-y-3 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
          {n}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60 border border-border/60">
              {typeLab}
            </span>
            {q.points != null ? (
              <span className="text-[10px] text-muted-foreground">
                {isAr ? `الدرجة: ${q.points}` : `Pts: ${q.points}`}
              </span>
            ) : null}
          </div>
          <p className="text-sm font-medium text-foreground leading-relaxed">{q.question_text}</p>
          {q.options_json && q.options_json.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {q.options_json.map((opt) => (
                <li
                  key={opt.key}
                  className={`text-sm rounded-lg border px-3 py-2 leading-relaxed ${
                    opt.key === q.answer
                      ? "border-green-600/40 bg-green-500/10 text-green-900 dark:text-green-100"
                      : "border-border/80 bg-muted/20 text-muted-foreground"
                  }`}
                >
                  <span className="font-mono text-xs opacity-70 me-1">{opt.key}.</span>
                  {opt.text}
                </li>
              ))}
            </ul>
          )}
          {q.answer && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-green-700 dark:text-green-400">
                {isAr ? "الإجابة النموذجية: " : "Answer key: "}
              </span>
              {q.answer}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: string | null | undefined, isAr: boolean) {
  const s = (status || "pending").toLowerCase();
  if (s === "graded") return isAr ? "مصحَّح" : "Graded";
  if (s === "submitted") return isAr ? "مُسلَّم" : "Submitted";
  if (s === "pending") return isAr ? "لم يسلِّم بعد" : "Not submitted";
  return status || "—";
}

function SubmissionDetailPanel({
  row,
  assignmentId,
  questions,
  maxScore,
  isAr,
}: {
  row: AssignmentSubmissionRow;
  assignmentId: string;
  questions: QuizQuestion[];
  maxScore: number | null;
  isAr: boolean;
}) {
  const patchScore = useTeacherOverrideSubmissionScore();
  const ans: Record<string, string> =
    row.answers_json && typeof row.answers_json === "object" && !Array.isArray(row.answers_json)
      ? (row.answers_json as Record<string, string>)
      : {};
  const grading = row.grading_details as
    | {
        open_grading?: Array<{
          question_id: string;
          feedback_ar?: string;
          points_earned?: number;
          max_points?: number;
        }>;
      }
    | null
    | undefined;
  const openItems = grading?.open_grading || [];
  const [editScore, setEditScore] = useState(row.score != null ? String(row.score) : "");

  useEffect(() => {
    setEditScore(row.score != null ? String(row.score) : "");
  }, [row.score, row.id]);

  return (
    <td colSpan={5} className="px-4 py-4 bg-muted/25 border-t border-border align-top" onClick={(e) => e.stopPropagation()}>
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">
          {isAr ? "إجابات الطالب حسب كل سؤال" : "Per-question responses"}
        </p>
        {questions.map((q, i) => {
          if (!q.id) return null;
          const fb = openItems.find((o) => o.question_id === q.id);
          return (
            <div key={q.id} className="rounded-lg border border-border bg-background/80 p-3 space-y-2 text-sm">
              <div className="text-[10px] text-muted-foreground">
                #{i + 1} · {q.question_type}
              </div>
              <p className="font-medium leading-relaxed">{q.question_text}</p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                <span className="font-medium text-foreground">{isAr ? "إجابة الطالب:" : "Student:"}</span> {ans[q.id]?.trim() || "—"}
              </p>
              {q.answer ? (
                <p className="text-xs text-green-800 dark:text-green-300 whitespace-pre-wrap">
                  <span className="font-medium">{isAr ? "المرجع:" : "Key:"}</span> {q.answer}
                </p>
              ) : null}
              {fb ? (
                <p className="text-xs bg-primary/10 border border-primary/20 rounded px-2 py-1 leading-relaxed">
                  <span className="font-medium">{isAr ? "تقييم المقالي (آلي):" : "Essay grading (AI):"}</span>{" "}
                  ({fb.points_earned ?? 0}/{fb.max_points ?? q.points ?? 1}) {fb.feedback_ar ? `— ${fb.feedback_ar}` : ""}
                </p>
              ) : null}
            </div>
          );
        })}

        <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-border/60">
          <div>
            <label className="text-xs font-medium block mb-1">{isAr ? "تصحيح الدرجة الإجمالية" : "Override total score"}</label>
            <input
              type="number"
              step="any"
              className="w-28 px-3 py-2 border border-border rounded-lg text-sm bg-background"
              value={editScore}
              onChange={(e) => setEditScore(e.target.value)}
              max={maxScore != null ? String(maxScore) : undefined}
            />
            {maxScore != null ? (
              <span className="text-xs text-muted-foreground ms-2">
                / {maxScore}
              </span>
            ) : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={patchScore.isPending || editScore === "" || Number.isNaN(Number(editScore))}
            className="h-10"
            onClick={() => {
              const n = Number(String(editScore).replace(/,/g, "."));
              if (Number.isNaN(n)) return;
              void patchScore
                .mutateAsync({
                  submissionId: row.id,
                  studentId: row.student_id,
                  assignmentId,
                  score: n,
                  gradingDetails: (row.grading_details as Record<string, unknown>) || {},
                })
                .then(() => toast.success(isAr ? "تم حفظ الدرجة المصحَّحة وتسجيلها في الفصول." : "Corrected score saved and synced to gradebook."));
            }}
          >
            {isAr ? "حفظ الدرجة المصحَّحة" : "Save corrected score"}
          </Button>
        </div>
      </div>
    </td>
  );
}

export function TeacherAssignmentInspectModal({
  assignment,
  isAr,
  open,
  onClose,
}: {
  assignment: Assignment | null;
  isAr: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const quizId = assignment?.quiz_id ?? null;
  const { data: questions = [], isLoading: qLoad } = useQuizQuestions(open ? quizId : null);
  const { data: submissions = [], isLoading: sLoad, isError: submissionsErr } = useAssignmentSubmissions(open ? assignment?.id : undefined);

  const maxFromQuiz = useMemo(
    () => questions.reduce((s, q) => s + (q.points ?? 1), 0),
    [questions],
  );

  const maxScore = maxFromQuiz > 0 ? maxFromQuiz : assignment?.max_score ?? null;

  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  if (!open || !assignment) return null;

  const title = isAr ? assignment.title_ar || assignment.title : assignment.title;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal
        className="relative w-full max-w-3xl max-h-[min(90vh,900px)] overflow-y-auto rounded-2xl border border-border bg-surface-elevated shadow-2xl my-4"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface-elevated/95 backdrop-blur px-5 py-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary shrink-0" />
              <span className="truncate">{title}</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {assignment.assignment_type && (
                <span className="me-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {assignment.assignment_type === "quiz"
                    ? isAr ? "اختبار" : "Quiz"
                    : assignment.assignment_type === "homework"
                      ? isAr ? "واجب" : "Homework"
                      : assignment.assignment_type}
                </span>
              )}
              {assignment.due_date
                ? `${isAr ? "التسليم: " : "Due: "} ${assignment.due_date}`
                : null}
              {maxScore != null ? ` · ${isAr ? `من ${maxScore}` : `/ ${maxScore} max`}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-8">
          {assignment.description?.trim() && (
            <div className="rounded-xl border border-amber-200/60 bg-amber-500/5 p-4 text-sm text-foreground">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
                {isAr ? "التعليمات" : "Instructions"}
              </p>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{assignment.description}</p>
            </div>
          )}

          {quizId ? (
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                {isAr ? "الأسئلة" : "Questions"}
              </h4>
              {qLoad ? (
                <div className="flex justify-center py-12 text-muted-foreground gap-2 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isAr ? "جارى التحميل…" : "Loading…"}
                </div>
              ) : questions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{isAr ? "لا توجد أسئلة مخزَّنة لهذا الإسناد." : "No questions stored for this task."}</p>
              ) : (
                <div className="space-y-4">
                  {questions.map((q, i) => (
                    <ReadOnlyQuestionCard key={q.id || i} q={q} index={i} isAr={isAr} />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {isAr ? "مهمة بدون أسئلة تفاعليّة (وصف أو تسليم يدوى فقط)." : "Plain assignment (no quiz questions linked)."}
            </p>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                {isAr ? "درجات الطلاب" : "Student scores"}
              </h4>
              <span className="text-xs text-muted-foreground">
                {isAr ? `${submissions.length} سجل` : `${submissions.length} row(s)`}
              </span>
            </div>
            {sLoad ? (
              <div className="flex justify-center py-8 gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /> {isAr ? "جارى التحميل…" : "Loading…"}
              </div>
            ) : submissionsErr ? (
              <p className="text-sm text-red-600 dark:text-red-400 py-6 text-center border border-dashed border-red-300/70 rounded-xl bg-red-500/5">
                {isAr
                  ? "تعذّر تحميل تسليمات الطلاب — تحقّق من ربطك بالفصل في «تعيين المعلّم بالصفوف» وأن حسابك مرتبط بجدول المعلّمين."
                  : "Could not load student submissions — ensure you are assigned to this class in teacher-class links."}
              </p>
            ) : submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl bg-muted/20">
                {isAr ? "لا يوجد تسليم بعد — ستظهر الدرجة هنا عند بدء الطلاب وحل الواجب/الاختبار." : "No submissions yet."}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-left rtl:text-right">
                      <th className="px-4 py-2.5 font-medium">{isAr ? "الطالب" : "Student"}</th>
                      <th className="px-4 py-2.5 font-medium">{isAr ? "الحالة" : "Status"}</th>
                      <th className="px-4 py-2.5 font-medium">{isAr ? "الدرجة" : "Score"}</th>
                      <th className="px-4 py-2.5 font-medium">{isAr ? "التسليم" : "Submitted"}</th>
                      <th className="px-4 py-2.5 font-medium w-[6rem]" />
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((row) => {
                      const pct =
                        row.score != null && maxScore && maxScore > 0
                          ? Math.round((Number(row.score) / Number(maxScore)) * 100)
                          : null;
                      const expanded = expandedSubmissionId === row.id;
                      return (
                        <Fragment key={row.id}>
                          <tr
                            className={`border-t border-border hover:bg-muted/10 ${expanded ? "bg-muted/20" : ""}`}
                          >
                            <td className="px-4 py-2.5">{row.students?.full_name || row.student_id.slice(0, 8)}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{statusLabel(row.status, isAr)}</td>
                            <td className="px-4 py-2.5 font-medium tabular-nums">
                              {row.score != null ? (
                                <>
                                  {row.score}
                                  {maxScore != null ? ` / ${maxScore}` : ""}
                                  {pct != null ? (
                                    <span className="ms-2 text-xs text-muted-foreground">({pct}%)</span>
                                  ) : null}
                                </>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                              {row.submitted_at ? new Date(row.submitted_at).toLocaleString(isAr ? "ar-EG" : "en-GB") : "—"}
                            </td>
                            <td className="px-2 py-2.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() =>
                                  setExpandedSubmissionId(expanded ? null : row.id)
                                }
                              >
                                {expanded ? (isAr ? "إخفاء" : "Hide") : isAr ? "تفاصيل" : "Details"}
                              </Button>
                            </td>
                          </tr>
                          {expanded ? (
                            <tr className="border-t border-border bg-muted/10">
                              <SubmissionDetailPanel
                                row={row}
                                assignmentId={assignment.id}
                                questions={questions}
                                maxScore={maxScore}
                                isAr={isAr}
                              />
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
