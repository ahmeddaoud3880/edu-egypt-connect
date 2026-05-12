import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { ClipboardCheck, Clock, AlertCircle, FileQuestion, BookOpen } from "lucide-react";
import { useStudentRegistrationInfo, useStudentAssignments, isStudentAssignmentHandInComplete } from "@/hooks/useStudentData";

export function AssignmentsTracker() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { data: regInfo, isLoading: regLoading } = useStudentRegistrationInfo();
  const { data: assignments = [], isLoading: listLoading } = useStudentAssignments();

  if (regLoading || listLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
        <Clock className="w-4 h-4 animate-spin" /> {isAr ? "جارى التحميل..." : "Loading..."}
      </div>
    );
  }

  if (!regInfo || !["approved", "activated"].includes(regInfo.request_status)) {
    return (
      <div className="bg-surface-elevated rounded-lg border border-amber-200 p-8 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <p className="text-sm text-muted-foreground">
          {isAr ? "ستظهر واجباتك فور تفعيل الحساب من قِبل المدرسة." : "Your assignments will appear once the school activates your account."}
        </p>
      </div>
    );
  }

  const newCount = assignments.filter((a) => a.assignment_type === "quiz").length;
  const pending = assignments.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "واجباتى ومهامى" : "My Assignments & Tasks"}</h2>
        <span className="ms-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
          {assignments.length} {isAr ? "مهمة" : "tasks"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: isAr ? "اختبارات/واجبات" : "Assigned", count: assignments.length, color: "border-primary/30 text-primary" },
          { label: isAr ? "بانتظار التسليم" : "Open", count: pending, color: "border-amber-300 text-amber-600" },
          { label: isAr ? "اختبارات" : "Quizzes", count: newCount, color: "border-green-300 text-green-600" },
        ].map((s) => (
          <div key={s.label} className={`bg-surface-elevated rounded-lg border p-4 text-center ${s.color}`}>
            <div className="text-2xl font-bold">{s.count}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {assignments.length === 0 ? (
        <div className="bg-surface-elevated rounded-lg border border-border p-10 text-center space-y-3">
          <ClipboardCheck className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <h3 className="font-semibold text-foreground">{isAr ? "لا توجد مهام بعد" : "No tasks yet"}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {isAr
              ? "عندما يُعيّن معلّمك واجباً أو اختباراً، يظهر هنا مع الموعد النهائي."
              : "When your teacher assigns homework or a quiz, it will appear here with the due date."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {assignments.map((a) => {
            const title = isAr && a.title_ar ? a.title_ar : a.title;
            const subj = a.subjects?.name_ar || a.subjects?.name || "";
            const isQuiz = a.assignment_type === "quiz";
            const structuredHomework = a.assignment_type === "homework" && a.quiz_id;
            const canStart = (isQuiz || structuredHomework) && a.quiz_id;
            const hi = a.hand_in;
            const submittedStructured =
              !!canStart &&
              !!hi &&
              (isStudentAssignmentHandInComplete(hi) || hi.score != null || hi.max_score != null);
            const scoreLine =
              hi?.score != null
                ? hi.max_score != null
                  ? `${hi.score} / ${hi.max_score}`
                  : String(hi.score)
                : hi?.max_score != null
                  ? `— / ${hi.max_score}`
                  : null;
            return (
              <li
                key={a.id}
                className="flex items-start gap-3 p-4 rounded-lg border border-border bg-surface-elevated"
              >
                {structuredHomework ? (
                  <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                ) : isQuiz ? (
                  <FileQuestion className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                ) : (
                  <BookOpen className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {canStart
                      ? isQuiz
                        ? (isAr ? "اختبار" : "Quiz")
                        : (isAr ? "واجب (أسئلة من الكتاب)" : "Homework (book questions)")
                      : isAr ? "واجب" : "Homework"}
                    {subj ? ` · ${subj}` : ""}
                    {a.due_date
                      ? ` · ${isAr ? "التسليم: " : "Due: "}${a.due_date}`
                      : ""}
                    {a.counts_toward_grade === false ? (
                      <span className="ms-1 text-amber-700">({isAr ? "لا يحتسب" : "ungraded item"})</span>
                    ) : null}
                  </p>
                </div>
                {canStart ? (
                  submittedStructured ? (
                    <div className="flex flex-col items-end gap-1 shrink-0 text-end">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {isAr ? "الدرجة: " : "Score: "}
                        {scoreLine ?? (isAr ? "مُسلَّم" : "Submitted")}
                      </span>
                      <Link
                        to={`/dashboard/student/assignment/${a.id}/quiz`}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        {isAr ? "مراجعة" : "Review"}
                      </Link>
                    </div>
                  ) : (
                    <Link
                      to={`/dashboard/student/assignment/${a.id}/quiz`}
                      className="text-xs px-3 py-1.5 rounded-lg shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                    >
                      {isQuiz ? (isAr ? "بدء الاختبار" : "Start quiz") : (isAr ? "بدء الواجب" : "Start homework")}
                    </Link>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
