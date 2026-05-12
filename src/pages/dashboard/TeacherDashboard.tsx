import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { TeacherOverview } from "@/components/teacher/TeacherOverview";
import { MySchedule } from "@/components/teacher/MySchedule";
import { MyClasses } from "@/components/teacher/MyClasses";
import { LessonPlanning } from "@/components/teacher/LessonPlanning";
import { AttendanceMarking } from "@/components/teacher/AttendanceMarking";
import { HomeworkManagement } from "@/components/teacher/HomeworkManagement";
import { QuizBuilder } from "@/components/teacher/QuizBuilder";
import { Gradebook } from "@/components/teacher/Gradebook";
import { StudentTracking } from "@/components/teacher/StudentTracking";
import { TeacherParentComm } from "@/components/teacher/TeacherParentComm";
import { TeacherAIAssistant } from "@/components/teacher/TeacherAIAssistant";
import { QuizGeneratorAI } from "@/components/teacher/QuizGeneratorAI";
import { CheckCircle2, GraduationCap } from "lucide-react";

const tabs = [
  { id: "overview", label: { en: "Overview", ar: "نظرة عامة" } },
  { id: "schedule", label: { en: "My Schedule", ar: "جدولى" } },
  { id: "classes", label: { en: "My Classes", ar: "فصولى" } },
  { id: "lessons", label: { en: "Lesson Planning", ar: "تخطيط الدروس" } },
  { id: "attendance", label: { en: "Attendance", ar: "الحضور" } },
  { id: "homework", label: { en: "Homework", ar: "الواجبات" } },
  { id: "quizzes", label: { en: "Quizzes", ar: "الاختبارات" } },
  { id: "ai_quiz", label: { en: "AI Quiz from Book", ar: "أسئلة بـ AI من الكتاب" } },
  { id: "gradebook", label: { en: "Gradebook", ar: "سجل الدرجات" } },
  { id: "tracking", label: { en: "Student Tracking", ar: "متابعة الطلاب" } },
  { id: "parents", label: { en: "Parents", ar: "أولياء الأمور" } },
  { id: "ai", label: { en: "AI Assistant", ar: "المساعد الذكى" } },
];

export default function TeacherDashboard() {
  const { t, lang } = useTranslation();
  const { profile, user } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const validTabIds = new Set(tabs.map(t => t.id));
  const [activeTab, setActiveTab] = useState(() =>
    tabParam && validTabIds.has(tabParam) ? tabParam : "overview"
  );

  useEffect(() => {
    if (tabParam && validTabIds.has(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const displayName = lang === "ar"
    ? (profile?.full_name_ar || profile?.full_name || user?.user_metadata?.full_name || "معلم")
    : (profile?.full_name || user?.user_metadata?.full_name || "Teacher");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{lang === "ar" ? "مساحة عمل المعلم" : "Teacher Workspace"}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{lang === "ar" ? "لوحة العمل اليومية للمعلم — إدارة الفصول والتدريس" : "Daily Teaching Workspace — Class & Instruction Management"}</p>
              <p className="text-xs text-gold font-medium mt-0.5">{displayName}</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <div>{t("dash.lastUpdated")}: {new Date().toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
            <div className="mt-1 flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> {t("dash.allSystems")}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <DashboardFilters showGrade showClass showSubject showDateRange />

      {/* Tab Navigation - hidden, controlled via sidebar */}

      {/* Tab Content */}
      {activeTab === "overview" && <TeacherOverview />}
      {activeTab === "schedule" && <MySchedule />}
      {activeTab === "classes" && <MyClasses />}
      {activeTab === "lessons" && <LessonPlanning />}
      {activeTab === "attendance" && <AttendanceMarking />}
      {activeTab === "homework" && <HomeworkManagement />}
      {activeTab === "quizzes" && <QuizBuilder />}
      {activeTab === "ai_quiz" && <QuizGeneratorAI />}
      {activeTab === "gradebook" && <Gradebook />}
      {activeTab === "tracking" && <StudentTracking />}
      {activeTab === "parents" && <TeacherParentComm />}
      {activeTab === "ai" && <TeacherAIAssistant />}
    </div>
  );
}
