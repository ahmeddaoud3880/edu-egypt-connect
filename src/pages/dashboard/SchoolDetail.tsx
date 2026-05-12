import { useTranslation } from "@/hooks/useTranslation";
import { useParams, Link } from "react-router-dom";
import { AIRecommendationsPanel } from "@/components/dashboard/AIRecommendationsPanel";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  School, Users, GraduationCap, TrendingUp, CheckCircle2,
  ArrowUpRight, ArrowDownRight, ArrowLeft, BookOpen
} from "lucide-react";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const tabs = [
  { id: "overview", labelEn: "Overview", labelAr: "نظرة عامة" },
  { id: "performance", labelEn: "Performance", labelAr: "الأداء" },
  { id: "operations", labelEn: "Operations", labelAr: "العمليات" },
  { id: "ai", labelEn: "AI Recommendations", labelAr: "التوصيات الذكية" },
];

const subjectData = [
  { subject: "Arabic", avg: 78, pass: 92 },
  { subject: "Math", avg: 68, pass: 82 },
  { subject: "Science", avg: 72, pass: 85 },
  { subject: "English", avg: 65, pass: 79 },
  { subject: "Social", avg: 76, pass: 90 },
];

const classData = [
  { grade: "Grade 1", sections: 4, students: 180, avgScore: 82, attendance: 96 },
  { grade: "Grade 2", sections: 4, students: 175, avgScore: 80, attendance: 95 },
  { grade: "Grade 3", sections: 3, students: 140, avgScore: 78, attendance: 93 },
  { grade: "Grade 4", sections: 3, students: 135, avgScore: 75, attendance: 92 },
  { grade: "Grade 5", sections: 3, students: 130, avgScore: 73, attendance: 90 },
  { grade: "Grade 6", sections: 3, students: 130, avgScore: 71, attendance: 89 },
];

const aiRecs = [
  { priority: "high" as const, text: { en: "English language scores 15% below administration average — consider additional tutoring sessions", ar: "درجات اللغة الإنجليزية أقل 15% من متوسط الإدارة — يُنظر فى جلسات تقوية إضافية" } },
  { priority: "medium" as const, text: { en: "Attendance decline in grades 5-6 — parental engagement program recommended", ar: "انخفاض الحضور فى الصفين 5-6 — يُوصى ببرنامج إشراك أولياء الأمور" } },
  { priority: "low" as const, text: { en: "Top performing students in Grade 2 may benefit from accelerated learning track", ar: "الطلاب المتفوقون فى الصف الثانى قد يستفيدون من مسار تعلم متسارع" } },
];

export default function SchoolDetail() {
  const { t, lang } = useTranslation();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const schoolName = id ? id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "School";

  const kpis = [
    { label: t("common.students"), value: "890", icon: GraduationCap },
    { label: t("common.teachers"), value: "55", icon: Users },
    { label: lang === "ar" ? "الفصول" : "Classes", value: "20", icon: BookOpen },
    { label: t("common.attendance"), value: "93.2%", change: "-0.4%", up: false, icon: TrendingUp },
    { label: t("ministry.passRate"), value: "85.1%", change: "+1.2%", up: true, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard?role=administration" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-3 h-3" /> {lang === "ar" ? "العودة للوحة الإدارة" : "Back to Administration Dashboard"}
        </Link>
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-primary flex items-center justify-center">
              <School className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{schoolName}</h1>
              <p className="text-sm text-muted-foreground">{lang === "ar" ? "عرض تفصيلى للمدرسة" : "School Detail View"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <kpi.icon className="w-4 h-4 text-muted-foreground mb-2" />
            <div className="text-lg font-bold text-foreground">{kpi.value}</div>
            <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
            {kpi.change && (
              <span className={`text-[10px] font-semibold flex items-center gap-0.5 mt-1 ${kpi.up ? "text-green-600" : "text-destructive"}`}>
                {kpi.change} {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="border-b border-border">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {lang === "ar" ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "أداء المواد" : "Subject Performance"}</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={subjectData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} domain={[50, 100]} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="avg" fill="hsl(220 40% 13%)" name="Avg Score" radius={[2, 2, 0, 0]} />
                <Bar dataKey="pass" fill="hsl(42 75% 50%)" name="Pass Rate %" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "بيانات الفصول" : "Class Data"}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start pb-2 text-xs font-semibold text-muted-foreground">Grade</th>
                  <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">Sections</th>
                  <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{t("common.students")}</th>
                  <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">Avg Score</th>
                  <th className="text-end pb-2 text-xs font-semibold text-muted-foreground">{t("common.attendance")}</th>
                </tr>
              </thead>
              <tbody>
                {classData.map((c) => (
                  <tr key={c.grade} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium text-foreground">{c.grade}</td>
                    <td className="py-2.5 text-end text-foreground">{c.sections}</td>
                    <td className="py-2.5 text-end text-foreground">{c.students}</td>
                    <td className="py-2.5 text-end text-foreground">{c.avgScore}</td>
                    <td className="py-2.5 text-end text-foreground">{c.attendance}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "performance" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6 text-center py-16">
          <p className="text-sm text-muted-foreground">{lang === "ar" ? "تحليلات أداء تفصيلية ستتوفر قريبا" : "Detailed performance analytics coming in next phase"}</p>
        </div>
      )}

      {activeTab === "operations" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "الحالة التشغيلية" : "Operational Status"}</h3>
          <div className="space-y-3">
            {[
              { item: "Monthly report submitted on time", status: "normal" as const },
              { item: "Safety inspection: last done Feb 2026", status: "normal" as const },
              { item: "English teacher vacancy: 2 positions", status: "warning" as const },
              { item: "Lab equipment request pending", status: "pending" as const },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-surface rounded border border-border">
                <span className="text-sm text-foreground">{item.item}</span>
                <StatusBadge status={item.status} label={item.status === "normal" ? t("status.normal") : item.status === "warning" ? t("status.warning") : t("status.pending")} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "ai" && <AIRecommendationsPanel recommendations={aiRecs} />}
    </div>
  );
}
