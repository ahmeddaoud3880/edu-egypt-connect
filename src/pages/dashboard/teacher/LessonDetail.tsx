import { useParams } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useState } from "react";
import { BookOpen, Users, TrendingUp, AlertTriangle, Bot, ArrowRight, Target, FileText, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const lessonData = {
  topic: { en: "Fractions – Adding Unlike Denominators", ar: "الكسور – جمع مقامات مختلفة" },
  class: "4-A",
  subject: { en: "Mathematics", ar: "رياضيات" },
  date: "2026-03-30",
  duration: "45 min",
  objectives: [
    { en: "Students can add fractions with unlike denominators", ar: "يستطيع الطالب جمع كسور ذات مقامات مختلفة" },
    { en: "Students find common denominators", ar: "يجد الطالب المقام المشترك" },
    { en: "Students simplify fraction results", ar: "يبسّط الطالب نتائج الكسور" },
  ],
  activities: [
    { en: "Visual fraction bar demonstration (10 min)", ar: "عرض أشرطة الكسور البصرية (10 دقائق)" },
    { en: "Guided practice with partner (15 min)", ar: "تمارين موجهة مع شريك (15 دقيقة)" },
    { en: "Independent problem set (15 min)", ar: "مجموعة مسائل مستقلة (15 دقيقة)" },
    { en: "Exit ticket assessment (5 min)", ar: "تقييم تذكرة خروج (5 دقائق)" },
  ],
  understanding: [
    { level: { en: "Mastered", ar: "متقن" }, count: 22 },
    { level: { en: "Developing", ar: "قيد التطوير" }, count: 11 },
    { level: { en: "Struggling", ar: "يواجه صعوبة" }, count: 5 },
  ],
};

export default function LessonDetail() {
  const { lang } = useTranslation();
  const { lessonId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: { en: "Overview", ar: "نظرة عامة" } },
    { id: "activities", label: { en: "Activities", ar: "الأنشطة" } },
    { id: "assessment", label: { en: "Assessment", ar: "التقييم" } },
    { id: "ai", label: { en: "AI Recommendations", ar: "توصيات الذكاء الاصطناعى" } },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{lessonData.class}</span>
          <span className="text-xs text-muted-foreground">{lang === "ar" ? lessonData.subject.ar : lessonData.subject.en}</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">{lang === "ar" ? lessonData.topic.ar : lessonData.topic.en}</h1>
        <p className="text-sm text-muted-foreground mt-1">{lessonData.date} — {lessonData.duration}</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-4">
        {lessonData.understanding.map((u) => (
          <div key={u.level.en} className="bg-surface-elevated rounded-lg border border-border p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{u.count}</div>
            <div className="text-xs text-muted-foreground">{lang === "ar" ? u.level.ar : u.level.en}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
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
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <div className="flex items-center gap-1 mb-3"><Target className="w-4 h-4 text-green-600" /><h3 className="font-semibold text-foreground">{lang === "ar" ? "أهداف الدرس" : "Lesson Objectives"}</h3></div>
            <ul className="space-y-2">{lessonData.objectives.map((o, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-green-600 mt-0.5">✓</span>{lang === "ar" ? o.ar : o.en}</li>)}</ul>
          </div>
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-3">{lang === "ar" ? "مستوى الفهم" : "Understanding Level"}</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={lessonData.understanding.map((u) => ({ name: lang === "ar" ? u.level.ar : u.level.en, count: u.count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(220,40%,13%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "activities" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "أنشطة الدرس" : "Lesson Activities"}</h3>
          <div className="space-y-3">
            {lessonData.activities.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded border border-border">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <span className="text-sm text-foreground">{lang === "ar" ? a.ar : a.en}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "assessment" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-3">{lang === "ar" ? "نتائج التقييم" : "Assessment Results"}</h3>
          <p className="text-sm text-muted-foreground">{lang === "ar" ? "5 طلاب يحتاجون إعادة شرح. يُنصح بتمرين مراجعة مركّز." : "5 students need re-explanation. A focused revision exercise is recommended."}</p>
          <div className="flex gap-2 mt-4">
            <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded">{lang === "ar" ? "إنشاء تمرين مراجعة" : "Create Revision Exercise"}</button>
            <button className="px-3 py-1.5 text-xs font-medium border border-border rounded">{lang === "ar" ? "إعادة الشرح بالذكاء الاصطناعى" : "AI Re-explain"}</button>
          </div>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="bg-gold-light rounded-lg border border-gold/20 p-6">
          <div className="flex items-center gap-2 mb-3"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{lang === "ar" ? "توصيات الذكاء الاصطناعى" : "AI Recommendations"}</h3></div>
          <div className="space-y-2">
            {[
              { en: "Use more visual fraction bars for struggling students", ar: "استخدم المزيد من أشرطة الكسور البصرية للطلاب الذين يواجهون صعوبة" },
              { en: "Create a simpler worksheet for the 5 struggling students", ar: "أنشئ ورقة عمل أسهل للطلاب الخمسة الذين يواجهون صعوبة" },
              { en: "Consider a peer tutoring session for reinforcement", ar: "فكّر فى جلسة تعلم أقران للتعزيز" },
            ].map((r, i) => <div key={i} className="p-2 text-xs text-foreground/80">• {lang === "ar" ? r.ar : r.en}</div>)}
          </div>
          <div className="flex gap-2 mt-3">
            <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded">{lang === "ar" ? "إنشاء أمثلة أسهل" : "Create Easier Examples"}</button>
            <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded">{lang === "ar" ? "إنشاء أمثلة أصعب" : "Create Harder Examples"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
