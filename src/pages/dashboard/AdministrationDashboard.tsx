import { useTranslation } from "@/hooks/useTranslation";
import { Link } from "react-router-dom";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { AIRecommendationsPanel } from "@/components/dashboard/AIRecommendationsPanel";
import { useAuth } from "@/contexts/AuthContext";
import {
  School, Users, AlertTriangle, CheckCircle2,
  Clock, FileText, ClipboardList, TrendingUp, BarChart2
} from "lucide-react";

export default function AdministrationDashboard() {
  const { t, lang } = useTranslation();
  const { profile } = useAuth();
  const isAr = lang === "ar";

  const kpis = [
    { label: t("admin.schoolsUnder"), value: "0", icon: School },
    { label: t("common.teachers"), value: "0", icon: Users },
    { label: t("common.students"), value: "0", icon: TrendingUp },
    { label: t("common.attendance"), value: "0%", icon: CheckCircle2 },
    { label: t("admin.delayedReports"), value: "0", icon: FileText },
    { label: t("admin.openComplaints"), value: "0", icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("admin.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("admin.subtitle")} {(profile as any)?.administration ? `— ${(profile as any).administration}` : ""}
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            <div>{t("dash.lastUpdated")}: {new Date().toLocaleDateString(isAr ? "ar-EG" : "en-GB")}</div>
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

      {/* Schools List Placeholder */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{t("admin.schoolsUnder")}</h3>
        <div className="p-16 text-center border border-dashed border-border rounded-lg bg-muted/5">
           <School className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
           <p className="text-sm text-muted-foreground italic">
              {isAr ? "قائمة المدارس التابعة للإدارة ستظهر هنا فور اكتمال عملية الربط الرقمى." : "The list of schools under this administration will appear here once digital linking is complete."}
           </p>
        </div>
      </div>

      {/* School Comparison Chart Placeholder */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{t("admin.schoolComparison")}</h3>
        <div className="p-16 text-center border border-dashed border-border rounded-lg bg-muted/5">
           <BarChart2 className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
           <p className="text-sm text-muted-foreground italic">
              {isAr ? "الرسوم البيانية للمقارنة ستفعل فور رصد المدارس لبيانات الحضور والأداء." : "Comparison charts will be enabled once schools record attendance and performance data."}
           </p>
        </div>
      </div>

      {/* Delayed Reports + Open Complaints Placeholder */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-destructive" />
            <h3 className="font-semibold text-foreground">{t("admin.delayedReports")}</h3>
          </div>
          <div className="h-40 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground/40 italic text-xs">
            {isAr ? "لا توجد تقارير متأخرة حالياً." : "No delayed reports currently."}
          </div>
        </div>

        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-foreground">{t("admin.openComplaints")}</h3>
          </div>
          <div className="h-40 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground/40 italic text-xs">
            {isAr ? "لا توجد شكاوى مفتوحة." : "No open complaints."}
          </div>
        </div>
      </div>

      {/* Inspections Placeholder */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">{t("admin.inspections")}</h3>
        </div>
        <div className="h-40 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground/40 italic text-xs">
           {isAr ? "لا توجد زيارات تفتيشية مجدولة." : "No inspection visits scheduled."}
        </div>
      </div>

      <AIRecommendationsPanel recommendations={[]} />
    </div>
  );
}
