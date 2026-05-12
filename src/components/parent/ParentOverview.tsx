import { useTranslation } from "@/hooks/useTranslation";
import { useMyChildren, useChildGrades, useChildAssignments, useChildAttendance } from "@/hooks/useParentData";
import { useMyNotifications } from "@/hooks/useNotifications";
import { Users, CheckCircle2, AlertTriangle, BookOpen, TrendingUp, Bot, CalendarDays, Bell } from "lucide-react";

function useParentKpis(children: any[]) {
  const first = children[0];
  const { data: grades = [] } = useChildGrades(first?.student_id);
  const { data: assignments = [] } = useChildAssignments(first?.student_id);
  const { data: attendance = [] } = useChildAttendance(first?.student_id);
  const { unreadCount } = useMyNotifications();

  const avg = grades.length > 0
    ? Math.round(grades.reduce((s: number, g: any) => s + ((g.score ?? 0) / (g.max_score ?? 100)) * 100, 0) / grades.length)
    : null;

  const presentCount = attendance.filter((r: any) => r.status === "present").length;
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : null;

  const pendingAssignments = assignments.filter(
    (a: any) => !a.due_date || new Date(a.due_date) >= new Date()
  ).length;

  return { avg, attendanceRate, pendingAssignments, unreadCount };
}

export function ParentOverview() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { data: children = [] } = useMyChildren();

  const { avg, attendanceRate, pendingAssignments, unreadCount } = useParentKpis(children);

  const kpis = [
    {
      label: isAr ? "الأبناء المرتبطون" : "Linked Children",
      value: children.length.toString(),
      icon: Users,
      color: "text-primary",
    },
    {
      label: isAr ? "نسبة الحضور" : "Attendance Rate",
      value: attendanceRate !== null ? `${attendanceRate}%` : "—",
      icon: CheckCircle2,
      color: "text-green-600",
    },
    {
      label: isAr ? "الواجبات القادمة" : "Pending Assignments",
      value: pendingAssignments.toString(),
      icon: BookOpen,
      color: "text-amber-600",
    },
    {
      label: isAr ? "المعدل العام" : "Overall Average",
      value: avg !== null ? `${avg}%` : "—",
      icon: TrendingUp,
      color: "text-primary",
    },
    {
      label: isAr ? "إشعارات غير مقروءة" : "Unread Notifications",
      value: unreadCount.toString(),
      icon: Bell,
      color: unreadCount > 0 ? "text-destructive" : "text-muted-foreground",
    },
    {
      label: isAr ? "مواعيد قادمة" : "Upcoming Events",
      value: "—",
      icon: CalendarDays,
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <k.icon className={`w-5 h-5 ${k.color} mb-2`} />
            <div className="text-2xl font-bold text-foreground">{k.value}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Children quick list */}
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">{isAr ? "أبنائى" : "My Children"}</h3>
          </div>
          {children.length === 0 ? (
            <p className="text-sm text-muted-foreground">{isAr ? "لا يوجد أبناء مرتبطون بعد." : "No children linked yet."}</p>
          ) : (
            <div className="space-y-2">
              {children.map((c) => (
                <div key={c.student_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
                    {(c.full_name || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {isAr ? `الصف ${c.grade_number ?? "—"}` : `Grade ${c.grade_number ?? "—"}`}
                      {c.school_name && ` · ${c.school_name}`}
                    </p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications preview */}
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-foreground">{isAr ? "تنبيهات الحضور" : "Attendance Alerts"}</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "اضغط على تبويب «الحضور» لعرض تفاصيل غيابات أبنائك وسجل الحضور الكامل."
              : "Click the Attendance tab to view full attendance records and absence details."}
          </p>
        </div>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-5 h-5 text-gold" />
          <h3 className="font-semibold text-foreground">{isAr ? "ملخص الذكاء الاصطناعى" : "AI Parent Summary"}</h3>
        </div>
        <div className="p-4 bg-gold-light rounded-lg border border-gold/20 text-sm text-foreground/80">
          {children.length === 0
            ? isAr
              ? "بمجرد إضافة بيانات أبنائك وتفعيل حساباتهم من قبل المدرسة، سيبدأ المساعد الذكى هنا بعرض ملخصات أسبوعية وتوصيات للتحسين الأكاديمى."
              : "Once your children's data is added and approved by the school, the AI Assistant will start providing weekly summaries and academic improvement recommendations here."
            : avg !== null
            ? isAr
              ? `أبناؤك ${children.length === 1 ? "يحقق" : "يحققون"} متوسط ${avg}% حالياً. تفقد تبويبات الدرجات والواجبات للمزيد من التفاصيل.`
              : `Your ${children.length === 1 ? "child is" : "children are"} averaging ${avg}% currently. Check the Grades and Assignments tabs for more details.`
            : isAr
            ? "لا تتوفر درجات حتى الآن. سيعرض المساعد ملخصاً بمجرد تسجيل الدرجات."
            : "No grades yet. The assistant will provide a summary once grades are recorded."}
        </div>
      </div>
    </div>
  );
}
