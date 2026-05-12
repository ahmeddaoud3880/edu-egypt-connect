import { useParams } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useState } from "react";
import { Users, TrendingUp, AlertTriangle, Bot, ClipboardCheck, BookOpen } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const studentData = {
  name: { en: "Mohamed Saeed", ar: "محمد سعيد" },
  class: "4-A",
  id: "STU-2026-1847",
  avg: 51,
  attendance: 78,
  homework: 60,
  risk: ["academic", "attendance"],
  parent: { en: "Mr. Saeed Hassan", ar: "أ. سعيد حسن" },
  history: [
    { month: "Oct", score: 62 }, { month: "Nov", score: 58 }, { month: "Dec", score: 55 },
    { month: "Jan", score: 52 }, { month: "Feb", score: 48 }, { month: "Mar", score: 51 },
  ],
  subjects: [
    { name: { en: "Mathematics", ar: "رياضيات" }, score: 51 },
    { name: { en: "Science", ar: "علوم" }, score: 58 },
    { name: { en: "Arabic", ar: "عربى" }, score: 65 },
    { name: { en: "English", ar: "إنجليزى" }, score: 55 },
  ],
  notes: [
    { date: "2026-03-25", text: { en: "Parent contacted about declining performance.", ar: "تم التواصل مع ولى الأمر بخصوص تراجع الأداء." } },
    { date: "2026-03-15", text: { en: "Missed 3 homework assignments this month.", ar: "فاته 3 واجبات هذا الشهر." } },
  ],
};

export default function StudentPerformanceDetail() {
  const { lang } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: { en: "Overview", ar: "نظرة عامة" } },
    { id: "academic", label: { en: "Academic", ar: "الأكاديمى" } },
    { id: "attendance", label: { en: "Attendance", ar: "الحضور" } },
    { id: "notes", label: { en: "Notes", ar: "الملاحظات" } },
    { id: "ai", label: { en: "AI Recommendations", ar: "توصيات الذكاء الاصطناعى" } },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h1 className="text-xl font-bold text-foreground">{lang === "ar" ? studentData.name.ar : studentData.name.en}</h1>
        <p className="text-sm text-muted-foreground mt-1">{studentData.class} — {studentData.id}</p>
        <div className="flex gap-1 mt-2">
          {studentData.risk.map((r) => (
            <span key={r} className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-100 text-red-700">{r === "academic" ? (lang === "ar" ? "أكاديمى" : "Academic") : (lang === "ar" ? "حضور" : "Attendance")}</span>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: { en: "Average", ar: "المتوسط" }, value: `${studentData.avg}%`, color: "text-destructive" },
          { label: { en: "Attendance", ar: "الحضور" }, value: `${studentData.attendance}%`, color: "text-amber-600" },
          { label: { en: "Homework", ar: "الواجبات" }, value: `${studentData.homework}%`, color: "text-amber-600" },
          { label: { en: "Parent", ar: "ولى الأمر" }, value: lang === "ar" ? studentData.parent.ar : studentData.parent.en, color: "text-foreground" },
        ].map((k) => (
          <div key={k.label.en} className="bg-surface-elevated rounded-lg border border-border p-4 text-center">
            <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{lang === "ar" ? k.label.ar : k.label.en}</div>
          </div>
        ))}
      </div>

      <div className="border-b border-border">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {lang === "ar" ? tab.label.ar : tab.label.en}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "اتجاه الأداء" : "Performance Trend"}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={studentData.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="score" fill="hsl(0,72%,51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === "academic" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "الأداء حسب المادة" : "Performance by Subject"}</h3>
          <div className="space-y-3">
            {studentData.subjects.map((s) => (
              <div key={s.name.en} className="flex items-center justify-between p-3 rounded border border-border">
                <span className="text-sm font-medium text-foreground">{lang === "ar" ? s.name.ar : s.name.en}</span>
                <span className={`font-bold ${s.score >= 60 ? "text-amber-600" : "text-destructive"}`}>{s.score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-3">{lang === "ar" ? "سجل الحضور" : "Attendance Record"}</h3>
          <p className="text-sm text-muted-foreground">{lang === "ar" ? `نسبة الحضور: ${studentData.attendance}%. تغيب 8 أيام هذا الفصل الدراسى. 3 تأخيرات متكررة.` : `Attendance rate: ${studentData.attendance}%. Absent 8 days this term. 3 recurring late arrivals.`}</p>
        </div>
      )}

      {activeTab === "notes" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{lang === "ar" ? "ملاحظات المتابعة" : "Follow-up Notes"}</h3>
          <div className="space-y-3">
            {studentData.notes.map((n, i) => (
              <div key={i} className="p-3 rounded border border-border">
                <div className="text-xs text-muted-foreground">{n.date}</div>
                <p className="text-sm text-foreground mt-1">{lang === "ar" ? n.text.ar : n.text.en}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <textarea className="w-full text-sm border border-border rounded px-3 py-2 bg-background resize-none" rows={2} placeholder={lang === "ar" ? "إضافة ملاحظة جديدة..." : "Add a new note..."} />
            <button className="mt-2 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded">{lang === "ar" ? "حفظ الملاحظة" : "Save Note"}</button>
          </div>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="bg-gold-light rounded-lg border border-gold/20 p-6">
          <div className="flex items-center gap-2 mb-3"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{lang === "ar" ? "توصيات الذكاء الاصطناعى" : "AI Recommendations"}</h3></div>
          <div className="space-y-2">
            {[
              { en: "Performance is declining consistently — schedule weekly one-on-one support", ar: "الأداء يتراجع باستمرار — جدول دعم فردى أسبوعى" },
              { en: "Attendance pattern suggests disengagement — investigate with parent", ar: "نمط الحضور يشير لانفصال — تحقق مع ولى الأمر" },
              { en: "Mathematics is weakest subject — consider simplified worksheet", ar: "الرياضيات هى الأضعف — فكّر فى ورقة عمل مبسطة" },
            ].map((r, i) => <div key={i} className="p-2 text-xs text-foreground/80">• {lang === "ar" ? r.ar : r.en}</div>)}
          </div>
          <div className="flex gap-2 mt-3">
            <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded">{lang === "ar" ? "إخطار ولى الأمر" : "Notify Parent"}</button>
            <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded">{lang === "ar" ? "جدولة جلسة دعم" : "Schedule Support"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
