import { useTranslation } from "@/hooks/useTranslation";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Link } from "react-router-dom";
import { Filter } from "lucide-react";
import { useState } from "react";
import { useSupportTickets } from "@/hooks/useRealData";

export function TicketManagement() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const { data: tickets, isLoading } = useSupportTickets();

  const filtered = (tickets || []).filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  const priorityToStatus = (p: string) => {
    if (p === "critical") return "critical" as const;
    if (p === "high") return "warning" as const;
    return "normal" as const;
  };

  const statusToDisplay = (s: string) => {
    if (s === "resolved" || s === "closed") return "resolved" as const;
    if (s === "escalated") return "critical" as const;
    return "pending" as const;
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-4 flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border border-border rounded px-3 py-1.5 bg-background text-foreground">
          <option value="all">{isAr ? "كل الحالات" : "All Status"}</option>
          <option value="open">{isAr ? "مفتوح" : "Open"}</option>
          <option value="in_progress">{isAr ? "قيد المعالجة" : "In Progress"}</option>
          <option value="resolved">{isAr ? "تم الحل" : "Resolved"}</option>
          <option value="escalated">{isAr ? "مصعّد" : "Escalated"}</option>
          <option value="closed">{isAr ? "مغلق" : "Closed"}</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="text-xs border border-border rounded px-3 py-1.5 bg-background text-foreground">
          <option value="all">{isAr ? "كل الأولويات" : "All Priorities"}</option>
          <option value="critical">{isAr ? "حرج" : "Critical"}</option>
          <option value="high">{isAr ? "مرتفع" : "High"}</option>
          <option value="medium">{isAr ? "متوسط" : "Medium"}</option>
          <option value="low">{isAr ? "منخفض" : "Low"}</option>
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} {isAr ? "تذكرة" : "tickets"}</span>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{isAr ? "قائمة التذاكر" : "Ticket List"}</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{isAr ? "جارى التحميل..." : "Loading..."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-start p-2 text-muted-foreground font-medium">{isAr ? "رقم" : "ID"}</th>
                <th className="text-start p-2 text-muted-foreground font-medium">{isAr ? "المشكلة" : "Issue"}</th>
                <th className="text-start p-2 text-muted-foreground font-medium">{isAr ? "الفئة" : "Category"}</th>
                <th className="text-center p-2 text-muted-foreground font-medium">{isAr ? "الأولوية" : "Priority"}</th>
                <th className="text-center p-2 text-muted-foreground font-medium">{isAr ? "الحالة" : "Status"}</th>
                <th className="text-start p-2 text-muted-foreground font-medium">{isAr ? "التاريخ" : "Date"}</th>
                <th className="p-2"></th>
              </tr></thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-2 font-mono text-xs text-muted-foreground">{t.ticket_number}</td>
                    <td className="p-2 text-foreground">{isAr ? (t.subject_ar || t.subject) : t.subject}</td>
                    <td className="p-2 text-xs text-muted-foreground">{t.category}</td>
                    <td className="p-2 text-center">
                      <StatusBadge 
                        status={priorityToStatus(t.priority)} 
                        label={t.priority === "critical" ? (isAr ? "حرج" : "Critical") : t.priority === "high" ? (isAr ? "مرتفع" : "High") : t.priority === "medium" ? (isAr ? "متوسط" : "Medium") : (isAr ? "منخفض" : "Low")} 
                      />
                    </td>
                    <td className="p-2 text-center">
                      <StatusBadge 
                        status={statusToDisplay(t.status)} 
                        label={t.status === "resolved" ? (isAr ? "تم الحل" : "Resolved") : t.status === "escalated" ? (isAr ? "مصعّد" : "Escalated") : t.status === "closed" ? (isAr ? "مغلق" : "Closed") : t.status === "in_progress" ? (isAr ? "قيد المعالجة" : "In Progress") : (isAr ? "مفتوح" : "Open")} 
                      />
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="p-2">
                      <Link to={`/dashboard/support/ticket/${t.ticket_number}`} className="text-[10px] text-primary underline">{isAr ? "تفاصيل" : "Details"}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-xs text-green-700">
          <strong>✓ {isAr ? "بيانات حقيقية" : "Real Data"}:</strong> {isAr ? "جدول التذاكر مستمد من قاعدة البيانات" : "Ticket table is powered by real database queries"}
        </p>
      </div>
    </div>
  );
}
