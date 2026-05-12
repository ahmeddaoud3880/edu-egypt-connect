import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { TrendingUp, TrendingDown, BarChart2, Users, Loader2, UserCheck } from "lucide-react";
import { useMyChildren, useChildGrades } from "@/hooks/useParentData";

export function GradeTracking() {
  const { isAr } = useTranslation();
  const { data: children = [], isLoading } = useMyChildren();
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(children[0]?.student_id);

  const childId = selectedChildId || children[0]?.student_id;
  const { data: grades = [], isLoading: gradesLoading } = useChildGrades(childId);

  const avg = grades.length > 0
    ? Math.round(grades.reduce((s: number, g: any) => s + ((g.score ?? 0) / (g.max_score ?? 100)) * 100, 0) / grades.length)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "متابعة الدرجات" : "Grade Tracking"}</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : children.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-border rounded-lg bg-surface-elevated">
          <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">{isAr ? "لا يوجد أبناء مرتبطون" : "No Linked Children"}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {isAr ? "سيظهر هنا سجل درجات أبنائك بعد ربط حساباتهم بحسابك كولي أمر." : "Your children's grades will appear here after their accounts are linked to your parent account."}
          </p>
        </div>
      ) : (
        <>
          {children.length > 1 && (
            <div className="flex gap-2">
              {children.map((c) => (
                <button
                  key={c.student_id}
                  onClick={() => setSelectedChildId(c.student_id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${childId === c.student_id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  {c.full_name || (isAr ? "ابن/بنت" : "Child")}
                </button>
              ))}
            </div>
          )}

          {/* Average */}
          {avg !== null && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-surface-elevated border border-border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{avg}%</p>
                <p className="text-xs text-muted-foreground mt-1">{isAr ? "المتوسط العام" : "Overall Average"}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{grades.filter((g: any) => ((g.score ?? 0) / (g.max_score ?? 100)) * 100 >= 85).length}</p>
                <p className="text-xs text-green-600 mt-1">{isAr ? "ممتاز (≥85%)" : "Excellent (≥85%)"}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{grades.filter((g: any) => ((g.score ?? 0) / (g.max_score ?? 100)) * 100 < 60).length}</p>
                <p className="text-xs text-red-600 mt-1">{isAr ? "يحتاج متابعة" : "Needs Attention"}</p>
              </div>
            </div>
          )}

          {/* Grades table */}
          {gradesLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : grades.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-lg">
              <p className="text-sm text-muted-foreground">{isAr ? "لا توجد درجات مسجّلة بعد" : "No grades recorded yet"}</p>
            </div>
          ) : (
            <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="text-start p-3 text-xs font-medium text-muted-foreground">{isAr ? "المادة" : "Subject"}</th>
                    <th className="text-start p-3 text-xs font-medium text-muted-foreground">{isAr ? "المعلم" : "Teacher"}</th>
                    <th className="text-start p-3 text-xs font-medium text-muted-foreground">{isAr ? "الفصل" : "Class"}</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground">{isAr ? "الدرجة" : "Score"}</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground">{isAr ? "النسبة" : "Percent"}</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g: any, idx: number) => {
                    const pct = g.max_score ? Math.round((g.score / g.max_score) * 100) : null;
                    const resolvedClass = g._resolved_class || g.classes || null;
                    const teacherName = g.teacher_class_assignments?.[0]?.teachers?.full_name || "—";
                    const assignTitle = isAr
                      ? (g.assignments?.title_ar || g.assignments?.title || null)
                      : (g.assignments?.title || null);
                    return (
                      <tr key={g.id} className={`border-b border-border/50 ${idx % 2 === 0 ? "" : "bg-muted/5"}`}>
                        <td className="p-3 font-medium text-foreground">
                          {isAr ? g.subjects?.name_ar || g.subjects?.name : g.subjects?.name || "—"}
                          {assignTitle && <p className="text-[11px] text-muted-foreground font-normal mt-0.5 truncate">{assignTitle}</p>}
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />{(g as any).teacher_name || "—"}</span>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">{(g as any)._resolved_class?.name || "—"}</td>
                        <td className="p-3 text-center">{g.score != null ? `${g.score} / ${g.max_score ?? 100}` : "—"}</td>
                        <td className="p-3 text-center">
                          {pct !== null ? (
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${pct >= 85 ? "text-green-600" : pct >= 60 ? "text-blue-600" : "text-red-600"}`}>
                              {pct >= 70 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {pct}%
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
