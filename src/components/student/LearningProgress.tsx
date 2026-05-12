import { useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { TrendingUp, Clock, AlertCircle, BarChart2, Target, Award, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useStudentRegistrationInfo } from "@/hooks/useStudentData";
import { useStudentGrades } from "@/hooks/useStudentData";
import { useStudentAttendance } from "@/hooks/useStudentData";

export function LearningProgress() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { data: regInfo, isLoading: regLoading } = useStudentRegistrationInfo();
  const { data: grades = [], isLoading: gradesLoading } = useStudentGrades();
  const { data: attRows = [], isLoading: attLoading } = useStudentAttendance();

  const isLoading = regLoading || gradesLoading;

  // Subject averages from real grades
  const chartData = useMemo(() => {
    const map = new Map<string, { name: string; scores: number[] }>();
    for (const g of grades) {
      const sid = g.subject_id || "_none_";
      const name = (isAr ? g.subjects?.name_ar || g.subjects?.name : g.subjects?.name) || (isAr ? "بدون مادة" : "Unknown");
      if (!map.has(sid)) map.set(sid, { name, scores: [] });
      if (g.score !== null) {
        const max = Math.max(Number(g.max_score ?? 100), 1);
        map.get(sid)!.scores.push((Number(g.score) / max) * 100);
      }
    }
    return [...map.values()]
      .filter((s) => s.scores.length > 0)
      .map((s) => ({ name: s.name, score: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [grades, isAr]);

  // Attendance stats
  const attStats = useMemo(() => {
    let present = 0, absent = 0, late = 0;
    for (const r of (attRows as any[])) {
      if (r.status === "present") present++;
      else if (r.status === "absent") absent++;
      else late++;
    }
    const total = present + absent + late;
    return { present, absent, late, total, rate: total ? Math.round((present / total) * 100) : null };
  }, [attRows]);

  // Overall average
  const overallAvg = useMemo(() => {
    const scored = grades.filter((g) => g.score !== null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((s, g) => s + (Number(g.score) / Math.max(Number(g.max_score ?? 100), 1)) * 100, 0) / scored.length);
  }, [grades]);

  const milestones = useMemo(() => [
    { label: isAr ? "درجات مُسجَّلة" : "Recorded Grades", value: grades.length, target: null, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { label: isAr ? "أيام حضور" : "Present Days", value: attStats.present, target: null, color: "text-green-600 bg-green-50 border-green-200" },
    { label: isAr ? "غيابات" : "Absences", value: attStats.absent, target: null, color: attStats.absent > 5 ? "text-red-600 bg-red-50 border-red-200" : "text-muted-foreground bg-muted/20 border-border" },
    { label: isAr ? "متوسط عام" : "Overall Average", value: overallAvg !== null ? `${overallAvg}%` : "—", target: null, color: overallAvg !== null ? (overallAvg >= 70 ? "text-green-600 bg-green-50 border-green-200" : overallAvg >= 50 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-red-600 bg-red-50 border-red-200") : "text-muted-foreground bg-muted/20 border-border" },
  ], [grades, attStats, overallAvg, isAr]);

  if (isLoading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> {isAr ? "جارى التحميل..." : "Loading..."}
    </div>
  );

  if (!regInfo || !["approved", "activated"].includes(regInfo.request_status)) {
    return (
      <div className="bg-surface-elevated rounded-lg border border-amber-200 p-8 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <p className="text-sm text-muted-foreground">
          {isAr ? "ستظهر إحصائيات تقدمك الأكاديمى فور تفعيل الحساب." : "Academic progress stats will appear after account activation."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "تحليل التقدم الدراسى" : "Learning Progress Analysis"}</h2>
      </div>

      {/* Milestone Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {milestones.map((m) => (
          <div key={m.label} className={`p-4 rounded-lg border text-center ${m.color}`}>
            <p className="text-2xl font-bold">{m.value}</p>
            <p className="text-xs mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="text-sm font-semibold text-foreground mb-6">{isAr ? "متوسط الدرجات حسب المادة" : "Average Score by Subject"}</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))", fontSize: "12px" }}
                formatter={(v: number) => [`${v}%`, isAr ? "المتوسط" : "Average"]}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={30}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.score >= 80 ? "#22c55e" : entry.score >= 60 ? "hsl(var(--primary))" : entry.score >= 40 ? "#f59e0b" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex flex-col items-center justify-center border border-dashed border-border rounded-lg gap-3">
            <BarChart2 className="w-10 h-10 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">{isAr ? "لا توجد درجات مسجلة بعد" : "No grades recorded yet"}</p>
          </div>
        )}
      </div>

      {/* Attendance Progress */}
      {attStats.total > 0 && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">{isAr ? "معدل الحضور" : "Attendance Rate"}</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{isAr ? "معدل الحضور" : "Attendance rate"}</span>
                <span className="font-semibold text-foreground">{attStats.rate}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${(attStats.rate ?? 0) >= 85 ? "bg-green-500" : (attStats.rate ?? 0) >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${attStats.rate ?? 0}%` }}
                />
              </div>
            </div>
            <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${(attStats.rate ?? 0) >= 85 ? "text-green-700 bg-green-50 border-green-200" : (attStats.rate ?? 0) >= 70 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-red-700 bg-red-50 border-red-200"}`}>
              {(attStats.rate ?? 0) >= 85 ? (isAr ? "ممتاز" : "Excellent") : (attStats.rate ?? 0) >= 70 ? (isAr ? "مقبول" : "Fair") : (isAr ? "يحتاج تحسين" : "Needs Improvement")}
            </div>
          </div>
        </div>
      )}

      {/* Achievement Level */}
      {overallAvg !== null && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-gold" />
            <h3 className="font-semibold text-foreground text-sm">{isAr ? "مستوى التحصيل" : "Achievement Level"}</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-4 shrink-0 ${overallAvg >= 85 ? "text-green-700 border-green-400 bg-green-50" : overallAvg >= 70 ? "text-blue-700 border-blue-400 bg-blue-50" : overallAvg >= 50 ? "text-amber-700 border-amber-400 bg-amber-50" : "text-red-700 border-red-400 bg-red-50"}`}>
              {overallAvg >= 85 ? "A" : overallAvg >= 70 ? "B" : overallAvg >= 50 ? "C" : "D"}
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {overallAvg >= 85 ? (isAr ? "ممتاز" : "Excellent") : overallAvg >= 70 ? (isAr ? "جيد جداً" : "Very Good") : overallAvg >= 50 ? (isAr ? "جيد" : "Good") : (isAr ? "يحتاج تحسين" : "Needs Improvement")}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">{isAr ? `متوسط عام: ${overallAvg}%` : `Overall average: ${overallAvg}%`}</p>
              <p className="text-xs text-muted-foreground mt-1">{isAr ? `مبنى على ${grades.length} درجة مسجلة` : `Based on ${grades.length} recorded grade(s)`}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
