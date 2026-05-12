import { useParams } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useState } from "react";
import { BookOpen, TrendingUp, TrendingDown, AlertTriangle, Bot, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const subjectData = {
  name: { en: "Mathematics", ar: "الرياضيات" },
  teacher: { en: "Mr. Mohamed Abdelrahman", ar: "أ. محمد عبد الرحمن" },
  avg: 65, attendance: 90, homework: 78,
  assessments: [
    { name: { en: "Quiz 1", ar: "اختبار 1" }, score: 60 },
    { name: { en: "Quiz 2", ar: "اختبار 2" }, score: 55 },
    { name: { en: "Midterm", ar: "نصف الفصل" }, score: 62 },
    { name: { en: "Homework Avg", ar: "متوسط الواجبات" }, score: 78 },
  ],
  trend: [
    { month: "Oct", score: 72 }, { month: "Nov", score: 70 }, { month: "Dec", score: 68 },
    { month: "Jan", score: 65 }, { month: "Feb", score: 63 }, { month: "Mar", score: 65 },
  ],
  weakTopics: [
    { en: "Adding fractions with unlike denominators", ar: "جمع كسور ذات مقامات مختلفة" },
    { en: "Simplifying fractions", ar: "تبسيط الكسور" },
    { en: "Word problems with fractions", ar: "مسائل كلامية بالكسور" },
  ],
  pendingWork: [
    { en: "Fractions Worksheet Ch.7 — Due March 30", ar: "ورقة عمل الكسور فصل 7 — مستحق 30 مارس" },
    { en: "Math Practice Set 5 — Late", ar: "مجموعة تمارين رياضيات 5 — متأخر" },
  ],
};

export default function StudentSubjectDetail() {
  const { lang } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: { en: "Overview", ar: "نظرة عامة" } },
    { id: "grades", label: { en: "Grades", ar: "الدرجات" } },
    { id: "tasks", label: { en: "Tasks", ar: "المهام" } },
    { id: "ai", label: { en: "AI Help", ar: "مساعدة ذكية" } },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-2"><BookOpen className="w-5 h-5 text-primary" /></div>
        <h1 className="text-xl font-bold text-foreground">{lang === "ar" ? subjectData.name.ar : subjectData.name.en}</h1>
        <p className="text-sm text-muted-foreground mt-1">{lang === "ar" ? subjectData.teacher.ar : subjectData.teacher.en}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: { en: "Average", ar: "المتوسط" }, value: `${subjectData.avg}%`, color: "text-amber-600" },
          { label: { en: "Attendance", ar: "الحضور" }, value: `${subjectData.attendance}%`, color: "text-green-700" },
          { label: { en: "Homework", ar: "الواجبات" }, value: `${subjectData.homework}%`, color: "text-foreground" },
        ].map((k) => (
          <div key={k.label.en} className="bg-surface-elevated rounded-lg border border-border p-4 text-center">
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-xs text-muted-foreground">{lang === "ar" ? k.label.ar : k.label.en}</div>
          </div>
        ))}
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

      {activeTab === "overview" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "اتجاه الأداء" : "Performance Trend"}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subjectData.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="score" fill="hsl(220,40%,13%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-3">{lang === "ar" ? "مواضيع ضعيفة" : "Weak Topics"}</h3>
            <div className="space-y-2">
              {subjectData.weakTopics.map((w, i) => (
                <div key={i} className="p-3 rounded border border-destructive/30 bg-red-50/30 flex items-center justify-between">
                  <span className="text-sm text-foreground">{lang === "ar" ? w.ar : w.en}</span>
                  <button className="px-2 py-1 text-[10px] font-medium bg-primary text-primary-foreground rounded">{lang === "ar" ? "تمرّن" : "Practice"}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "grades" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "الدرجات" : "Grades"}</h3>
          <div className="space-y-3">
            {subjectData.assessments.map((a, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded border border-border">
                <span className="text-sm font-medium text-foreground">{lang === "ar" ? a.name.ar : a.name.en}</span>
                <span className={`font-bold ${a.score >= 75 ? "text-green-700" : a.score >= 60 ? "text-amber-600" : "text-destructive"}`}>{a.score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "المهام المعلقة" : "Pending Tasks"}</h3>
          <div className="space-y-2">
            {subjectData.pendingWork.map((w, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded border border-border">
                <span className="text-sm text-foreground">{lang === "ar" ? w.ar : w.en}</span>
                <button className="px-2 py-1 text-[10px] font-medium bg-primary text-primary-foreground rounded">{lang === "ar" ? "فتح" : "Open"}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="bg-gold-light rounded-lg border border-gold/20 p-6">
          <div className="flex items-center gap-2 mb-3"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{lang === "ar" ? "مساعدة الذكاء الاصطناعى" : "AI Help"}</h3></div>
          <div className="space-y-2 mb-4">
            {[
              { en: "Focus on fraction basics before attempting unlike denominators", ar: "ركّز على أساسيات الكسور قبل محاولة المقامات المختلفة" },
              { en: "Use visual fraction bars to build intuition", ar: "استخدم أشرطة الكسور البصرية لبناء الفهم" },
              { en: "Practice 5 word problems daily for improvement", ar: "تمرّن على 5 مسائل كلامية يومياً للتحسن" },
            ].map((r, i) => <div key={i} className="text-xs text-foreground/80 p-2">• {lang === "ar" ? r.ar : r.en}</div>)}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { en: "Explain Fractions Simply", ar: "اشرح الكسور ببساطة" },
              { en: "Step-by-Step Solution", ar: "حل خطوة بخطوة" },
              { en: "Generate Practice", ar: "توليد تمارين" },
            ].map((a) => (
              <button key={a.en} className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90">{lang === "ar" ? a.ar : a.en}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
