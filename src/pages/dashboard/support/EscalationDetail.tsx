import { useParams, Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ArrowLeft, ArrowUpRight, Bot, Clock } from "lucide-react";

export default function EscalationDetail() {
  const { ticketId } = useParams();
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  return (
    <div className="space-y-6">
      <Link to="/dashboard?role=support" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" />{isAr ? "العودة" : "Back"}</Link>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-xl font-bold text-foreground">{isAr ? "تفاصيل التصعيد" : "Escalation Detail"} — {ticketId}</h1><p className="text-sm text-muted-foreground mt-1">{isAr ? "تعذر الدخول — دور المعلم" : "Login failure — Teacher role"}</p></div>
          <StatusBadge status="critical" label="L2" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isAr ? "مستوى التصعيد" : "Escalation Level", value: "L2" },
          { label: isAr ? "السبب" : "Reason", value: isAr ? "يؤثر على 120+ مستخدم" : "Affects 120+ users" },
          { label: isAr ? "المسؤول" : "Owner", value: isAr ? "م. طارق" : "Eng. Tarek" },
          { label: isAr ? "منذ التصعيد" : "Time Since", value: "2h 15m" },
        ].map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <div className="text-[10px] text-muted-foreground mb-1">{k.label}</div>
            <div className="text-sm font-semibold text-foreground">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-3">{isAr ? "سجل التصعيد" : "Escalation Timeline"}</h3>
        <div className="space-y-3">
          {[
            { time: "10:34", text: isAr ? "تذكرة مفتوحة — أولوية عادية" : "Ticket opened — normal priority" },
            { time: "10:50", text: isAr ? "تقارير إضافية — رفع الأولوية لحرج" : "Additional reports — priority raised to critical" },
            { time: "11:02", text: isAr ? "تحقيق أولى — مشكلة خدمة المصادقة" : "Initial investigation — auth service issue" },
            { time: "11:30", text: isAr ? "تصعيد إلى L2 — يحتاج تدخل فريق البنية التحتية" : "Escalated to L2 — needs infrastructure team" },
          ].map((h, i) => (
            <div key={i} className="flex items-start gap-3 p-2 bg-surface rounded border border-border">
              <Clock className="w-3 h-3 text-muted-foreground mt-1 shrink-0" />
              <div><span className="text-xs text-muted-foreground">{h.time}</span><p className="text-sm text-foreground">{h.text}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{isAr ? "توصيات" : "AI Recommendations"}</h3></div>
        <div className="space-y-2">
          {[isAr ? "فحص سجلات خدمة المصادقة فورا" : "Check authentication service logs immediately", isAr ? "إخطار المدارس المتأثرة" : "Notify affected schools"].map((r, i) => (
            <div key={i} className="p-3 bg-gold-light rounded border border-gold/20 text-sm text-foreground/80">{r}</div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button className="text-xs px-4 py-2 bg-primary text-primary-foreground rounded">{isAr ? "تم الحل" : "Mark Resolved"}</button>
        <button className="text-xs px-4 py-2 border border-border rounded text-foreground">{isAr ? "تصعيد إضافى" : "Escalate Further"}</button>
        <button className="text-xs px-4 py-2 border border-border rounded text-foreground">{isAr ? "إعادة تعيين" : "Reassign"}</button>
      </div>
    </div>
  );
}
