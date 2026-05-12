import { useTranslation } from "@/hooks/useTranslation";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { AIRecommendationsPanel } from "@/components/dashboard/AIRecommendationsPanel";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const performanceTrend = [
  { month: "Oct", score: 62 }, { month: "Nov", score: 58 }, { month: "Dec", score: 55 },
  { month: "Jan", score: 50 }, { month: "Feb", score: 48 }, { month: "Mar", score: 48 },
];

const subjectScores = [
  { subject: "Arabic", score: 58, status: "warning" as const },
  { subject: "Mathematics", score: 38, status: "critical" as const },
  { subject: "Science", score: 45, status: "critical" as const },
  { subject: "English", score: 42, status: "critical" as const },
  { subject: "Social Studies", score: 55, status: "warning" as const },
];

const tabs = [
  { id: "overview", en: "Overview", ar: "نظرة عامة" },
  { id: "academic", en: "Academic", ar: "أكاديمى" },
  { id: "attendance", en: "Attendance", ar: "الحضور" },
  { id: "ai", en: "AI", ar: "الذكاء الاصطناعى" },
];

const aiRecs = [
  { priority: "high" as const, text: { en: "Continuous academic decline over 5 months — comprehensive intervention plan required with parent involvement", ar: "تراجع أكاديمى مستمر لمدة 5 أشهر — خطة تدخل شاملة مطلوبة بمشاركة ولى الأمر" } },
  { priority: "high" as const, text: { en: "Mathematics and English scores critically low — assign dedicated tutoring 3x/week", ar: "درجات الرياضيات والإنجليزية منخفضة بشكل حرج — تعيين دروس تقوية 3 مرات/أسبوع" } },
  { priority: "medium" as const, text: { en: "Investigate potential learning difficulties — refer to educational psychologist for assessment", ar: "التحقيق فى صعوبات تعلم محتملة — إحالة لأخصائى نفسى تربوى للتقييم" } },
];

export default function StudentProfile() {
  const { t, lang } = useTranslation();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const studentName = id ? id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Student";

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard?role=school" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-3 h-3" /> {lang === "ar" ? "العودة للوحة المدرسة" : "Back to School Dashboard"}
        </Link>
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{studentName}</h1>
              <p className="text-sm text-muted-foreground">{t("detail.studentProfile")} — Grade 5-B</p>
            </div>
            <StatusBadge status="critical" label={t("status.critical")} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: lang === "ar" ? "المتوسط العام" : "Overall Avg", value: "48%", color: "text-destructive" },
          { label: t("common.attendance"), value: "90%", color: "text-foreground" },
          { label: lang === "ar" ? "الواجبات" : "Homework", value: "52%", color: "text-destructive" },
          { label: lang === "ar" ? "نوع الخطر" : "Risk Type", value: lang === "ar" ? "أكاديمى" : "Academic", color: "text-amber-600" },
          { label: lang === "ar" ? "الأولوية" : "Priority", value: t("status.critical"), color: "text-destructive" },
          { label: lang === "ar" ? "المسؤول" : "Owner", value: lang === "ar" ? "المنسق الأكاديمى" : "Academic Coord.", color: "text-foreground" },
        ].map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4 text-center">
            <div className={`text-lg font-bold ${k.color}`}>{k.value}</div>
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
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "اتجاه الأداء" : "Performance Trend"}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={performanceTrend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} domain={[30, 100]} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="hsl(0 72% 51%)" strokeWidth={2} dot={{ r: 3 }} name="Score" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "درجات المواد" : "Subject Scores"}</h3>
            <div className="space-y-3">
              {subjectScores.map((s) => (
                <div key={s.subject} className="flex items-center gap-4">
                  <span className="text-sm text-foreground w-28 shrink-0">{s.subject}</span>
                  <div className="flex-1 bg-muted rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full ${s.score >= 60 ? "bg-amber-500" : "bg-destructive"}`} style={{ width: `${s.score}%` }}></div>
                  </div>
                  <span className={`text-sm font-bold w-10 text-end ${s.score >= 60 ? "text-amber-600" : "text-destructive"}`}>{s.score}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "academic" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "سجل التقييمات" : "Assessment Record"}</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">{lang === "ar" ? "التقييم" : "Assessment"}</th>
              <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{t("common.score")}</th>
              <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{lang === "ar" ? "متوسط الفصل" : "Class Avg"}</th>
              <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{t("common.date")}</th>
            </tr></thead>
            <tbody>
              {[
                { name: "Math Mid-Term", score: 38, classAvg: 72, date: "Feb 15" },
                { name: "English Quiz 3", score: 42, classAvg: 68, date: "Mar 1" },
                { name: "Science Test 2", score: 45, classAvg: 70, date: "Mar 10" },
                { name: "Arabic Composition", score: 58, classAvg: 75, date: "Mar 18" },
              ].map((a) => (
                <tr key={a.name} className="border-b border-border">
                  <td className="py-2 font-medium text-foreground">{a.name}</td>
                  <td className={`py-2 text-end font-semibold ${a.score < 50 ? "text-destructive" : "text-amber-600"}`}>{a.score}%</td>
                  <td className="py-2 text-end text-muted-foreground">{a.classAvg}%</td>
                  <td className="py-2 text-end text-muted-foreground">{a.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "سجل الحضور" : "Attendance Record"}</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-surface rounded border border-border text-center">
              <div className="text-2xl font-bold text-green-600">90%</div>
              <div className="text-xs text-muted-foreground">{lang === "ar" ? "نسبة الحضور" : "Attendance Rate"}</div>
            </div>
            <div className="p-4 bg-surface rounded border border-border text-center">
              <div className="text-2xl font-bold text-destructive">12</div>
              <div className="text-xs text-muted-foreground">{lang === "ar" ? "أيام غياب" : "Days Absent"}</div>
            </div>
            <div className="p-4 bg-surface rounded border border-border text-center">
              <div className="text-2xl font-bold text-amber-600">5</div>
              <div className="text-xs text-muted-foreground">{lang === "ar" ? "مرات التأخر" : "Late Arrivals"}</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{lang === "ar" ? "سجل تفصيلى للحضور — المرحلة القادمة" : "Detailed attendance log — next phase"}</p>
        </div>
      )}

      {activeTab === "ai" && <AIRecommendationsPanel recommendations={aiRecs} />}

      {/* Actions */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{t("school.nextActions")}</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button className="p-3 bg-primary text-primary-foreground rounded text-sm font-medium">{t("action.assignIntervention")}</button>
          <button className="p-3 bg-primary text-primary-foreground rounded text-sm font-medium">{t("action.notifyParent")}</button>
          <button className="p-3 border border-border rounded text-sm font-medium text-foreground hover:bg-muted">{t("action.scheduleReview")}</button>
          <button className="p-3 border border-border rounded text-sm font-medium text-foreground hover:bg-muted">{t("action.escalate")}</button>
        </div>
      </div>
    </div>
  );
}
