import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoConfig, useToggleDemoData } from "@/hooks/useGovernanceData";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ToggleLeft, ToggleRight, TestTube, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const DEMO_ACCOUNTS = [
  { role: "ministry", email: "demo-ministry@edu.gov.eg", password: "Demo@2026!", en: "Ministry Leadership", ar: "قيادة الوزارة", scope_en: "National Level", scope_ar: "المستوى الوطنى" },
  { role: "directorate", email: "demo-directorate@edu.gov.eg", password: "Demo@2026!", en: "Directorate Leadership", ar: "قيادة المديرية", scope_en: "Cairo Governorate", scope_ar: "محافظة القاهرة" },
  { role: "administration", email: "demo-admin@edu.gov.eg", password: "Demo@2026!", en: "Administration Leadership", ar: "قيادة الإدارة", scope_en: "East Cairo Admin", scope_ar: "إدارة شرق القاهرة" },
  { role: "school", email: "demo-school@edu.gov.eg", password: "Demo@2026!", en: "School Leadership", ar: "قيادة المدرسة", scope_en: "Al-Orman School", scope_ar: "مدرسة الأورمان" },
  { role: "teacher", email: "demo-teacher@edu.gov.eg", password: "Demo@2026!", en: "Teacher", ar: "معلم", scope_en: "Al-Orman School", scope_ar: "مدرسة الأورمان" },
  { role: "student", email: "demo-student@edu.gov.eg", password: "Demo@2026!", en: "Student", ar: "طالب", scope_en: "Al-Orman School", scope_ar: "مدرسة الأورمان" },
  { role: "parent", email: "demo-parent@edu.gov.eg", password: "Demo@2026!", en: "Parent", ar: "ولى أمر", scope_en: "Linked to Student", scope_ar: "مرتبط بطالب" },
  { role: "support", email: "demo-support@edu.gov.eg", password: "Demo@2026!", en: "Technical Support", ar: "الدعم الفنى", scope_en: "Platform-wide", scope_ar: "على مستوى المنصة" },
];

export default function DemoAccounts() {
  const { isAr } = useTranslation();
  const { role, signIn } = useAuth();
  const navigate = useNavigate();
  const { data: demoConfig } = useDemoConfig();
  const toggleDemo = useToggleDemoData();
  const [seeding, setSeeding] = useState(false);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  const isDemoVisible = demoConfig?.show_demo_data !== "false";
  const canToggle = ["ministry", "support"].includes(role || "");

  const handleSeedAccounts = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-demo-accounts");
      if (error) throw error;
      toast.success(isAr ? "تم إنشاء/تحديث الحسابات التجريبية" : "Demo accounts created/updated successfully");
      console.log("Seed results:", data);
    } catch (err: any) {
      toast.error(err.message || "Error seeding accounts");
    }
    setSeeding(false);
  };

  const handleToggle = async () => {
    try {
      await toggleDemo.mutateAsync(!isDemoVisible);
      toast.success(isDemoVisible
        ? (isAr ? "تم إخفاء البيانات التجريبية" : "Demo data hidden")
        : (isAr ? "تم إظهار البيانات التجريبية" : "Demo data restored"));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDemoLogin = async (acc: typeof DEMO_ACCOUNTS[0]) => {
    setLoggingIn(acc.role);
    try {
      const { error } = await signIn(acc.email, acc.password);
      if (error) {
        toast.error(isAr ? `فشل تسجيل الدخول: ${error}` : `Login failed: ${error}`);
      } else {
        toast.success(isAr ? "تم تسجيل الدخول بنجاح" : "Signed in successfully");
        setTimeout(() => navigate("/dashboard", { replace: true }), 500);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoggingIn(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-2">
          <TestTube className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">{isAr ? "حسابات العرض التوضيحى" : "Demo / Test Accounts"}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {isAr ? "حسابات تجريبية حقيقية للاختبار الشامل لجميع أدوار المنصة — تسجيل دخول حقيقى" : "Real authenticated demo accounts for end-to-end testing across all platform roles"}
        </p>
      </div>

      {/* Seed button */}
      {canToggle && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{isAr ? "إنشاء / تحديث الحسابات التجريبية" : "Create / Update Demo Accounts"}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? "إنشاء حسابات تجريبية حقيقية فى نظام المصادقة مع الأدوار والنطاقات المناسبة" : "Create real auth accounts with proper roles and scope assignments"}
              </p>
            </div>
            <button onClick={handleSeedAccounts} disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-navy-light transition-colors disabled:opacity-50">
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
              {seeding ? (isAr ? "جارى الإنشاء..." : "Seeding...") : (isAr ? "إنشاء الحسابات" : "Seed Accounts")}
            </button>
          </div>
        </div>
      )}

      {/* Demo data toggle */}
      {canToggle && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{isAr ? "التحكم فى البيانات التجريبية" : "Demo Data Control"}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? "إظهار أو إخفاء البيانات التجريبية من قوائم الموافقات والحوكمة" : "Show or hide demo data from approval queues and governance lists"}
              </p>
            </div>
            <button onClick={handleToggle} disabled={toggleDemo.isPending}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDemoVisible ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-muted text-muted-foreground hover:bg-border"}`}>
              {isDemoVisible ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              {isDemoVisible ? (isAr ? "البيانات التجريبية: مرئية" : "Demo Data: Visible") : (isAr ? "البيانات التجريبية: مخفية" : "Demo Data: Hidden")}
            </button>
          </div>
        </div>
      )}

      {/* Demo accounts table with real login */}
      <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الدور" : "Role"}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "البريد الإلكترونى" : "Email"}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "كلمة المرور" : "Password"}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "النطاق" : "Scope"}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "تسجيل دخول" : "Login"}</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_ACCOUNTS.map(acc => (
                <tr key={acc.role} className="border-b border-border hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">DEMO</span>
                      <span className="text-xs font-medium">{isAr ? acc.ar : acc.en}</span>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">{acc.email}</td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">{acc.password}</td>
                  <td className="p-3 text-xs text-muted-foreground">{isAr ? acc.scope_ar : acc.scope_en}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDemoLogin(acc)}
                      disabled={loggingIn === acc.role}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-navy-light transition-colors disabled:opacity-50"
                    >
                      {loggingIn === acc.role ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
                      {isAr ? "دخول" : "Login"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
        <Shield className="w-4 h-4 inline-block me-1" />
        {isAr
          ? "هذه حسابات تجريبية للاختبار فقط. يجب إنشاء الحسابات أولاً باستخدام زر 'إنشاء الحسابات' أعلاه. كلمة المرور الافتراضية: Demo@2026!"
          : "These are demo accounts for testing only. Accounts must be created first using the 'Seed Accounts' button above. Default password: Demo@2026!"}
      </div>
    </div>
  );
}
