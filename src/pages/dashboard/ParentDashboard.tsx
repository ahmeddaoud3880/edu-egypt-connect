import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParentOverview } from "@/components/parent/ParentOverview";
import { MultiChildSupport } from "@/components/parent/MultiChildSupport";
import { ChildPerformance } from "@/components/parent/ChildPerformance";
import { AttendanceAlerts } from "@/components/parent/AttendanceAlerts";
import { AssignmentsFollowUp } from "@/components/parent/AssignmentsFollowUp";
import { GradeTracking } from "@/components/parent/GradeTracking";
import { TeacherCommunication } from "@/components/parent/TeacherCommunication";
import { MeetingScheduling } from "@/components/parent/MeetingScheduling";
import { SchoolNotices } from "@/components/parent/SchoolNotices";
import { ChildSupport } from "@/components/parent/ChildSupport";
import { ParentAIAssistant } from "@/components/parent/ParentAIAssistant";
import { Users } from "lucide-react";

export default function ParentDashboard() {
  const { lang } = useTranslation();
  const { profile, user } = useAuth();
  const [searchParams] = useSearchParams();
  const isAr = lang === "ar";

  const displayName = isAr
    ? (profile?.full_name_ar || profile?.full_name || user?.user_metadata?.full_name || "ولي الأمر")
    : (profile?.full_name || user?.user_metadata?.full_name || "Parent");

  const tabParam = searchParams.get("tab");

  const tabs = [
    { value: "overview", label: isAr ? "نظرة عامة" : "Overview" },
    { value: "children", label: isAr ? "أبنائى" : "My Children" },
    { value: "performance", label: isAr ? "الأداء" : "Performance" },
    { value: "attendance", label: isAr ? "الحضور" : "Attendance" },
    { value: "assignments", label: isAr ? "الواجبات" : "Assignments" },
    { value: "grades", label: isAr ? "الدرجات" : "Grades" },
    { value: "communication", label: isAr ? "التواصل" : "Communication" },
    { value: "meetings", label: isAr ? "الاجتماعات" : "Meetings" },
    { value: "notices", label: isAr ? "إشعارات المدرسة" : "School Notices" },
    { value: "support", label: isAr ? "الدعم" : "Support" },
    { value: "ai", label: isAr ? "المساعد الذكى" : "AI Assistant" },
  ];

  const validTabs = new Set(tabs.map((t) => t.value));
  const defaultTab = (tabParam && validTabs.has(tabParam)) ? tabParam : "overview";

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded bg-primary flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{isAr ? "بوابة ولى الأمر" : "Parent Follow-up Portal"}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{isAr ? "متابعة أداء أبنائك الأكاديمى والحضور والتواصل مع المدرسة" : "Follow your children's academic performance, attendance, and school communication"}</p>
            <p className="text-xs text-gold font-medium mt-0.5">{displayName}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} key={defaultTab} className="w-full">
        {/* TabsList hidden - navigation via sidebar */}

        <TabsContent value="overview"><ParentOverview /></TabsContent>
        <TabsContent value="children"><MultiChildSupport /></TabsContent>
        <TabsContent value="performance"><ChildPerformance /></TabsContent>
        <TabsContent value="attendance"><AttendanceAlerts /></TabsContent>
        <TabsContent value="assignments"><AssignmentsFollowUp /></TabsContent>
        <TabsContent value="grades"><GradeTracking /></TabsContent>
        <TabsContent value="communication"><TeacherCommunication /></TabsContent>
        <TabsContent value="meetings"><MeetingScheduling /></TabsContent>
        <TabsContent value="notices"><SchoolNotices /></TabsContent>
        <TabsContent value="support"><ChildSupport /></TabsContent>
        <TabsContent value="ai"><ParentAIAssistant /></TabsContent>
      </Tabs>
    </div>
  );
}
