import { useTranslation } from "@/hooks/useTranslation";
import { useParams, Link } from "react-router-dom";
import { AIRecommendationsPanel } from "@/components/dashboard/AIRecommendationsPanel";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useDemoMode } from "@/hooks/useDemoMode";
import {
  School, Users, GraduationCap, TrendingUp, CheckCircle2,
  ArrowUpRight, ArrowDownRight, ChevronRight, ArrowLeft
} from "lucide-react";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const tabs = [
  { id: "overview", labelEn: "Overview", labelAr: "نظرة عامة" },
  { id: "performance", labelEn: "Performance", labelAr: "الأداء" },
  { id: "operations", labelEn: "Operations", labelAr: "العمليات" },
  { id: "ai", labelEn: "AI Recommendations", labelAr: "التوصيات الذكية" },
];

const schoolsData = [
  { name: "Secondary #1", students: 1420, teachers: 85, attendance: 96, passRate: 91, status: "normal" as const },
  { name: "Prep #3", students: 1180, teachers: 72, attendance: 94, passRate: 88, status: "normal" as const },
  { name: "Primary #7", students: 890, teachers: 55, attendance: 93, passRate: 85, status: "normal" as const },
  { name: "Technical", students: 1350, teachers: 90, attendance: 88, passRate: 78, status: "warning" as const },
  { name: "Primary #12", students: 1650, teachers: 68, attendance: 84, passRate: 72, status: "warning" as const },
  { name: "Prep #8", students: 980, teachers: 45, attendance: 79, passRate: 65, status: "critical" as const },
];

const comparisonData = schoolsData.map((s) => ({ name: s.name, attendance: s.attendance, passRate: s.passRate }));

const aiRecs = [
  { priority: "high" as const, text: { en: "Prep #8 needs full performance review and support plan — all metrics below thresholds", ar: "إعدادى #8 يحتاج مراجعة أداء شاملة وخطة دعم — جميع المؤشرات أقل من الحدود" } },
  { priority: "medium" as const, text: { en: "Primary #12 class density too high — consider redistributing students to Primary #7", ar: "كثافة الفصول فى ابتدائى #12 مرتفعة جدا — يُنظر فى إعادة توزيع الطلاب لابتدائى #7" } },
];

export default function AdministrationDetail() {
  const { t, lang } = useTranslation();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const { isDemoVisible } = useDemoMode();
  const adminName = id ? id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "Nasr City";

  const kpis = [
    { label: t("ministry.totalSchools"), value: isDemoVisible ? "145" : "—", icon: School },
    { label: t("common.teachers"), value: isDemoVisible ? "4,230" : "—", icon: Users },
    { label: t("common.students"), value: isDemoVisible ? "168,500" : "—", icon: GraduationCap },
    { label: t("common.attendance"), value: isDemoVisible ? "91.8%" : "—", change: isDemoVisible ? "-0.3%" : undefined, up: false, icon: TrendingUp },
    { label: t("ministry.passRate"), value: isDemoVisible ? "84.5%" : "—", change: isDemoVisible ? "+0.8%" : undefined, up: true, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard?role=directorate" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-3 h-3" /> {lang === "ar" ? "العودة للوحة المديرية" : "Back to Directorate Dashboard"}
        </Link>
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h1 className="text-xl font-bold text-foreground">{adminName} Administration</h1>
          <p className="text-sm text-muted-foreground mt-1">{lang === "ar" ? `إدارة ${adminName} التعليمية — عرض تفصيلى` : `Educational Administration — Detail View`}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <kpi.icon className="w-4 h-4 text-muted-foreground mb-2" />
            <div className="text-lg font-bold text-foreground">{kpi.value}</div>
            <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
            {kpi.change && (
              <span className={`text-[10px] font-semibold flex items-center gap-0.5 mt-1 ${kpi.up ? "text-green-600" : "text-destructive"}`}>
                {kpi.change} {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="border-b border-border">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {lang === "ar" ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{t("admin.schoolsUnder")}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-primary">
                  <th className="text-start pb-3 text-xs font-semibold text-muted-foreground">{t("common.school")}</th>
                  <th className="text-end pb-3 text-xs font-semibold text-muted-foreground">{t("common.students")}</th>
                  <th className="text-end pb-3 text-xs font-semibold text-muted-foreground">{t("common.teachers")}</th>
                  <th className="text-end pb-3 text-xs font-semibold text-muted-foreground">{t("common.attendance")}</th>
                  <th className="text-end pb-3 text-xs font-semibold text-muted-foreground">{t("ministry.passRate")}</th>
                  <th className="text-end pb-3 text-xs font-semibold text-muted-foreground">{t("common.status")}</th>
                  <th className="text-end pb-3 text-xs font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {schoolsData.map((s) => (
                  <tr key={s.name} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2.5 font-medium text-foreground">{s.name}</td>
                    <td className="py-2.5 text-end text-foreground">{s.students.toLocaleString()}</td>
                    <td className="py-2.5 text-end text-foreground">{s.teachers}</td>
                    <td className="py-2.5 text-end text-foreground">{s.attendance}%</td>
                    <td className="py-2.5 text-end text-foreground">{s.passRate}%</td>
                    <td className="py-2.5 text-end"><StatusBadge status={s.status} label={s.status === "critical" ? t("status.critical") : s.status === "warning" ? t("status.warning") : t("status.normal")} /></td>
                    <td className="py-2.5 text-end">
                      <Link to={`/dashboard/school/${s.name.toLowerCase().replace(/ /g, "-").replace(/#/g, "")}?role=directorate`} className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{t("admin.schoolComparison")}</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={comparisonData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} domain={[50, 100]} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="attendance" fill="hsl(220 40% 13%)" name={t("common.attendance")} radius={[2, 2, 0, 0]} />
                <Bar dataKey="passRate" fill="hsl(42 75% 50%)" name={t("ministry.passRate")} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "performance" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6 text-center py-16">
          <p className="text-sm text-muted-foreground">{lang === "ar" ? "تفاصيل الأداء التفصيلية ستتوفر فى المرحلة القادمة" : "Detailed performance analytics will be available in the next phase"}</p>
        </div>
      )}

      {activeTab === "operations" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "الملخص التشغيلى" : "Operational Summary"}</h3>
          <div className="space-y-3">
            {[
              { issue: "4 delayed reports from 3 schools", status: "warning" as const },
              { issue: "3 open complaints requiring attention", status: "warning" as const },
              { issue: "English and PE teacher shortage: critical", status: "critical" as const },
              { issue: "2 upcoming inspections scheduled", status: "normal" as const },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-surface rounded border border-border">
                <span className="text-sm text-foreground">{item.issue}</span>
                <StatusBadge status={item.status} label={item.status === "critical" ? t("status.critical") : item.status === "warning" ? t("status.warning") : t("status.normal")} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "ai" && <AIRecommendationsPanel recommendations={aiRecs} />}
    </div>
  );
}
