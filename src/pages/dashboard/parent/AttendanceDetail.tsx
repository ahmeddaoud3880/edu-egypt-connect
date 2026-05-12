import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const monthlyData = [
  { month: "Oct", ahmed: 90, sara: 98 }, { month: "Nov", ahmed: 88, sara: 97 },
  { month: "Dec", ahmed: 85, sara: 96 }, { month: "Jan", ahmed: 84, sara: 98 },
  { month: "Feb", ahmed: 80, sara: 97 }, { month: "Mar", ahmed: 72, sara: 97 },
];

const log = [
  { child: "Ahmed", childAr: "أحمد", date: "Mar 30", status: "critical" as const, label: "Absent", labelAr: "غائب" },
  { child: "Ahmed", childAr: "أحمد", date: "Mar 29", status: "critical" as const, label: "Absent", labelAr: "غائب" },
  { child: "Sara", childAr: "سارة", date: "Mar 30", status: "normal" as const, label: "Present", labelAr: "حاضر" },
  { child: "Ahmed", childAr: "أحمد", date: "Mar 28", status: "warning" as const, label: "Late", labelAr: "متأخر" },
  { child: "Sara", childAr: "سارة", date: "Mar 29", status: "normal" as const, label: "Present", labelAr: "حاضر" },
  { child: "Ahmed", childAr: "أحمد", date: "Mar 27", status: "critical" as const, label: "Absent", labelAr: "غائب" },
  { child: "Sara", childAr: "سارة", date: "Mar 28", status: "normal" as const, label: "Present", labelAr: "حاضر" },
  { child: "Ahmed", childAr: "أحمد", date: "Mar 26", status: "normal" as const, label: "Present", labelAr: "حاضر" },
];

export default function ParentAttendanceDetail() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  return (
    <div className="space-y-6">
      <Link to="/dashboard?role=parent" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" />{isAr ? "العودة" : "Back"}</Link>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h1 className="text-xl font-bold text-foreground">{isAr ? "تفاصيل الحضور" : "Attendance Detail"}</h1>
        <p className="text-sm text-muted-foreground mt-1">{isAr ? "سجل الحضور التفصيلى لأبنائك" : "Detailed attendance record for your children"}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isAr ? "حضور أحمد" : "Ahmed", value: "82%", color: "text-destructive", icon: AlertTriangle },
          { label: isAr ? "حضور سارة" : "Sara", value: "97%", color: "text-green-600", icon: CheckCircle2 },
          { label: isAr ? "إجمالى الغياب" : "Total Absences", value: "8", color: "text-destructive", icon: AlertTriangle },
          { label: isAr ? "إجمالى التأخر" : "Total Late", value: "3", color: "text-amber-600", icon: Clock },
        ].map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{isAr ? "اتجاه الحضور الشهرى" : "Monthly Attendance Trend"}</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} domain={[60, 100]} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="ahmed" fill="hsl(220 40% 13%)" name={isAr ? "أحمد" : "Ahmed"} radius={[2, 2, 0, 0]} />
            <Bar dataKey="sara" fill="hsl(42 75% 50%)" name={isAr ? "سارة" : "Sara"} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{isAr ? "السجل التفصيلى" : "Detailed Log"}</h3>
        <div className="space-y-2">
          {log.map((l, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-surface rounded border border-border">
              <div className="text-sm text-foreground">{isAr ? l.childAr : l.child} — {l.date}</div>
              <StatusBadge status={l.status} label={isAr ? l.labelAr : l.label} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
