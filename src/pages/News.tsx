import { Calendar, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/i18n/translations";

const newsItems = [
  { date: "2026-03-28", type: "announcement", titleKey: "news.n1Title", descKey: "news.n1Desc" },
  { date: "2026-03-25", type: "alert", titleKey: "news.n2Title", descKey: "news.n2Desc" },
  { date: "2026-03-20", type: "news", titleKey: "news.n3Title", descKey: "news.n3Desc" },
  { date: "2026-03-15", type: "announcement", titleKey: "news.n4Title", descKey: "news.n4Desc" },
  { date: "2026-03-10", type: "news", titleKey: "news.n5Title", descKey: "news.n5Desc" },
  { date: "2026-03-05", type: "alert", titleKey: "news.n6Title", descKey: "news.n6Desc" },
  { date: "2026-02-28", type: "news", titleKey: "news.n7Title", descKey: "news.n7Desc" },
  { date: "2026-02-20", type: "announcement", titleKey: "news.n8Title", descKey: "news.n8Desc" },
];

const typeIcons = { announcement: Info, alert: AlertTriangle, news: Calendar };
const typeColors = {
  announcement: "bg-blue-50 text-blue-700 border-blue-200",
  alert: "bg-amber-50 text-amber-700 border-amber-200",
  news: "bg-muted text-muted-foreground border-border",
};

const typeKeys: Record<string, TranslationKey> = {
  announcement: "news.announcement",
  alert: "news.alert",
  news: "news.newsType",
};

export default function News() {
  const { t } = useTranslation();

  return (
    <div>
      <section className="bg-primary text-primary-foreground">
        <div className="container-gov py-16 lg:py-20">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px w-8 bg-gold"></div>
            <span className="text-gold text-xs font-semibold tracking-wide uppercase">{t("news.badge")}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">{t("news.title")}</h1>
          <p className="text-primary-foreground/70 max-w-2xl">{t("news.desc")}</p>
        </div>
      </section>

      <section className="bg-background">
        <div className="container-gov section-padding">
          <div className="space-y-4">
            {newsItems.map((item) => {
              const Icon = typeIcons[item.type as keyof typeof typeIcons];
              const color = typeColors[item.type as keyof typeof typeColors];
              return (
                <div key={item.titleKey} className="p-5 border border-border rounded-lg bg-surface-elevated hover:border-primary/20 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`px-2.5 py-1 rounded text-xs font-medium border ${color} shrink-0 flex items-center gap-1.5`}>
                      <Icon className="w-3 h-3" />
                      {t(typeKeys[item.type])}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1">{t(item.titleKey as TranslationKey)}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{t(item.descKey as TranslationKey)}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{item.date}</span>
                        <button className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline">
                          {t("news.readMore")} <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
