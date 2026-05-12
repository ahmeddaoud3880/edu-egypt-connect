import { useTranslation } from "@/hooks/useTranslation";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { AIRecommendationsPanel } from "@/components/dashboard/AIRecommendationsPanel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const students = [
  { name: "Ahmed Mahmoud", avg: 92, attendance: 98, homework: 95, status: "normal" as const },
  { name: "Layla Hassan", avg: 88, attendance: 96, homework: 90, status: "normal" as const },
  { name: "Youssef Samir", avg: 76, attendance: 92, homework: 82, status: "normal" as const },
  { name: "Nada Ibrahim", avg: 70, attendance: 88, homework: 75, status: "warning" as const },
  { name: "Omar Khaled", avg: 55, attendance: 92, homework: 60, status: "warning" as const },
  { name: "Nour Ahmed", avg: 48, attendance: 90, homework: 52, status: "critical" as const },
  { name: "Hana Mostafa", avg: 58, attendance: 76, homework: 55, status: "warning" as const },
];

const subjectScores = [
  { subject: "Arabic", avg: 74 }, { subject: "Math", avg: 62 }, { subject: "Science", avg: 68 },
  { subject: "English", avg: 58 }, { subject: "Social", avg: 76 },
];

const tabs = [
  { id: "overview", en: "Overview", ar: "نظرة عامة" },
  { id: "students", en: "Students", ar: "الطلاب" },
  { id: "ai", en: "AI", ar: "الذكاء الاصطناعى" },
];

const aiRecs = [
  { priority: "high" as const, text: { en: "Nour Ahmed needs immediate academic intervention — average 48% with declining trend", ar: "نور أحمد تحتاج تدخل أكاديمى فورى — المتوسط 48% مع اتجاه تراجعى" } },
  { priority: "medium" as const, text: { en: "English scores significantly lower than other subjects — request supplementary English sessions", ar: "درجات الإنجليزية أقل بكثير من المواد الأخرى — طلب جلسات دعم إنجليزى" } },
];

export default function ClassDetail() {
  const { t, lang } = useTranslation();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const className = id ? id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Grade 5-B";

  const kpis = [
    { label: t("common.students"), value: "31" },
    { label: t("common.attendance"), value: "91%" },
    { label: lang === "ar" ? "المتوسط" : "Average", value: "74%" },
    { label: lang === "ar" ? "الواجبات" : "Homework", value: "78%" },
    { label: lang === "ar" ? "معرضون للخطر" : "At Risk", value: "3" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard?role=school" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-3 h-3" /> {lang === "ar" ? "العودة للوحة المدرسة" : "Back to School Dashboard"}
        </Link>
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h1 className="text-xl font-bold text-foreground">{className}</h1>
          <p className="text-sm text-muted-foreground">{t("detail.classDetail")}</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4 text-center">
            <div className="text-lg font-bold text-foreground">{k.value}</div>
            <div className="text-[10px] text-muted-foreground">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="border-b border-border">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {lang === "ar" ? tab.ar : tab.en}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "أداء المواد" : "Subject Performance"}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subjectScores} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} domain={[40, 100]} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="avg" fill="hsl(220 40% 13%)" name="Avg Score" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "قائمة الطلاب" : "Student List"}</h3>
            <div className="space-y-2">
              {students.slice(0, 5).map((s) => (
                <div key={s.name} className="flex items-center justify-between p-2 bg-surface rounded border border-border">
                  <div>
                    <span className="text-sm font-medium text-foreground">{s.name}</span>
                    <span className="text-xs text-muted-foreground ms-2">Avg: {s.avg}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={s.status} label={s.status === "critical" ? t("status.critical") : s.status === "warning" ? t("status.warning") : t("status.normal")} />
                    <Link to={`/dashboard/school/student/${s.name.toLowerCase().replace(/ /g, "-")}?role=school`}><ChevronRight className="w-3 h-3 text-primary" /></Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "students" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "جميع الطلاب" : "All Students"}</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b-2 border-primary">
              <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">{t("common.name")}</th>
              <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{lang === "ar" ? "المتوسط" : "Avg"}</th>
              <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{t("common.attendance")}</th>
              <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{lang === "ar" ? "واجبات" : "HW"}</th>
              <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{t("common.status")}</th>
              <th className="text-end pb-2 text-xs font-semibold text-muted-foreground"></th>
            </tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.name} className="border-b border-border hover:bg-muted/30">
                  <td className="py-2 font-medium text-foreground">{s.name}</td>
                  <td className={`py-2 text-end font-semibold ${s.avg >= 70 ? "text-green-600" : s.avg >= 50 ? "text-amber-600" : "text-destructive"}`}>{s.avg}%</td>
                  <td className="py-2 text-end text-foreground">{s.attendance}%</td>
                  <td className="py-2 text-end text-foreground">{s.homework}%</td>
                  <td className="py-2 text-end"><StatusBadge status={s.status} label={s.status === "critical" ? t("status.critical") : s.status === "warning" ? t("status.warning") : t("status.normal")} /></td>
                  <td className="py-2 text-end"><Link to={`/dashboard/school/student/${s.name.toLowerCase().replace(/ /g, "-")}?role=school`}><ChevronRight className="w-3 h-3 text-primary" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "ai" && <AIRecommendationsPanel recommendations={aiRecs} />}
    </div>
  );
}
