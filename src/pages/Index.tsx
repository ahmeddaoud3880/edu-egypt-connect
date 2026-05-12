import { Link } from "react-router-dom";
import {
  ArrowRight, Building2, School, Users, GraduationCap, BookOpen,
  BarChart3, Bot, Shield, Globe, FileText, Headphones, Landmark,
  UserCheck, TrendingUp, Award, MapPin, CheckCircle2
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/i18n/translations";

export default function Index() {
  const { t } = useTranslation();

  const stats = [
    { label: t("home.stat1"), value: "27", icon: MapPin },
    { label: t("home.stat2"), value: "27", icon: Landmark },
    { label: t("home.stat3"), value: "312", icon: Building2 },
    { label: t("home.stat4"), value: "58,000+", icon: School },
    { label: t("home.stat5"), value: "1,200,000+", icon: Users },
    { label: t("home.stat6"), value: "25,000,000+", icon: GraduationCap },
  ];

  const hierarchy = [
    { level: t("home.h1"), desc: t("home.h1d"), icon: Landmark, count: "1 HQ" },
    { level: t("home.h2"), desc: t("home.h2d"), icon: Building2, count: "27" },
    { level: t("home.h3"), desc: t("home.h3d"), icon: Building2, count: "312" },
    { level: t("home.h4"), desc: t("home.h4d"), icon: School, count: "58,000+" },
    { level: t("home.h5"), desc: t("home.h5d"), icon: UserCheck, count: "58,000+" },
    { level: t("home.h6"), desc: t("home.h6d"), icon: Users, count: "1.2M+" },
    { level: t("home.h7"), desc: t("home.h7d"), icon: BookOpen, count: "450,000+" },
    { level: t("home.h8"), desc: t("home.h8d"), icon: GraduationCap, count: "25M+" },
    { level: t("home.h9"), desc: t("home.h9d"), icon: Users, count: "15M+" },
  ];

  const capabilities = [
    { title: t("home.cap1Title"), desc: t("home.cap1Desc"), icon: FileText },
    { title: t("home.cap2Title"), desc: t("home.cap2Desc"), icon: BarChart3 },
    { title: t("home.cap3Title"), desc: t("home.cap3Desc"), icon: Bot },
    { title: t("home.cap4Title"), desc: t("home.cap4Desc"), icon: Globe },
    { title: t("home.cap5Title"), desc: t("home.cap5Desc"), icon: Shield },
    { title: t("home.cap6Title"), desc: t("home.cap6Desc"), icon: Award },
  ];

  const services = [
    { title: t("home.svc1"), desc: t("home.svc1d"), icon: GraduationCap },
    { title: t("home.svc2"), desc: t("home.svc2d"), icon: Users },
    { title: t("home.svc3"), desc: t("home.svc3d"), icon: CheckCircle2 },
    { title: t("home.svc4"), desc: t("home.svc4d"), icon: FileText },
    { title: t("home.svc5"), desc: t("home.svc5d"), icon: BarChart3 },
    { title: t("home.svc6"), desc: t("home.svc6d"), icon: Headphones },
  ];

  const aiItems = [
    t("home.ai1"), t("home.ai2"), t("home.ai3"),
    t("home.ai4"), t("home.ai5"), t("home.ai6"),
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground">
        <div className="container-gov py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px w-12 bg-gold"></div>
              <span className="text-gold text-sm font-medium tracking-wide uppercase">{t("home.badge")}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6">
              {t("home.title1")}
              <br />
              <span className="text-gold">{t("home.title2")}</span>
            </h1>
            <p className="text-sm text-primary-foreground/50 font-medium mb-2">
              {t("home.subtitle")}
            </p>
            <p className="text-lg text-primary-foreground/70 leading-relaxed mb-10 max-w-2xl">
              {t("home.desc")}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-gold text-primary font-semibold rounded hover:bg-gold/90 transition-colors"
              >
                {t("home.accessPortal")}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 px-8 py-3.5 border border-primary-foreground/20 text-primary-foreground font-medium rounded hover:border-primary-foreground/40 transition-colors"
              >
                {t("home.learnMore")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* National Statistics */}
      <section className="bg-background border-b border-border">
        <div className="container-gov py-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="w-6 h-6 text-gold mx-auto mb-3" />
                <div className="text-2xl lg:text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Capabilities */}
      <section className="bg-background">
        <div className="container-gov section-padding">
          <div className="max-w-2xl mb-12">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px w-8 bg-gold"></div>
              <span className="text-gold text-xs font-semibold tracking-wide uppercase">{t("home.capBadge")}</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">{t("home.capTitle")}</h2>
            <p className="text-muted-foreground">{t("home.capDesc")}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap) => (
              <div key={cap.title} className="p-6 bg-surface rounded-lg border border-border hover:border-gold/30 transition-colors">
                <cap.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-2">{cap.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hierarchy Section */}
      <section className="bg-surface">
        <div className="container-gov section-padding">
          <div className="max-w-2xl mb-12">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px w-8 bg-gold"></div>
              <span className="text-gold text-xs font-semibold tracking-wide uppercase">{t("home.structBadge")}</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">{t("home.structTitle")}</h2>
            <p className="text-muted-foreground">{t("home.structDesc")}</p>
          </div>
          <div className="space-y-3">
            {hierarchy.map((item, i) => (
              <div key={item.level} className="flex items-center gap-4 p-4 bg-surface-elevated rounded-lg border border-border">
                <div className="w-10 h-10 rounded bg-primary flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gold font-medium">{t("home.level")} {i + 1}</span>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{item.level}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <div className="text-end shrink-0">
                  <div className="text-sm font-bold text-foreground">{item.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="bg-primary text-primary-foreground">
        <div className="container-gov section-padding">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px w-8 bg-gold"></div>
                <span className="text-gold text-xs font-semibold tracking-wide uppercase">{t("home.aiBadge")}</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold mb-4">{t("home.aiTitle")}</h2>
              <p className="text-primary-foreground/70 leading-relaxed mb-8">{t("home.aiDesc")}</p>
              <ul className="space-y-3">
                {aiItems.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-primary-foreground/80">
                    <Bot className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-navy-light rounded-lg p-8 border border-navy-light">
              <div className="flex items-center gap-3 mb-6">
                <Bot className="w-6 h-6 text-gold" />
                <span className="font-semibold">{t("home.aiPreview")}</span>
              </div>
              <div className="space-y-4">
                <div className="bg-navy-dark rounded-lg p-4">
                  <p className="text-xs text-primary-foreground/50 mb-1">{t("home.aiRec")}</p>
                  <p className="text-sm text-primary-foreground/90">{t("home.aiRec1")}</p>
                </div>
                <div className="bg-navy-dark rounded-lg p-4">
                  <p className="text-xs text-primary-foreground/50 mb-1">{t("home.aiOpt")}</p>
                  <p className="text-sm text-primary-foreground/90">{t("home.aiOpt1")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="bg-background">
        <div className="container-gov section-padding">
          <div className="max-w-2xl mb-12">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px w-8 bg-gold"></div>
              <span className="text-gold text-xs font-semibold tracking-wide uppercase">{t("home.svcBadge")}</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">{t("home.svcTitle")}</h2>
            <p className="text-muted-foreground">{t("home.svcDesc")}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((svc) => (
              <div key={svc.title} className="group p-6 border border-border rounded-lg hover:border-primary/20 transition-colors">
                <svc.icon className="w-7 h-7 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-1">{svc.title}</h3>
                <p className="text-sm text-muted-foreground">{svc.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/services" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              {t("home.viewAll")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface border-t border-border">
        <div className="container-gov section-padding text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">{t("home.ctaTitle")}</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">{t("home.ctaDesc")}</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-10 py-4 bg-primary text-primary-foreground font-semibold rounded hover:bg-navy-light transition-colors"
          >
            {t("home.ctaBtn")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
