import { useParams, Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { ArrowLeft, TrendingUp, TrendingDown, Bot } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const gradeHistory = [
  { period: "Mid-1", ahmed: 70, sara: 82 }, { period: "Final-1", ahmed: 68, sara: 84 },
  { period: "Mid-2", ahmed: 65, sara: 86 }, { period: "Mar", ahmed: 68, sara: 85 },
];

export default function ParentGradeDetail() {
  const { subjectId } = useParams();
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  return (
    <div className="space-y-6">
      <Link to="/dashboard?role=parent" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" />{isAr ? "العودة" : "Back"}</Link>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h1 className="text-xl font-bold text-foreground">{isAr ? "تفاصيل الدرجات" : "Grade Detail"} — {subjectId || "Overview"}</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {[{ name: isAr ? "أحمد" : "Ahmed", avg: 68, trend: "down" }, { name: isAr ? "سارة" : "Sara", avg: 85, trend: "up" }].map((c) => (
          <div key={c.name} className="bg-surface-elevated rounded-lg border border-border p-5 flex items-center justify-between">
            <div><h4 className="font-semibold text-foreground">{c.name}</h4><span className="text-xs text-muted-foreground">{isAr ? "المعدل" : "Average"}</span></div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${c.avg < 70 ? "text-destructive" : "text-foreground"}`}>{c.avg}%</span>
              {c.trend === "up" ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{isAr ? "اتجاه الدرجات" : "Grade Trend"}</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={gradeHistory}><CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" /><XAxis dataKey="period" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} /><YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} domain={[40, 100]} /><Tooltip /><Line type="monotone" dataKey="ahmed" stroke="hsl(220 40% 13%)" name={isAr ? "أحمد" : "Ahmed"} strokeWidth={2} /><Line type="monotone" dataKey="sara" stroke="hsl(42 75% 50%)" name={isAr ? "سارة" : "Sara"} strokeWidth={2} /></LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{isAr ? "توصيات" : "AI Recommendations"}</h3></div>
        <div className="space-y-2">
          {[isAr ? "ركز على تدريب الرياضيات — أكبر نقطة ضعف لكلا الطفلين" : "Focus on math practice — biggest weakness for both children", isAr ? "سارة تتحسن فى معظم المواد — حافظ على الزخم" : "Sara is improving in most subjects — maintain momentum"].map((r, i) => (
            <div key={i} className="p-3 bg-gold-light rounded border border-gold/20 text-sm text-foreground/80">{r}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
