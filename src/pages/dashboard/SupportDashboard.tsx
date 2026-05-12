import { useTranslation } from "@/hooks/useTranslation";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupportOverview } from "@/components/support/SupportOverview";
import { TicketManagement } from "@/components/support/TicketManagement";
import { TicketCategories } from "@/components/support/TicketCategories";
import { IssueEscalation } from "@/components/support/IssueEscalation";
import { PlatformHealth } from "@/components/support/PlatformHealth";
import { UserSupportRequests } from "@/components/support/UserSupportRequests";
import { BilingualMonitoring } from "@/components/support/BilingualMonitoring";
import { SupportAIAssistant } from "@/components/support/SupportAIAssistant";
import { AISettings } from "@/components/support/AISettings";
import { RagLibrary } from "@/components/support/RagLibrary";
import { ApprovalQueue } from "@/components/governance/ApprovalQueue";
import { UserActivityLogViewer } from "@/components/support/UserActivityLogViewer";
import { ProfileChangeRequestsManager } from "@/components/support/ProfileChangeRequestsManager";

export default function SupportDashboard() {
  const { lang } = useTranslation();
  const [searchParams] = useSearchParams();
  const isAr = lang === "ar";

  const tabParam = searchParams.get("tab");

  const tabs = [
    { value: "overview", label: isAr ? "نظرة عامة" : "Overview" },
    { value: "tickets", label: isAr ? "التذاكر" : "Tickets" },
    { value: "categories", label: isAr ? "الفئات" : "Categories" },
    { value: "escalation", label: isAr ? "التصعيد" : "Escalation" },
    { value: "health", label: isAr ? "صحة النظام" : "Platform Health" },
    { value: "requests", label: isAr ? "طلبات الدعم" : "Support Requests" },
    { value: "user-logs", label: isAr ? "سجل المستخدمين" : "User Logs" },
    { value: "profile-changes", label: isAr ? "طلبات تعديل البيانات" : "Profile Change Requests" },
    { value: "bilingual", label: isAr ? "الترجمة" : "Bilingual" },
    { value: "ai", label: isAr ? "المساعد الذكى" : "AI Assistant" },
    { value: "ai-settings", label: isAr ? "إعدادات الذكاء" : "AI Settings" },
    { value: "rag-library", label: isAr ? "مكتبة RAG" : "RAG Library" },
    { value: "approvals", label: isAr ? "الموافقات والحوكمة" : "Approvals & Governance" },
  ];

  const validTabs = new Set(tabs.map((t) => t.value));
  const defaultTab = (tabParam && validTabs.has(tabParam)) ? tabParam : "overview";

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h1 className="text-xl font-bold text-foreground">{isAr ? "مركز الدعم الفنى" : "Technical Support Center"}</h1>
        <p className="text-sm text-muted-foreground mt-1">{isAr ? "إدارة التذاكر ومراقبة صحة المنصة والدعم الفنى" : "Ticket management, platform health monitoring, and technical support"}</p>
      </div>

      <Tabs defaultValue={defaultTab} key={defaultTab} className="w-full">
        {/* TabsList hidden - navigation via sidebar */}

        <TabsContent value="overview"><SupportOverview /></TabsContent>
        <TabsContent value="tickets"><TicketManagement /></TabsContent>
        <TabsContent value="categories"><TicketCategories /></TabsContent>
        <TabsContent value="escalation"><IssueEscalation /></TabsContent>
        <TabsContent value="health"><PlatformHealth /></TabsContent>
        <TabsContent value="requests"><UserSupportRequests /></TabsContent>
        <TabsContent value="user-logs">
          <div className="mt-4">
            <UserActivityLogViewer />
          </div>
        </TabsContent>
        <TabsContent value="profile-changes">
          <div className="mt-4">
            <ProfileChangeRequestsManager />
          </div>
        </TabsContent>
        <TabsContent value="bilingual"><BilingualMonitoring /></TabsContent>
        <TabsContent value="ai"><SupportAIAssistant /></TabsContent>
        <TabsContent value="ai-settings"><AISettings /></TabsContent>
        <TabsContent value="rag-library"><RagLibrary /></TabsContent>
        <TabsContent value="approvals">
          <div className="mt-4">
            <ApprovalQueue />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
