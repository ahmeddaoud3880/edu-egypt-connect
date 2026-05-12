import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoConfig, useToggleDemoData } from "@/hooks/useGovernanceData";
import { useDemoMode } from "@/hooks/useDemoMode";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Shield, TestTube, Loader2, Info,
  CheckCircle2, AlertTriangle, RefreshCw, Eye, EyeOff, Database, Globe
} from "lucide-react";
import { toast } from "sonner";

function useDemoRecordCounts() {
  return useQuery({
    queryKey: ["demo_record_counts"],
    queryFn: async () => {
      const tables = [
        "registration_requests", "support_tickets", "schools", "students",
        "teachers", "classes", "assignments", "grades", "attendance_records",
        "enrollments", "parents", "role_change_requests", "transfer_requests",
        "parent_child_link_requests", "user_scope_assignments",
      ];
      const counts: Record<string, number> = {};
      let total = 0;
      await Promise.all(
        tables.map(async (t) => {
          const { count } = await supabase
            .from(t as any)
            .select("id", { count: "exact", head: true })
            .eq("is_demo", true);
          counts[t] = count || 0;
          total += count || 0;
        })
      );
      return { counts, total };
    },
  });
}

export default function DemoControl() {
  const { isAr } = useTranslation();
  const { role } = useAuth();
  const { data: demoConfig, isLoading } = useDemoConfig();
  const { isDemoVisible } = useDemoMode();
  const toggleDemo = useToggleDemoData();
  const { data: demoCounts } = useDemoRecordCounts();
  const [seeding, setSeeding] = useState(false);

  const canControl = ["ministry", "support", "super_admin"].includes(role || "");

  if (!canControl) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 bg-surface-elevated rounded-lg border border-border max-w-lg">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-2">
            {isAr ? "غير مصرح بالوصول" : "Access Restricted"}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {isAr
              ? "هذه الصفحة متاحة فقط لقيادة الوزارة والدعم الفنى."
              : "This page is only available to Ministry Leadership and Technical Support accounts."}
          </p>
          <div className="p-4 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-2 text-start">
            <p className="font-semibold text-foreground">{isAr ? "كيفية الوصول:" : "How to access:"}</p>
            <p>{isAr
              ? "1. انتقل إلى صفحة تسجيل الدخول وافتح قسم «الحسابات التجريبية للاختبار»"
              : "1. Go to the login page and open the 'Demo Test Accounts' section"}</p>
            <p>{isAr
              ? "2. سجل دخول بحساب «قيادة الوزارة» (demo-ministry@edu.gov.eg) أو «الدعم الفنى» (demo-support@edu.gov.eg)"
              : "2. Sign in with 'Ministry' (demo-ministry@edu.gov.eg) or 'Support' (demo-support@edu.gov.eg)"}</p>
            <p>{isAr
              ? "3. كلمة المرور: Demo@2026!"
              : "3. Password: Demo@2026!"}</p>
          </div>
          <div className="mt-4">
            <a href="/login" className="inline-block px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              {isAr ? "الذهاب لتسجيل الدخول" : "Go to Login"}
            </a>
          </div>
        </div>
      </div>
    );
  }

  const handleToggle = async (show: boolean) => {
    try {
      await toggleDemo.mutateAsync(show);
      toast.success(show
        ? (isAr ? "✅ تم إظهار البيانات التجريبية على مستوى المنصة بالكامل" : "✅ Demo data is now visible across the entire platform")
        : (isAr ? "✅ تم إخفاء البيانات التجريبية على مستوى المنصة بالكامل" : "✅ Demo data is now hidden across the entire platform"));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSeedAccounts = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-demo-accounts");
      if (error) throw error;
      toast.success(isAr ? "تم إنشاء/تحديث الحسابات التجريبية بنجاح" : "Demo accounts created/updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Error seeding accounts");
    }
    setSeeding(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {isAr ? "التحكم الشامل فى البيانات التجريبية" : "Global Demo Data Control"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isAr ? "إخفاء أو إظهار البيانات التجريبية على مستوى المنصة بالكامل" : "Hide or show demo data across the entire platform"}
            </p>
          </div>
        </div>
      </div>

      {/* Current Status — Global */}
      <div className={`rounded-lg border-2 p-6 ${isDemoVisible ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {isDemoVisible
              ? <Eye className="w-6 h-6 text-green-700" />
              : <EyeOff className="w-6 h-6 text-amber-700" />}
            <div>
              <h2 className="text-lg font-bold" style={{ color: isDemoVisible ? '#15803d' : '#b45309' }}>
                {isDemoVisible
                  ? (isAr ? "البيانات التجريبية: مرئية على المنصة بالكامل" : "Demo Data: VISIBLE Across Entire Platform")
                  : (isAr ? "البيانات التجريبية: مخفية على المنصة بالكامل" : "Demo Data: HIDDEN Across Entire Platform")}
              </h2>
              <p className="text-sm mt-1" style={{ color: isDemoVisible ? '#166534' : '#92400e' }}>
                {isDemoVisible
                  ? (isAr ? "جميع السجلات التجريبية مرئية فى كل الأدوار واللوحات والصفحات والمخططات والإحصائيات" : "All demo records are visible in all roles, dashboards, pages, charts, and statistics")
                  : (isAr ? "جميع السجلات التجريبية مخفية من كل الأدوار واللوحات والصفحات والمخططات والإحصائيات" : "All demo records are hidden from all roles, dashboards, pages, charts, and statistics")}
              </p>
            </div>
          </div>
          <div className="text-center">
            <div className={`px-4 py-2 rounded-full text-sm font-bold ${isDemoVisible ? "bg-green-200 text-green-800" : "bg-amber-200 text-amber-800"}`}>
              {isDemoVisible ? (isAr ? "مرئى" : "VISIBLE") : (isAr ? "مخفى" : "HIDDEN")}
            </div>
            {demoCounts && (
              <p className="text-xs text-muted-foreground mt-2">
                {isAr ? `${demoCounts.total} سجل تجريبى` : `${demoCounts.total} demo records`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => handleToggle(true)}
          disabled={isDemoVisible || toggleDemo.isPending}
          className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border bg-surface-elevated hover:border-green-400 hover:bg-green-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Eye className="w-8 h-8 text-green-600" />
          <span className="text-sm font-bold text-foreground">{isAr ? "إظهار كل البيانات التجريبية" : "Show All Demo Data"}</span>
          <span className="text-xs text-muted-foreground text-center">
            {isAr ? "إظهار البيانات التجريبية فى كل أنحاء المنصة" : "Show demo data across the entire platform"}
          </span>
        </button>

        <button
          onClick={() => handleToggle(false)}
          disabled={!isDemoVisible || toggleDemo.isPending}
          className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border bg-surface-elevated hover:border-amber-400 hover:bg-amber-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <EyeOff className="w-8 h-8 text-amber-600" />
          <span className="text-sm font-bold text-foreground">{isAr ? "إخفاء كل البيانات التجريبية" : "Hide All Demo Data"}</span>
          <span className="text-xs text-muted-foreground text-center">
            {isAr ? "إخفاء البيانات التجريبية من كل أنحاء المنصة" : "Hide demo data across the entire platform"}
          </span>
        </button>

        <button
          onClick={() => handleToggle(true)}
          disabled={isDemoVisible || toggleDemo.isPending}
          className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border bg-surface-elevated hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-8 h-8 text-blue-600" />
          <span className="text-sm font-bold text-foreground">{isAr ? "استعادة إظهار البيانات التجريبية" : "Restore Demo Visibility"}</span>
          <span className="text-xs text-muted-foreground text-center">
            {isAr ? "استعادة رؤية جميع البيانات التجريبية" : "Restore visibility of all demo data"}
          </span>
        </button>
      </div>

      {/* Affected Categories */}
      {demoCounts && demoCounts.total > 0 && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            {isAr ? "الفئات المتأثرة" : "Affected Categories"}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(demoCounts.counts)
              .filter(([, count]) => count > 0)
              .map(([table, count]) => (
                <div key={table} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded text-xs">
                  <span className="text-muted-foreground">{table.replace(/_/g, " ")}</span>
                  <span className="font-bold text-foreground">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Seed Accounts */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <TestTube className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {isAr ? "إنشاء / تحديث الحسابات التجريبية" : "Create / Update Demo Auth Accounts"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr
                  ? "إنشاء حسابات تجريبية حقيقية قابلة لتسجيل الدخول"
                  : "Create real login-capable demo accounts with proper roles"}
              </p>
            </div>
          </div>
          <button onClick={handleSeedAccounts} disabled={seeding}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
            {seeding ? (isAr ? "جارى الإنشاء..." : "Seeding...") : (isAr ? "إنشاء الحسابات" : "Seed Accounts")}
          </button>
        </div>
      </div>

      {/* Important Notes */}
      <div className="space-y-3">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">{isAr ? "البيانات المرجعية الحقيقية محمية" : "Real Reference Data is Protected"}</p>
            <p>{isAr
              ? "المحافظات المصرية الحقيقية (27 محافظة) والإدارات التعليمية الحقيقية لن تتأثر بإخفاء أو إظهار البيانات التجريبية. هذا التحكم يؤثر فقط على السجلات المُعلَّمة كبيانات تجريبية (is_demo = true)."
              : "Real Egyptian governorates (27) and real administrations are NEVER affected. This control only affects records marked as demo (is_demo = true). Reference dropdowns always work."}</p>
          </div>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-semibold mb-1">{isAr ? "تأثير شامل على المنصة" : "Platform-Wide Effect"}</p>
            <p>{isAr
              ? "عند إخفاء البيانات التجريبية، يتم إخفاؤها من: كل الأدوار، كل اللوحات، كل الجداول، كل المخططات، كل الإحصائيات، كل قوائم الموافقات، كل القوائم المنسدلة."
              : "When hidden, demo data disappears from: all roles, all dashboards, all tables, all charts, all KPIs, all approval queues, all dropdowns, all searches."}</p>
          </div>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-semibold mb-1">{isAr ? "لا حذف دائم" : "No Permanent Deletion"}</p>
            <p>{isAr
              ? "إخفاء البيانات التجريبية لا يحذفها. يمكنك استعادتها فى أى وقت."
              : "Hiding demo data does not delete it. You can restore it at any time."}</p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">{isAr ? "الأدوار المصرح لها" : "Authorized Roles"}</p>
            <p>{isAr
              ? "هذه الصفحة متاحة فقط لـ: قيادة الوزارة، الدعم الفنى."
              : "This page is available only to: Ministry Leadership, Technical Support."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
