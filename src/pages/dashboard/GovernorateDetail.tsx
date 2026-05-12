import { useTranslation } from "@/hooks/useTranslation";
import { useParams, Link } from "react-router-dom";
import { AIRecommendationsPanel } from "@/components/dashboard/AIRecommendationsPanel";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useDemoMode } from "@/hooks/useDemoMode";
import {
  Building2, School, Users, GraduationCap, TrendingUp, CheckCircle2,
  ArrowUpRight, ArrowDownRight, ChevronRight, ArrowLeft
} from "lucide-react";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts";

const tabs = [
  { id: "overview", labelEn: "Overview", labelAr: "نظرة عامة" },
  { id: "performance", labelEn: "Performance", labelAr: "الأداء" },
  { id: "operations", labelEn: "Operations", labelAr: "العمليات" },
  { id: "ai", labelEn: "AI Recommendations", labelAr: "التوصيات الذكية" },
];

const adminData = [
  { name: "Nasr City", schools: 145, attendance: 96, passRate: 91, score: 88 },
  { name: "Heliopolis", schools: 112, attendance: 95, passRate: 90, score: 86 },
  { name: "Maadi", schools: 98, attendance: 94, passRate: 88, score: 84 },
  { name: "Shoubra", schools: 134, attendance: 91, passRate: 83, score: 78 },
  { name: "El-Marg", schools: 87, attendance: 88, passRate: 79, score: 72 },
  { name: "El-Salam", schools: 76, attendance: 85, passRate: 76, score: 68 },
];

const trendData = [
  { month: "Sep", attendance: 96, passRate: 89 },
  { month: "Oct", attendance: 95, passRate: 88 },
  { month: "Nov", attendance: 93, passRate: 86 },
  { month: "Dec", attendance: 91, passRate: 85 },
  { month: "Jan", attendance: 89, passRate: 83 },
  { month: "Feb", attendance: 92, passRate: 86 },
  { month: "Mar", attendance: 93, passRate: 87 },
];

const aiRecs = [
  { priority: "high" as const, text: { en: "El-Salam and El-Marg administrations need immediate support — both below national benchmarks", ar: "إدارتا السلام والمرج تحتاجان دعم فورى — كلاهما أقل من المعايير الوطنية" } },
  { priority: "medium" as const, text: { en: "Teacher surplus in Nasr City (Mathematics) can address Shoubra deficit through inter-admin transfer", ar: "فائض المعلمين فى مدينة نصر (رياضيات) يمكنه سد عجز شبرا عبر النقل بين الإدارات" } },
  { priority: "low" as const, text: { en: "Digital learning resources in Maadi show 28% higher engagement — consider expansion to other administrations", ar: "موارد التعلم الرقمى فى المعادى تظهر مشاركة أعلى 28% — يُنظر فى التوسع للإدارات الأخرى" } },
];

export default function GovernorateDetail() {
  const { t, lang } = useTranslation();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const { isDemoVisible } = useDemoMode();
  const govName = id ? id.charAt(0).toUpperCase() + id.slice(1) : "Cairo";

  const kpis = [
    { label: lang === "ar" ? "الإدارات" : "Administrations", value: isDemoVisible ? "38" : "—", icon: Building2 },
    { label: t("ministry.totalSchools"), value: isDemoVisible ? "5,420" : "—", icon: School },
    { label: t("common.teachers"), value: isDemoVisible ? "42,300" : "—", icon: Users },
    { label: t("common.students"), value: isDemoVisible ? "3.2M" : "—", icon: GraduationCap },
    { label: t("common.attendance"), value: isDemoVisible ? "92.3%" : "—", change: isDemoVisible ? "-0.5%" : undefined, up: false, icon: TrendingUp },
    { label: t("ministry.passRate"), value: isDemoVisible ? "84.1%" : "—", change: isDemoVisible ? "+0.8%" : undefined, up: true, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link to="/dashboard?role=ministry" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-3 h-3" /> {lang === "ar" ? "العودة للوحة الوطنية" : "Back to National Dashboard"}
        </Link>
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h1 className="text-xl font-bold text-foreground">{govName} Governorate</h1>
          <p className="text-sm text-muted-foreground mt-1">{lang === "ar" ? `محافظة ${govName} — تفاصيل المديرية` : `Educational Directorate — Governorate Detail View`}</p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {lang === "ar" ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "ترتيب الإدارات" : "Administration Rankings"}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="text-start pb-3 text-xs font-semibold text-muted-foreground">{t("common.administration")}</th>
                    <th className="text-end pb-3 text-xs font-semibold text-muted-foreground">{t("common.school")}s</th>
                    <th className="text-end pb-3 text-xs font-semibold text-muted-foreground">{t("common.attendance")}</th>
                    <th className="text-end pb-3 text-xs font-semibold text-muted-foreground">{t("ministry.passRate")}</th>
                    <th className="text-end pb-3 text-xs font-semibold text-muted-foreground">{t("common.score")}</th>
                    <th className="text-end pb-3 text-xs font-semibold text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.map((a) => (
                    <tr key={a.name} className="border-b border-border hover:bg-muted/30">
                      <td className="py-2.5 font-medium text-foreground">{a.name}</td>
                      <td className="py-2.5 text-end text-foreground">{a.schools}</td>
                      <td className="py-2.5 text-end text-foreground">{a.attendance}%</td>
                      <td className="py-2.5 text-end text-foreground">{a.passRate}%</td>
                      <td className="py-2.5 text-end font-semibold text-foreground">{a.score}</td>
                      <td className="py-2.5 text-end">
                        <Link to={`/dashboard/administration/${a.name.toLowerCase().replace(/ /g, "-")}?role=ministry`} className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
                          {t("dash.viewDetails")} <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "مقارنة أداء الإدارات" : "Administration Performance Comparison"}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={adminData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} domain={[60, 100]} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="attendance" fill="hsl(220 40% 13%)" name={t("common.attendance")} radius={[2, 2, 0, 0]} />
                <Bar dataKey="passRate" fill="hsl(42 75% 50%)" name={t("ministry.passRate")} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "performance" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "اتجاهات الأداء" : "Performance Trends"}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} domain={[75, 100]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="attendance" stroke="hsl(220 40% 13%)" strokeWidth={2} name={t("common.attendance")} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="passRate" stroke="hsl(42 75% 50%)" strokeWidth={2} name={t("ministry.passRate")} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === "operations" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "المشكلات التشغيلية" : "Operational Issues"}</h3>
          <div className="space-y-3">
            {[
              { issue: "Teacher shortage in 3 administrations", severity: "critical" as const },
              { issue: "5 schools with overdue safety inspections", severity: "warning" as const },
              { issue: "12 delayed monthly performance reports", severity: "warning" as const },
              { issue: "Infrastructure maintenance backlog: 18 schools", severity: "warning" as const },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-surface rounded border border-border">
                <span className="text-sm text-foreground">{item.issue}</span>
                <StatusBadge status={item.severity} label={item.severity === "critical" ? t("status.critical") : t("status.warning")} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "ai" && <AIRecommendationsPanel recommendations={aiRecs} />}
    </div>
  );
}
