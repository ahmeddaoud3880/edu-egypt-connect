import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import MinistryDashboard from "./dashboard/MinistryDashboard";
import DirectorateDashboard from "./dashboard/DirectorateDashboard";
import AdministrationDashboard from "./dashboard/AdministrationDashboard";
import SchoolDashboard from "./dashboard/SchoolDashboard";
import TeacherDashboard from "./dashboard/TeacherDashboard";
import StudentDashboard from "./dashboard/StudentDashboard";
import ParentDashboard from "./dashboard/ParentDashboard";
import SupportDashboard from "./dashboard/SupportDashboard";
import { useTranslation } from "@/hooks/useTranslation";
import {
  TrendingUp, Users, School, GraduationCap, AlertTriangle, CheckCircle2, Bot, ArrowUpRight, ChevronRight, Clock
} from "lucide-react";

const genericLabels: Record<string, { title: string; titleAr: string; welcome: string; welcomeAr: string }> = {
  school: { title: "School Dashboard", titleAr: "لوحة تحكم المدرسة", welcome: "Welcome to your School Management Dashboard", welcomeAr: "مرحبا بك فى لوحة إدارة المدرسة" },
  teacher: { title: "Teacher Dashboard", titleAr: "لوحة تحكم المعلم", welcome: "Welcome to your Teaching Workspace", welcomeAr: "مرحبا بك فى مساحة عمل المعلم" },
  student: { title: "Student Dashboard", titleAr: "لوحة الطالب", welcome: "Welcome to your Learning Portal", welcomeAr: "مرحبا بك فى بوابة التعلم" },
  parent: { title: "Parent Dashboard", titleAr: "لوحة ولى الأمر", welcome: "Welcome to your Child Follow-up Portal", welcomeAr: "مرحبا بك فى بوابة متابعة الأبناء" },
  support: { title: "Support Dashboard", titleAr: "لوحة الدعم الفنى", welcome: "Welcome to the Technical Support Center", welcomeAr: "مرحبا بك فى مركز الدعم الفنى" },
};

function GenericDashboard({ role }: { role: string }) {
  const { t, lang } = useTranslation();
  const isAr = lang === "ar";
  
  const config = genericLabels[role] || genericLabels.school;

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h1 className="text-xl font-bold text-foreground">{isAr ? config.titleAr : config.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{isAr ? config.welcomeAr : config.welcome}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isAr ? "المدارس" : "Schools", value: "0", icon: School },
          { label: isAr ? "المعلمون" : "Teachers", value: "0", icon: Users },
          { label: isAr ? "الطلاب" : "Students", value: "0", icon: GraduationCap },
          { label: isAr ? "التنبيهات" : "Alerts", value: "0", icon: AlertTriangle },
        ].map((card) => (
          <div key={card.label} className="bg-surface-elevated rounded-lg border border-border p-5">
            <card.icon className="w-5 h-5 text-muted-foreground mb-3" />
            <div className="text-2xl font-bold text-foreground">{card.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-gold" />
            <h2 className="font-semibold text-foreground">{t("dash.aiRecommendations")}</h2>
          </div>
          <div className="h-40 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground/40 italic text-xs">
            {isAr ? "سيقوم المساعد الذكى بتقديم التوصيات فور تفعيل البيانات." : "The AI assistant will provide recommendations once data is activated."}
          </div>
        </div>

        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">{t("dash.recentActivity")}</h2>
          <div className="h-40 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground/40 italic text-xs text-center p-4">
             <Clock className="w-6 h-6 mb-2 opacity-20" />
             <p>{isAr ? "لا يوجد نشاط مسجل بعد." : "No recent activity recorded yet."}</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gold-light rounded-lg border border-gold/20">
        <p className="text-xs text-foreground/70">
          <strong>{isAr ? "ملاحظة:" : "Note:"}</strong> {isAr ? "هذه اللوحة قيد التطوير. سيتم إضافة المحتوى التفصيلى فى المراحل القادمة." : "This dashboard is under development. Detailed content will be added in upcoming phases."}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const { role: authRole, user, profile } = useAuth();
  const role = authRole || searchParams.get("role");

  // If we have a user but no role assigned yet, they are likely pending approval
  if (user && !authRole && !searchParams.get("role")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-6">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center border border-amber-200">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
        </div>
        <div className="max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {profile?.full_name ? (profile.full_name_ar || profile.full_name) : "مرحباً"}
          </h1>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            حسابك قيد المراجعة والتفعيل
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            لقد تم تسجيل طلبك بنجاح. يتم حالياً مراجعة بياناتك من قبل السلطة المختصة (المدرسة أو الإدارة التعليمية) لتفعيل صلاحيات الوصول الخاصة بك.
          </p>
        </div>
        <div className="bg-surface-elevated border border-border rounded-lg p-4 w-full max-w-sm text-sm">
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">حالة الحساب</span>
            <span className="font-medium text-amber-600">في انتظار المراجعة</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">التاريخ</span>
            <span className="font-medium">{new Date().toLocaleDateString("ar-EG")}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground max-w-xs">
          بمجرد الموافقة، ستتمكن من الوصول إلى لوحة التحكم الخاصة بك. شكراً لاهتمامك بمنصة تعليم مصر الرقمية.
        </p>
      </div>
    );
  }

  const finalRole = role;

  if (finalRole === "ministry") return <MinistryDashboard />;
  if (finalRole === "directorate") return <DirectorateDashboard />;
  if (finalRole === "administration") return <AdministrationDashboard />;
  if (role === "school") return <SchoolDashboard />;
  if (role === "teacher") return <TeacherDashboard />;
  if (role === "student") return <StudentDashboard />;
  if (role === "parent") return <ParentDashboard />;
  if (role === "support") return <SupportDashboard />;

  return <GenericDashboard role={role} />;
}
