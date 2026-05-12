import { useTranslation } from "@/hooks/useTranslation";
import { Ticket, LogIn, Monitor, BarChart3, Users, Globe, Gauge, BookOpen } from "lucide-react";

const categories: any[] = [];

export function TicketCategories() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{isAr ? "فئات التذاكر" : "Ticket Categories"}</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {categories.map((c) => (
            <div key={c.name} className="p-4 bg-surface rounded-lg border border-border hover:border-primary/30 transition-colors">
              <c.icon className="w-5 h-5 text-primary mb-3" />
              <div className="text-lg font-bold text-foreground">{c.count}</div>
              <div className="text-xs text-foreground font-medium mt-1">{isAr ? c.nameAr : c.name}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{isAr ? c.trendAr : c.trend}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Most Common */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{isAr ? "أكثر المشكلات شيوعا" : "Most Common Issues"}</h3>
        <div className="space-y-2">
          {categories.sort((a, b) => b.count - a.count).slice(0, 5).map((c, i) => (
            <div key={c.name} className="flex items-center justify-between p-3 bg-surface rounded border border-border">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">{i + 1}</span>
                <span className="text-sm text-foreground">{isAr ? c.nameAr : c.name}</span>
              </div>
              <span className="text-sm font-bold text-foreground">{c.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
