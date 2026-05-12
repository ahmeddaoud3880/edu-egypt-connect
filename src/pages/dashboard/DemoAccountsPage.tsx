import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Shield, TestTube, Loader2, LogIn, CheckCircle2, XCircle,
  Landmark, Building2, School, Users, GraduationCap, UserCheck, Headphones
} from "lucide-react";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  { role: "ministry", email: "demo-ministry@edu.gov.eg", password: "Demo@2026!", en: "Ministry Leadership", ar: "قيادة الوزارة", scope_en: "National Level", scope_ar: "المستوى الوطنى", dashboard: "/dashboard", icon: Landmark },
  { role: "directorate", email: "demo-directorate@edu.gov.eg", password: "Demo@2026!", en: "Directorate Leadership", ar: "قيادة المديرية", scope_en: "Cairo Governorate", scope_ar: "محافظة القاهرة", dashboard: "/dashboard", icon: Building2 },
  { role: "administration", email: "demo-admin@edu.gov.eg", password: "Demo@2026!", en: "Administration Leadership", ar: "قيادة الإدارة", scope_en: "East Cairo Administration", scope_ar: "إدارة شرق القاهرة", dashboard: "/dashboard", icon: Building2 },
  { role: "school", email: "demo-school@edu.gov.eg", password: "Demo@2026!", en: "School Leadership", ar: "قيادة المدرسة", scope_en: "Al-Orman Experimental School", scope_ar: "مدرسة الأورمان التجريبية", dashboard: "/dashboard", icon: School },
  { role: "teacher", email: "demo-teacher@edu.gov.eg", password: "Demo@2026!", en: "Teacher", ar: "معلم", scope_en: "Al-Orman Experimental School", scope_ar: "مدرسة الأورمان التجريبية", dashboard: "/dashboard", icon: Users },
  { role: "student", email: "demo-student@edu.gov.eg", password: "Demo@2026!", en: "Student", ar: "طالب", scope_en: "Al-Orman Experimental School", scope_ar: "مدرسة الأورمان التجريبية", dashboard: "/dashboard", icon: GraduationCap },
  { role: "parent", email: "demo-parent@edu.gov.eg", password: "Demo@2026!", en: "Parent / Guardian", ar: "ولى أمر", scope_en: "Linked to demo student", scope_ar: "مرتبط بالطالب التجريبى", dashboard: "/dashboard", icon: UserCheck },
  { role: "support", email: "demo-support@edu.gov.eg", password: "Demo@2026!", en: "Technical Support", ar: "الدعم الفنى", scope_en: "Platform-wide", scope_ar: "على مستوى المنصة", dashboard: "/dashboard", icon: Headphones },
];

export default function DemoAccountsPage() {
  const { isAr } = useTranslation();
  const { role, signIn } = useAuth();
  const navigate = useNavigate();
  const [loggingIn, setLoggingIn] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const canAccess = ["ministry", "support"].includes(role || "");

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 bg-surface-elevated rounded-lg border border-border max-w-lg">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-2">
            {isAr ? "غير مصرح بالوصول" : "Access Restricted"}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {isAr
              ? "هذه الصفحة متاحة فقط لقيادة الوزارة والدعم الفنى والحسابات الإدارية المصرح لها."
              : "This page is only available to Ministry Leadership and Technical Support accounts."}
          </p>
          <div className="p-4 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-2 text-start">
            <p className="font-semibold text-foreground">{isAr ? "كيفية الوصول:" : "How to access:"}</p>
            <p>{isAr
              ? "1. انتقل إلى صفحة تسجيل الدخول وافتح قسم «الحسابات التجريبية للاختبار»"
              : "1. Go to the login page and expand the 'Demo Test Accounts' section"}</p>
            <p>{isAr
              ? "2. سجل دخول بحساب «قيادة الوزارة» أو «الدعم الفنى»"
              : "2. Sign in with the 'Ministry Leadership' or 'Technical Support' demo account"}</p>
            <p>{isAr
              ? "3. ثم انتقل إلى /dashboard/demo-accounts"
              : "3. Then navigate to /dashboard/demo-accounts"}</p>
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

  const handleSeedAccounts = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-demo-accounts");
      if (error) throw error;
      toast.success(isAr ? "تم إنشاء/تحديث الحسابات التجريبية" : "Demo accounts created/updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Error");
    }
    setSeeding(false);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TestTube className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {isAr ? "حسابات الاختبار التجريبية" : "Demo / Test Accounts"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isAr ? "حسابات تجريبية حقيقية قابلة لتسجيل الدخول — لاختبار جميع أدوار المنصة" : "Real authenticated demo accounts for end-to-end testing across all platform roles"}
            </p>
          </div>
        </div>
      </div>

      {/* Seed button */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">{isAr ? "إنشاء / تحديث الحسابات التجريبية" : "Create / Update Demo Accounts"}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isAr ? "يجب إنشاء الحسابات أولاً قبل تسجيل الدخول بها" : "Accounts must be seeded first before they can be used to log in"}
            </p>
          </div>
          <button onClick={handleSeedAccounts} disabled={seeding}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-navy-light transition-colors disabled:opacity-50">
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
            {seeding ? (isAr ? "جارى..." : "Seeding...") : (isAr ? "إنشاء الحسابات" : "Seed Accounts")}
          </button>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid gap-4">
        {DEMO_ACCOUNTS.map(acc => {
          const Icon = acc.icon;
          return (
            <div key={acc.role} className="bg-surface-elevated rounded-lg border border-border p-5 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold tracking-wide">DEMO</span>
                    <span className="text-sm font-bold text-foreground">{isAr ? acc.ar : acc.en}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <span><span className="font-medium">{isAr ? "البريد:" : "Email:"}</span> <code className="font-mono bg-muted px-1 py-0.5 rounded">{acc.email}</code></span>
                    <span><span className="font-medium">{isAr ? "كلمة المرور:" : "Password:"}</span> <code className="font-mono bg-muted px-1 py-0.5 rounded">{acc.password}</code></span>
                    <span><span className="font-medium">{isAr ? "النطاق:" : "Scope:"}</span> {isAr ? acc.scope_ar : acc.scope_en}</span>
                    <span><span className="font-medium">{isAr ? "الوجهة:" : "Dashboard:"}</span> {acc.dashboard}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-green-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isAr ? "حساب حقيقى" : "Real Auth"}
                </span>
                <button
                  onClick={() => handleDemoLogin(acc)}
                  disabled={loggingIn === acc.role}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-navy-light transition-colors disabled:opacity-50"
                >
                  {loggingIn === acc.role ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                  {isAr ? "تسجيل دخول" : "Login"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
        <Shield className="w-4 h-4 inline-block me-2" />
        {isAr
          ? "هذه حسابات تجريبية للاختبار فقط. يجب إنشاء الحسابات أولاً باستخدام زر «إنشاء الحسابات» أعلاه. كلمة المرور الافتراضية لجميع الحسابات: Demo@2026!"
          : "These are demo accounts for testing only. Accounts must be created first using the 'Seed Accounts' button above. Default password for all accounts: Demo@2026!"}
      </div>

      {/* How to use */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="text-sm font-bold text-foreground mb-3">{isAr ? "كيفية الاستخدام" : "How to Use"}</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>{isAr ? "اضغط على زر «إنشاء الحسابات» لإنشاء جميع الحسابات التجريبية" : "Click 'Seed Accounts' to create all demo accounts"}</li>
          <li>{isAr ? "اضغط «تسجيل دخول» بجانب أى دور للدخول مباشرة" : "Click 'Login' next to any role to sign in directly"}</li>
          <li>{isAr ? "أو استخدم البريد وكلمة المرور من صفحة تسجيل الدخول العادية" : "Or use the email and password from the regular login page"}</li>
          <li>{isAr ? "كل حساب يفتح لوحة التحكم الخاصة بدوره تلقائياً" : "Each account opens its role-specific dashboard automatically"}</li>
        </ol>
      </div>
    </div>
  );
}
