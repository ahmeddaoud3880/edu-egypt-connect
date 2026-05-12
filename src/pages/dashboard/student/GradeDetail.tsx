import { useTranslation } from "@/hooks/useTranslation";
import { useState } from "react";
import { TrendingUp, Bot } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const gradeData = {
  subject: { en: "Mathematics", ar: "رياضيات" },
  assessments: [
    { name: "Quiz 1", score: 60 }, { name: "Quiz 2", score: 55 }, { name: "Midterm", score: 62 }, { name: "Homework", score: 78 },
  ],
  avg: 65,
  classAvg: 78,
  rank: 28,
  totalStudents: 38,
};

export default function StudentGradeDetail() {
  const { lang } = useTranslation();
  const [activeTab, setActiveTab] = useState("breakdown");

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h1 className="text-xl font-bold text-foreground">{lang === "ar" ? `تفاصيل الدرجات — ${gradeData.subject.ar}` : `Grade Detail — ${gradeData.subject.en}`}</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: { en: "My Average", ar: "متوسطى" }, value: `${gradeData.avg}%`, color: "text-amber-600" },
          { label: { en: "Class Average", ar: "متوسط الفصل" }, value: `${gradeData.classAvg}%`, color: "text-foreground" },
          { label: { en: "My Rank", ar: "ترتيبى" }, value: `${gradeData.rank}/${gradeData.totalStudents}`, color: "text-foreground" },
          { label: { en: "Assessments", ar: "التقييمات" }, value: `${gradeData.assessments.length}`, color: "text-foreground" },
        ].map((k) => (
          <div key={k.label.en} className="bg-surface-elevated rounded-lg border border-border p-4 text-center">
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-xs text-muted-foreground">{lang === "ar" ? k.label.ar : k.label.en}</div>
          </div>
        ))}
      </div>

      <div className="border-b border-border">
        <div className="flex gap-0">
          {[
            { id: "breakdown", label: { en: "Score Breakdown", ar: "تفصيل الدرجات" } },
            { id: "ai", label: { en: "AI Analysis", ar: "تحليل ذكى" } },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {lang === "ar" ? tab.label.ar : tab.label.en}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "breakdown" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={gradeData.assessments}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="score" fill="hsl(220,40%,13%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="bg-gold-light rounded-lg border border-gold/20 p-6">
          <div className="flex items-center gap-2 mb-3"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{lang === "ar" ? "تحليل الذكاء الاصطناعى" : "AI Analysis"}</h3></div>
          <div className="space-y-2">
            {[
              { en: "Your homework score (78%) is much higher than quiz scores — you understand when given time but struggle under pressure", ar: "درجة واجباتك (78%) أعلى بكثير من الاختبارات — تفهم عند إعطائك وقت لكن تواجه صعوبة تحت الضغط" },
              { en: "Quiz 2 (55%) was your lowest — review that specific topic again", ar: "اختبار 2 (55%) كان الأدنى — راجع ذلك الموضوع مرة أخرى" },
              { en: "You are ranked 28/38 — with focused practice you can reach top 20", ar: "ترتيبك 28/38 — بالتمرين المركّز يمكنك الوصول لأفضل 20" },
            ].map((r, i) => <div key={i} className="text-xs text-foreground/80 p-2">• {lang === "ar" ? r.ar : r.en}</div>)}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded">{lang === "ar" ? "بدء المراجعة" : "Start Revision"}</button>
        <button className="px-3 py-1.5 text-xs font-medium border border-border rounded">{lang === "ar" ? "أسئلة تدريب" : "Practice Questions"}</button>
      </div>
    </div>
  );
}
