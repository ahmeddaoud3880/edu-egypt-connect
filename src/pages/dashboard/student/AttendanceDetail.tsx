import { useTranslation } from "@/hooks/useTranslation";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const monthlyData = [
  { week: "W1", present: 5, absent: 0, late: 0 },
  { week: "W2", present: 4, absent: 1, late: 0 },
  { week: "W3", present: 4, absent: 0, late: 1 },
  { week: "W4", present: 3, absent: 1, late: 1 },
];

const subjectAttendance = [
  { subject: { en: "Mathematics", ar: "رياضيات" }, rate: 90 },
  { subject: { en: "Science", ar: "علوم" }, rate: 95 },
  { subject: { en: "Arabic", ar: "عربى" }, rate: 92 },
  { subject: { en: "English", ar: "إنجليزى" }, rate: 88 },
  { subject: { en: "Social Studies", ar: "دراسات" }, rate: 95 },
];

export default function StudentAttendanceDetail() {
  const { lang } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h1 className="text-xl font-bold text-foreground">{lang === "ar" ? "تفاصيل الحضور" : "Attendance Detail"}</h1>
        <p className="text-sm text-muted-foreground mt-1">{lang === "ar" ? "مارس 2026 — تفصيل أسبوعى" : "March 2026 — Weekly Breakdown"}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-elevated rounded-lg border border-border p-4 text-center">
          <CheckCircle2 className="w-5 h-5 mx-auto text-green-600" />
          <div className="text-2xl font-bold text-foreground mt-1">16</div>
          <div className="text-xs text-muted-foreground">{lang === "ar" ? "أيام حضور" : "Days Present"}</div>
        </div>
        <div className="bg-surface-elevated rounded-lg border border-border p-4 text-center">
          <XCircle className="w-5 h-5 mx-auto text-destructive" />
          <div className="text-2xl font-bold text-foreground mt-1">2</div>
          <div className="text-xs text-muted-foreground">{lang === "ar" ? "أيام غياب" : "Days Absent"}</div>
        </div>
        <div className="bg-surface-elevated rounded-lg border border-border p-4 text-center">
          <Clock className="w-5 h-5 mx-auto text-amber-600" />
          <div className="text-2xl font-bold text-foreground mt-1">2</div>
          <div className="text-xs text-muted-foreground">{lang === "ar" ? "تأخيرات" : "Late Arrivals"}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "تفصيل أسبوعى" : "Weekly Breakdown"}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="present" fill="hsl(142,72%,29%)" stackId="a" />
              <Bar dataKey="absent" fill="hsl(0,72%,51%)" stackId="a" />
              <Bar dataKey="late" fill="hsl(38,92%,50%)" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "الحضور حسب المادة" : "Attendance by Subject"}</h3>
          <div className="space-y-3">
            {subjectAttendance.map((s) => (
              <div key={s.subject.en} className="flex items-center justify-between p-3 rounded border border-border">
                <span className="text-sm font-medium text-foreground">{lang === "ar" ? s.subject.ar : s.subject.en}</span>
                <span className={`font-bold ${s.rate >= 93 ? "text-green-700" : s.rate >= 88 ? "text-amber-600" : "text-destructive"}`}>{s.rate}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
