import { useMemo, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { AlertTriangle, ShieldAlert, Heart, TrendingDown, UserCheck, Loader2, Brain, XCircle, Clock } from "lucide-react";
import { useSchoolStudents, useSchoolClasses } from "@/hooks/useSchoolAdminData";
import { useUserScope } from "@/hooks/useGovernanceData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type RiskLevel = "critical" | "high" | "medium";
interface AtRiskStudent {
  id: string;
  full_name: string | null;
  grade_number: number | null;
  attendanceRate: number | null;
  avgGrade: number | null;
  riskLevel: RiskLevel;
  riskReasons: string[];
}

function useSchoolRiskData(schoolId: string | null | undefined) {
  return useQuery({
    queryKey: ["school_risk_analysis", schoolId],
    queryFn: async (): Promise<AtRiskStudent[]> => {
      if (!schoolId) return [];

      // 1. Get classes in school
      const { data: cls } = await (supabase as any).from("classes").select("id").eq("school_id", schoolId);
      const classIds = (cls || []).map((c: any) => c.id);
      if (!classIds.length) return [];

      // 2. Get students in those classes via enrollments
      const { data: enr } = await (supabase as any)
        .from("enrollments").select("student_id,class_id,students(id,full_name,grade_number)").in("class_id", classIds);
      const studentMap = new Map<string, { full_name: string | null; grade_number: number | null; classIds: string[] }>();
      for (const e of enr || []) {
        const sid = e.student_id as string;
        if (!studentMap.has(sid)) studentMap.set(sid, { full_name: e.students?.full_name ?? null, grade_number: e.students?.grade_number ?? null, classIds: [] });
        studentMap.get(sid)!.classIds.push(e.class_id);
      }
      if (!studentMap.size) return [];

      const studentIds = [...studentMap.keys()];
      const since30 = new Date(); since30.setDate(since30.getDate() - 30);

      // 3. Attendance last 30 days
      const { data: attRows } = await (supabase as any)
        .from("attendance_records").select("student_id,status").in("student_id", studentIds).gte("date", since30.toISOString().split("T")[0]);

      const attMap = new Map<string, { p: number; a: number; l: number }>();
      for (const r of attRows || []) {
        const sid = r.student_id as string;
        if (!attMap.has(sid)) attMap.set(sid, { p: 0, a: 0, l: 0 });
        const s = attMap.get(sid)!;
        if (r.status === "present") s.p++; else if (r.status === "absent") s.a++; else s.l++;
      }

      // 4. Grades
      const { data: gradeRows } = await (supabase as any)
        .from("grades").select("student_id,score,max_score").in("student_id", studentIds);
      const gradeMap = new Map<string, number[]>();
      for (const g of gradeRows || []) {
        const sid = g.student_id as string;
        const max = Math.max(Number(g.max_score ?? 100), 1);
        const pct = (Number(g.score ?? 0) / max) * 100;
        if (!gradeMap.has(sid)) gradeMap.set(sid, []);
        gradeMap.get(sid)!.push(pct);
      }

      // 5. Calculate risk
      const result: AtRiskStudent[] = [];
      for (const [sid, info] of studentMap) {
        const att = attMap.get(sid);
        const grades = gradeMap.get(sid);
        const total = att ? att.p + att.a + att.l : 0;
        const attRate = total > 0 ? Math.round((att!.p / total) * 100) : null;
        const avgGrade = grades?.length ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : null;

        const riskReasons: string[] = [];
        if (attRate !== null && attRate < 70) riskReasons.push("attendance_critical");
        else if (attRate !== null && attRate < 85) riskReasons.push("attendance_low");
        if (avgGrade !== null && avgGrade < 40) riskReasons.push("grades_critical");
        else if (avgGrade !== null && avgGrade < 60) riskReasons.push("grades_low");
        if (att && att.a >= 5) riskReasons.push("many_absences");

        if (riskReasons.length === 0) continue;

        const riskLevel: RiskLevel =
          riskReasons.includes("attendance_critical") || riskReasons.includes("grades_critical") ? "critical"
          : riskReasons.length >= 2 ? "high"
          : "medium";

        result.push({ id: sid, full_name: info.full_name, grade_number: info.grade_number, attendanceRate: attRate, avgGrade, riskLevel, riskReasons });
      }

      return result.sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2 };
        return order[a.riskLevel] - order[b.riskLevel];
      });
    },
    enabled: !!schoolId,
    staleTime: 60_000,
  });
}

const RISK_STYLES: Record<RiskLevel, { badge: string; row: string; icon: typeof AlertTriangle }> = {
  critical: { badge: "text-red-700 bg-red-50 border-red-300", row: "border-red-200 bg-red-50/30", icon: XCircle },
  high: { badge: "text-amber-700 bg-amber-50 border-amber-300", row: "border-amber-200 bg-amber-50/30", icon: AlertTriangle },
  medium: { badge: "text-blue-700 bg-blue-50 border-blue-300", row: "border-blue-200 bg-blue-50/20", icon: Clock },
};

const REASON_LABELS: Record<string, { ar: string; en: string }> = {
  attendance_critical: { ar: "حضور أقل من 70%", en: "Attendance < 70%" },
  attendance_low: { ar: "حضور أقل من 85%", en: "Attendance < 85%" },
  grades_critical: { ar: "متوسط أقل من 40%", en: "Avg grade < 40%" },
  grades_low: { ar: "متوسط أقل من 60%", en: "Avg grade < 60%" },
  many_absences: { ar: "5+ غيابات", en: "5+ absences" },
};

export function InterventionCenter() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { data: scope } = useUserScope();
  const { data: atRisk = [], isLoading } = useSchoolRiskData(scope?.school_id);
  const [filter, setFilter] = useState<"all" | RiskLevel>("all");

  const filtered = filter === "all" ? atRisk : atRisk.filter((s) => s.riskLevel === filter);
  const counts = useMemo(() => ({
    critical: atRisk.filter((s) => s.riskLevel === "critical").length,
    high: atRisk.filter((s) => s.riskLevel === "high").length,
    medium: atRisk.filter((s) => s.riskLevel === "medium").length,
  }), [atRisk]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h2 className="font-semibold text-foreground">{isAr ? "مركز التدخل والدعم" : "Intervention & Support Center"}</h2>
        </div>
        <div className="flex items-center gap-1.5 bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-1.5">
          <Brain className="w-4 h-4 text-destructive" />
          <span className="text-xs font-medium text-destructive">{isAr ? "تحليل ذكاء اصطناعى" : "AI Risk Analysis"}</span>
        </div>
      </div>

      {/* AI Info Banner */}
      <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-destructive">{isAr ? "نظام الإنذار المبكر — AI" : "Early Warning System — AI"}</p>
          <p className="text-[10px] text-destructive/70 mt-1 leading-relaxed">
            {isAr
              ? "يحلل النظام بيانات الحضور والدرجات آلياً لتحديد الطلاب المعرضين للخطر. بيانات آخر 30 يوم."
              : "System automatically analyzes attendance and grades to identify at-risk students. Data from last 30 days."}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: "critical" as RiskLevel, label: isAr ? "خطر حرج" : "Critical", color: "text-red-700 bg-red-50 border-red-200" },
          { key: "high" as RiskLevel, label: isAr ? "خطر مرتفع" : "High Risk", color: "text-amber-700 bg-amber-50 border-amber-200" },
          { key: "medium" as RiskLevel, label: isAr ? "متابعة" : "Monitor", color: "text-blue-700 bg-blue-50 border-blue-200" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(filter === item.key ? "all" : item.key)}
            className={`p-4 rounded-lg border text-center transition-all ${item.color} ${filter === item.key ? "ring-2 ring-offset-1 ring-current" : "hover:opacity-80"}`}
          >
            <p className="text-2xl font-bold">{isLoading ? "—" : counts[item.key]}</p>
            <p className="text-xs mt-1">{item.label}</p>
          </button>
        ))}
      </div>

      {/* Students List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{isAr ? "جارى التحليل..." : "Analyzing..."}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-elevated rounded-lg border border-border p-12 text-center">
          {atRisk.length === 0 ? (
            <>
              <Heart className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="font-medium text-foreground mb-1">{isAr ? "لا توجد حالات تحتاج تدخلاً" : "No intervention cases"}</h3>
              <p className="text-sm text-muted-foreground">{isAr ? "جميع الطلاب بمستوى أداء وحضور مقبول." : "All students have acceptable performance and attendance."}</p>
            </>
          ) : (
            <>
              <UserCheck className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">{isAr ? "لا توجد حالات في هذه الفئة." : "No cases in this category."}</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filtered.length} {isAr ? "طالب يحتاج متابعة" : "students need attention"}
            </p>
            {filter !== "all" && (
              <button onClick={() => setFilter("all")} className="text-xs text-primary underline">{isAr ? "عرض الكل" : "Show all"}</button>
            )}
          </div>

          {filtered.map((student) => {
            const style = RISK_STYLES[student.riskLevel];
            const Icon = style.icon;
            return (
              <div key={student.id} className={`rounded-lg border p-4 ${style.row}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${style.badge}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{student.full_name || (isAr ? "طالب" : "Student")}</span>
                      {student.grade_number && (
                        <span className="text-xs text-muted-foreground">
                          {isAr ? `الصف ${student.grade_number}` : `Grade ${student.grade_number}`}
                        </span>
                      )}
                      <span className={`text-[10px] border px-1.5 py-0.5 rounded-full font-medium ${style.badge}`}>
                        {isAr ? (student.riskLevel === "critical" ? "حرج" : student.riskLevel === "high" ? "مرتفع" : "متابعة") : student.riskLevel}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {student.attendanceRate !== null && (
                        <span className={`text-xs ${student.attendanceRate < 70 ? "text-red-600" : student.attendanceRate < 85 ? "text-amber-600" : "text-green-600"}`}>
                          {isAr ? "حضور:" : "Att:"} <strong>{student.attendanceRate}%</strong>
                        </span>
                      )}
                      {student.avgGrade !== null && (
                        <span className={`text-xs ${student.avgGrade < 40 ? "text-red-600" : student.avgGrade < 60 ? "text-amber-600" : "text-green-600"}`}>
                          {isAr ? "متوسط:" : "Avg:"} <strong>{student.avgGrade}%</strong>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {student.riskReasons.map((r) => (
                        <span key={r} className={`text-[10px] border px-1.5 py-0.5 rounded-full ${style.badge}`}>
                          {isAr ? REASON_LABELS[r]?.ar : REASON_LABELS[r]?.en}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
