import { useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useMyChildren } from "@/hooks/useParentData";
import { useChildGrades, useChildAttendance, ChildProfile } from "@/hooks/useParentData";
import { BookOpen, Users, Loader2, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function ChildPerformanceCard({ child, isAr }: { child: ChildProfile; isAr: boolean }) {
  const { data: grades = [], isLoading: gl } = useChildGrades(child.student_id);
  const { data: attendance = [], isLoading: al } = useChildAttendance(child.student_id);

  const isLoading = gl || al;

  const subjectAverages = useMemo(() => {
    const map = new Map<string, { name: string; scores: number[] }>();
    for (const g of grades) {
      const sid = g.subject_id;
      if (!sid || g.score === null) continue;
      const max = Math.max(Number(g.max_score ?? 100), 1);
      const pct = (Number(g.score) / max) * 100;
      const sname = isAr ? g.subjects?.name_ar || g.subjects?.name : g.subjects?.name || "?";
      if (!map.has(sid)) map.set(sid, { name: sname || "?", scores: [] });
      map.get(sid)!.scores.push(pct);
    }
    return [...map.values()]
      .map(s => ({ name: s.name, avg: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 6);
  }, [grades, isAr]);

  const attStats = useMemo(() => {
    const list = attendance as any[];
    let p = 0, a = 0;
    list.forEach(r => { if (r.status === "present") p++; else if (r.status === "absent") a++; });
    const total = p + a;
    return { rate: total ? Math.round((p / total) * 100) : null, absent: a, present: p };
  }, [attendance]);

  const overallAvg = useMemo(() => {
    const scored = grades.filter(g => g.score !== null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((s, g) => s + (Number(g.score) / Math.max(Number(g.max_score ?? 100), 1)) * 100, 0) / scored.length);
  }, [grades]);

  const childName = child.full_name || (isAr ? "طالب" : "Student");

  return (
    <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="bg-primary/5 border-b border-border px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
          {childName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{childName}</h3>
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            {isAr ? "مسجل ومفعّل" : "Active"}
          </span>
        </div>
        {/* Overall */}
        {overallAvg !== null && (
          <div className={`px-3 py-1.5 rounded-lg border text-center shrink-0 ${overallAvg >= 75 ? "text-green-700 bg-green-50 border-green-200" : overallAvg >= 50 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-red-700 bg-red-50 border-red-200"}`}>
            <p className="text-xl font-bold">{overallAvg}%</p>
            <p className="text-[10px]">{isAr ? "متوسط" : "Avg"}</p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 p-8 justify-center text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{isAr ? "جارى التحميل..." : "Loading..."}</span>
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* Attendance mini stat */}
          {attStats.rate !== null && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{isAr ? "معدل الحضور" : "Attendance rate"}</span>
                  <span className={`font-bold ${attStats.rate >= 85 ? "text-green-600" : attStats.rate >= 70 ? "text-amber-600" : "text-red-600"}`}>{attStats.rate}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full">
                  <div className={`h-full rounded-full ${attStats.rate >= 85 ? "bg-green-500" : attStats.rate >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${attStats.rate}%` }} />
                </div>
              </div>
              {attStats.absent > 0 && (
                <span className={`text-xs shrink-0 ${attStats.absent > 5 ? "text-red-600 font-bold" : "text-muted-foreground"}`}>
                  {attStats.absent} {isAr ? "غياب" : "absent"}
                </span>
              )}
            </div>
          )}

          {/* Grades chart */}
          {subjectAverages.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-foreground mb-3">{isAr ? "متوسط الدرجات بالمادة" : "Grade Average by Subject"}</p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={subjectAverages} margin={{ top: 0, right: 5, left: -20, bottom: 30 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip formatter={(v: number) => [`${v}%`, isAr ? "المتوسط" : "Avg"]} contentStyle={{ fontSize: "11px", backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))" }} />
                  <Bar dataKey="avg" radius={[3, 3, 0, 0]} barSize={22}>
                    {subjectAverages.map((entry) => (
                      <Cell key={entry.name} fill={entry.avg >= 75 ? "#22c55e" : entry.avg >= 50 ? "hsl(var(--primary))" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-muted-foreground italic border border-dashed border-border rounded-lg">
              {grades.length > 0
                ? (isAr ? "المواد غير مرتبطة بالدرجات بعد" : "Subjects not yet linked to grades")
                : (isAr ? "لا توجد درجات مسجلة بعد" : "No grades recorded yet")}
            </div>
          )}

          {/* Grade count */}
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
            <span>{isAr ? `${grades.length} درجة مسجلة` : `${grades.length} recorded grade(s)`}</span>
            {overallAvg !== null && (
              <span className="flex items-center gap-1">
                {overallAvg >= 75 ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                {overallAvg >= 75 ? (isAr ? "أداء جيد" : "Good performance") : (isAr ? "يحتاج متابعة" : "Needs attention")}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ChildPerformance() {
  const { lang } = useTranslation();
  const { data: myChildren = [], isLoading } = useMyChildren();
  const isAr = lang === "ar";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>{isAr ? "جارى تحميل البيانات..." : "Loading..."}</span>
      </div>
    );
  }

  if (myChildren.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-lg border border-border p-8 text-center space-y-3">
        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto" />
        <h3 className="font-semibold text-foreground">{isAr ? "لا يوجد أبناء مرتبطون" : "No Linked Children"}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {isAr ? "سيظهر أبناؤك هنا تلقائياً بناءً على الرقم القومى." : "Your children will appear here automatically based on National ID."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "أداء الأبناء الأكاديمى" : "Children's Academic Performance"}</h2>
        <span className="ms-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {myChildren.length} {isAr ? "طالب" : "students"}
        </span>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {myChildren.map((child) => (
          <ChildPerformanceCard key={child.student_id} child={child} isAr={isAr} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {isAr ? "✦ الدرجات مسحوبة مباشرة من قاعدة بيانات المدرسة — آخر تحديث منذ قليل." : "✦ Grades pulled directly from school database — updated moments ago."}
      </p>
    </div>
  );
}
