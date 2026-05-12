import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { useRegistrationRequests, useRoleChangeRequests, useTransferRequests, usePerformApprovalAction } from "@/hooks/useGovernanceData";
import { toast } from "sonner";
import { ArrowUpRight, CheckCircle2, XCircle, RotateCcw, Clock, AlertTriangle } from "lucide-react";
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

function timeSince(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export function EscalationQueue() {
  const { isAr } = useTranslation();
  const { user } = useAuth();
  const performAction = usePerformApprovalAction();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: registrations } = useRegistrationRequests("escalated");
  const { data: roleChanges } = useRoleChangeRequests();
  const { data: transfers } = useTransferRequests();

  const escalatedRoleChanges = roleChanges?.filter(r => r.request_status === "escalated") || [];
  const escalatedTransfers = transfers?.filter(r => r.request_status === "escalated") || [];

  const escalatedRegs = registrations?.filter(r => r.user_id !== user?.id) || [];

  const allEscalated = [
    ...escalatedRegs.map(r => ({ ...r, _type: "registration" as const, _table: "registration_requests", _name: isAr ? r.full_name_ar || r.full_name : r.full_name, _role: r.requested_role, _reason: r.escalation_target || r.notes })),
    ...escalatedRoleChanges.filter(r => r.user_id !== user?.id).map(r => ({ ...r, _type: "role_change" as const, _table: "role_change_requests", _name: r.user_id.slice(0, 8), _role: r.requested_role, _reason: r.reason, national_id: null })),
    ...escalatedTransfers.filter(r => r.user_id !== user?.id).map(r => ({ ...r, _type: "transfer" as const, _table: "transfer_requests", _name: r.user_id.slice(0, 8), _role: r.entity_type, _reason: r.reason, national_id: null })),
  ];

  const handleAction = async (id: string, action: string, newStatus: string, type: string, table: string) => {
    try {
      await performAction.mutateAsync({ requestType: type, requestId: id, actionType: action, newStatus, tableName: table });
      toast.success(isAr ? "تم تنفيذ الإجراء" : "Action performed");
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-2">
          <ArrowUpRight className="w-5 h-5 text-purple-600" />
          <h1 className="text-xl font-bold text-foreground">{isAr ? "قائمة التصعيدات" : "Escalation Queue"}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {isAr ? "الطلبات المصعّدة التى تحتاج مراجعة من مستوى أعلى فى التسلسل الإدارى" : "Escalated requests requiring review by a higher authority in the governance hierarchy"}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">{allEscalated.length} {isAr ? "تصعيد نشط" : "active escalations"}</span>
        </div>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "نوع الطلب" : "Request Type"}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "مقدم الطلب" : "Applicant"}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الرقم القومى" : "National ID"}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الدور" : "Role"}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "سبب التصعيد" : "Escalation Reason"}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "مدة التصعيد" : "Time Since"}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {allEscalated.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{isAr ? "لا توجد تصعيدات حالياً" : "No active escalations"}</td></tr>
              ) : allEscalated.map(item => (
                <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-3">
                    <span className="px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs font-medium">
                      {item._type === "registration" ? (isAr ? "تسجيل" : "Registration")
                        : item._type === "role_change" ? (isAr ? "تغيير دور" : "Role Change")
                        : (isAr ? "نقل" : "Transfer")}
                    </span>
                  </td>
                  <td className="p-3 text-xs font-medium text-foreground">{item._name}</td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">{item.national_id || "—"}</td>
                  <td className="p-3 text-xs">{isAr ? ROLE_LABELS[item._role]?.ar : ROLE_LABELS[item._role]?.en}</td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">{item._reason || "—"}</td>
                  <td className="p-3">
                    <span className="flex items-center gap-1 text-xs text-amber-700">
                      <Clock className="w-3 h-3" />{timeSince(item.created_at)}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleAction(item.id, "approve", "approved", item._type, item._table)} className="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200" title={isAr ? "موافقة" : "Approve"}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleAction(item.id, "reject", "rejected", item._type, item._table)} className="p-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200" title={isAr ? "رفض" : "Reject"}>
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleAction(item.id, "return", "returned", item._type, item._table)} className="p-1.5 rounded bg-amber-100 text-amber-700 hover:bg-amber-200" title={isAr ? "إعادة" : "Return"}>
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className="p-1.5 rounded bg-muted text-muted-foreground hover:bg-border" title={isAr ? "السجل" : "History"}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {expandedId === item.id && (
                      <div className="mt-2"><ApprovalHistoryPanel requestId={item.id} /></div>
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
