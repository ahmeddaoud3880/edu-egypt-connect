import { useTranslation } from "@/hooks/useTranslation";
import { Link } from "react-router-dom";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { AIRecommendationsPanel } from "@/components/dashboard/AIRecommendationsPanel";
import { useAuth } from "@/contexts/AuthContext";
import {
  School, Users, GraduationCap, TrendingUp, CheckCircle2,
  AlertTriangle, Building2, BarChart2
} from "lucide-react";

export default function DirectorateDashboard() {
  const { t, lang } = useTranslation();
  const { profile } = useAuth();
  const isAr = lang === "ar";

  const kpis = [
    { label: t("common.administration") + "s", value: "0", icon: Building2 },
    { label: t("ministry.totalSchools"), value: "0", icon: School },
    { label: t("common.teachers"), value: "0", icon: Users },
    { label: t("common.students"), value: "0", icon: GraduationCap },
    { label: t("common.attendance"), value: "0%", icon: TrendingUp },
    { label: t("ministry.passRate"), value: "0%", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("directorate.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("directorate.subtitle")} {(profile as any)?.governorate ? `— ${(profile as any).governorate}` : ""}
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            <div>{t("dash.lastUpdated")}: {new Date().toLocaleDateString(isAr ? "ar-EG" : "en-GB")}</div>
            <div className="mt-1 flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> {t("dash.allSystems")}</div>
          </div>
        </div>
      </div>

      <DashboardFilters />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <kpi.icon className="w-4 h-4 text-muted-foreground mb-2" />
            <div className="text-lg font-bold text-foreground">{kpi.value}</div>
            <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Admin Ranking Table Placeholder */}
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{t("directorate.adminRanking")}</h3>
          <div className="p-16 text-center border border-dashed border-border rounded-lg bg-muted/5">
             <Building2 className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
             <p className="text-sm text-muted-foreground italic">
                {isAr ? "سيتم عرض ترتيب الإدارات التعليمية فور مزامنة بيانات المدارس التابعة للمديرية." : "Administration rankings will appear once school data for the directorate is synchronized."}
             </p>
          </div>
        </div>

        {/* Analytics Placeholder */}
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{isAr ? "تحليلات المديرية" : "Directorate Analytics"}</h3>
          <div className="p-16 text-center border border-dashed border-border rounded-lg bg-muted/5">
             <BarChart2 className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
             <p className="text-sm text-muted-foreground italic">
                {isAr ? "التحليلات ستكون متاحة فور بدء المعلمين فى رصد الحضور والدرجات." : "Analytics will be available once teachers start recording attendance and grades."}
             </p>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{t("directorate.urgentSchools")}</h3>
          <div className="h-40 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground/40 italic text-xs">
            {isAr ? "لا توجد تنبيهات عاجلة للمدارس حالياً." : "No urgent school alerts currently."}
          </div>
        </div>

        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{t("directorate.operationalIssues")}</h3>
          <div className="h-40 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground/40 italic text-xs">
            {isAr ? "لا توجد مشكلات تشغيلية مفتوحة." : "No open operational issues."}
          </div>
        </div>
      </div>

      <AIRecommendationsPanel recommendations={[]} />
    </div>
  );
}
