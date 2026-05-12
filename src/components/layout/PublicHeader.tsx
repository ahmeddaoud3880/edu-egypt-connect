import { Link, useLocation } from "react-router-dom";
import { Menu, X, Globe } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

export function PublicHeader() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, lang, setLang, isAr } = useTranslation();

  const navItems = [
    { label: t("nav.home"), path: "/" },
    { label: t("nav.about"), path: "/about" },
    { label: t("nav.educationalMap"), path: "/educational-map" },
    { label: t("nav.schoolDirectory"), path: "/school-directory" },
    { label: t("nav.services"), path: "/services" },
    { label: t("nav.news"), path: "/news" },
    { label: t("nav.support"), path: "/complaints" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-primary border-b border-navy-light">
      {/* Top bar */}
      <div className="bg-navy-dark">
        <div className="container-gov flex items-center justify-between py-1.5 text-xs text-primary-foreground/70">
          <span>{t("topbar.countryAr")}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(isAr ? "en" : "ar")}
              className="flex items-center gap-1 text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              <Globe className="w-3 h-3" />
              <span className="font-medium">{isAr ? "English" : "العربية"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="container-gov">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center">
              <span className="text-primary font-bold text-lg">م</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-primary-foreground font-bold text-sm leading-tight">
                {isAr ? "المنصة الذكية الوطنية" : "National Smart Education"}
              </div>
              <div className="text-primary-foreground/60 text-xs">
                {isAr ? "National Smart Education Platform" : "المنصة الذكية الوطنية للتعليم"}
              </div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 text-sm rounded transition-colors ${
                  location.pathname === item.path
                    ? "text-gold font-semibold"
                    : "text-primary-foreground/80 hover:text-primary-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center px-5 py-2 text-sm font-semibold bg-gold text-primary rounded hover:bg-gold/90 transition-colors"
            >
              {t("nav.accessPortal")}
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-primary-foreground p-2"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-primary border-t border-navy-light">
          <nav className="container-gov py-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2.5 text-sm rounded ${
                  location.pathname === item.path ? "text-gold font-semibold bg-navy-light" : "text-primary-foreground/80"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link to="/login" onClick={() => setMobileOpen(false)} className="mt-2 px-5 py-2.5 text-sm font-semibold bg-gold text-primary rounded text-center">
              {t("nav.accessPortal")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
