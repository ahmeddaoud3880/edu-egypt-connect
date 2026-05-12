import { FileText, GraduationCap, Users, School, ClipboardList, BarChart3, Headphones, Building2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/i18n/translations";

export default function Services() {
  const { t } = useTranslation();

  const serviceCategories = [
    { titleKey: "svc.studentServices" as TranslationKey, icon: GraduationCap, serviceKeys: ["svc.s1_1","svc.s1_2","svc.s1_3","svc.s1_4","svc.s1_5"] as TranslationKey[] },
    { titleKey: "svc.teacherServices" as TranslationKey, icon: Users, serviceKeys: ["svc.s2_1","svc.s2_2","svc.s2_3","svc.s2_4","svc.s2_5"] as TranslationKey[] },
    { titleKey: "svc.schoolServices" as TranslationKey, icon: School, serviceKeys: ["svc.s3_1","svc.s3_2","svc.s3_3","svc.s3_4","svc.s3_5"] as TranslationKey[] },
    { titleKey: "svc.adminServices" as TranslationKey, icon: Building2, serviceKeys: ["svc.s4_1","svc.s4_2","svc.s4_3","svc.s4_4","svc.s4_5"] as TranslationKey[] },
    { titleKey: "svc.examServices" as TranslationKey, icon: ClipboardList, serviceKeys: ["svc.s5_1","svc.s5_2","svc.s5_3","svc.s5_4","svc.s5_5"] as TranslationKey[] },
    { titleKey: "svc.analyticsServices" as TranslationKey, icon: BarChart3, serviceKeys: ["svc.s6_1","svc.s6_2","svc.s6_3","svc.s6_4","svc.s6_5"] as TranslationKey[] },
    { titleKey: "svc.documentServices" as TranslationKey, icon: FileText, serviceKeys: ["svc.s7_1","svc.s7_2","svc.s7_3","svc.s7_4","svc.s7_5"] as TranslationKey[] },
    { titleKey: "svc.techSupport" as TranslationKey, icon: Headphones, serviceKeys: ["svc.s8_1","svc.s8_2","svc.s8_3","svc.s8_4","svc.s8_5"] as TranslationKey[] },
  ];

  return (
    <div>
      <section className="bg-primary text-primary-foreground">
        <div className="container-gov py-16 lg:py-20">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px w-8 bg-gold"></div>
            <span className="text-gold text-xs font-semibold tracking-wide uppercase">{t("svc.badge")}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">{t("svc.title")}</h1>
          <p className="text-primary-foreground/70 max-w-2xl">{t("svc.desc")}</p>
        </div>
      </section>

      <section className="bg-background">
        <div className="container-gov section-padding">
          <div className="grid md:grid-cols-2 gap-6">
            {serviceCategories.map((cat) => (
              <div key={cat.titleKey} className="p-6 border border-border rounded-lg bg-surface-elevated">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded bg-primary flex items-center justify-center">
                    <cat.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-bold text-foreground">{t(cat.titleKey)}</h3>
                </div>
                <ul className="space-y-2">
                  {cat.serviceKeys.map((key) => (
                    <li key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold shrink-0"></div>
                      {t(key)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
