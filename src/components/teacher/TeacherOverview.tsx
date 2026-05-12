import { useTranslation } from "@/hooks/useTranslation";
import { useMyNotifications } from "@/hooks/useNotifications";
import { Users, BookOpen, Clock, ClipboardCheck, AlertTriangle, CalendarDays, Bot, CheckCircle2, Bell } from "lucide-react";

export function TeacherOverview() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { unreadCount } = useMyNotifications();

  const kpis = [
    { label: { en: "My Classes", ar: "فصولى" }, value: "0", icon: BookOpen, color: "text-primary" },
    { label: { en: "Total Students", ar: "إجمالى الطلاب" }, value: "0", icon: Users, color: "text-blue-600" },
    { label: { en: "Today's Sessions", ar: "حصص اليوم" }, value: "0", icon: Clock, color: "text-amber-600" },
    { label: { en: "Pending Grading", ar: "درجات معلقة" }, value: "0", icon: ClipboardCheck, color: "text-orange-600" },
    { label: { en: "Pending Attendance", ar: "حضور معلق" }, value: "0", icon: CalendarDays, color: "text-red-600" },
    { label: { en: "Students Needing Support", ar: "طلاب يحتاجون دعم" }, value: "0", icon: AlertTriangle, color: "text-destructive" },
    {
      label: { en: "Unread Notifications", ar: "إشعارات غير مقروءة" },
      value: unreadCount.toString(),
      icon: Bell,
      color: unreadCount > 0 ? "text-destructive" : "text-muted-foreground",
      highlight: unreadCount > 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {kpis.map((kpi: any) => (
          <div key={kpi.label.en} className={`bg-surface-elevated rounded-lg border p-4 ${kpi.highlight ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              {kpi.highlight && <span className="w-2 h-2 bg-destructive rounded-full" />}
            </div>
            <div className={`text-2xl font-bold ${kpi.highlight ? "text-destructive" : "text-foreground"}`}>{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{isAr ? kpi.label.ar : kpi.label.en}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* AI Teaching Summary */}
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-gold" />
            <h2 className="font-semibold text-foreground">{isAr ? "ملخص الذكاء الاصطناعى" : "AI Teaching Summary"}</h2>
          </div>
          <div className="p-8 text-center bg-muted/20 rounded-lg border border-dashed border-border">
            <Bot className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {isAr 
                ? "سيقوم المساعد الذكى بتحليل بيانات فصولك وتقديم ملخص يومى فور إسناد الفصول والطلاب لك." 
                : "The AI assistant will analyze your class data and provide a daily summary once classes and students are assigned to you."}
            </p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">{isAr ? "النشاط الأخير" : "Recent Activity"}</h2>
          <div className="h-32 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-border rounded-lg">
             <Clock className="w-6 h-6 text-muted-foreground/20" />
             <p className="text-xs text-muted-foreground italic">{isAr ? "لا يوجد نشاط مسجل بعد" : "No recent activity recorded"}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h2 className="font-semibold text-foreground mb-4">{isAr ? "إجراءات سريعة" : "Quick Actions"}</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { en: "Mark Attendance", ar: "تسجيل الحضور" },
            { en: "Create Homework", ar: "إنشاء واجب" },
            { en: "Create Quiz", ar: "إنشاء اختبار" },
            { en: "Notify Parent", ar: "إخطار ولى الأمر" },
            { en: "Add Follow-up Note", ar: "إضافة ملاحظة متابعة" },
            { en: "Export Class Report", ar: "تصدير تقرير الفصل" },
          ].map((action) => (
            <button key={action.en} disabled className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded opacity-50 cursor-not-allowed">
              {isAr ? action.ar : action.en}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-4 italic text-center">
          {isAr ? "✦ الإجراءات السريعة ستُفعل فور تفعيل صلاحيات المعلم وإسناد الجداول الدراسية" : "✦ Quick actions will be enabled once teacher roles are activated and schedules are assigned"}
        </p>
      </div>
    </div>
  );
}
