import { useApprovalActions } from "@/hooks/useGovernanceData";
import { useTranslation } from "@/hooks/useTranslation";
import { Clock, User, ArrowRight } from "lucide-react";

const ACTION_LABELS: Record<string, { en: string; ar: string }> = {
  approve: { en: "Approved", ar: "تمت الموافقة" },
  reject: { en: "Rejected", ar: "تم الرفض" },
  return: { en: "Returned for Completion", ar: "أُعيد للاستكمال" },
  escalate: { en: "Escalated", ar: "تم التصعيد" },
  reassign: { en: "Reassigned", ar: "أُعيد التوجيه" },
  suspend: { en: "Suspended", ar: "تم التعليق" },
  activate: { en: "Activated", ar: "تم التفعيل" },
};

export function ApprovalHistoryPanel({ requestId }: { requestId: string }) {
  const { isAr } = useTranslation();
  const { data: actions, isLoading } = useApprovalActions(requestId);

  if (isLoading) return <div className="text-xs text-muted-foreground p-2">{isAr ? "جارى التحميل..." : "Loading..."}</div>;

  if (!actions?.length) {
    return (
      <div className="p-3 bg-muted rounded text-xs text-muted-foreground">
        {isAr ? "لا يوجد سجل إجراءات بعد" : "No action history yet"}
      </div>
    );
  }

  return (
    <div className="p-3 bg-muted rounded space-y-2">
      <h4 className="text-xs font-semibold text-foreground mb-2">
        {isAr ? "سجل الإجراءات" : "Action History"}
      </h4>
      {actions.map(action => (
        <div key={action.id} className="flex items-start gap-2 p-2 bg-background rounded border border-border">
          <Clock className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-foreground">
                {isAr ? ACTION_LABELS[action.action_type]?.ar : ACTION_LABELS[action.action_type]?.en}
              </span>
              {action.old_status && action.new_status && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  {action.old_status} <ArrowRight className="w-2.5 h-2.5" /> {action.new_status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <User className="w-2.5 h-2.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                {action.performer_name || action.performed_by.slice(0, 8)}
                {action.performer_role && ` (${action.performer_role})`}
              </span>
            </div>
            {action.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{action.notes}</p>}
            <p className="text-[10px] text-muted-foreground">{new Date(action.created_at).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
