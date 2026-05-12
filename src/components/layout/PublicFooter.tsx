import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

export function PublicFooter() {
  const { t } = useTranslation();

  const platformLinks = [
    { label: t("footer.about"), path: "/about" },
    { label: t("footer.services"), path: "/services" },
    { label: t("footer.eduMap"), path: "/educational-map" },
    { label: t("footer.directory"), path: "/school-directory" },
  ];

  const supportLinks = [
    { label: t("footer.complaints"), path: "/complaints" },
    { label: t("footer.news"), path: "/news" },
    { label: t("footer.portal"), path: "/login" },
  ];

  const legalLinks = [
    { label: t("footer.privacy"), path: "#" },
    { label: t("footer.terms"), path: "#" },
    { label: t("footer.accessibility"), path: "#" },
  ];

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container-gov py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center">
                <span className="text-primary font-bold text-lg">م</span>
              </div>
              <div>
                <div className="font-bold text-sm">{t("footer.brandName")}</div>
                <div className="text-primary-foreground/50 text-xs">{t("footer.brandSub")}</div>
              </div>
            </div>
            <p className="text-primary-foreground/60 text-sm leading-relaxed">{t("footer.desc")}</p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-gold">{t("footer.platform")}</h4>
            <ul className="space-y-2.5">
              {platformLinks.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-gold">{t("footer.support")}</h4>
            <ul className="space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-gold">{t("footer.legal")}</h4>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-navy-light flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-primary-foreground/40">
          <span>© {new Date().getFullYear()} {t("footer.copyright")}</span>
        </div>
      </div>
    </footer>
  );
}
