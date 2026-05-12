import { useState, Component, useEffect } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";

class TabErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("[TabErrorBoundary]", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-lg text-center space-y-3">
          <p className="font-semibold text-destructive text-sm">حدث خطأ أثناء تحميل هذه الصفحة</p>
          <p className="text-xs text-muted-foreground font-mono break-all">{this.state.error.message}</p>
          <button
            className="text-xs text-primary underline"
            onClick={() => this.setState({ error: null })}
          >إعادة المحاولة</button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { StudentOverview } from "@/components/student/StudentOverview";
import { MySubjects } from "@/components/student/MySubjects";
import { AssignmentsTracker } from "@/components/student/AssignmentsTracker";
import { GradesView } from "@/components/student/GradesView";
import { AttendanceHistory } from "@/components/student/AttendanceHistory";
import { StudyResources } from "@/components/student/StudyResources";
import { RevisionPlan } from "@/components/student/RevisionPlan";
import { AssessmentsPractice } from "@/components/student/AssessmentsPractice";
import { LearningProgress } from "@/components/student/LearningProgress";
import { SubjectSelection } from "@/components/student/SubjectSelection";
import { StudentAIAssistant } from "@/components/student/StudentAIAssistant";
import type { RagBook } from "@/services/ragService";
import { CheckCircle2, GraduationCap } from "lucide-react";

const tabs = [
  { id: "overview", label: { en: "Overview", ar: "نظرة عامة" } },
  { id: "subjects", label: { en: "My Subjects", ar: "موادى" } },
  { id: "subject-selection", label: { en: "Optional Subjects", ar: "المواد الاختيارية" } },
  { id: "assignments", label: { en: "Assignments", ar: "الواجبات" } },
  { id: "grades", label: { en: "Grades", ar: "الدرجات" } },
  { id: "attendance", label: { en: "Attendance", ar: "الحضور" } },
  { id: "resources", label: { en: "Resources", ar: "الموارد" } },
  { id: "revision", label: { en: "Revision Plan", ar: "خطة المراجعة" } },
  { id: "assessments", label: { en: "Assessments", ar: "التقييمات" } },
  { id: "progress", label: { en: "Progress", ar: "التقدم" } },
  { id: "ai", label: { en: "AI Assistant", ar: "المساعد الذكى" } },
];

const validTabIds = new Set(tabs.map((t) => t.id));

export default function StudentDashboard() {
  const { t, lang } = useTranslation();
  const { profile, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [studentAiBookIntent, setStudentAiBookIntent] = useState<RagBook | null>(null);

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() =>
    tabParam && validTabIds.has(tabParam) ? tabParam : "overview"
  );

  // Sync tab when URL ?tab= changes (e.g., from notification click)
  useEffect(() => {
    if (tabParam && validTabIds.has(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const displayName = lang === "ar"
    ? (profile?.full_name_ar || profile?.full_name || user?.user_metadata?.full_name || "طالب")
    : (profile?.full_name || user?.user_metadata?.full_name || "Student");

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
              <h1 className="text-xl font-bold text-foreground">{lang === "ar" ? "بوابة التعلم" : "Learning Portal"}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{lang === "ar" ? "بوابة الطالب — التعلم والمتابعة الأكاديمية" : "Student Portal — Learning & Academic Tracking"}</p>
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
      <DashboardFilters showSubject showDateRange />


      {/* Tab Content */}
      <TabErrorBoundary key={activeTab}>
        {activeTab === "overview" && <StudentOverview onNavigate={setActiveTab} />}
        {activeTab === "subjects" && <MySubjects />}
        {activeTab === "subject-selection" && <SubjectSelection />}
        {activeTab === "assignments" && <AssignmentsTracker />}
        {activeTab === "grades" && <GradesView />}
        {activeTab === "attendance" && <AttendanceHistory />}
        {activeTab === "resources" && (
          <StudyResources
            onAskAboutRagBook={(b) => {
              setStudentAiBookIntent(b);
              setActiveTab("ai");
            }}
          />
        )}
        {activeTab === "revision" && <RevisionPlan />}
        {activeTab === "assessments" && <AssessmentsPractice />}
        {activeTab === "progress" && <LearningProgress />}
        {activeTab === "ai" && (
          <StudentAIAssistant
            bookIntent={studentAiBookIntent}
            onBookIntentConsumed={() => setStudentAiBookIntent(null)}
          />
        )}
      </TabErrorBoundary>
    </div>
  );
}
