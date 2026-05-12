import { useState } from "react";
import { Send, Phone, Mail, MapPin } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function Complaints() {
  const [submitted, setSubmitted] = useState(false);
  const { t } = useTranslation();

  return (
    <div>
      <section className="bg-primary text-primary-foreground">
        <div className="container-gov py-16 lg:py-20">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px w-8 bg-gold"></div>
            <span className="text-gold text-xs font-semibold tracking-wide uppercase">{t("complaints.badge")}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">{t("complaints.title")}</h1>
          <p className="text-primary-foreground/70 max-w-2xl">{t("complaints.desc")}</p>
        </div>
      </section>

      <section className="bg-background">
        <div className="container-gov section-padding">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-foreground mb-6">{t("complaints.submitRequest")}</h2>
              {submitted ? (
                <div className="p-8 bg-surface rounded-lg border border-border text-center">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                    <Send className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{t("complaints.submitted")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{t("complaints.refNumber")}: <strong>REQ-2026-00847</strong></p>
                  <button onClick={() => setSubmitted(false)} className="text-sm text-primary font-medium hover:underline">
                    {t("complaints.submitAnother")}
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">{t("complaints.fullName")}</label>
                      <input type="text" required className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">{t("complaints.nationalId")}</label>
                      <input type="text" required className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">{t("complaints.email")}</label>
                      <input type="email" required className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">{t("complaints.phone")}</label>
                      <input type="tel" required className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">{t("complaints.category")}</label>
                    <select required className="w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">{t("complaints.selectCategory")}</option>
                      <option>{t("complaints.catEnrollment")}</option>
                      <option>{t("complaints.catTransfer")}</option>
                      <option>{t("complaints.catInfra")}</option>
                      <option>{t("complaints.catExam")}</option>
                      <option>{t("complaints.catTech")}</option>
                      <option>{t("complaints.catGeneral")}</option>
                      <option>{t("complaints.catOther")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">{t("complaints.subject")}</label>
                    <input type="text" required className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">{t("complaints.details")}</label>
                    <textarea required rows={5} className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"></textarea>
                  </div>
                  <button type="submit" className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-navy-light transition-colors">
                    <Send className="w-4 h-4" />
                    {t("complaints.submit")}
                  </button>
                </form>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground mb-6">{t("complaints.contactInfo")}</h2>
              <div className="space-y-4">
                {[
                  { icon: Phone, label: t("complaints.hotline"), value: "19119" },
                  { icon: Mail, label: t("complaints.email"), value: "support@moe.gov.eg" },
                  { icon: MapPin, label: t("complaints.address"), value: t("complaints.addressValue") },
                ].map((c) => (
                  <div key={c.label} className="flex items-start gap-3 p-4 bg-surface rounded-lg border border-border">
                    <c.icon className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-foreground">{c.label}</div>
                      <div className="text-sm text-muted-foreground">{c.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-gold-light rounded-lg border border-gold/20">
                <p className="text-xs text-foreground/80">
                  <strong>{t("complaints.workingHours")}</strong> {t("complaints.workingHoursValue")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
