import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { ApprovalQueue } from "@/components/governance/ApprovalQueue";
import DemoAccounts from "@/pages/dashboard/DemoAccounts";
import { RegistrationRequestForm } from "@/components/governance/RegistrationRequestForm";
import { RoleChangeRequestForm } from "@/components/governance/RoleChangeRequestForm";
import { TransferRequestForm } from "@/components/governance/TransferRequestForm";
import { ParentChildLinkForm } from "@/components/governance/ParentChildLinkForm";
import { EscalationQueue } from "@/components/governance/EscalationQueue";
import { SuspendedAccounts } from "@/components/governance/SuspendedAccounts";
import {
  ClipboardList, FileText, UserCog, ArrowRightLeft, Link2, Shield, ArrowUpRight, Ban, TestTube
} from "lucide-react";

type GovernanceTab = "queue" | "register" | "role_change" | "transfer" | "parent_link" | "escalations" | "suspended" | "demo";

export default function GovernanceManagement() {
  const { isAr } = useTranslation();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<GovernanceTab>("queue");

  const isApprover = ["ministry", "directorate", "administration", "school", "support", "super_admin"].includes(role || "");
  const canDemo = ["ministry", "support", "super_admin"].includes(role || "");

  const tabs: { id: GovernanceTab; en: string; ar: string; icon: any; show: boolean }[] = [
    { id: "queue", en: "Approval Queue", ar: "قائمة الموافقات", icon: ClipboardList, show: isApprover },
    { id: "escalations", en: "Escalation Queue", ar: "قائمة التصعيدات", icon: ArrowUpRight, show: isApprover },
    { id: "suspended", en: "Suspended Accounts", ar: "الحسابات المعلّقة", icon: Ban, show: isApprover },
    { id: "register", en: "Registration Request", ar: "طلب تسجيل", icon: FileText, show: true },
    { id: "role_change", en: "Role Change", ar: "تغيير الدور", icon: UserCog, show: !!role },
    { id: "transfer", en: "Transfer Request", ar: "طلب نقل", icon: ArrowRightLeft, show: !!role },
    { id: "parent_link", en: "Parent-Child Link", ar: "ربط ولى أمر", icon: Link2, show: role === "parent" || isApprover },
    { id: "demo", en: "Demo Accounts", ar: "حسابات تجريبية", icon: TestTube, show: canDemo },
  ];

  const visibleTabs = tabs.filter(t => t.show);

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">
            {isAr ? "إدارة الحوكمة والموافقات" : "Governance & Approvals Management"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {isAr
            ? "إدارة طلبات التسجيل وتغيير الأدوار والنقل وربط أولياء الأمور والتصعيدات والحسابات المعلّقة — وفق التسلسل الإدارى الصارم"
            : "Manage registration, role changes, transfers, parent-child links, escalations, and suspended accounts — strict hierarchical governance"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-surface-elevated text-muted-foreground hover:bg-muted border border-border"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {isAr ? tab.ar : tab.en}
          </button>
        ))}
      </div>

      {activeTab === "queue" && isApprover && <ApprovalQueue />}
      {activeTab === "escalations" && isApprover && <EscalationQueue />}
      {activeTab === "suspended" && isApprover && <SuspendedAccounts />}
      {activeTab === "register" && <RegistrationRequestForm />}
      {activeTab === "role_change" && <RoleChangeRequestForm />}
      {activeTab === "transfer" && <TransferRequestForm />}
      {activeTab === "parent_link" && <ParentChildLinkForm />}
      {activeTab === "demo" && canDemo && <DemoAccounts />}
    </div>
  );
}
