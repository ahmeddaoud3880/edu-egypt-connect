import { useTranslation } from "@/hooks/useTranslation";
import { useMyChildren, useChildAssignments } from "@/hooks/useParentData";
import {
  ClipboardCheck, Clock, Users, Loader2, CheckCircle2,
  AlertCircle, XCircle, BookOpen,
} from "lucide-react";

function StatusBadge({ submission, isAr }: { submission: any; isAr: boolean }) {
  if (!submission) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
        <XCircle className="w-3 h-3" />
        {isAr ? "لم يُسلَّم" : "Not submitted"}
      </span>
    );
  }
  if (submission.status === "graded" || submission.status === "submitted") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <CheckCircle2 className="w-3 h-3" />
        {isAr ? "مُسلَّم" : "Submitted"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      <Clock className="w-3 h-3" />
      {isAr ? "قيد المراجعة" : "Pending"}
    </span>
  );
}

function GradeBadge({ grade, submission, isAr }: { grade: any; submission: any; isAr: boolean }) {
  const score = grade?.score ?? submission?.score;
  const max = grade?.max_score;
  if (score == null) return null;
  const pct = max ? Math.round((Number(score) / Number(max)) * 100) : null;
  const color = pct == null ? "text-primary" : pct >= 85 ? "text-green-700" : pct >= 60 ? "text-blue-600" : "text-red-600";
  return (
    <span className={`text-sm font-bold tabular-nums ${color}`}>
      {score}{max ? ` / ${max}` : ""}
      {pct != null && <span className="text-xs font-normal text-muted-foreground ms-1">({pct}%)</span>}
    </span>
  );
}

function ChildAssignments({ child, isAr }: { child: any; isAr: boolean }) {
  const { data: assignments = [], isLoading } = useChildAssignments(child.student_id);

  const submittedCount = assignments.filter((a: any) => a.submission?.status === "graded" || a.submission?.status === "submitted").length;
  const overdueCount = assignments.filter((a: any) => !a.submission && a.due_date && new Date(a.due_date) < new Date()).length;

  return (
    <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
      {/* Child header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-primary/5 border-b border-border">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
          {(child.full_name || "?").charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm">{child.full_name || (isAr ? "ابن/بنت" : "Child")}</h3>
          {!isLoading && assignments.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr
                ? `${submittedCount} / ${assignments.length} مُسلَّم`
                : `${submittedCount} / ${assignments.length} submitted`}
              {overdueCount > 0 && (
                <span className="text-red-600 ms-2">
                  · {overdueCount} {isAr ? "متأخر" : "overdue"}
                </span>
              )}
            </p>
          )}
        </div>
        {!isLoading && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
            {assignments.length} {isAr ? "واجب" : "tasks"}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="p-8 text-center">
          <ClipboardCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {isAr ? "لا توجد واجبات مُعيَّنة بعد." : "No assignments assigned yet."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {assignments.map((a: any) => {
            const isOverdue = !a.submission && a.due_date && new Date(a.due_date) < new Date();
            const subjectName = isAr
              ? a.subjects?.name_ar || a.subjects?.name
              : a.subjects?.name || a.subjects?.name_ar;
            const title = isAr ? a.title_ar || a.title : a.title;

            return (
              <div key={a.id} className={`flex items-center gap-3 px-4 py-3 ${isOverdue ? "bg-red-50/40" : ""}`}>
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  a.submission ? "bg-green-100" : isOverdue ? "bg-red-100" : "bg-muted"
                }`}>
                  {a.submission
                    ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                    : isOverdue
                    ? <AlertCircle className="w-4 h-4 text-red-500" />
                    : <BookOpen className="w-4 h-4 text-muted-foreground" />}
                </div>

                {/* Title + subject */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{title || "—"}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {subjectName && (
                      <span className="text-xs text-muted-foreground">{subjectName}</span>
                    )}
                    {a.due_date && (
                      <span className={`text-xs flex items-center gap-0.5 ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
                        <Clock className="w-3 h-3" />
                        {new Date(a.due_date).toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right side: grade + status */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <GradeBadge grade={a.grade} submission={a.submission} isAr={isAr} />
                  <StatusBadge submission={a.submission} isAr={isAr} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AssignmentsFollowUp() {
  const { isAr } = useTranslation();
  const { data: children = [], isLoading } = useMyChildren();

  if (isLoading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> {isAr ? "جارى التحميل..." : "Loading..."}
    </div>
  );

  if (children.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-lg border border-border p-8 text-center space-y-3">
        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto" />
        <p className="text-sm text-muted-foreground">
          {isAr ? "أضف أبناءك أولاً لمتابعة واجباتهم." : "Add your children first to follow up on their assignments."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "متابعة الواجبات" : "Assignment Follow-Up"}</h2>
        <span className="ms-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {children.length} {isAr ? "طالب" : "students"}
        </span>
      </div>

      <div className="space-y-4">
        {children.map((child) => (
          <ChildAssignments key={child.student_id} child={child} isAr={isAr} />
        ))}
      </div>
    </div>
  );
}
