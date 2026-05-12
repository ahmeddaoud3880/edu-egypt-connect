import { useRequestStatusHistory } from "@/hooks/useGovernanceData";
import { useTranslation } from "@/hooks/useTranslation";
import { Clock, ArrowRight } from "lucide-react";

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  draft: { en: "Draft", ar: "مسودة" },
  submitted: { en: "Submitted", ar: "مُقدَّم" },
  under_review: { en: "Under Review", ar: "قيد المراجعة" },
  waiting_higher_approval: { en: "Waiting Higher Approval", ar: "في انتظار موافقة أعلى" },
  approved: { en: "Approved", ar: "مُوافَق" },
  rejected: { en: "Rejected", ar: "مرفوض" },
  returned: { en: "Returned", ar: "مُعاد" },
  escalated: { en: "Escalated", ar: "مُصعَّد" },
  activated: { en: "Activated", ar: "مُفعَّل" },
  suspended: { en: "Suspended", ar: "مُعلَّق" },
};

export function StatusHistoryPanel({ requestId }: { requestId: string }) {
  const { isAr } = useTranslation();
  const { data: history, isLoading } = useRequestStatusHistory(requestId);

  if (isLoading) return <div className="text-xs text-muted-foreground p-2">{isAr ? "جارى التحميل..." : "Loading..."}</div>;
  if (!history?.length) return (
    <div className="p-3 bg-muted rounded text-xs text-muted-foreground">{isAr ? "لا يوجد سجل حالات" : "No status history"}</div>
  );

  return (
    <div className="p-3 bg-muted rounded space-y-2">
      <h4 className="text-xs font-semibold text-foreground mb-2">{isAr ? "سجل تغيير الحالة" : "Status Change History"}</h4>
      {history.map((entry: any) => (
        <div key={entry.id} className="flex items-start gap-2 p-2 bg-background rounded border border-border">
          <Clock className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground">
                {isAr ? STATUS_LABELS[entry.old_status]?.ar || entry.old_status : STATUS_LABELS[entry.old_status]?.en || entry.old_status}
              </span>
              <ArrowRight className="w-2.5 h-2.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">
                {isAr ? STATUS_LABELS[entry.new_status]?.ar || entry.new_status : STATUS_LABELS[entry.new_status]?.en || entry.new_status}
              </span>
            </div>
            {entry.note && <p className="text-[10px] text-muted-foreground mt-0.5">{entry.note}</p>}
            <p className="text-[10px] text-muted-foreground">{new Date(entry.changed_at).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
