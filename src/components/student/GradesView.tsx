import { useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { ClipboardList, Clock, AlertCircle } from "lucide-react";
import { useStudentRegistrationInfo, useStudentGrades, type StudentGradeDisplayRow } from "@/hooks/useStudentData";

export function GradesView() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { data: regInfo, isLoading: regLoading } = useStudentRegistrationInfo();
  const { data: grades = [], isLoading: gradesLoading } = useStudentGrades();

  const subjectGroups = useMemo(() => {
    const locales = isAr ? "ar-EG" : "en-US";
    const buckets = new Map<string, StudentGradeDisplayRow[]>();
    for (const g of grades) {
      const sid = g.subject_id || "_none_";
      if (!buckets.has(sid)) buckets.set(sid, []);
      buckets.get(sid)!.push(g);
    }

    const labelFor = (key: string, rows: StudentGradeDisplayRow[]): string => {
      if (key === "_none_") return isAr ? "بدون مادة محددة" : "No linked subject";
      const r0 = rows[0];
      return (
        (isAr ? r0.subjects?.name_ar || r0.subjects?.name : r0.subjects?.name || r0.subjects?.name_ar) ||
        key
      );
    };

    const keys = [...buckets.keys()].sort((a, b) =>
      labelFor(a, buckets.get(a)! || []).localeCompare(labelFor(b, buckets.get(b)! || []), locales),
    );

    const labels = new Map<string, string>();
    keys.forEach((k) => labels.set(k, labelFor(k, buckets.get(k) || [])));

    return { buckets, keys, labels };
  }, [grades, isAr]);

  if (regLoading || gradesLoading) {
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
          {isAr ? "ستظهر درجاتك فور تفعيل الحساب من قِبل المدرسة." : "Your grades will appear once the school activates your account."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "درجاتى" : "My Grades"}</h2>
      </div>

      {grades.length === 0 ? (
        <div className="bg-surface-elevated rounded-lg border border-border p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <ClipboardList className="w-8 h-8 text-primary/40" />
          </div>
          <h3 className="font-semibold text-foreground">{isAr ? "لا توجد درجات بعد" : "No Grades Yet"}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {isAr
              ? "تظهر هنا نتائجك من سجل الدرجات، وكذلك الاختبارات والواجبات التفاعلية بعد أن تسلمها. تأكد من حل كل واجب مرتبط بأسئلة وإنهاء التسليم."
              : "You will see scored work from the gradebook plus interactive quizzes and homework once you submit them."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {subjectGroups.keys.map((sk) => (
            <div key={sk} className="space-y-3">
              <h3 className="text-base font-semibold text-foreground border-b border-border pb-2 flex items-center gap-2 flex-wrap">
                <span>{subjectGroups.labels.get(sk)}</span>
                <span className="text-xs font-normal text-muted-foreground rounded-full bg-muted px-2 py-0.5">
                  {(subjectGroups.buckets.get(sk) || []).length}{" "}
                  {(subjectGroups.buckets.get(sk) || []).length === 1
                    ? isAr ? "نشاط" : "item"
                    : isAr ? "أنشطة" : "items"}
                </span>
              </h3>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-start p-3 font-medium">{isAr ? "المهمة / التاريخ" : "Task / date"}</th>
                      <th className="text-end p-3 font-medium w-32">{isAr ? "الدرجة" : "Score"}</th>
                      <th className="text-end p-3 font-medium w-36 hidden sm:table-cell">{isAr ? "النوع" : "Type"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(subjectGroups.buckets.get(sk) || []).map((g: StudentGradeDisplayRow) => {
                      const task = g.assignments?.title_ar || g.assignments?.title;
                      const label = task || (isAr ? "نشاط" : "Activity");
                      const rawMax = g.max_score;
                      const displayMax =
                        rawMax != null && Number.isFinite(Number(rawMax)) ? Number(rawMax) : null;
                      const pct =
                        g.score != null && displayMax != null && displayMax > 0
                          ? Math.round((Number(g.score) / displayMax) * 100)
                          : null;
                      const when = g.grade_date || (g.created_at ? String(g.created_at).slice(0, 10) : null);
                      const sourceHint =
                        g.source === "submission"
                          ? isAr ? " · من التسليم" : " · from hand-in"
                          : "";

                      return (
                        <tr key={g.id} className="border-b border-border last:border-0">
                          <td className="p-3">
                            <span className="text-foreground">{label}</span>
                            {when ? (
                              <p className="text-[11px] text-muted-foreground mt-0.5">{when}</p>
                            ) : null}
                          </td>
                          <td className="p-3 text-end font-medium tabular-nums">
                            {g.score != null
                              ? `${g.score}${displayMax != null && displayMax > 0 ? ` / ${displayMax}` : ""}`
                              : "—"}
                            {pct != null ? (
                              <span className="text-xs text-muted-foreground ms-1">({pct}%)</span>
                            ) : null}
                          </td>
                          <td className="p-3 text-end text-muted-foreground text-xs hidden sm:table-cell">
                            {(g.assignments?.assignment_type || g.grade_type || "—") + sourceHint}
                            {g.assignments?.counts_toward_grade === false ? (
                              <span className="block text-[11px] text-amber-700 mt-0.5">
                                {isAr ? "لا يحتسب رسمياً" : "practice"}
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
