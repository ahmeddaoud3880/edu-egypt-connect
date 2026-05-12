import { useTranslation } from "@/hooks/useTranslation";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { AIRecommendationsPanel } from "@/components/dashboard/AIRecommendationsPanel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const classPerformance = [
  { class: "G4-A", avg: 82 }, { class: "G4-B", avg: 78 },
  { class: "G5-A", avg: 76 }, { class: "G5-B", avg: 68 },
  { class: "G6-A", avg: 72 },
];

const tabs = [
  { id: "overview", en: "Overview", ar: "نظرة عامة" },
  { id: "performance", en: "Performance", ar: "الأداء" },
  { id: "ai", en: "AI", ar: "الذكاء الاصطناعى" },
];

const aiRecs = [
  { priority: "high" as const, text: { en: "Grade 5-B student averages significantly below other classes — instructional support session recommended", ar: "متوسط طلاب الصف 5-B أقل بكثير من الفصول الأخرى — جلسة دعم تعليمى موصى بها" } },
  { priority: "medium" as const, text: { en: "Consider peer observation with Dr. Heba Nasser (strong performer) for teaching methodology improvement", ar: "النظر فى ملاحظة أقران مع د. هبة ناصر (أداء متميز) لتحسين منهجية التدريس" } },
];

export default function TeacherDetailPage() {
  const { t, lang } = useTranslation();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const teacherName = id ? id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Teacher";

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard?role=school" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-3 h-3" /> {lang === "ar" ? "العودة للوحة المدرسة" : "Back to School Dashboard"}
        </Link>
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{teacherName}</h1>
              <p className="text-sm text-muted-foreground">{t("detail.teacherDetail")} — {lang === "ar" ? "رياضيات" : "Mathematics"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: lang === "ar" ? "فصول" : "Classes", value: "5" },
          { label: lang === "ar" ? "ساعات/أسبوع" : "Hours/Wk", value: "20" },
          { label: lang === "ar" ? "متوسط الطلاب" : "Student Avg", value: "72%" },
          { label: t("common.attendance"), value: "92%" },
          { label: lang === "ar" ? "مرات التأخر" : "Late Count", value: "4" },
        ].map((k) => (
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
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "أداء الفصول" : "Class Performance"}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={classPerformance} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="class" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} domain={[50, 100]} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="avg" fill="hsl(220 40% 13%)" name="Avg Score" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "ملخص" : "Summary"}</h3>
            <div className="space-y-3">
              {[
                { label: lang === "ar" ? "حالة الدعم" : "Support Status", value: lang === "ar" ? "يحتاج دعم تعليمى" : "Needs instructional support", status: "warning" as const },
                { label: lang === "ar" ? "نمط التأخر" : "Delay Pattern", value: lang === "ar" ? "بعد عطلات نهاية الأسبوع" : "After weekends", status: "warning" as const },
                { label: lang === "ar" ? "إتمام الواجبات" : "HW Completion", value: "75%", status: "warning" as const },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 bg-surface rounded border border-border">
                  <div><span className="text-sm text-foreground">{item.label}</span><br /><span className="text-xs text-muted-foreground">{item.value}</span></div>
                  <StatusBadge status={item.status} label={t("status.warning")} />
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button className="text-xs px-3 py-2 bg-primary text-primary-foreground rounded">{t("action.scheduleReview")}</button>
              <button className="text-xs px-3 py-2 border border-border rounded text-foreground">{t("action.notifyTeacher")}</button>
            </div>
          </div>
        </div>
      )}
      {activeTab === "performance" && (
        <div className="space-y-6">
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "تحليل أداء الفصول" : "Class Performance Analysis"}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b-2 border-primary">
                  <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">{t("common.class")}</th>
                  <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{lang === "ar" ? "المتوسط" : "Avg"}</th>
                  <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{lang === "ar" ? "نسبة النجاح" : "Pass %"}</th>
                  <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{lang === "ar" ? "الواجبات" : "HW %"}</th>
                  <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">{t("common.status")}</th>
                </tr></thead>
                <tbody>
                  {classPerformance.map((c) => (
                    <tr key={c.class} className="border-b border-border">
                      <td className="py-2.5 font-medium text-foreground">{c.class}</td>
                      <td className={`py-2.5 text-end font-semibold ${c.avg >= 75 ? "text-green-600" : c.avg >= 60 ? "text-amber-600" : "text-destructive"}`}>{c.avg}%</td>
                      <td className="py-2.5 text-end text-foreground">{Math.round(c.avg * 1.1)}%</td>
                      <td className="py-2.5 text-end text-foreground">{Math.round(c.avg * 0.95)}%</td>
                      <td className="py-2.5"><StatusBadge status={c.avg < 70 ? "warning" : "normal"} label={c.avg < 70 ? t("status.warning") : t("status.normal")} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "ملاحظات الأداء" : "Performance Notes"}</h3>
            <div className="space-y-3">
              {[
                { note: lang === "ar" ? "أداء متفاوت بشكل ملحوظ بين الفصول — G5-B أقل بـ 14 نقطة من G4-A" : "Notable performance variance across classes — G5-B 14 points below G4-A", type: "warning" as const },
                { note: lang === "ar" ? "نمط تأخر متكرر بعد عطلات نهاية الأسبوع يؤثر على جودة الحصص الأولى" : "Recurring post-weekend lateness pattern affects first-period class quality", type: "warning" as const },
                { note: lang === "ar" ? "جلسة ملاحظة أقران مع د. هبة ناصر قد تحسن أساليب التدريس" : "Peer observation session with Dr. Heba Nasser could improve teaching methods", type: "normal" as const },
              ].map((n, i) => (
                <div key={i} className="p-3 bg-surface rounded border border-border flex items-start gap-3">
                  <StatusBadge status={n.type} label={n.type === "warning" ? t("status.warning") : t("status.normal")} />
                  <p className="text-sm text-foreground">{n.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {activeTab === "ai" && <AIRecommendationsPanel recommendations={aiRecs} />}
    </div>
  );
}
