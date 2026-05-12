import { useTranslation } from "@/hooks/useTranslation";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ArrowUpRight, AlertTriangle, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const escalated: any[] = [];

export function IssueEscalation() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: isAr ? "حالات مصعّدة" : "Escalated Cases", value: escalated.length.toString(), icon: ArrowUpRight, color: "text-destructive" },
          { label: isAr ? "المستوى الثانى" : "Level 2 (L2)", value: "0", icon: AlertTriangle, color: "text-destructive" },
          { label: isAr ? "أطول انتظار" : "Longest Wait", value: "0h", icon: Clock, color: "text-amber-600" },
        ].map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Escalated Tickets */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <ArrowUpRight className="w-4 h-4 text-destructive" />
          <h3 className="font-semibold text-foreground">{isAr ? "التذاكر المصعّدة" : "Escalated Tickets"}</h3>
        </div>
        <div className="space-y-4">
          {escalated.map((e) => (
            <div key={e.id} className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">{e.id}</span>
                  <span className="text-sm font-medium text-foreground">{isAr ? e.issueAr : e.issue}</span>
                </div>
                <StatusBadge status="critical" label={e.level} />
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                <div><strong>{isAr ? "السبب:" : "Reason:"}</strong> {isAr ? e.reasonAr : e.reason}</div>
                <div><strong>{isAr ? "المسؤول:" : "Owner:"}</strong> {isAr ? e.ownerAr : e.owner} — {isAr ? "منذ" : "Since"} {e.since}</div>
              </div>
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 mb-3">
                <strong>{isAr ? "الإجراء التالى:" : "Next Action:"}</strong> {isAr ? e.nextActionAr : e.nextAction}
              </div>
              <div className="flex gap-2">
                <Link to={`/dashboard/support/escalation/${e.id}`} className="text-[10px] px-3 py-1.5 bg-primary text-primary-foreground rounded">{isAr ? "عرض التفاصيل" : "View Details"}</Link>
                <button className="text-[10px] px-3 py-1.5 border border-border rounded text-foreground">{isAr ? "تم الحل" : "Mark Resolved"}</button>
                <button className="text-[10px] px-3 py-1.5 border border-border rounded text-foreground">{isAr ? "إعادة تعيين" : "Reassign"}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
