import { useTranslation } from "@/hooks/useTranslation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserScope } from "@/hooks/useGovernanceData";
import {
  useSchoolStudents,
  useSchoolTeachers,
  useSchoolClasses,
  useSchoolClassEnrollmentCounts,
} from "@/hooks/useSchoolAdminData";
import {
  GraduationCap, Users, TrendingUp, ClipboardList, AlertTriangle,
  Wrench, MessageSquare, BookOpen, Sparkles,
} from "lucide-react";

function usePendingSubjectChangeRequests(schoolId: string | null) {
  return useQuery({
    queryKey: ["pending_subject_changes_school", schoolId],
    queryFn: async (): Promise<number> => {
      if (!schoolId) return 0;
      const { data: studentIds } = await (supabase as any)
        .from("students")
        .select("id")
        .eq("school_id", schoolId);
      if (!studentIds?.length) return 0;
      const ids = studentIds.map((s: any) => s.id);
      const { count } = await (supabase as any)
        .from("subject_change_requests")
        .select("id", { count: "exact", head: true })
        .in("student_id", ids)
        .in("status", ["pending", "support_approved"]);
      return count || 0;
    },
    enabled: !!schoolId,
    refetchInterval: 60000,
  });
}

function useSchoolAttendanceRateLast60d(studentIds: string[]) {
  const key = [...studentIds].sort().join(",");
  return useQuery({
    queryKey: ["school_overview_attendance_60d", key],
    queryFn: async (): Promise<number | null> => {
      if (studentIds.length === 0) return null;
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const iso = since.toISOString().slice(0, 10);
      const { data, error } = await (supabase as any)
        .from("attendance_records")
        .select("status")
        .in("student_id", studentIds)
        .gte("date", iso);
      if (error) throw error;
      const rows = (data || []) as { status: string }[];
      if (rows.length === 0) return null;
      const present = rows.filter((r) => r.status === "present").length;
      return Math.round((present / rows.length) * 100);
    },
    enabled: studentIds.length > 0,
    staleTime: 60_000,
  });
}

export function SchoolOverview() {
  const { t, lang } = useTranslation();
  const { profile } = useAuth();
  const { data: scope } = useUserScope();
  const isAr = lang === "ar";
  const schoolId = scope?.school_id ?? (profile as { school_id?: string | null })?.school_id ?? null;

  const { data: students = [] } = useSchoolStudents();
  const { data: teachers = [] } = useSchoolTeachers();
  const { data: classes = [] } = useSchoolClasses();
  const { data: enrollmentCounts = {} } = useSchoolClassEnrollmentCounts();
  const { data: pendingChanges = 0 } = usePendingSubjectChangeRequests(schoolId);

  const studentIds = students.map((s) => s.id);
  const { data: attendancePct } = useSchoolAttendanceRateLast60d(studentIds);

  const totalEnrolled = Object.values(enrollmentCounts).reduce((a, b) => a + b, 0);
  const notInAnyClass = Math.max(0, students.length - totalEnrolled);

  const kpis = [
    {
      label: t("school.totalStudents"),
      value: students.length.toString(),
      change: notInAnyClass > 0 ? (isAr ? `${notInAnyClass} غير مسجّلين بفصل` : `${notInAnyClass} not in a class`) : "",
      up: true,
      icon: GraduationCap,
    },
    { label: t("school.totalTeachers"), value: teachers.length.toString(), change: "", up: true, icon: Users },
    {
      label: t("school.attendanceRate"),
      value: attendancePct != null ? `${attendancePct}%` : "—",
      change: isAr ? "(آخر 60 يوماً)" : "(last 60 days)",
      up: (attendancePct ?? 0) >= 70,
      icon: TrendingUp,
    },
    {
      label: isAr ? "الفصول" : "Classes",
      value: classes.length.toString(),
      change: totalEnrolled > 0 ? `${totalEnrolled} ${isAr ? "تسجيل" : "enrollments"}` : "",
      up: true,
      icon: ClipboardList,
    },
    { label: t("school.academicRisk"), value: "—", change: isAr ? "قريباً" : "soon", up: true, icon: AlertTriangle },
    { label: t("school.openIssues"), value: "—", change: isAr ? "قريباً" : "soon", up: true, icon: Wrench },
    { label: t("school.parentCommStatus"), value: "—", change: isAr ? "قريباً" : "soon", up: true, icon: MessageSquare },
    {
      label: isAr ? "طلبات تغيير مادة" : "Subject Change Requests",
      value: pendingChanges.toString(),
      change: "",
      up: pendingChanges === 0,
      icon: BookOpen,
      highlight: pendingChanges > 0,
    },
  ];

  const hasLiveData = students.length > 0 || teachers.length > 0 || classes.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        {kpis.map((kpi: any) => (
          <div
            key={kpi.label}
            className={`bg-surface-elevated rounded-lg border p-4 ${kpi.highlight ? "border-amber-300 bg-amber-50/50" : "border-border"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className={`w-4 h-4 ${kpi.highlight ? "text-amber-600" : "text-muted-foreground"}`} />
              {kpi.highlight && kpi.value !== "0" && <span className="w-2 h-2 bg-amber-500 rounded-full" />}
            </div>
            <div className={`text-lg font-bold ${kpi.highlight && kpi.value !== "0" ? "text-amber-700" : "text-foreground"}`}>
              {kpi.value}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</div>
            {!!kpi.change && <div className="text-[9px] text-muted-foreground/80 mt-0.5 leading-tight">{kpi.change}</div>}
          </div>
        ))}
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary shrink-0" />
          <h3 className="font-semibold text-foreground">{isAr ? "ملخص سريع" : "Quick summary"}</h3>
        </div>
        {!schoolId ? (
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "تعذر تحديد المدرسة المرتبطة بحسابك. راجع قسم «اختيارات المواد» أو الدعم الفني لربط المدرسة."
              : "Your account is not linked to a school record. Contact support if this persists."}
          </p>
        ) : hasLiveData ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isAr ? (
              <>
                لديكم <strong>{students.length}</strong> طالب/ة و<strong>{teachers.length}</strong> معلماً ضمن{" "}
                <strong>{classes.length}</strong> فصلاً. إجمالي التسجيلات في الفصول:{" "}
                <strong>{totalEnrolled}</strong>
                {notInAnyClass > 0 && (
                  <>
                    {" "}
                    — يوجد <strong>{notInAnyClass}</strong> طالب/ة بلا فصل مسجّل في«العمليات اليومية».
                  </>
                )}
                .
              </>
            ) : (
              <>
                You have <strong>{students.length}</strong> students and <strong>{teachers.length}</strong> teachers
                across <strong>{classes.length}</strong> classes. Total class enrollments: <strong>{totalEnrolled}</strong>
                {notInAnyClass > 0 && (
                  <>
                    {" "}
                    — <strong>{notInAnyClass}</strong> student(s) are not enrolled in any class yet (use Daily Operations).
                  </>
                )}
                .
              </>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isAr
              ? "لا توجد بيانات طلاب/معلمين/فصول مرتبطة بهذه المدرسة في النظام. أضيفوا الفصول والتسجيلات من «العمليات اليومية» بعد تفعيل حسابات الطلاب والمعلمين."
              : "No students, teachers, or classes are linked to this school yet. Add classes and enrollments under Daily Operations once accounts exist."}
          </p>
        )}
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{isAr ? "مؤشرات صحة المدرسة" : "School health indicators"}</h3>
        <div className="space-y-4">
          {[
            {
              area: isAr ? "الحضور (تقديري)" : "Attendance (estimated)",
              score: attendancePct ?? 0,
              filled: attendancePct != null,
            },
            {
              area: isAr ? "تغطية الفصول (طلاب بفصل)" : "Class coverage (enrolled)",
              score: students.length ? Math.min(100, Math.round((totalEnrolled / students.length) * 100)) : 0,
              filled: students.length > 0,
            },
            {
              area: isAr ? "طاقة التدريس (معلم/فصل)" : "Staffing (teachers / class)",
              score: classes.length ? Math.min(100, Math.round((teachers.length / classes.length) * 20)) : 0,
              filled: classes.length > 0 && teachers.length > 0,
            },
            {
              area: isAr ? "طلبات تغيير مواد (معلقة)" : "Pending subject changes",
              score: pendingChanges > 0 ? Math.min(100, pendingChanges * 15) : 0,
              filled: true,
            },
          ].map((item) => (
            <div key={item.area} className="flex items-center gap-4">
              <span className="text-sm text-foreground w-44 shrink-0">{item.area}</span>
              <div className="flex-1 bg-muted rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${item.filled ? "bg-primary/70" : "bg-muted-foreground/15"}`}
                  style={{ width: `${item.filled ? Math.min(100, item.score) : 8}%` }}
                />
              </div>
              <span className="text-sm font-bold w-12 text-end">
                {item.filled ? `${Math.min(100, item.score)}%` : "—"}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-4">
          {isAr
            ? "المؤشرات تُحسب من بيانات منصة «تعليم مصر الرقمية» الحالية وليست مزامنة خارجية. حضور «—» يعني لا سجلات في آخر 60 يوماً."
            : "Indicators use current platform data only, not an external ministry sync. Attendance shows — when there are no records in the last 60 days."}
        </p>
      </div>
    </div>
  );
}
