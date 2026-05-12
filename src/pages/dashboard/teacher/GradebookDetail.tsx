import { useParams } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useState } from "react";
import { BookOpen, Users, TrendingUp, AlertTriangle, Bot, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const gradebookData = {
  class: "4-A",
  subject: { en: "Mathematics", ar: "رياضيات" },
  classAvg: 78,
  assessments: ["Quiz 1", "Quiz 2", "Midterm", "Homework"],
  students: [
    { name: { en: "Ahmed Hassan", ar: "أحمد حسن" }, scores: [85, 78, 72, 90], avg: 78 },
    { name: { en: "Fatma Ali", ar: "فاطمة على" }, scores: [92, 88, 90, 95], avg: 91 },
    { name: { en: "Mohamed Saeed", ar: "محمد سعيد" }, scores: [55, 48, 42, 60], avg: 51 },
    { name: { en: "Nour Ibrahim", ar: "نور إبراهيم" }, scores: [70, 65, 68, 75], avg: 69 },
    { name: { en: "Sara Mahmoud", ar: "سارة محمود" }, scores: [45, null, 50, 55], avg: 50 },
    { name: { en: "Omar Khaled", ar: "عمر خالد" }, scores: [88, 90, 85, 88], avg: 87 },
  ],
  trend: [
    { assessment: "Quiz 1", avg: 72 }, { assessment: "Quiz 2", avg: 74 }, { assessment: "Midterm", avg: 68 }, { assessment: "Homework", avg: 77 },
  ],
};

export default function GradebookDetail() {
  const { lang } = useTranslation();
  const [activeTab, setActiveTab] = useState("grades");

  const tabs = [
    { id: "grades", label: { en: "Grade Table", ar: "جدول الدرجات" } },
    { id: "trends", label: { en: "Trends", ar: "الاتجاهات" } },
    { id: "ai", label: { en: "AI Analysis", ar: "تحليل الذكاء الاصطناعى" } },
  ];

  const scoreCell = (v: number | null) => {
    if (v === null) return <span className="text-xs text-destructive font-medium">{lang === "ar" ? "ناقص" : "Missing"}</span>;
    return <span className={`font-medium ${v >= 75 ? "text-green-700" : v >= 60 ? "text-amber-600" : "text-destructive"}`}>{v}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-2"><BookOpen className="w-5 h-5 text-primary" /></div>
        <h1 className="text-xl font-bold text-foreground">{lang === "ar" ? `سجل درجات الفصل ${gradebookData.class}` : `Gradebook — Class ${gradebookData.class}`}</h1>
        <p className="text-sm text-muted-foreground mt-1">{lang === "ar" ? gradebookData.subject.ar : gradebookData.subject.en} — {lang === "ar" ? `متوسط الفصل: ${gradebookData.classAvg}%` : `Class Average: ${gradebookData.classAvg}%`}</p>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {lang === "ar" ? tab.label.ar : tab.label.en}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "grades" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-start py-2 px-3 text-xs font-medium text-muted-foreground">{lang === "ar" ? "الطالب" : "Student"}</th>
                {gradebookData.assessments.map((a) => <th key={a} className="text-start py-2 px-3 text-xs font-medium text-muted-foreground">{a}</th>)}
                <th className="text-start py-2 px-3 text-xs font-medium text-muted-foreground">{lang === "ar" ? "المتوسط" : "Average"}</th>
              </tr>
            </thead>
            <tbody>
              {gradebookData.students.map((s) => (
                <tr key={s.name.en} className={`border-b border-border last:border-0 ${s.avg < 60 ? "bg-red-50/30" : ""}`}>
                  <td className="py-3 px-3 font-medium text-foreground">{lang === "ar" ? s.name.ar : s.name.en}</td>
                  {s.scores.map((score, i) => <td key={i} className="py-3 px-3">{scoreCell(score)}</td>)}
                  <td className="py-3 px-3 font-bold">{scoreCell(s.avg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "trends" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "اتجاه متوسط الفصل" : "Class Average Trend"}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={gradebookData.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="assessment" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avg" fill="hsl(220,40%,13%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="bg-gold-light rounded-lg border border-gold/20 p-6">
          <div className="flex items-center gap-2 mb-3"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{lang === "ar" ? "تحليل الذكاء الاصطناعى" : "AI Analysis"}</h3></div>
          <div className="space-y-2">
            {[
              { en: "Midterm scores dropped — review difficulty level or teaching approach", ar: "درجات نصف الفصل انخفضت — راجع مستوى الصعوبة أو أسلوب التدريس" },
              { en: "Mohamed Saeed and Sara Mahmoud consistently below 60% — urgent intervention needed", ar: "محمد سعيد وسارة محمود أقل من 60% باستمرار — تدخل عاجل مطلوب" },
              { en: "Homework scores are strongest — students may benefit from more practice-based learning", ar: "درجات الواجبات هى الأقوى — قد يستفيد الطلاب من المزيد من التعلم القائم على الممارسة" },
            ].map((r, i) => <div key={i} className="p-2 text-xs text-foreground/80">• {lang === "ar" ? r.ar : r.en}</div>)}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {[
          { en: "Export Grades", ar: "تصدير الدرجات" },
          { en: "Notify Parents of At-Risk Students", ar: "إخطار أولياء أمور الطلاب المعرضين" },
          { en: "Schedule Revision Session", ar: "جدولة جلسة مراجعة" },
        ].map((a) => (
          <button key={a.en} className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90">{lang === "ar" ? a.ar : a.en}</button>
        ))}
      </div>
    </div>
  );
}
