import { useTranslation } from "@/hooks/useTranslation";
import { AlertTriangle, CheckCircle2, Clock, Ticket, TrendingUp, Bot, ArrowUpRight } from "lucide-react";
import { useTicketStats, useSupportTickets } from "@/hooks/useRealData";

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  subject_ar?: string;
  priority: string;
  status: string;
  created_at: string;
}

export function SupportOverview() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { data: stats } = useTicketStats();
  const { data: tickets } = useSupportTickets();

  const kpis = [
    { label: isAr ? "تذاكر مفتوحة" : "Open Tickets", value: String(stats?.open ?? "0"), icon: Ticket, color: "text-amber-600" },
    { label: isAr ? "مشكلات حرجة" : "Critical Issues", value: String(stats?.critical ?? "0"), icon: AlertTriangle, color: "text-destructive" },
    { label: isAr ? "قيد المعالجة" : "In Progress", value: String(stats?.inProgress ?? "0"), icon: Clock, color: "text-amber-600" },
    { label: isAr ? "تم الحل" : "Resolved", value: String(stats?.resolved ?? "0"), icon: CheckCircle2, color: "text-green-600" },
    { label: isAr ? "حالات مصعّدة" : "Escalated Cases", value: String(stats?.escalated ?? "0"), icon: ArrowUpRight, color: "text-destructive" },
    { label: isAr ? "إجمالى التذاكر" : "Total Tickets", value: String(stats?.total ?? "0"), icon: TrendingUp, color: "text-primary" },
  ];

  const recentTickets = (tickets as unknown as SupportTicket[] || []).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <k.icon className={`w-5 h-5 ${k.color} mb-2`} />
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{isAr ? "أحدث التذاكر" : "Recent Tickets"}</h3>
          <div className="space-y-2">
            {recentTickets.length === 0 && (
              <p className="text-sm text-muted-foreground">{isAr ? "لا توجد تذاكر" : "No tickets found"}</p>
            )}
            {recentTickets.map((t) => (
              <div key={t.id} className={`p-3 rounded border ${t.priority === "critical" ? "bg-destructive/5 border-destructive/20" : "bg-surface border-border"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{t.ticket_number}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                    t.priority === "critical" ? "bg-destructive/10 text-destructive" 
                    : t.priority === "high" ? "bg-amber-100 text-amber-800" 
                    : "bg-muted text-muted-foreground"
                  }`}>
                    {t.priority === "critical" ? (isAr ? "حرج" : "Critical") 
                    : t.priority === "high" ? (isAr ? "مرتفع" : "High") 
                    : (isAr ? "متوسط" : "Medium")}
                  </span>
                </div>
                <p className="text-sm text-foreground">{isAr ? t.subject_ar || t.subject : t.subject}</p>
                <span className="text-[10px] text-muted-foreground">{t.status} · {new Date(t.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-gold" />
            <h3 className="font-semibold text-foreground">{isAr ? "ملخص الذكاء الاصطناعى" : "AI Support Summary"}</h3>
          </div>
          <div className="p-4 bg-gold-light rounded-lg border border-gold/20 text-sm text-foreground/80 leading-relaxed mb-4">
            {isAr
              ? `هناك ${stats?.critical ?? 0} مشكلات حرجة و ${stats?.open ?? 0} تذاكر مفتوحة تحتاج اهتمام. ${stats?.escalated ?? 0} حالات مصعدة. يوصى بمراجعة الحالات الحرجة أولا.`
              : `${stats?.critical ?? 0} critical issues and ${stats?.open ?? 0} open tickets need attention. ${stats?.escalated ?? 0} escalated cases. Recommend reviewing critical cases first.`}
          </div>
          <div className="space-y-2">
            {!stats?.critical && !stats?.open && (
              <p className="text-xs text-muted-foreground">{isAr ? "لا توجد توصيات حالية" : "No current recommendations"}</p>
            )}
            {stats?.critical > 0 && (
              <div className="p-2 bg-surface rounded border border-border text-xs text-foreground">
                {isAr ? "فحص المشكلات الحرجة فوراً" : "Check critical issues immediately"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real vs Mock indicator */}
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-xs text-green-700">
          <strong>✓ {isAr ? "بيانات حقيقية" : "Real Data"}:</strong> {isAr ? "إحصائيات التذاكر والقائمة مستمدة من قاعدة البيانات" : "Ticket stats and list are powered by real database queries"}
        </p>
      </div>
    </div>
  );
}
