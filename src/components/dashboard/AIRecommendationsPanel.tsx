import { useTranslation } from "@/hooks/useTranslation";
import { Bot } from "lucide-react";

interface Recommendation {
  priority: "high" | "medium" | "low";
  text: { en: string; ar: string };
}

export function AIRecommendationsPanel({ recommendations }: { recommendations: Recommendation[] }) {
  const { t, lang } = useTranslation();

  const priorityStyles = {
    high: "bg-destructive/10 text-destructive border-destructive/20",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-blue-50 text-blue-700 border-blue-200",
  };

  const priorityLabels = {
    high: t("status.high"),
    medium: t("status.medium"),
    low: t("status.low"),
  };

  return (
    <div className="bg-surface-elevated rounded-lg border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-5 h-5 text-gold" />
        <h3 className="font-semibold text-foreground">{t("dash.aiRecommendations")}</h3>
      </div>
      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-surface rounded border border-border">
            <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold border ${priorityStyles[rec.priority]}`}>
              {priorityLabels[rec.priority]}
            </span>
            <p className="text-sm text-muted-foreground">{rec.text[lang]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
