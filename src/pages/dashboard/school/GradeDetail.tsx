import { useTranslation } from "@/hooks/useTranslation";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { AIRecommendationsPanel } from "@/components/dashboard/AIRecommendationsPanel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const classesData = [
  { name: "A", students: 32, avg: 82, attendance: 95, homework: 88, risk: 1 },
  { name: "B", students: 31, avg: 74, attendance: 91, homework: 78, risk: 3 },
  { name: "C", students: 30, avg: 78, attendance: 93, homework: 82, risk: 2 },
];

const subjectPerformance = [
  { subject: "Arabic", avg: 78, pass: 92 },
  { subject: "Math", avg: 65, pass: 80 },
  { subject: "Science", avg: 70, pass: 84 },
  { subject: "English", avg: 62, pass: 76 },
  { subject: "Social", avg: 80, pass: 93 },
];

const tabs = [
  { id: "overview", en: "Overview", ar: "نظرة عامة" },
  { id: "classes", en: "Classes", ar: "الفصول" },
  { id: "subjects", en: "Subjects", ar: "المواد" },
  { id: "ai", en: "AI", ar: "الذكاء الاصطناعى" },
];

const aiRecs = [
  { priority: "high" as const, text: { en: "Class B average (74%) significantly below Class A (82%) — investigate teaching approach differences", ar: "متوسط فصل B (74%) أقل بكثير من فصل A (82%) — التحقيق فى اختلاف أساليب التدريس" } },
  { priority: "medium" as const, text: { en: "English performance weakest across all classes — consider English support program for this grade", ar: "الإنجليزية الأضعف عبر كل الفصول — النظر فى برنامج دعم اللغة الإنجليزية لهذا الصف" } },
];

export default function GradeDetail() {
  const { t, lang } = useTranslation();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const gradeName = id ? id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Grade 5";

  const kpis = [
    { label: lang === "ar" ? "الطلاب" : "Students", value: "93" },
    { label: lang === "ar" ? "الفصول" : "Classes", value: "3" },
    { label: t("common.attendance"), value: "93.0%" },
    { label: lang === "ar" ? "المتوسط" : "Average", value: "78%" },
    { label: lang === "ar" ? "معرضون للخطر" : "At Risk", value: "6" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard?role=school" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-3 h-3" /> {lang === "ar" ? "العودة للوحة المدرسة" : "Back to School Dashboard"}
        </Link>
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h1 className="text-xl font-bold text-foreground">{gradeName}</h1>
          <p className="text-sm text-muted-foreground">{t("detail.gradeDetail")}</p>
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
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "مقارنة الفصول" : "Class Comparison"}</h3>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">{t("common.class")}</th>
                <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{t("common.students")}</th>
                <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{lang === "ar" ? "المتوسط" : "Avg"}</th>
                <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{t("common.attendance")}</th>
                <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{lang === "ar" ? "خطر" : "Risk"}</th>
                <th className="text-end pb-2 text-xs font-semibold text-muted-foreground"></th>
              </tr></thead>
              <tbody>
                {classesData.map((c) => (
                  <tr key={c.name} className="border-b border-border">
                    <td className="py-2 font-medium text-foreground">{gradeName}-{c.name}</td>
                    <td className="py-2 text-end text-foreground">{c.students}</td>
                    <td className={`py-2 text-end font-semibold ${c.avg >= 80 ? "text-green-600" : c.avg >= 70 ? "text-amber-600" : "text-destructive"}`}>{c.avg}%</td>
                    <td className="py-2 text-end text-foreground">{c.attendance}%</td>
                    <td className="py-2 text-end text-destructive font-bold">{c.risk}</td>
                    <td className="py-2 text-end"><Link to={`/dashboard/school/class/${gradeName.toLowerCase().replace(/ /g, "-")}-${c.name.toLowerCase()}?role=school`}><ChevronRight className="w-3 h-3 text-primary" /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "أداء المواد" : "Subject Performance"}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subjectPerformance} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} domain={[40, 100]} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="avg" fill="hsl(220 40% 13%)" name="Avg" radius={[2, 2, 0, 0]} />
                <Bar dataKey="pass" fill="hsl(42 75% 50%)" name="Pass %" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {activeTab === "classes" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "تفاصيل الفصول" : "Class Details"}</h3>
          <div className="space-y-3">
            {classesData.map((c) => (
              <div key={c.name} className="p-4 bg-surface rounded border border-border">
                <div className="flex items-center justify-between mb-2">
                  <Link to={`/dashboard/school/1/class/${gradeName.toLowerCase().replace(/ /g, "-")}-${c.name.toLowerCase()}?role=school`} className="text-sm font-medium text-foreground hover:text-primary">{gradeName}-{c.name}</Link>
                  <StatusBadge status={c.risk > 2 ? "warning" : "normal"} label={c.risk > 2 ? (lang === "ar" ? "تحذير" : "Warning") : (lang === "ar" ? "طبيعى" : "Normal")} />
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div><div className="text-sm font-bold text-foreground">{c.students}</div><div className="text-[10px] text-muted-foreground">{t("common.students")}</div></div>
                  <div><div className={`text-sm font-bold ${c.avg >= 80 ? "text-green-600" : "text-amber-600"}`}>{c.avg}%</div><div className="text-[10px] text-muted-foreground">{lang === "ar" ? "المتوسط" : "Avg"}</div></div>
                  <div><div className="text-sm font-bold text-foreground">{c.attendance}%</div><div className="text-[10px] text-muted-foreground">{t("common.attendance")}</div></div>
                  <div><div className="text-sm font-bold text-destructive">{c.risk}</div><div className="text-[10px] text-muted-foreground">{lang === "ar" ? "خطر" : "Risk"}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === "subjects" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "تحليل المواد لهذا الصف" : "Subject Analysis for This Grade"}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b-2 border-primary">
                <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">{t("common.subject")}</th>
                <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{lang === "ar" ? "المتوسط" : "Avg"}</th>
                <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{lang === "ar" ? "نسبة النجاح" : "Pass %"}</th>
                <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">{t("common.status")}</th>
                <th className="text-end pb-2 text-xs font-semibold text-muted-foreground"></th>
              </tr></thead>
              <tbody>
                {subjectPerformance.map((s) => (
                  <tr key={s.subject} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2.5 font-medium text-foreground">{s.subject}</td>
                    <td className={`py-2.5 text-end font-semibold ${s.avg >= 75 ? "text-green-600" : s.avg >= 60 ? "text-amber-600" : "text-destructive"}`}>{s.avg}%</td>
                    <td className={`py-2.5 text-end ${s.pass >= 85 ? "text-green-600" : "text-amber-600"}`}>{s.pass}%</td>
                    <td className="py-2.5"><StatusBadge status={s.avg < 65 ? "warning" : "normal"} label={s.avg < 65 ? (lang === "ar" ? "ضعيف" : "Weak") : (lang === "ar" ? "جيد" : "Good")} /></td>
                    <td className="py-2.5 text-end"><Link to={`/dashboard/school/1/subject/${s.subject.toLowerCase()}?role=school`}><ChevronRight className="w-3 h-3 text-primary" /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === "ai" && <AIRecommendationsPanel recommendations={aiRecs} />}
    </div>
  );
}
