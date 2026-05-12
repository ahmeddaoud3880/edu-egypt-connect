import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { useRegistrationRequests, usePerformApprovalAction } from "@/hooks/useGovernanceData";
import { toast } from "sonner";
import { Ban, RefreshCw, XCircle, Clock, Shield } from "lucide-react";
import { ApprovalHistoryPanel } from "./ApprovalHistoryPanel";
import { useState } from "react";

const ROLE_LABELS: Record<string, { en: string; ar: string }> = {
  ministry: { en: "Ministry Leadership", ar: "قيادة الوزارة" },
  directorate: { en: "Directorate Leadership", ar: "قيادة المديرية" },
  administration: { en: "Administration Leadership", ar: "قيادة الإدارة" },
  school: { en: "School Leadership", ar: "قيادة المدرسة" },
  teacher: { en: "Teacher", ar: "معلم" },
  student: { en: "Student", ar: "طالب" },
  parent: { en: "Parent", ar: "ولى أمر" },
  support: { en: "Technical Support", ar: "دعم فنى" },
};

export function SuspendedAccounts() {
  const { isAr } = useTranslation();
  const { user } = useAuth();
  const performAction = usePerformApprovalAction();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: registrations, isLoading } = useRegistrationRequests("suspended");
  const suspended = registrations?.filter(r => r.user_id !== user?.id) || [];

  const handleAction = async (id: string, action: string, newStatus: string) => {
    try {
      await performAction.mutateAsync({ requestType: "registration", requestId: id, actionType: action, newStatus, tableName: "registration_requests" });
      toast.success(isAr ? "تم تنفيذ الإجراء" : "Action performed");
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-2">
          <Ban className="w-5 h-5 text-gray-600" />
          <h1 className="text-xl font-bold text-foreground">{isAr ? "الحسابات المعلّقة" : "Suspended Accounts"}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {isAr ? "إدارة الحسابات والطلبات المعلّقة — إعادة التفعيل أو الرفض النهائى" : "Manage suspended accounts and requests — reactivate or finalize rejection"}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">{suspended.length} {isAr ? "معلّق" : "suspended"}</span>
        </div>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الاسم القانونى" : "Legal Name"}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الرقم القومى" : "National ID"}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الدور" : "Role"}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "البريد" : "Email"}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "سبب التعليق" : "Suspension Reason"}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "تاريخ التعليق" : "Suspended Date"}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{isAr ? "جارى التحميل..." : "Loading..."}</td></tr>
              ) : suspended.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  {isAr ? "لا توجد حسابات معلّقة حالياً" : "No suspended accounts at this time"}
                </td></tr>
              ) : suspended.map(req => (
                <tr key={req.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium text-foreground text-xs">{isAr ? req.full_name_ar || req.full_name : req.full_name}</div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">{req.national_id || "—"}</td>
                  <td className="p-3 text-xs">{isAr ? ROLE_LABELS[req.requested_role]?.ar : ROLE_LABELS[req.requested_role]?.en}</td>
                  <td className="p-3 text-xs text-muted-foreground">{req.email}</td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[180px] truncate">{req.rejection_reason || req.notes || "—"}</td>
                  <td className="p-3">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />{new Date(req.updated_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAction(req.id, "reactivate", "approved")}
                        className="px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium flex items-center gap-1"
                        title={isAr ? "إعادة التفعيل" : "Reactivate"}
                      >
                        <RefreshCw className="w-3 h-3" />
                        {isAr ? "إعادة تفعيل" : "Reactivate"}
                      </button>
                      <button
                        onClick={() => handleAction(req.id, "reject", "rejected")}
                        className="px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium flex items-center gap-1"
                        title={isAr ? "رفض نهائى" : "Reject"}
                      >
                        <XCircle className="w-3 h-3" />
                        {isAr ? "رفض نهائى" : "Reject"}
                      </button>
                      <button
                        onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                        className="p-1.5 rounded bg-muted text-muted-foreground hover:bg-border"
                        title={isAr ? "السجل" : "History"}
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {expandedId === req.id && (
                      <div className="mt-2"><ApprovalHistoryPanel requestId={req.id} /></div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
