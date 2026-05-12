import { useTranslation } from "@/hooks/useTranslation";
import { Link } from "react-router-dom";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { AIRecommendationsPanel } from "@/components/dashboard/AIRecommendationsPanel";
import { useNationalStats, useGovernorates } from "@/hooks/useRealData";
import { useAuth } from "@/contexts/AuthContext";
import {
  School, Users, GraduationCap, TrendingUp, CheckCircle2,
  ArrowUpRight, ArrowDownRight, ChevronRight, Clock, Bot
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

export default function MinistryDashboard() {
  const { t, lang } = useTranslation();
  const { data: stats } = useNationalStats();
  const { data: governorates } = useGovernorates();
  const { profile } = useAuth();
  const isAr = lang === "ar";

  const kpis = [
    { label: t("ministry.totalSchools"), value: stats ? stats.schools.toLocaleString() : "0", icon: School },
    { label: t("ministry.totalTeachers"), value: stats ? stats.teachers.toLocaleString() : "0", icon: Users },
    { label: t("ministry.totalStudents"), value: stats ? stats.students.toLocaleString() : "0", icon: GraduationCap },
    { label: t("ministry.attendanceRate"), value: "0%", icon: TrendingUp },
    { label: t("ministry.passRate"), value: "0%", icon: CheckCircle2 },
    { label: isAr ? "المحافظات" : "Governorates", value: stats ? stats.governorates.toLocaleString() : "0", icon: School },
  ];

  // Using real governorates data for the chart if available, otherwise empty
  const chartData = governorates?.map(g => ({
    name: isAr ? (g.name_ar || g.name) : g.name,
    schools: g.total_schools || 0,
    students: g.total_students || 0
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("ministry.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("ministry.subtitle")}</p>
            <p className="text-xs text-gold font-medium mt-1">{isAr ? "مرحباً" : "Welcome"}, {profile?.full_name || (isAr ? "مسؤول الوزارة" : "Ministry Official")}</p>
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

      {/* Main Stats Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Performance by Governorate */}
        <div className="lg:col-span-2 bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-foreground">{isAr ? "توزيع المدارس حسب المحافظة" : "School Distribution by Governorate"}</h3>
          </div>
          
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(220 13% 91%)" }} />
                <Bar dataKey="schools" fill="hsl(220 40% 13%)" radius={[2, 2, 0, 0]} name={isAr ? "المدارس" : "Schools"} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-center space-y-3 bg-muted/5 border border-dashed border-border rounded-lg">
              <BarChart className="w-10 h-10 text-muted-foreground/20" />
              <p className="text-xs text-muted-foreground italic">{isAr ? "بانتظار مزامنة بيانات المحافظات..." : "Waiting for governorate data synchronization..."}</p>
            </div>
          )}
        </div>

        {/* AI Recommendations */}
        <AIRecommendationsPanel recommendations={[]} />
      </div>

      {/* Alerts & Critical Issues */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-foreground">{isAr ? "التنبيهات الوطنية العاجلة" : "Urgent National Alerts"}</h3>
          <Link to="/reports" className="text-xs text-primary hover:underline">{isAr ? "عرض الكل" : "View All"}</Link>
        </div>
        <div className="h-40 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-border rounded-lg">
           <CheckCircle2 className="w-8 h-8 text-green-500/20" />
           <p className="text-xs text-muted-foreground italic">{isAr ? "لا توجد تنبيهات عاجلة حالياً على المستوى الوطنى." : "No urgent national alerts currently."}</p>
        </div>
      </div>
    </div>
  );
}
