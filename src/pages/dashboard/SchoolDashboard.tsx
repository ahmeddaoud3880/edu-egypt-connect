import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { SchoolOverview } from "@/components/school/SchoolOverview";
import { DailyOperations } from "@/components/school/DailyOperations";
import { AcademicMonitoring } from "@/components/school/AcademicMonitoring";
import { TeacherMonitoring } from "@/components/school/TeacherMonitoring";
import { InterventionCenter } from "@/components/school/InterventionCenter";
import { ParentCommunication } from "@/components/school/ParentCommunication";
import { OperationalIssues } from "@/components/school/OperationalIssues";
import { SchoolAIAssistant } from "@/components/school/SchoolAIAssistant";
import { StudentSubjectSelections } from "@/components/school/StudentSubjectSelections";
import { ProfileChangeRequestsManager } from "@/components/support/ProfileChangeRequestsManager";
import { CheckCircle2, School } from "lucide-react";

const tabs = [
  { id: "overview", key: "school.overview" },
  { id: "daily", key: "school.dailyOps" },
  { id: "academics", key: "school.academics" },
  { id: "teachers", key: "school.teacherMonitor" },
  { id: "interventions", key: "school.interventions" },
  { id: "parents", key: "school.parentComm" },
  { id: "operations", key: "school.operations" },
  { id: "subject-selections", key: "school.subjectSelections" },
  { id: "profile-changes", key: "school.profileChanges" },
  { id: "ai", key: "school.aiAssistant" },
];

export default function SchoolDashboard() {
  const { t, lang } = useTranslation();
  const { profile, user } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const validTabIds = new Set(tabs.map(t => t.id));
  const [activeTab, setActiveTab] = useState<string>(() =>
    tabParam && validTabIds.has(tabParam) ? tabParam : "overview"
  );

  useEffect(() => {
    if (tabParam && validTabIds.has(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const schoolName = lang === "ar" 
    ? (profile?.full_name_ar || profile?.full_name || user?.user_metadata?.full_name || "مدير المدرسة")
    : (profile?.full_name || user?.user_metadata?.full_name || "School Manager");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-primary flex items-center justify-center">
              <School className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t("school.title")}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{t("school.subtitle")}</p>
              <p className="text-xs text-gold font-medium mt-0.5">{schoolName}</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <div>{t("dash.lastUpdated")}: {new Date().toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
            <div className="mt-1 flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> {t("dash.allSystems")}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <DashboardFilters showGrade showClass showSubject showRiskType showDateRange />

      {/* Tab Navigation - hidden, controlled via sidebar */}

      {/* Tab Content */}
      {activeTab === "overview" && <SchoolOverview />}
      {activeTab === "daily" && <DailyOperations />}
      {activeTab === "academics" && <AcademicMonitoring />}
      {activeTab === "teachers" && <TeacherMonitoring />}
      {activeTab === "interventions" && <InterventionCenter />}
      {activeTab === "parents" && <ParentCommunication />}
      {activeTab === "operations" && <OperationalIssues />}
      {activeTab === "subject-selections" && <StudentSubjectSelections />}
      {activeTab === "profile-changes" && <ProfileChangeRequestsManager />}
      {activeTab === "ai" && <SchoolAIAssistant />}
    </div>
  );
}
