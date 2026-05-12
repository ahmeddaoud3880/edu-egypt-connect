import { useTranslation } from "@/hooks/useTranslation";
import { useState } from "react";
import { Target, Bot, CheckCircle2 } from "lucide-react";

const planData = {
  title: { en: "Fractions & English Tenses Improvement Plan", ar: "خطة تحسين الكسور وأزمنة الإنجليزى" },
  duration: { en: "2 weeks — March 30 to April 13", ar: "أسبوعان — 30 مارس إلى 13 أبريل" },
  goals: [
    { text: { en: "Reach 70% in Mathematics quizzes", ar: "الوصول لـ 70% فى اختبارات الرياضيات" }, progress: 40 },
    { text: { en: "Score 65%+ on English Tenses quiz", ar: "الحصول على 65%+ فى اختبار أزمنة الإنجليزى" }, progress: 35 },
  ],
  dailyTasks: [
    { day: 1, task: { en: "Math: Review fraction basics (20 min)", ar: "رياضيات: مراجعة أساسيات الكسور (20 دقيقة)" }, done: true },
    { day: 2, task: { en: "English: Present Simple vs Continuous (15 min)", ar: "إنجليزى: المضارع البسيط مقابل المستمر (15 دقيقة)" }, done: true },
    { day: 3, task: { en: "Math: Unlike denominators practice (25 min)", ar: "رياضيات: تمارين المقامات المختلفة (25 دقيقة)" }, done: false },
    { day: 4, task: { en: "English: Past tenses review (15 min)", ar: "إنجليزى: مراجعة أزمنة الماضى (15 دقيقة)" }, done: false },
    { day: 5, task: { en: "Math: Word problems practice (20 min)", ar: "رياضيات: تمارين مسائل كلامية (20 دقيقة)" }, done: false },
    { day: 6, task: { en: "Review all topics + quiz yourself (30 min)", ar: "مراجعة كل المواضيع + اختبر نفسك (30 دقيقة)" }, done: false },
  ],
};

export default function StudyPlanDetail() {
  const { lang } = useTranslation();
  const [activeTab, setActiveTab] = useState("plan");

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-2"><Target className="w-5 h-5 text-primary" /></div>
        <h1 className="text-xl font-bold text-foreground">{lang === "ar" ? planData.title.ar : planData.title.en}</h1>
        <p className="text-sm text-muted-foreground mt-1">{lang === "ar" ? planData.duration.ar : planData.duration.en}</p>
      </div>

      {/* Goals */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "الأهداف" : "Goals"}</h3>
        <div className="space-y-4">
          {planData.goals.map((g, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-foreground">{lang === "ar" ? g.text.ar : g.text.en}</span>
                <span className="text-xs font-medium text-foreground">{g.progress}%</span>
              </div>
              <div className="bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${g.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-0">
          {[
            { id: "plan", label: { en: "Daily Plan", ar: "الخطة اليومية" } },
            { id: "ai", label: { en: "AI Guidance", ar: "إرشاد ذكى" } },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {lang === "ar" ? tab.label.ar : tab.label.en}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "plan" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="space-y-3">
            {planData.dailyTasks.map((t) => (
              <div key={t.day} className="flex items-center gap-3 p-3 rounded border border-border">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${t.done ? "bg-green-600 border-green-600 text-white" : "border-border"}`}>
                  {t.done && <CheckCircle2 className="w-3 h-3" />}
                </div>
                <span className="text-xs font-medium text-muted-foreground w-14">{lang === "ar" ? `يوم ${t.day}` : `Day ${t.day}`}</span>
                <span className={`text-sm ${t.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{lang === "ar" ? t.task.ar : t.task.en}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="bg-gold-light rounded-lg border border-gold/20 p-6">
          <div className="flex items-center gap-2 mb-3"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{lang === "ar" ? "إرشاد الذكاء الاصطناعى" : "AI Guidance"}</h3></div>
          <div className="space-y-2">
            {[
              { en: "You completed Day 1 and Day 2 — great start! Keep the momentum.", ar: "أكملت اليوم 1 و2 — بداية رائعة! حافظ على الزخم." },
              { en: "Day 3 focuses on your weakest Math topic — take it slowly.", ar: "اليوم 3 يركّز على أضعف موضوع رياضيات — خذه ببطء." },
              { en: "If you complete all 6 days, you should see a 5-8% improvement.", ar: "إذا أكملت الأيام الستة، يجب أن ترى تحسناً 5-8%." },
            ].map((r, i) => <div key={i} className="text-xs text-foreground/80 p-2">• {lang === "ar" ? r.ar : r.en}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
