import { Link, Outlet, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, School, BookOpen, BarChart3, MessageSquare,
  Settings, Bell, Bot, FileText, Map, AlertTriangle,
  GraduationCap, Building2, UserCog, Headphones, ClipboardList,
  Menu, X, Globe, Shield, Database, TestTube
} from "lucide-react";
import { useState, useRef } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { useMyNotifications } from "@/hooks/useNotifications";
import { NotificationDropdown } from "./NotificationDropdown";
import { ProfileDropdown, ProfileDropdownTrigger } from "./ProfileDropdown";
import { ProfileChangeRequestForm } from "./ProfileChangeRequestForm";

interface NavItem {
  labelKey: string;
  icon: React.ElementType;
  path: string;
  label?: { en: string; ar: string };
}

const roleConfig: Record<string, { labelKey: string; navItems: NavItem[] }> = {
  ministry: {
    labelKey: "role.ministry",
    navItems: [
      { labelKey: "sidebar.nationalDashboard", label: { en: "Overview", ar: "نظرة عامة" }, icon: LayoutDashboard, path: "/dashboard" },
      { labelKey: "sidebar.governance", label: { en: "Governance", ar: "الحوكمة" }, icon: Shield, path: "/dashboard/governance" },
      { labelKey: "sidebar.demoControl", label: { en: "Demo Control", ar: "التحكم التجريبي" }, icon: Database, path: "/dashboard/demo-control" },
      { labelKey: "sidebar.demoAccounts", label: { en: "Demo Accounts", ar: "الحسابات التجريبية" }, icon: TestTube, path: "/dashboard/demo-accounts" },
      { labelKey: "sidebar.settings", label: { en: "Settings", ar: "الإعدادات" }, icon: Settings, path: "/dashboard/settings" },
    ],
  },
  directorate: {
    labelKey: "role.directorate",
    navItems: [
      { labelKey: "sidebar.nationalDashboard", label: { en: "Overview", ar: "نظرة عامة" }, icon: LayoutDashboard, path: "/dashboard" },
      { labelKey: "sidebar.settings", label: { en: "Settings", ar: "الإعدادات" }, icon: Settings, path: "/dashboard/settings" },
    ],
  },
  administration: {
    labelKey: "role.administration",
    navItems: [
      { labelKey: "sidebar.nationalDashboard", label: { en: "Overview", ar: "نظرة عامة" }, icon: LayoutDashboard, path: "/dashboard" },
      { labelKey: "sidebar.settings", label: { en: "Settings", ar: "الإعدادات" }, icon: Settings, path: "/dashboard/settings" },
    ],
  },
  school: {
    labelKey: "role.school",
    navItems: [
      { labelKey: "", label: { en: "Overview", ar: "نظرة عامة" }, icon: LayoutDashboard, path: "/dashboard?tab=overview" },
      { labelKey: "", label: { en: "Daily Operations", ar: "العمليات اليومية" }, icon: ClipboardList, path: "/dashboard?tab=daily" },
      { labelKey: "", label: { en: "Academics", ar: "الأكاديمية" }, icon: BookOpen, path: "/dashboard?tab=academics" },
      { labelKey: "", label: { en: "Teacher Monitoring", ar: "متابعة المعلمين" }, icon: Users, path: "/dashboard?tab=teachers" },
      { labelKey: "", label: { en: "Interventions", ar: "التدخلات" }, icon: AlertTriangle, path: "/dashboard?tab=interventions" },
      { labelKey: "", label: { en: "Parent Comm.", ar: "تواصل أولياء الأمور" }, icon: MessageSquare, path: "/dashboard?tab=parents" },
      { labelKey: "", label: { en: "Operations", ar: "العمليات" }, icon: Building2, path: "/dashboard?tab=operations" },
      { labelKey: "", label: { en: "Subject Selections", ar: "اختيار المواد" }, icon: FileText, path: "/dashboard?tab=subject-selections" },
      { labelKey: "", label: { en: "Profile Changes", ar: "تعديل البيانات" }, icon: UserCog, path: "/dashboard?tab=profile-changes" },
      { labelKey: "", label: { en: "AI Assistant", ar: "المساعد الذكى" }, icon: Bot, path: "/dashboard?tab=ai" },
      { labelKey: "sidebar.settings", label: { en: "Settings", ar: "الإعدادات" }, icon: Settings, path: "/dashboard/settings" },
    ],
  },
  teacher: {
    labelKey: "role.teacher",
    navItems: [
      { labelKey: "", label: { en: "Overview", ar: "نظرة عامة" }, icon: LayoutDashboard, path: "/dashboard?tab=overview" },
      { labelKey: "", label: { en: "My Schedule", ar: "جدولى" }, icon: ClipboardList, path: "/dashboard?tab=schedule" },
      { labelKey: "", label: { en: "My Classes", ar: "فصولى" }, icon: BookOpen, path: "/dashboard?tab=classes" },
      { labelKey: "", label: { en: "Lesson Planning", ar: "تخطيط الدروس" }, icon: FileText, path: "/dashboard?tab=lessons" },
      { labelKey: "", label: { en: "Attendance", ar: "الحضور" }, icon: ClipboardList, path: "/dashboard?tab=attendance" },
      { labelKey: "", label: { en: "Homework", ar: "الواجبات" }, icon: ClipboardList, path: "/dashboard?tab=homework" },
      { labelKey: "", label: { en: "Quizzes", ar: "الاختبارات" }, icon: FileText, path: "/dashboard?tab=quizzes" },
      { labelKey: "", label: { en: "AI Quiz from Book", ar: "أسئلة بـ AI من الكتاب" }, icon: Bot, path: "/dashboard?tab=ai_quiz" },
      { labelKey: "", label: { en: "Gradebook", ar: "سجل الدرجات" }, icon: BarChart3, path: "/dashboard?tab=gradebook" },
      { labelKey: "", label: { en: "Student Tracking", ar: "متابعة الطلاب" }, icon: GraduationCap, path: "/dashboard?tab=tracking" },
      { labelKey: "", label: { en: "Parents", ar: "أولياء الأمور" }, icon: Users, path: "/dashboard?tab=parents" },
      { labelKey: "", label: { en: "AI Assistant", ar: "المساعد الذكى" }, icon: Bot, path: "/dashboard?tab=ai" },
      { labelKey: "sidebar.settings", label: { en: "Settings", ar: "الإعدادات" }, icon: Settings, path: "/dashboard/settings" },
    ],
  },
  student: {
    labelKey: "role.student",
    navItems: [
      { labelKey: "", label: { en: "Overview", ar: "نظرة عامة" }, icon: LayoutDashboard, path: "/dashboard?tab=overview" },
      { labelKey: "", label: { en: "My Subjects", ar: "موادى" }, icon: BookOpen, path: "/dashboard?tab=subjects" },
      { labelKey: "", label: { en: "Optional Subjects", ar: "المواد الاختيارية" }, icon: BookOpen, path: "/dashboard?tab=subject-selection" },
      { labelKey: "", label: { en: "Assignments", ar: "الواجبات" }, icon: ClipboardList, path: "/dashboard?tab=assignments" },
      { labelKey: "", label: { en: "Grades", ar: "الدرجات" }, icon: BarChart3, path: "/dashboard?tab=grades" },
      { labelKey: "", label: { en: "Attendance", ar: "الحضور" }, icon: ClipboardList, path: "/dashboard?tab=attendance" },
      { labelKey: "", label: { en: "Resources", ar: "الموارد" }, icon: FileText, path: "/dashboard?tab=resources" },
      { labelKey: "", label: { en: "Revision Plan", ar: "خطة المراجعة" }, icon: ClipboardList, path: "/dashboard?tab=revision" },
      { labelKey: "", label: { en: "Assessments", ar: "التقييمات" }, icon: TestTube, path: "/dashboard?tab=assessments" },
      { labelKey: "", label: { en: "Progress", ar: "التقدم" }, icon: BarChart3, path: "/dashboard?tab=progress" },
      { labelKey: "", label: { en: "AI Assistant", ar: "المساعد الذكى" }, icon: Bot, path: "/dashboard?tab=ai" },
      { labelKey: "sidebar.settings", label: { en: "Settings", ar: "الإعدادات" }, icon: Settings, path: "/dashboard/settings" },
    ],
  },
  parent: {
    labelKey: "role.parent",
    navItems: [
      { labelKey: "", label: { en: "Overview", ar: "نظرة عامة" }, icon: LayoutDashboard, path: "/dashboard?tab=overview" },
      { labelKey: "", label: { en: "My Children", ar: "أبنائى" }, icon: GraduationCap, path: "/dashboard?tab=children" },
      { labelKey: "", label: { en: "Performance", ar: "الأداء" }, icon: BarChart3, path: "/dashboard?tab=performance" },
      { labelKey: "", label: { en: "Attendance", ar: "الحضور" }, icon: ClipboardList, path: "/dashboard?tab=attendance" },
      { labelKey: "", label: { en: "Assignments", ar: "الواجبات" }, icon: ClipboardList, path: "/dashboard?tab=assignments" },
      { labelKey: "", label: { en: "Grades", ar: "الدرجات" }, icon: BarChart3, path: "/dashboard?tab=grades" },
      { labelKey: "", label: { en: "Communication", ar: "التواصل" }, icon: MessageSquare, path: "/dashboard?tab=communication" },
      { labelKey: "", label: { en: "Meetings", ar: "الاجتماعات" }, icon: Users, path: "/dashboard?tab=meetings" },
      { labelKey: "", label: { en: "School Notices", ar: "إشعارات المدرسة" }, icon: Bell, path: "/dashboard?tab=notices" },
      { labelKey: "", label: { en: "Support", ar: "الدعم" }, icon: Headphones, path: "/dashboard?tab=support" },
      { labelKey: "", label: { en: "AI Assistant", ar: "المساعد الذكى" }, icon: Bot, path: "/dashboard?tab=ai" },
      { labelKey: "sidebar.settings", label: { en: "Settings", ar: "الإعدادات" }, icon: Settings, path: "/dashboard/settings" },
    ],
  },
  support: {
    labelKey: "role.support",
    navItems: [
      { labelKey: "", label: { en: "Overview", ar: "نظرة عامة" }, icon: LayoutDashboard, path: "/dashboard?tab=overview" },
      { labelKey: "", label: { en: "Tickets", ar: "التذاكر" }, icon: Headphones, path: "/dashboard?tab=tickets" },
      { labelKey: "", label: { en: "Categories", ar: "الفئات" }, icon: FileText, path: "/dashboard?tab=categories" },
      { labelKey: "", label: { en: "Escalation", ar: "التصعيد" }, icon: AlertTriangle, path: "/dashboard?tab=escalation" },
      { labelKey: "", label: { en: "Platform Health", ar: "صحة النظام" }, icon: BarChart3, path: "/dashboard?tab=health" },
      { labelKey: "", label: { en: "Support Requests", ar: "طلبات الدعم" }, icon: Users, path: "/dashboard?tab=requests" },
      { labelKey: "", label: { en: "User Logs", ar: "سجل المستخدمين" }, icon: Database, path: "/dashboard?tab=user-logs" },
      { labelKey: "", label: { en: "Profile Changes", ar: "طلبات تعديل البيانات" }, icon: UserCog, path: "/dashboard?tab=profile-changes" },
      { labelKey: "", label: { en: "Bilingual", ar: "الترجمة" }, icon: Globe, path: "/dashboard?tab=bilingual" },
      { labelKey: "", label: { en: "AI Assistant", ar: "المساعد الذكى" }, icon: Bot, path: "/dashboard?tab=ai" },
      { labelKey: "", label: { en: "AI Settings", ar: "إعدادات الذكاء" }, icon: Settings, path: "/dashboard?tab=ai-settings" },
      { labelKey: "", label: { en: "RAG Library", ar: "مكتبة RAG" }, icon: BookOpen, path: "/dashboard?tab=rag-library" },
      { labelKey: "", label: { en: "Approvals", ar: "الموافقات والحوكمة" }, icon: Shield, path: "/dashboard?tab=approvals" },
      { labelKey: "sidebar.demoControl", label: { en: "Demo Control", ar: "التحكم التجريبي" }, icon: TestTube, path: "/dashboard/demo-control" },
      { labelKey: "sidebar.settings", label: { en: "Settings", ar: "الإعدادات" }, icon: Settings, path: "/dashboard/settings" },
    ],
  },
};


export function DashboardLayout() {
  const [searchParams] = useSearchParams();
  const { user, role: authRole, profile } = useAuth();
  const role = authRole || searchParams.get("role") || (user ? "pending" : "ministry");

  const pendingConfig = {
    labelKey: "status.underReview",
    navItems: [
      { labelKey: "sidebar.nationalDashboard", icon: LayoutDashboard, path: "/dashboard" },
      { labelKey: "sidebar.settings", icon: Settings, path: "/dashboard/settings" },
    ],
  };

  const config = role === "pending" ? pendingConfig : (roleConfig[role] || roleConfig.ministry);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, setLang, isAr } = useTranslation();
  const { unreadCount } = useMyNotifications();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const roleLabel = t(config.labelKey as any);
  const displayName = isAr
    ? (profile?.full_name_ar || profile?.full_name || user?.user_metadata?.full_name || "مستخدم النظام")
    : (profile?.full_name || user?.user_metadata?.full_name || "System User");

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen flex bg-surface" dir={isAr ? "rtl" : "ltr"}>

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar — fixed on mobile (slide-in), sticky in document flow on lg+ */}
      <aside
        className={`
          fixed inset-y-0 z-40 flex flex-col bg-primary text-primary-foreground
          transition-transform duration-300 shrink-0
          w-64
          lg:sticky lg:top-0 lg:h-screen lg:translate-x-0
          start-0
          ${sidebarOpen ? "translate-x-0" : (isAr ? "translate-x-full" : "-translate-x-full")}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-navy-light shrink-0">
          <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center shrink-0">
            <span className="text-primary font-bold text-sm">م</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">{isAr ? "المنصة الذكية" : "Smart Education"}</div>
            <div className="text-[10px] text-primary-foreground/50 truncate">{roleLabel}</div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={closeSidebar}
            className="ms-auto p-1 rounded hover:bg-white/10 transition-colors lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-0.5 px-2">
            {config.navItems.map((item) => {
              const currentPath = location.pathname;
              const currentTab = new URLSearchParams(location.search).get("tab") || "overview";
              
              let isActive = false;
              if (item.path.includes("?tab=")) {
                const itemTab = new URLSearchParams(item.path.split("?")[1]).get("tab");
                isActive = currentPath === "/dashboard" && currentTab === itemTab;
              } else if (item.path === "/dashboard") {
                isActive = currentPath === "/dashboard" && currentTab === "overview";
              } else {
                isActive = currentPath === item.path;
              }

              return (
                <li key={item.path}>
                  <Link
                    to={item.path.includes("?") ? `${item.path}&role=${role}` : `${item.path}?role=${role}`}
                    onClick={closeSidebar}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-gold font-medium"
                        : "text-primary-foreground/70 hover:bg-sidebar-accent hover:text-primary-foreground"
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {item.label ? (isAr ? item.label.ar : item.label.en) : t(item.labelKey as any)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar footer - profile mini */}
        <div className="p-3 border-t border-navy-light shrink-0">
          <div className="flex items-center gap-2 px-2 py-2 rounded text-primary-foreground/70">
            <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
              <UserCog className="w-3 h-3" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium truncate">{displayName}</p>
              <p className="text-[10px] text-primary-foreground/40 truncate">{roleLabel}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content — fills remaining space; sidebar is in-flow on lg+ so no explicit margin needed */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-surface-elevated border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger — only on mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded hover:bg-muted transition-colors lg:hidden"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{roleLabel}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <button
              onClick={() => setLang(isAr ? "en" : "ar")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              {isAr ? "EN" : "ع"}
            </button>

            {/* Notification bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setNotifOpen((o) => !o); setProfileOpen(false); }}
                className="relative p-2 rounded hover:bg-muted transition-colors"
              >
                <Bell className="w-4 h-4 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              <NotificationDropdown
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
              />
            </div>

            {/* Profile dropdown */}
            <div ref={profileRef} className="relative">
              <ProfileDropdownTrigger
                onClick={() => { setProfileOpen((o) => !o); setNotifOpen(false); }}
                displayName={displayName}
                roleLabel={roleLabel}
              />
              <ProfileDropdown
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                onRequestEdit={() => setShowEditForm(true)}
              />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {showEditForm && (
        <ProfileChangeRequestForm onClose={() => setShowEditForm(false)} />
      )}
    </div>
  );
}
