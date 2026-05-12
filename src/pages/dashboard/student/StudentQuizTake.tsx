import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/useTranslation";
import { useQuizQuestions, type QuizQuestion } from "@/hooks/useQuizData";
import {
  isQuizSubmissionDone,
  type StudentQuizSubmissionRow,
  useStudentAssignment,
  useStudentQuizSubmission,
  useSubmitStudentQuiz,
} from "@/hooks/useStudentData";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatCorrectAnswerDisplay,
  isQuizAnswerCorrect,
} from "@/lib/quizAnswerGrading";
import { regradeOpenSubmission } from "@/services/ragService";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

function QuestionBlock({
  q,
  isAr,
  value,
  onChange,
  disabled,
}: {
  q: QuizQuestion;
  isAr: boolean;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const qid = q.id || "";
  if (q.question_type === "mcq" && q.options_json?.length) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-surface-elevated p-4">
        <p className="text-sm font-medium text-foreground leading-relaxed">{q.question_text}</p>
        <RadioGroup
          value={value || ""}
          onValueChange={onChange}
          disabled={disabled}
          className="space-y-2"
        >
          {q.options_json.map((opt) => {
            const id = `${qid}-${opt.key}`;
            return (
              <div key={opt.key} className="flex items-start gap-2">
                <RadioGroupItem value={opt.key} id={id} className="mt-1" />
                <Label htmlFor={id} className="text-sm font-normal cursor-pointer leading-relaxed">
                  <span className="font-mono text-muted-foreground me-2">{opt.key}.</span>
                  {opt.text}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>
    );
  }

  if (q.question_type === "true_false") {
    const tVal = isAr ? "صواب" : "true";
    const fVal = isAr ? "خطأ" : "false";
    return (
      <div className="space-y-3 rounded-lg border border-border bg-surface-elevated p-4">
        <p className="text-sm font-medium text-foreground leading-relaxed">{q.question_text}</p>
        <RadioGroup value={value || ""} onValueChange={onChange} disabled={disabled} className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <RadioGroupItem value={tVal} id={`${qid}-t`} />
            <Label htmlFor={`${qid}-t`} className="cursor-pointer">
              {isAr ? "صواب" : "True"}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value={fVal} id={`${qid}-f`} />
            <Label htmlFor={`${qid}-f`} className="cursor-pointer">
              {isAr ? "خطأ" : "False"}
            </Label>
          </div>
        </RadioGroup>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface-elevated p-4">
      <p className="text-sm font-medium text-foreground leading-relaxed">{q.question_text}</p>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={3}
        placeholder={isAr ? "اكتب إجابتك…" : "Your answer…"}
        className="resize-y min-h-[80px]"
      />
    </div>
  );
}

type OpenGradeItem = { question_id: string; feedback_ar?: string; points_earned?: number; max_points?: number };

function PostSubmitQuestionReview({
  q,
  studentAnswer,
  isAr,
  gradingDetails,
  essayGraderUnavailable,
}: {
  q: QuizQuestion;
  studentAnswer: string;
  isAr: boolean;
  gradingDetails?: Record<string, unknown> | null;
  essayGraderUnavailable?: boolean;
}) {
  const trimmedKey = (q.answer ?? "").trim();
  const hasKey = trimmedKey.length > 0;
  const openItems = ((gradingDetails?.open_grading as OpenGradeItem[] | undefined) || []).filter(Boolean);
  const openFb = q.id ? openItems.find((o) => o.question_id === q.id) : undefined;

  if (q.question_type === "open") {
    if (!hasKey) {
      return (
        <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-200/95">
          {isAr
            ? "سؤال مقالي بدون إجابة نموذجية — المعلّم قد يقيّم يدويّاً لاحقاً."
            : "Open-ended question without a model answer — teacher may grade manually."}
        </div>
      );
    }
    return (
      <div className="mt-3 space-y-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm">
        <p className="text-xs font-medium text-primary">{isAr ? "المقالي (تقييم ذكي)" : "Open-ended (AI-assisted)"}</p>
        <p className="text-xs text-muted-foreground">
          {isAr ? "إجابتك:" : "Your answer:"}{" "}
          <span className="font-medium text-foreground">{studentAnswer.trim() || (isAr ? "(فارغة)" : "(empty)")}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">{isAr ? "الإجابة المرجعية:" : "Model answer:"}</span>{" "}
          {formatCorrectAnswerDisplay(q, isAr)}
        </p>
        {openFb ? (
          <>
            <p className="text-xs text-muted-foreground">
              {isAr ? "الدرجة على هذا الجزء:" : "Partial score:"}{" "}
              <span className="font-mono font-medium text-foreground">
                {openFb.points_earned ?? 0} / {openFb.max_points ?? q.points ?? 1}
              </span>
            </p>
            {openFb.feedback_ar ? (
              <p className="text-xs leading-relaxed text-foreground">{openFb.feedback_ar}</p>
            ) : null}
          </>
        ) : essayGraderUnavailable ? (
          <p className="text-xs text-muted-foreground">
            {isAr
              ? "خادم تقييم المقالي غير متاح حالياً — تُستخدم الدرجة المحفوظة (التلقائية)؛ أعد المحاولة لاحقاً لتحديث جزء الذكاء."
              : "Essay grading service is offline — the saved automated score applies; retry later for AI-assisted updates."}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            {isAr ? "في انتظار التقييم الذكي لجزء المقالي… أعد تحميل الصفحة بعد لحظات." : "AI grading pending for this essay… refresh shortly."}
          </p>
        )}
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {isAr ? "لا توجد إجابة مرجعية مسجَّلة لهذا السؤال." : "No reference answer is stored for this question."}
      </div>
    );
  }

  const ok = isQuizAnswerCorrect(q, studentAnswer);
  if (ok) {
    return (
      <div className="mt-3 rounded-md border border-emerald-500/35 bg-emerald-500/8 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-200/95">
        {isAr ? "✓ إجابتك صحيحة." : "✓ Correct."}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-md border border-destructive/35 bg-destructive/8 px-3 py-2 text-sm">
      <p className="font-medium text-destructive">{isAr ? "إجابة غير صحيحة أو فارغة." : "Incorrect or empty."}</p>
      <p className="text-xs text-muted-foreground">
        {isAr ? "إجابتك:" : "Your answer:"}{" "}
        <span className="font-medium text-foreground">{studentAnswer.trim() || (isAr ? "(فارغة)" : "(empty)")}</span>
      </p>
      <p className="text-xs">
        <span className="text-muted-foreground">{isAr ? "الإجابة الصحيحة:" : "Correct answer:"} </span>
        <span className="font-medium text-foreground">{formatCorrectAnswerDisplay(q, isAr)}</span>
      </p>
    </div>
  );
}

export default function StudentQuizTake() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: assignment, isLoading: aLoad, error: aErr } = useStudentAssignment(assignmentId);
  const quizId = assignment?.quiz_id ?? null;
  const { data: submission, isLoading: sLoad } = useStudentQuizSubmission(assignmentId);

  const done = isQuizSubmissionDone(submission ?? null);

  const { data: questions = [], isLoading: qLoad } = useQuizQuestions(quizId, {
    includeAnswerKey: done,
  });
  const submitMut = useSubmitStudentQuiz();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  /** Set when regrade-open API fails after submit — explains provisional essay score vs AI. */
  const [essayGraderUnavailable, setEssayGraderUnavailable] = useState(false);

  useEffect(() => {
    if (submission?.answers_json && typeof submission.answers_json === "object") {
      setAnswers(submission.answers_json as Record<string, string>);
    }
  }, [submission?.id, submission?.answers_json]);

  useEffect(() => {
    setEssayGraderUnavailable(false);
  }, [assignmentId]);

  useEffect(() => {
    const gd = submission?.grading_details;
    const og =
      gd && typeof gd === "object" && "open_grading" in gd
        ? (gd as { open_grading?: unknown }).open_grading
        : null;
    if (Array.isArray(og) && og.length > 0) setEssayGraderUnavailable(false);
  }, [submission?.grading_details]);

  const title = useMemo(() => {
    if (!assignment) return "";
    return isAr && assignment.title_ar ? assignment.title_ar : assignment.title;
  }, [assignment, isAr]);

  const totalQuestionPoints = useMemo(
    () => questions.reduce((sum, q) => sum + (q.points ?? 1), 0),
    [questions],
  );

  const onSubmit = async () => {
    if (!assignmentId) return;
    const missing = questions.filter((q) => {
      if (!q.id) return false;
      return !(answers[q.id] ?? "").trim();
    });
    if (missing.length > 0) {
      toast.warning(
        isAr
          ? `تسليم جزئى: ${missing.length} سؤال بدون إجابة (تُحتسب فارغة = خطأ حيث يوجد تصحيح).`
          : `Partial submit: ${missing.length} unanswered (blank counts wrong where graded).`,
      );
    }

    const payload: Record<string, string> = {};
    for (const q of questions) {
      if (q.id) payload[q.id] = (answers[q.id] ?? "").trim();
    }

    try {
      const res = await submitMut.mutateAsync({ assignmentId, answers: payload });

      let displayScore = res.score;
      let displayMax = res.max_score;

      const sid = typeof res?.submission_id === "string" && res.submission_id ? res.submission_id : null;
      if (sid) {
        const { data: sess } = await supabase.auth.getSession();
        const tok = sess.session?.access_token;
        if (tok) {
          try {
            const rg = await regradeOpenSubmission(sid, tok);
            displayScore = rg.score;
            displayMax = rg.max_score;
            setEssayGraderUnavailable(false);
          } catch {
            setEssayGraderUnavailable(true);
            toast.warning(
              isAr
                ? "خدمة تقييم المقالي غير متاحة — حُفظت درجتك الحالية؛ شغّل المخدم لاحقاً لتحسين التقييم."
                : "Essay grading service unavailable — score saved as-is; start the AI server later for smarter grading.",
              { duration: 6000 },
            );
          }
        }
      }

      /* Lock UI immediately for new submits; merges RPC score for repeats while Supabase catches up */
      if (user?.id && assignmentId) {
        const { data: stRow } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
        const sidStudent = stRow?.id ? String(stRow.id) : null;
        if (sidStudent) {
          qc.setQueryData<StudentQuizSubmissionRow | null>(
            ["student_quiz_submission", user.id, assignmentId],
            (prev) => ({
              id:
                (typeof res.submission_id === "string" && res.submission_id) ||
                prev?.id ||
                `pending-${assignmentId}`,
              assignment_id: assignmentId,
              student_id: sidStudent,
              score: displayScore ?? res.score ?? prev?.score ?? null,
              submitted_at: prev?.submitted_at ?? new Date().toISOString(),
              status: "graded",
              answers_json: res.already_submitted
                ? (prev?.answers_json ?? (submission?.answers_json as Record<string, string> | null)) ?? null
                : payload,
              grading_details: (prev?.grading_details ??
                submission?.grading_details ??
                null) as Record<string, unknown> | null,
            }),
          );
        }
      }

      await qc.invalidateQueries({ queryKey: ["student_quiz_submission", user?.id, assignmentId] });
      await qc.refetchQueries({ queryKey: ["student_quiz_submission", user?.id, assignmentId] });
      await qc.invalidateQueries({ queryKey: ["student_grades", user?.id] });
      await qc.invalidateQueries({ queryKey: ["student_assignments", user?.id] });

      if (res.already_submitted) {
        toast.info(isAr ? "هذا الاختبار مسلَّم بالفعل. درجتك محفوظة." : "Already submitted — your score is on record.");
      } else {
        toast.success(
          isAr
            ? `تم التسليم. درجتك: ${displayScore} / ${displayMax ?? "—"}${res.counts_toward_grade === false ? " — لا يُحسب بالدرجات" : " — ستظهر في «درجاتى» إذا كان مهيّلاً للاحتساب."}`
            : `Submitted. Score: ${displayScore} / ${displayMax ?? "—"}${res.counts_toward_grade === false ? " — practice only." : " — appears under Grades when recorded."}`,
        );
      }
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "";
      toast.error(msg || (isAr ? "تعذّر التسليم." : "Submit failed."));
    }
  };

  if (aLoad || qLoad || sLoad) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        {isAr ? "جارى التحميل…" : "Loading…"}
      </div>
    );
  }

  if (aErr || !assignment) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          {isAr ? "لا يمكن عرض هذا التكليف أو لست مسجلاً في الصف." : "This assignment is unavailable or you are not enrolled."}
        </p>
        <Button variant="outline" asChild>
          <Link to="/dashboard">{isAr ? "العودة" : "Back"}</Link>
        </Button>
      </div>
    );
  }

  if (!quizId) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          {isAr ? "هذا التكليف ليس مرتبطاً ببنك أسئلة." : "This task is not linked to a question bank quiz."}
        </p>
        <Button variant="outline" asChild>
          <Link to="/dashboard">{isAr ? "العودة" : "Back"}</Link>
        </Button>
      </div>
    );
  }

  const quizLike = assignment.assignment_type === "quiz" || assignment.assignment_type === "homework";

  if (!quizLike) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          {isAr
            ? "هذا واجب بدون أسئلة تفاعليّة — راجع الوصف في قائمة الواجبات."
            : "This homework has no interactive questions — check the assignment list for instructions."}
        </p>
        <Button variant="outline" asChild>
          <Link to="/dashboard">{isAr ? "العودة" : "Back"}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 px-4 pt-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="shrink-0 -ms-2">
          <Link to="/dashboard" className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            {isAr ? "لوحة الطالب" : "Dashboard"}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {assignment.subjects?.name_ar || assignment.subjects?.name || ""}
          {assignment.due_date
            ? ` · ${isAr ? "آخر موعد: " : "Due: "}${assignment.due_date}`
            : ""}
          {assignment.counts_toward_grade === false ? (
            <span className="ms-1 text-amber-700">({isAr ? "لا يحتسب بالدرجات" : "does not count toward grade"})</span>
          ) : null}
        </p>
      </div>

      {done && submission ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 space-y-2">
          <p className="font-semibold text-foreground">{isAr ? "تم التسليم" : "Submitted"}</p>
          <p className="text-sm text-muted-foreground">
            {isAr ? "الدرجة:" : "Score:"}{" "}
            <span className="font-mono font-medium text-foreground">
              {submission.score ?? "—"}
              {submission.score != null && totalQuestionPoints > 0 ? ` / ${totalQuestionPoints}` : ""}
            </span>
          </p>
          <p className="text-xs font-medium text-foreground">
            {isAr
              ? "راجع الأسئلة أدناه: ستظهر إجابتك الصحيحة والخطأ حيث وُجد مفتاح تصحيح."
              : "Review questions below — correct/incorrect hints appear when an answer key exists."}
          </p>
          <p className="text-xs text-muted-foreground">
            {isAr
              ? assignment.counts_toward_grade === false
                ? "لم تُسجَّل في سجل الدرجات لأن المعلّم اختار عدم الاحتساب."
                : "إن وُجدت إجابة نموذجية، تم احتساب الدرجة آلياً وظهورها فى تبويب الدرجات."
              : assignment.counts_toward_grade === false
                ? "Not added to the gradebook because the teacher marked this as non-graded."
                : "When an answer key exists, your score is calculated automatically and appears under Grades."}
          </p>
        </div>
      ) : null}

      {!done && questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isAr ? "لا توجد أسئلة فى هذا الاختبار بعد." : "This quiz has no questions yet."}
        </p>
      ) : (
        <div className="space-y-6">
          {questions.map((q, idx) => {
            if (!q.id) return null;
            return (
              <div key={q.id}>
                <p className="text-xs text-muted-foreground mb-2">
                  {isAr ? `السؤال ${idx + 1}` : `Question ${idx + 1}`} · {q.points ?? 1} pts
                </p>
                <QuestionBlock
                  q={q}
                  isAr={isAr}
                  value={answers[q.id] ?? ""}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id!]: v }))}
                  disabled={done}
                />
                {done ? (
                  <PostSubmitQuestionReview
                    q={q}
                    studentAnswer={answers[q.id] ?? ""}
                    isAr={isAr}
                    gradingDetails={submission?.grading_details ?? null}
                    essayGraderUnavailable={essayGraderUnavailable}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {!done && questions.length > 0 ? (
        <Button
          className="w-full sm:w-auto"
          disabled={submitMut.isPending}
          onClick={() => void onSubmit()}
        >
          {submitMut.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isAr ? "جارى الإرسال…" : "Submitting…"}
            </>
          ) : isAr ? (
            "تسليم الإجابات"
          ) : (
            "Submit answers"
          )}
        </Button>
      ) : null}
    </div>
  );
}
