import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { useStudentRegistrationInfo, useSubjectsByStage, useStudentAssignments, useStudentGrades } from "@/hooks/useStudentData";
import {
  BookOpen, ClipboardCheck, CalendarDays, TrendingUp, AlertTriangle,
  Bot, CheckCircle2, Clock, RefreshCw, Sparkles,
} from "lucide-react";

const AI_BASE = import.meta.env.VITE_AI_AGENT_URL || "http://localhost:8000";

function useAISummary(userId: string | undefined) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = async (force = false) => {
    if (!userId) return;
    setLoading(true); setError(null);
    try {
      const cacheKey = `ai_summary_${userId}`;
      const cached = !force && sessionStorage.getItem(cacheKey);
      if (cached) { setSummary(cached); setLoading(false); return; }
      const r = await fetch(`${AI_BASE}/student/summary?user_id=${userId}`);
      if (!r.ok) throw new Error("AI unavailable");
      const d = await r.json();
      setSummary(d.summary);
      sessionStorage.setItem(cacheKey, d.summary);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch_(); }, [userId]);
  return { summary, loading, error, refresh: () => fetch_(true) };
}

interface StudentOverviewProps {
  onNavigate?: (tab: string) => void;
}

export function StudentOverview({ onNavigate }: StudentOverviewProps) {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { user } = useAuth();
  const { data: regInfo } = useStudentRegistrationInfo();
  const { data: subjects } = useSubjectsByStage(regInfo?.stage_id, null);
  const { data: assignments = [] } = useStudentAssignments();
  const { data: grades = [] } = useStudentGrades();
  const { summary, loading: summaryLoading, error: summaryError, refresh } = useAISummary(user?.id);

  const subjectCount = subjects?.length ?? 0;
  const today = new Date().toISOString().split("T")[0];
  const pendingAssignments = assignments.filter((a) => !a.due_date || a.due_date >= today);
  const upcomingQuizzes = assignments.filter((a) => a.assignment_type === "quiz");
  const avgScore = grades.length
    ? Math.round(grades.reduce((s, g) => s + ((g.score ?? 0) / (g.max_score || 100)) * 100, 0) / grades.length)
    : null;
  const weakSubjects = grades.filter((g) => ((g.score ?? 0) / (g.max_score || 100)) * 100 < 60).length;

  const kpis = [
    { label: { en: "My Subjects", ar: "موادى" }, value: subjectCount.toString(), icon: BookOpen, color: "text-primary" },
    { label: { en: "Pending Assignments", ar: "واجبات معلقة" }, value: pendingAssignments.length.toString(), icon: ClipboardCheck, color: "text-blue-600" },
    { label: { en: "Upcoming Quizzes", ar: "اختبارات قادمة" }, value: upcomingQuizzes.length.toString(), icon: CalendarDays, color: "text-purple-600" },
    { label: { en: "Current Average", ar: "المتوسط الحالى" }, value: avgScore !== null ? `${avgScore}%` : "—", icon: TrendingUp, color: avgScore !== null && avgScore >= 70 ? "text-green-600" : "text-amber-600" },
    { label: { en: "Grades Recorded", ar: "درجات مُسجَّلة" }, value: grades.length.toString(), icon: CheckCircle2, color: "text-green-600" },
    { label: { en: "Needs Improvement", ar: "تحتاج تحسين" }, value: weakSubjects.toString(), icon: AlertTriangle, color: weakSubjects > 0 ? "text-destructive" : "text-muted-foreground" },
  ];

  // today tasks: assignments due today
  const todayTasks = assignments.filter((a) => a.due_date === today);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label.en} className="bg-surface-elevated rounded-lg border border-border p-4">
            <kpi.icon className={`w-5 h-5 ${kpi.color} mb-2`} />
            <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{isAr ? kpi.label.ar : kpi.label.en}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* AI Summary */}
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-gold" />
              <h2 className="font-semibold text-foreground">{isAr ? "ملخص الذكاء الاصطناعى الدراسى" : "AI Study Summary"}</h2>
            </div>
            <button
              onClick={refresh}
              disabled={summaryLoading}
              title={isAr ? "تحديث الملخص" : "Refresh summary"}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${summaryLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
          {summaryLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 animate-pulse text-gold" />
              {isAr ? "جارى توليد الملخص..." : "Generating summary..."}
            </div>
          ) : summaryError ? (
            <p className="text-sm text-muted-foreground italic">
              {isAr ? "تعذّر تحميل الملخص. اضغط تحديث للمحاولة مجدداً." : "Could not load summary. Click refresh to retry."}
            </p>
          ) : summary ? (
            <p className="text-sm text-foreground leading-relaxed">{summary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isAr
                ? "مرحباً بك! سيظهر ملخص مخصص بعد تسجيل أول نشاط أكاديمى."
                : "Welcome! A personalized summary will appear after your first academic activity."}
            </p>
          )}
        </div>

        {/* Today's Tasks */}
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">{isAr ? "مهام اليوم" : "Today's Tasks"}</h2>
          <div className="space-y-3">
            {todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <CheckCircle2 className="w-8 h-8 text-green-500/40" />
                <p className="text-sm text-muted-foreground">{isAr ? "لا توجد مهام مُستحقة اليوم 🎉" : "No tasks due today 🎉"}</p>
              </div>
            ) : (
              todayTasks.map((t, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {isAr ? (t.title_ar || t.title) : t.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{t.assignment_type}</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700 shrink-0">
                    {isAr ? "اليوم" : "Today"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h2 className="font-semibold text-foreground mb-4">{isAr ? "إجراءات سريعة" : "Quick Actions"}</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { en: "Start Revision", ar: "بدء المراجعة", tab: "revision" },
            { en: "Open Assignment", ar: "فتح الواجب", tab: "assignments" },
            { en: "Ask AI for Help", ar: "اسأل الذكاء الاصطناعى", tab: "ai" },
            { en: "Practice Questions", ar: "أسئلة تدريب", tab: "assessments" },
            { en: "View Grades", ar: "عرض الدرجات", tab: "grades" },
          ].map((a) => (
            <button
              key={a.en}
              onClick={() => onNavigate?.(a.tab)}
              className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              {isAr ? a.ar : a.en}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
