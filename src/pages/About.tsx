import { CheckCircle2, Target, Eye, Lightbulb } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function About() {
  const { t } = useTranslation();

  const items = [
    { icon: Target, title: t("about.strategic"), desc: t("about.strategicDesc") },
    { icon: Eye, title: t("about.vision"), desc: t("about.visionDesc") },
    { icon: Lightbulb, title: t("about.innovation"), desc: t("about.innovationDesc") },
  ];

  const features = [
    t("about.feat1"), t("about.feat2"), t("about.feat3"),
    t("about.feat4"), t("about.feat5"), t("about.feat6"),
    t("about.feat7"), t("about.feat8"), t("about.feat9"),
  ];

  return (
    <div>
      <section className="bg-primary text-primary-foreground">
        <div className="container-gov py-16 lg:py-20">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px w-8 bg-gold"></div>
            <span className="text-gold text-xs font-semibold tracking-wide uppercase">{t("about.badge")}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">{t("about.title")}</h1>
          <p className="text-primary-foreground/70 max-w-2xl">{t("about.desc")}</p>
        </div>
      </section>

      <section className="bg-background">
        <div className="container-gov section-padding">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">{t("about.missionTitle")}</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">{t("about.missionP1")}</p>
              <p className="text-muted-foreground leading-relaxed">{t("about.missionP2")}</p>
            </div>
            <div className="space-y-6">
              {items.map((item) => (
                <div key={item.title} className="flex gap-4 p-5 bg-surface rounded-lg border border-border">
                  <item.icon className="w-6 h-6 text-gold shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20">
            <h2 className="text-2xl font-bold text-foreground mb-8">{t("about.features")}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-3 p-4 bg-surface rounded border border-border">
                  <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
