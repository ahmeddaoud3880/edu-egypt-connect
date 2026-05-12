import { useTranslation } from "@/hooks/useTranslation";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { AIRecommendationsPanel } from "@/components/dashboard/AIRecommendationsPanel";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts";

const gradePerformance = [
  { grade: "G1", avg: 82, pass: 94 },
  { grade: "G2", avg: 79, pass: 91 },
  { grade: "G3", avg: 62, pass: 76 },
  { grade: "G4", avg: 64, pass: 78 },
  { grade: "G5", avg: 58, pass: 72 },
  { grade: "G6", avg: 55, pass: 68 },
];

const classComparison = [
  { class: "G5-A", avg: 64, teacher: "Ms. Fatma Ali" },
  { class: "G5-B", avg: 52, teacher: "Mr. Amr Soliman" },
  { class: "G5-C", avg: 60, teacher: "Ms. Fatma Ali" },
  { class: "G6-A", avg: 58, teacher: "Mr. Amr Soliman" },
  { class: "G6-B", avg: 48, teacher: "Mr. Amr Soliman" },
  { class: "G6-C", avg: 56, teacher: "Ms. Fatma Ali" },
];

const weakSkills = [
  { skill: "Reading Comprehension", grade: "G5", score: 45, gap: -25 },
  { skill: "Grammar & Syntax", grade: "G6", score: 48, gap: -22 },
  { skill: "Essay Writing", grade: "G6", score: 50, gap: -20 },
  { skill: "Vocabulary", grade: "G4", score: 55, gap: -15 },
  { skill: "Listening Comprehension", grade: "G5", score: 58, gap: -12 },
];

const strugglingStudents = [
  { name: "Mohamed Samir", class: "G6-B", score: 32, attendance: 68, status: "critical" as const },
  { name: "Ali Hassan", class: "G6-B", score: 38, attendance: 74, status: "critical" as const },
  { name: "Nour Ahmed", class: "G5-B", score: 40, attendance: 90, status: "critical" as const },
  { name: "Omar Khaled", class: "G5-B", score: 45, attendance: 92, status: "warning" as const },
  { name: "Hana Mostafa", class: "G5-A", score: 48, attendance: 76, status: "warning" as const },
];

const trendData = [
  { month: "Oct", avg: 68 }, { month: "Nov", avg: 65 }, { month: "Dec", avg: 62 },
  { month: "Jan", avg: 60 }, { month: "Feb", avg: 58 }, { month: "Mar", avg: 56 },
];

const teacherPerformance = [
  { teacher: "Ms. Fatma Ali", classes: 4, studentAvg: 60, passRate: 74, status: "warning" as const },
  { teacher: "Mr. Amr Soliman", classes: 3, studentAvg: 52, passRate: 66, status: "critical" as const },
];

const tabs = [
  { id: "overview", en: "Overview", ar: "نظرة عامة" },
  { id: "grades", en: "By Grade", ar: "حسب الصف" },
  { id: "skills", en: "Weak Skills", ar: "المهارات الضعيفة" },
  { id: "teachers", en: "Teachers", ar: "المعلمون" },
  { id: "ai", en: "AI", ar: "الذكاء الاصطناعى" },
];

const aiRecs = [
  { priority: "high" as const, text: { en: "English performance declining school-wide for 5 consecutive months — systemic intervention required", ar: "أداء اللغة الإنجليزية فى تراجع على مستوى المدرسة لمدة 5 أشهر متتالية — تدخل منهجى مطلوب" } },
  { priority: "high" as const, text: { en: "Mr. Amr Soliman's classes consistently underperform (avg 52%) — instructional coaching recommended", ar: "فصول الأستاذ عمرو سليمان ضعيفة باستمرار (متوسط 52%) — التدريب التعليمى موصى به" } },
  { priority: "medium" as const, text: { en: "Reading comprehension is the weakest skill area — consider dedicated reading program for Grades 5-6", ar: "الفهم القرائى هو أضعف المهارات — النظر فى برنامج قراءة مخصص للصفوف 5-6" } },
  { priority: "low" as const, text: { en: "Grades 1-2 performing well — leverage their teaching methods as best practices for upper grades", ar: "الصفوف 1-2 أداؤها جيد — الاستفادة من طرق تدريسها كممارسات مثلى للصفوف العليا" } },
];

export default function SubjectDetail() {
  const { t, lang } = useTranslation();
  const { subjectId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const subjectName = subjectId ? subjectId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "English";

  const kpis = [
    { label: lang === "ar" ? "متوسط المدرسة" : "School Avg", value: "62%", color: "text-amber-600" },
    { label: lang === "ar" ? "نسبة النجاح" : "Pass Rate", value: "76%", color: "text-amber-600" },
    { label: lang === "ar" ? "المعلمون" : "Teachers", value: "2", color: "text-foreground" },
    { label: lang === "ar" ? "الفصول" : "Classes", value: "7", color: "text-foreground" },
    { label: lang === "ar" ? "طلاب معرضون" : "At Risk", value: "5", color: "text-destructive" },
    { label: lang === "ar" ? "الاتجاه" : "Trend", value: "↓", color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard?role=school" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-3 h-3" /> {lang === "ar" ? "العودة للوحة المدرسة" : "Back to School Dashboard"}
        </Link>
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{subjectName}</h1>
              <p className="text-sm text-muted-foreground">{t("detail.subjectDetail")} — {lang === "ar" ? "تحليل أداء المادة على مستوى المدرسة" : "School-wide subject performance analysis"}</p>
            </div>
            <StatusBadge status="warning" label={lang === "ar" ? "يحتاج اهتمام" : "Needs Attention"} />
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4 text-center">
            <div className={`text-lg font-bold ${k.color}`}>{k.value}</div>
            <div className="text-[10px] text-muted-foreground">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-border overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {lang === "ar" ? tab.ar : tab.en}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-surface-elevated rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "أداء المادة حسب الصف" : "Performance by Grade"}</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={gradePerformance} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis dataKey="grade" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} domain={[40, 100]} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="avg" fill="hsl(220 40% 13%)" name={lang === "ar" ? "المتوسط" : "Avg"} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="pass" fill="hsl(42 75% 50%)" name={lang === "ar" ? "نسبة النجاح" : "Pass %"} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-surface-elevated rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "اتجاه الأداء الشهرى" : "Monthly Performance Trend"}</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} domain={[40, 80]} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="avg" stroke="hsl(0 72% 51%)" strokeWidth={2} dot={{ r: 3 }} name={lang === "ar" ? "المتوسط" : "Avg Score"} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Struggling Students */}
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "طلاب يعانون فى هذه المادة" : "Students Struggling in This Subject"}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">{t("common.name")}</th>
                    <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">{t("common.class")}</th>
                    <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{t("common.score")}</th>
                    <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{t("common.attendance")}</th>
                    <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {strugglingStudents.map((s) => (
                    <tr key={s.name} className="border-b border-border hover:bg-muted/30">
                      <td className="py-2.5 font-medium text-foreground">
                        <Link to={`/dashboard/school/1/student/${s.name.toLowerCase().replace(/ /g, "-")}?role=school`} className="hover:text-primary">{s.name}</Link>
                      </td>
                      <td className="py-2.5 text-muted-foreground">{s.class}</td>
                      <td className={`py-2.5 text-end font-semibold ${s.score < 50 ? "text-destructive" : "text-amber-600"}`}>{s.score}%</td>
                      <td className={`py-2.5 text-end ${s.attendance < 80 ? "text-destructive" : "text-foreground"}`}>{s.attendance}%</td>
                      <td className="py-2.5"><StatusBadge status={s.status} label={s.status === "critical" ? t("status.critical") : t("status.warning")} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Grades Tab */}
      {activeTab === "grades" && (
        <div className="space-y-6">
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "مقارنة الفصول فى هذه المادة" : "Class Comparison for This Subject"}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">{t("common.class")}</th>
                    <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{lang === "ar" ? "المتوسط" : "Avg"}</th>
                    <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">{lang === "ar" ? "المعلم" : "Teacher"}</th>
                    <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {classComparison.map((c) => (
                    <tr key={c.class} className="border-b border-border hover:bg-muted/30">
                      <td className="py-2.5 font-medium text-foreground">{c.class}</td>
                      <td className={`py-2.5 text-end font-semibold ${c.avg >= 60 ? "text-amber-600" : "text-destructive"}`}>{c.avg}%</td>
                      <td className="py-2.5 text-muted-foreground">{c.teacher}</td>
                      <td className="py-2.5">
                        <StatusBadge status={c.avg < 55 ? "critical" : c.avg < 65 ? "warning" : "normal"} label={c.avg < 55 ? t("status.critical") : c.avg < 65 ? t("status.warning") : t("status.normal")} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "مقارنة بصرية للفصول" : "Visual Class Comparison"}</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={classComparison} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="class" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} domain={[30, 80]} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="avg" fill="hsl(220 40% 13%)" name={lang === "ar" ? "المتوسط" : "Avg"} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Weak Skills Tab */}
      {activeTab === "skills" && (
        <div className="space-y-6">
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "المهارات والدروس الضعيفة" : "Weak Skills & Lesson Areas"}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">{lang === "ar" ? "المهارة" : "Skill"}</th>
                    <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">{t("common.grade")}</th>
                    <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{t("common.score")}</th>
                    <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{lang === "ar" ? "الفجوة" : "Gap"}</th>
                    <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {weakSkills.map((s) => (
                    <tr key={s.skill + s.grade} className="border-b border-border">
                      <td className="py-2.5 font-medium text-foreground">{s.skill}</td>
                      <td className="py-2.5 text-muted-foreground">{s.grade}</td>
                      <td className="py-2.5 text-end text-destructive font-semibold">{s.score}%</td>
                      <td className="py-2.5 text-end text-destructive font-bold">{s.gap}%</td>
                      <td className="py-2.5"><StatusBadge status={s.score < 50 ? "critical" : "warning"} label={s.score < 50 ? t("status.critical") : t("status.warning")} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "مخطط المهارات" : "Skills Chart"}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weakSkills} margin={{ top: 5, right: 5, left: -10, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} domain={[0, 100]} />
                <YAxis dataKey="skill" type="category" tick={{ fontSize: 9, fill: "hsl(220 10% 45%)" }} width={140} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="score" fill="hsl(0 72% 51%)" name={lang === "ar" ? "الدرجة" : "Score"} radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Teachers Tab */}
      {activeTab === "teachers" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "أداء المعلمين فى هذه المادة" : "Teacher Performance for This Subject"}</h3>
          <div className="space-y-4">
            {teacherPerformance.map((tp) => (
              <div key={tp.teacher} className="p-4 bg-surface rounded border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{tp.teacher}</div>
                    <div className="text-xs text-muted-foreground">{tp.classes} {lang === "ar" ? "فصول" : "classes"}</div>
                  </div>
                  <StatusBadge status={tp.status} label={tp.status === "critical" ? t("status.critical") : t("status.warning")} />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-2 bg-surface-elevated rounded text-center">
                    <div className={`text-lg font-bold ${tp.studentAvg < 55 ? "text-destructive" : "text-amber-600"}`}>{tp.studentAvg}%</div>
                    <div className="text-[10px] text-muted-foreground">{lang === "ar" ? "متوسط الطلاب" : "Student Avg"}</div>
                  </div>
                  <div className="p-2 bg-surface-elevated rounded text-center">
                    <div className={`text-lg font-bold ${tp.passRate < 70 ? "text-destructive" : "text-amber-600"}`}>{tp.passRate}%</div>
                    <div className="text-[10px] text-muted-foreground">{lang === "ar" ? "نسبة النجاح" : "Pass Rate"}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="text-[10px] px-3 py-1.5 bg-primary text-primary-foreground rounded">{t("action.scheduleReview")}</button>
                  <button className="text-[10px] px-3 py-1.5 border border-border rounded text-foreground">{t("action.notifyTeacher")}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Tab */}
      {activeTab === "ai" && <AIRecommendationsPanel recommendations={aiRecs} />}

      {/* Actions */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{t("school.nextActions")}</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button className="p-3 bg-primary text-primary-foreground rounded text-sm font-medium">{t("action.assignIntervention")}</button>
          <button className="p-3 bg-primary text-primary-foreground rounded text-sm font-medium">{t("action.notifyTeacher")}</button>
          <button className="p-3 border border-border rounded text-sm font-medium text-foreground hover:bg-muted">{t("action.requestSupport")}</button>
          <button className="p-3 border border-border rounded text-sm font-medium text-foreground hover:bg-muted">{t("action.exportReport")}</button>
        </div>
      </div>
    </div>
  );
}
