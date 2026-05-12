import { useTranslation } from "@/hooks/useTranslation";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const errorTrend: any[] = [];

const modules = [
  { name: "Ministry Dashboard", nameAr: "لوحة الوزارة", status: "normal" as const, response: "0.0s" },
  { name: "Directorate Dashboard", nameAr: "لوحة المديرية", status: "normal" as const, response: "0.0s" },
  { name: "Administration Dashboard", nameAr: "لوحة الإدارة", status: "normal" as const, response: "0.0s" },
  { name: "School Dashboard", nameAr: "لوحة المدرسة", status: "normal" as const, response: "0.0s" },
  { name: "Teacher Workspace", nameAr: "مساحة المعلم", status: "normal" as const, response: "0.0s" },
  { name: "Student Portal", nameAr: "بوابة الطالب", status: "normal" as const, response: "0.0s" },
  { name: "Parent Portal", nameAr: "بوابة ولى الأمر", status: "normal" as const, response: "0.0s" },
  { name: "Support Dashboard", nameAr: "لوحة الدعم", status: "normal" as const, response: "0.0s" },
  { name: "Authentication Service", nameAr: "خدمة المصادقة", status: "normal" as const, response: "0.0s" },
  { name: "Translation Service", nameAr: "خدمة الترجمة", status: "normal" as const, response: "0.0s" },
];

export function PlatformHealth() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  const healthy = modules.filter(m => m.status === "normal").length;
  const warning = modules.filter(m => m.status === "warning").length;
  const critical = modules.filter(m => m.status === "critical").length;

  return (
    <div className="space-y-6">
      {/* Health Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: isAr ? "أنظمة سليمة" : "Healthy Systems", value: healthy.toString(), icon: CheckCircle2, color: "text-green-600" },
          { label: isAr ? "تحذيرات" : "Warnings", value: warning.toString(), icon: AlertTriangle, color: "text-amber-600" },
          { label: isAr ? "أعطال" : "Critical", value: critical.toString(), icon: XCircle, color: "text-destructive" },
        ].map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <k.icon className={`w-5 h-5 ${k.color} mb-2`} />
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Module Status */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{isAr ? "حالة الوحدات" : "Module Status"}</h3>
        <div className="space-y-2">
          {modules.map((m) => (
            <div key={m.name} className={`flex items-center justify-between p-3 rounded border ${m.status === "critical" ? "bg-destructive/5 border-destructive/20" : m.status === "warning" ? "bg-amber-50 border-amber-200" : "bg-surface border-border"}`}>
              <span className="text-sm text-foreground">{isAr ? m.nameAr : m.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{m.response}</span>
                <StatusBadge status={m.status} label={m.status === "critical" ? (isAr ? "عطل" : "Down") : m.status === "warning" ? (isAr ? "بطىء" : "Slow") : (isAr ? "سليم" : "OK")} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error Trend */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{isAr ? "اتجاه الأخطاء (أسبوعى)" : "Error Trend (Weekly)"}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={errorTrend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="errors" fill="hsl(0 84% 60%)" name={isAr ? "أخطاء" : "Errors"} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
