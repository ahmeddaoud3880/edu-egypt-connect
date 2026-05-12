import { useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { TrendingUp, TrendingDown, BarChart3, BookOpen, Users, Award, AlertCircle, Loader2 } from "lucide-react";
import { useSchoolClasses, useSchoolStudents } from "@/hooks/useSchoolAdminData";
import { useUserScope } from "@/hooks/useGovernanceData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function useSchoolGrades(schoolId: string | null | undefined) {
  return useQuery({
    queryKey: ["school_grades_summary", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      // Get all classes in school
      const { data: cls } = await (supabase as any).from("classes").select("id,name,grade_number").eq("school_id", schoolId);
      const classIds = (cls || []).map((c: any) => c.id);
      if (!classIds.length) return [];
      const { data, error } = await (supabase as any)
        .from("grades")
        .select("score,max_score,class_id,subject_id,subjects(name,name_ar)")
        .in("class_id", classIds);
      if (error) throw error;
      return (data || []).map((g: any) => ({
        ...g,
        classMap: (cls || []).reduce((acc: any, c: any) => { acc[c.id] = c; return acc; }, {}),
      }));
    },
    enabled: !!schoolId,
  });
}

function useSchoolAttendanceSummary(schoolId: string | null | undefined) {
  return useQuery({
    queryKey: ["school_attendance_summary", schoolId],
    queryFn: async () => {
      if (!schoolId) return { present: 0, absent: 0, late: 0, total: 0 };
      const since = new Date(); since.setDate(since.getDate() - 30);
      const { data: cls } = await (supabase as any).from("classes").select("id").eq("school_id", schoolId);
      const classIds = (cls || []).map((c: any) => c.id);
      if (!classIds.length) return { present: 0, absent: 0, late: 0, total: 0 };
      const { data, error } = await (supabase as any)
        .from("attendance_records")
        .select("status")
        .in("class_id", classIds)
        .gte("date", since.toISOString().split("T")[0]);
      if (error) throw error;
      let present = 0, absent = 0, late = 0;
      for (const r of data || []) {
        if (r.status === "present") present++;
        else if (r.status === "absent") absent++;
        else late++;
      }
      return { present, absent, late, total: present + absent + late };
    },
    enabled: !!schoolId,
  });
}

export function AcademicMonitoring() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { data: scope } = useUserScope();
  const { data: classes = [], isLoading: classLoading } = useSchoolClasses();
  const { data: students = [] } = useSchoolStudents();
  const { data: gradesRaw = [], isLoading: gradesLoading } = useSchoolGrades(scope?.school_id);
  const { data: att } = useSchoolAttendanceSummary(scope?.school_id);

  const isLoading = classLoading || gradesLoading;

  // Subject averages
  const subjectStats = useMemo(() => {
    const map = new Map<string, { name: string; name_ar: string | null; scores: number[] }>();
    for (const g of gradesRaw) {
      const max = Math.max(Number(g.max_score ?? 100), 1);
      const pct = (Number(g.score ?? 0) / max) * 100;
      const sid = g.subject_id || "_none_";
      if (!map.has(sid)) map.set(sid, { name: g.subjects?.name || "Unknown", name_ar: g.subjects?.name_ar || null, scores: [] });
      map.get(sid)!.scores.push(pct);
    }
    return [...map.values()].map((s) => ({
      name: isAr ? s.name_ar || s.name : s.name,
      avg: s.scores.length ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) : 0,
      count: s.scores.length,
    })).sort((a, b) => b.avg - a.avg).slice(0, 6);
  }, [gradesRaw, isAr]);

  // Class performance
  const classStats = useMemo(() => {
    const map = new Map<string, { name: string; scores: number[] }>();
    for (const cls of classes) map.set(cls.id, { name: cls.name, scores: [] });
    for (const g of gradesRaw) {
      const cid = g.class_id;
      if (map.has(cid)) {
        const max = Math.max(Number(g.max_score ?? 100), 1);
        map.get(cid)!.scores.push((Number(g.score ?? 0) / max) * 100);
      }
    }
    return [...map.values()].filter((c) => c.scores.length > 0).map((c) => ({
      name: c.name,
      avg: Math.round(c.scores.reduce((a, b) => a + b, 0) / c.scores.length),
      count: c.scores.length,
    })).sort((a, b) => b.avg - a.avg).slice(0, 8);
  }, [gradesRaw, classes]);

  // Overall stats
  const overallAvg = gradesRaw.length
    ? Math.round(gradesRaw.reduce((s, g) => s + (Number(g.score ?? 0) / Math.max(Number(g.max_score ?? 100), 1)) * 100, 0) / gradesRaw.length)
    : null;
  const attendanceRate = att?.total ? Math.round((att.present / att.total) * 100) : null;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isAr ? "متوسط الدرجات" : "Grade Average", value: overallAvg !== null ? `${overallAvg}%` : "—", icon: Award, color: overallAvg !== null ? (overallAvg >= 70 ? "text-green-600 bg-green-50" : "text-amber-600 bg-amber-50") : "text-muted-foreground bg-muted/30" },
          { label: isAr ? "معدل الحضور (30 يوم)" : "Attendance (30d)", value: attendanceRate !== null ? `${attendanceRate}%` : "—", icon: Users, color: attendanceRate !== null ? (attendanceRate >= 85 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50") : "text-muted-foreground bg-muted/30" },
          { label: isAr ? "الفصول" : "Classes", value: classes.length, icon: BookOpen, color: "text-blue-600 bg-blue-50" },
          { label: isAr ? "إجمالى الطلاب" : "Total Students", value: students.length, icon: Users, color: "text-purple-600 bg-purple-50" },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{isLoading ? <Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /> : stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {gradesRaw.length === 0 && !isLoading ? (
        <div className="bg-surface-elevated rounded-lg border border-border p-12 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-1">{isAr ? "لا توجد درجات مُسجَّلة بعد" : "No grades recorded yet"}</h3>
          <p className="text-sm text-muted-foreground">{isAr ? "ستظهر تحليلات الأداء الأكاديمى فور رصد المعلمين للدرجات." : "Academic performance analytics will appear once teachers record grades."}</p>
        </div>
      ) : (
        <>
          {/* Subject Performance */}
          {subjectStats.length > 0 && (
            <div className="bg-surface-elevated rounded-lg border border-border p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">{isAr ? "أداء المواد الدراسية" : "Subject Performance"}</h3>
              </div>
              <div className="space-y-3">
                {subjectStats.map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-sm text-foreground w-32 truncate shrink-0">{s.name}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${s.avg >= 80 ? "bg-green-500" : s.avg >= 60 ? "bg-blue-500" : s.avg >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${s.avg}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-sm font-bold ${s.avg >= 80 ? "text-green-600" : s.avg >= 60 ? "text-blue-600" : s.avg >= 40 ? "text-amber-600" : "text-red-600"}`}>{s.avg}%</span>
                      {s.avg >= 80 ? <TrendingUp className="w-3.5 h-3.5 text-green-500" /> : s.avg < 50 ? <TrendingDown className="w-3.5 h-3.5 text-red-500" /> : null}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{s.count} {isAr ? "رصد" : "records"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Class Performance */}
          {classStats.length > 0 && (
            <div className="bg-surface-elevated rounded-lg border border-border p-6">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">{isAr ? "أداء الفصول الدراسية" : "Class Performance"}</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {classStats.map((cls) => (
                  <div key={cls.name} className={`flex items-center gap-3 p-3 rounded-lg border ${cls.avg >= 75 ? "border-green-200 bg-green-50" : cls.avg >= 50 ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${cls.avg >= 75 ? "bg-green-100 text-green-700" : cls.avg >= 50 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                      {cls.avg}%
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">{cls.count} {isAr ? "درجة مُرصودة" : "grades recorded"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendance Breakdown */}
          {att && att.total > 0 && (
            <div className="bg-surface-elevated rounded-lg border border-border p-6">
              <div className="flex items-center gap-2 mb-5">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">{isAr ? "الحضور (آخر 30 يوم)" : "Attendance (Last 30 Days)"}</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: isAr ? "حاضر" : "Present", count: att.present, color: "text-green-700 bg-green-50 border-green-200" },
                  { label: isAr ? "غائب" : "Absent", count: att.absent, color: "text-red-700 bg-red-50 border-red-200" },
                  { label: isAr ? "متأخر" : "Late", count: att.late, color: "text-amber-700 bg-amber-50 border-amber-200" },
                ].map((item) => (
                  <div key={item.label} className={`p-4 rounded-lg border text-center ${item.color}`}>
                    <p className="text-2xl font-bold">{item.count}</p>
                    <p className="text-xs mt-1">{item.label}</p>
                    <p className="text-[10px] mt-0.5 opacity-60">{att.total ? Math.round((item.count / att.total) * 100) : 0}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Info Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-primary">{isAr ? "تحليل المناهج" : "Curriculum Analysis"}</p>
            <p className="text-[10px] text-primary/70 mt-1">{isAr ? "تتبع مدى التقدم فى شرح المناهج الدراسية لكل مادة." : "Track curriculum delivery progress per subject."}</p>
          </div>
        </div>
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800">{isAr ? "الفجوات التعليمية" : "Learning Gaps"}</p>
            <p className="text-[10px] text-amber-700 mt-1">
              {gradesRaw.filter((g: any) => (Number(g.score ?? 0) / Math.max(Number(g.max_score ?? 100), 1)) * 100 < 50).length} {isAr ? "رصد بأقل من 50% — تحتاج متابعة." : "records below 50% — need attention."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
