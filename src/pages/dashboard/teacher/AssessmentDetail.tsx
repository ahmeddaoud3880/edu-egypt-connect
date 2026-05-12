import { useParams } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useState } from "react";
import { FileText, Users, Bot, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const assessmentData = {
  title: { en: "Fractions Mid-Unit Quiz", ar: "اختبار نصف الوحدة – الكسور" },
  class: "4-A",
  subject: { en: "Mathematics", ar: "رياضيات" },
  date: "2026-03-25",
  questions: 10,
  avgScore: 76,
  highScore: 98,
  lowScore: 35,
  submitted: 36,
  total: 38,
  distribution: [
    { range: "90-100", count: 6 }, { range: "80-89", count: 10 }, { range: "70-79", count: 8 },
    { range: "60-69", count: 5 }, { range: "50-59", count: 4 }, { range: "<50", count: 3 },
  ],
  weakQuestions: [
    { q: 7, topic: { en: "Simplifying fractions", ar: "تبسيط الكسور" }, correctRate: 42 },
    { q: 9, topic: { en: "Word problem with fractions", ar: "مسألة كلامية بالكسور" }, correctRate: 48 },
  ],
};

export default function AssessmentDetail() {
  const { lang } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: { en: "Overview", ar: "نظرة عامة" } },
    { id: "distribution", label: { en: "Score Distribution", ar: "توزيع الدرجات" } },
    { id: "weakAreas", label: { en: "Weak Areas", ar: "نقاط الضعف" } },
    { id: "ai", label: { en: "AI Insights", ar: "رؤى الذكاء الاصطناعى" } },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-primary" />
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{assessmentData.class}</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">{lang === "ar" ? assessmentData.title.ar : assessmentData.title.en}</h1>
        <p className="text-sm text-muted-foreground mt-1">{lang === "ar" ? assessmentData.subject.ar : assessmentData.subject.en} — {assessmentData.date}</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: { en: "Average", ar: "المتوسط" }, value: `${assessmentData.avgScore}%` },
          { label: { en: "Highest", ar: "الأعلى" }, value: `${assessmentData.highScore}%` },
          { label: { en: "Lowest", ar: "الأدنى" }, value: `${assessmentData.lowScore}%` },
          { label: { en: "Submitted", ar: "المسلّم" }, value: `${assessmentData.submitted}/${assessmentData.total}` },
          { label: { en: "Questions", ar: "الأسئلة" }, value: `${assessmentData.questions}` },
        ].map((k) => (
          <div key={k.label.en} className="bg-surface-elevated rounded-lg border border-border p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{k.value}</div>
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
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">{lang === "ar" ? `تم تقديم ${assessmentData.submitted} من ${assessmentData.total} طالباً. المتوسط العام ${assessmentData.avgScore}%. سؤالان كانا دون معدل الإجابة المتوقع.` : `${assessmentData.submitted} of ${assessmentData.total} students submitted. Overall average is ${assessmentData.avgScore}%. Two questions fell below expected correct rate.`}</p>
        </div>
      )}

      {activeTab === "distribution" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "توزيع الدرجات" : "Score Distribution"}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={assessmentData.distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(220,40%,13%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === "weakAreas" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "أسئلة ضعيفة" : "Weak Questions"}</h3>
          <div className="space-y-3">
            {assessmentData.weakQuestions.map((wq) => (
              <div key={wq.q} className="p-3 rounded border border-destructive/30 bg-red-50/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{lang === "ar" ? `سؤال ${wq.q}: ${wq.topic.ar}` : `Q${wq.q}: ${wq.topic.en}`}</span>
                  <span className="text-xs font-medium text-destructive">{wq.correctRate}% {lang === "ar" ? "صحيح" : "correct"}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="px-2 py-1 text-[10px] font-medium bg-primary text-primary-foreground rounded">{lang === "ar" ? "إعادة شرح" : "Re-explain"}</button>
                  <button className="px-2 py-1 text-[10px] font-medium border border-border rounded">{lang === "ar" ? "إنشاء تمرين" : "Create Exercise"}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="bg-gold-light rounded-lg border border-gold/20 p-6">
          <div className="flex items-center gap-2 mb-3"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{lang === "ar" ? "رؤى الذكاء الاصطناعى" : "AI Insights"}</h3></div>
          <div className="space-y-2">
            {[
              { en: "Fraction simplification is a major gap — 58% of students got Q7 wrong", ar: "تبسيط الكسور فجوة كبيرة — 58% من الطلاب أخطأوا فى سؤال 7" },
              { en: "Word problems remain challenging — consider more practice sessions", ar: "المسائل الكلامية تظل صعبة — فكّر فى المزيد من جلسات التمرين" },
              { en: "3 students scored below 50% — schedule individual support", ar: "3 طلاب حصلوا على أقل من 50% — جدول دعم فردى" },
            ].map((r, i) => <div key={i} className="p-2 text-xs text-foreground/80">• {lang === "ar" ? r.ar : r.en}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
