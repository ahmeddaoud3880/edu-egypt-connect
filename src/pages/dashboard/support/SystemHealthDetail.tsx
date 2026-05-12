import { useParams, Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Bot } from "lucide-react";

const services = [
  { name: "Authentication", nameAr: "المصادقة", status: "critical" as const, uptime: "94.2%", lastIncident: "Now" },
  { name: "Database", nameAr: "قاعدة البيانات", status: "normal" as const, uptime: "99.9%", lastIncident: "15 days ago" },
  { name: "API Gateway", nameAr: "بوابة API", status: "normal" as const, uptime: "99.7%", lastIncident: "3 days ago" },
  { name: "File Storage", nameAr: "تخزين الملفات", status: "normal" as const, uptime: "99.8%", lastIncident: "7 days ago" },
  { name: "Translation Engine", nameAr: "محرك الترجمة", status: "normal" as const, uptime: "100%", lastIncident: "Never" },
  { name: "Notification Service", nameAr: "خدمة الإشعارات", status: "warning" as const, uptime: "97.5%", lastIncident: "1 day ago" },
];

export default function SystemHealthDetail() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  return (
    <div className="space-y-6">
      <Link to="/dashboard?role=support" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" />{isAr ? "العودة" : "Back"}</Link>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h1 className="text-xl font-bold text-foreground">{isAr ? "تفاصيل صحة النظام" : "System Health Detail"}</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-elevated rounded-lg border border-border p-4"><CheckCircle2 className="w-5 h-5 text-green-600 mb-2" /><div className="text-2xl font-bold text-green-600">{services.filter(s => s.status === "normal").length}</div><div className="text-[10px] text-muted-foreground">{isAr ? "سليم" : "Healthy"}</div></div>
        <div className="bg-surface-elevated rounded-lg border border-border p-4"><AlertTriangle className="w-5 h-5 text-amber-600 mb-2" /><div className="text-2xl font-bold text-amber-600">{services.filter(s => s.status === "warning").length}</div><div className="text-[10px] text-muted-foreground">{isAr ? "تحذير" : "Warning"}</div></div>
        <div className="bg-surface-elevated rounded-lg border border-border p-4"><XCircle className="w-5 h-5 text-destructive mb-2" /><div className="text-2xl font-bold text-destructive">{services.filter(s => s.status === "critical").length}</div><div className="text-[10px] text-muted-foreground">{isAr ? "عطل" : "Critical"}</div></div>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{isAr ? "حالة الخدمات التفصيلية" : "Detailed Service Status"}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-start p-2 text-muted-foreground font-medium">{isAr ? "الخدمة" : "Service"}</th>
              <th className="text-center p-2 text-muted-foreground font-medium">{isAr ? "الحالة" : "Status"}</th>
              <th className="text-center p-2 text-muted-foreground font-medium">{isAr ? "وقت التشغيل" : "Uptime"}</th>
              <th className="text-start p-2 text-muted-foreground font-medium">{isAr ? "آخر حادث" : "Last Incident"}</th>
            </tr></thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.name} className="border-b border-border last:border-0">
                  <td className="p-2 text-foreground">{isAr ? s.nameAr : s.name}</td>
                  <td className="p-2 text-center"><StatusBadge status={s.status} label={s.status === "critical" ? (isAr ? "عطل" : "Down") : s.status === "warning" ? (isAr ? "بطىء" : "Slow") : (isAr ? "سليم" : "OK")} /></td>
                  <td className="p-2 text-center text-foreground">{s.uptime}</td>
                  <td className="p-2 text-xs text-muted-foreground">{s.lastIncident}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{isAr ? "توصيات" : "AI Recommendations"}</h3></div>
        <div className="space-y-2">
          {[isAr ? "إعادة تشغيل خدمة المصادقة — مشكلة مهلة زمنية" : "Restart authentication service — timeout issue", isAr ? "مراقبة خدمة الإشعارات — أداء غير مستقر" : "Monitor notification service — unstable performance"].map((r, i) => (
            <div key={i} className="p-3 bg-gold-light rounded border border-gold/20 text-sm text-foreground/80">{r}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
