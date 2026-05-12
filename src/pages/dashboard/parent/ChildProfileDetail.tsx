import { useParams, Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, TrendingUp, TrendingDown, BookOpen, CheckCircle2, AlertTriangle, Bot } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const childData: Record<string, any> = {
  s1: { name: "Ahmed Mohamed", nameAr: "أحمد محمد", grade: "Grade 8", gradeAr: "الصف الثامن", avg: 68, attendance: 82, pending: 3, risk: true, trend: "declining" },
  s2: { name: "Sara Mohamed", nameAr: "سارة محمد", grade: "Grade 5", gradeAr: "الصف الخامس", avg: 85, attendance: 97, pending: 1, risk: false, trend: "improving" },
};

const trendData = [
  { month: "Oct", score: 72 }, { month: "Nov", score: 70 }, { month: "Dec", score: 65 },
  { month: "Jan", score: 68 }, { month: "Feb", score: 66 }, { month: "Mar", score: 68 },
];

export default function ChildProfileDetail() {
  const { childId } = useParams();
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const child = childData[childId || "s1"] || childData.s1;

  const subjects = [
    { name: isAr ? "اللغة العربية" : "Arabic", score: 75, status: "normal" as const },
    { name: isAr ? "الرياضيات" : "Mathematics", score: 55, status: "critical" as const },
    { name: isAr ? "العلوم" : "Science", score: 62, status: "warning" as const },
    { name: isAr ? "الإنجليزية" : "English", score: 70, status: "normal" as const },
    { name: isAr ? "الدراسات" : "Social Studies", score: 78, status: "normal" as const },
  ];

  return (
    <div className="space-y-6">
      <Link to="/dashboard?role=parent" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" />{isAr ? "العودة" : "Back"}</Link>

      {/* Header */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{isAr ? child.nameAr : child.name}</h1>
            <p className="text-sm text-muted-foreground">{isAr ? child.gradeAr : child.grade}</p>
          </div>
          {child.risk ? <StatusBadge status="critical" label={isAr ? "يحتاج متابعة" : "Needs Attention"} /> : <StatusBadge status="normal" label={isAr ? "جيد" : "Good"} />}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isAr ? "المعدل العام" : "Overall Average", value: `${child.avg}%`, color: child.avg < 70 ? "text-destructive" : "text-foreground" },
          { label: isAr ? "نسبة الحضور" : "Attendance Rate", value: `${child.attendance}%`, color: child.attendance < 90 ? "text-amber-600" : "text-green-600" },
          { label: isAr ? "واجبات معلقة" : "Pending Tasks", value: child.pending.toString(), color: child.pending > 2 ? "text-amber-600" : "text-foreground" },
          { label: isAr ? "الاتجاه" : "Trend", value: child.trend === "declining" ? (isAr ? "↓ تراجع" : "↓ Declining") : (isAr ? "↑ تحسن" : "↑ Improving"), color: child.trend === "declining" ? "text-destructive" : "text-green-600" },
        ].map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="academics" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-surface-elevated p-1 rounded-lg border border-border">
          {[
            { v: "academics", l: isAr ? "الأكاديمى" : "Academics" },
            { v: "attendance", l: isAr ? "الحضور" : "Attendance" },
            { v: "assignments", l: isAr ? "الواجبات" : "Assignments" },
            { v: "ai", l: isAr ? "توصيات" : "AI Recommendations" },
          ].map((t) => <TabsTrigger key={t.v} value={t.v} className="text-xs">{t.l}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="academics">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-surface-elevated rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">{isAr ? "درجات المواد" : "Subject Scores"}</h3>
              <div className="space-y-2">
                {subjects.map((s) => (
                  <div key={s.name} className="flex items-center justify-between p-2 bg-surface rounded border border-border">
                    <span className="text-sm text-foreground">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${s.score < 60 ? "text-destructive" : "text-foreground"}`}>{s.score}%</span>
                      <StatusBadge status={s.status} label={s.status === "critical" ? (isAr ? "ضعيف" : "Weak") : s.status === "warning" ? (isAr ? "تحذير" : "Warning") : (isAr ? "جيد" : "Good")} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-surface-elevated rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">{isAr ? "اتجاه الأداء" : "Performance Trend"}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} /><YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} domain={[40, 100]} /><Tooltip /><Line type="monotone" dataKey="score" stroke="hsl(220 40% 13%)" strokeWidth={2} /></LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{isAr ? "سجل الحضور" : "Attendance Record"}</h3>
            <div className="space-y-2">
              {["Mar 30 — Absent", "Mar 29 — Absent", "Mar 28 — Late", "Mar 27 — Absent (Sick)", "Mar 26 — Present", "Mar 25 — Present"].map((d, i) => (
                <div key={i} className="p-2 bg-surface rounded border border-border text-sm text-foreground">{d}</div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{isAr ? "الواجبات" : "Assignments"}</h3>
            <div className="space-y-2">
              {[
                { t: isAr ? "تقرير معمل العلوم" : "Science Lab Report", s: "overdue" },
                { t: isAr ? "مسائل رياضيات 12" : "Math Problem Set 12", s: "pending" },
                { t: isAr ? "ملخص القراءة" : "Reading Summary", s: "done" },
              ].map((a, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-surface rounded border border-border">
                  <span className="text-sm text-foreground">{a.t}</span>
                  <StatusBadge status={a.s === "overdue" ? "critical" : a.s === "pending" ? "pending" : "resolved"} label={a.s === "overdue" ? (isAr ? "متأخر" : "Overdue") : a.s === "pending" ? (isAr ? "معلق" : "Pending") : (isAr ? "مكتمل" : "Done")} />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <div className="flex items-center gap-2 mb-4"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{isAr ? "توصيات الذكاء الاصطناعى" : "AI Recommendations"}</h3></div>
            <div className="space-y-2">
              {[
                isAr ? "يحتاج تدريب يومى فى الرياضيات — 15 دقيقة على الأقل" : "Needs daily math practice — at least 15 minutes",
                isAr ? "تواصل مع المعلم بخصوص الغياب المتكرر" : "Communicate with teacher about repeated absences",
                isAr ? "راجع واجب العلوم المتأخر فورا" : "Review overdue science homework immediately",
              ].map((r, i) => (
                <div key={i} className="p-3 bg-gold-light rounded border border-gold/20 text-sm text-foreground/80">{r}</div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
