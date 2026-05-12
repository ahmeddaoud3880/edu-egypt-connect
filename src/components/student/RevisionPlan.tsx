import { useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Brain, Clock, AlertCircle, BookOpen, TrendingDown, CheckCircle2, Loader2, Zap } from "lucide-react";
import { useStudentRegistrationInfo, useSubjectsByStage, useStudentGrades } from "@/hooks/useStudentData";

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const SESSION_DURATIONS = [45, 30, 60, 30, 45]; // minutes per day

interface RevisionSlot {
  subject: string;
  subjectAr: string;
  color: string;
  priority: "high" | "medium" | "low";
  avgScore: number | null;
  minutes: number;
}

export function RevisionPlan() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { data: regInfo, isLoading: regLoading } = useStudentRegistrationInfo();
  const { data: subjects = [], isLoading: subLoading } = useSubjectsByStage(
    regInfo?.stage_id,
    regInfo?.grade_number ?? null
  );
  const { data: grades = [], isLoading: gradesLoading } = useStudentGrades();

  const isLoading = regLoading || subLoading || gradesLoading;

  // Compute average score per subject from real grades
  const subjectScores = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const g of grades) {
      if (!g.subject_id || g.score === null) continue;
      const max = Math.max(Number(g.max_score ?? 100), 1);
      const pct = (Number(g.score) / max) * 100;
      if (!map.has(g.subject_id)) map.set(g.subject_id, { total: 0, count: 0 });
      const s = map.get(g.subject_id)!;
      s.total += pct;
      s.count++;
    }
    return map;
  }, [grades]);

  // Build prioritized revision slots
  const revisionSlots: RevisionSlot[] = useMemo(() => {
    if (!subjects.length) return [];

    return subjects
      .map((s) => {
        const sc = subjectScores.get(s.id);
        const avgScore = sc ? Math.round(sc.total / sc.count) : null;
        let priority: "high" | "medium" | "low" = "medium";
        if (avgScore !== null) {
          if (avgScore < 50) priority = "high";
          else if (avgScore >= 75) priority = "low";
        }
        return {
          subject: s.name,
          subjectAr: s.name_ar,
          color: s.color ?? "#4A90D9",
          priority,
          avgScore,
          minutes: priority === "high" ? 60 : priority === "medium" ? 45 : 30,
        };
      })
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      });
  }, [subjects, subjectScores]);

  // Distribute subjects across 5 days (smart scheduling: weaker subjects appear more often)
  const weeklyPlan = useMemo(() => {
    if (!revisionSlots.length) return DAYS_EN.map(() => [] as RevisionSlot[]);
    const plan: RevisionSlot[][] = [[], [], [], [], []];
    let dayIdx = 0;
    for (const slot of revisionSlots) {
      const reps = slot.priority === "high" ? 3 : slot.priority === "medium" ? 2 : 1;
      for (let r = 0; r < reps; r++) {
        plan[dayIdx % 5].push(slot);
        dayIdx++;
      }
    }
    return plan;
  }, [revisionSlots]);

  const priorityStyle = (p: "high" | "medium" | "low") => ({
    high: { cls: "border-red-200 bg-red-50/50", badge: "text-red-700 bg-red-100 border-red-200", icon: TrendingDown },
    medium: { cls: "border-amber-200 bg-amber-50/50", badge: "text-amber-700 bg-amber-100 border-amber-200", icon: Clock },
    low: { cls: "border-green-200 bg-green-50/50", badge: "text-green-700 bg-green-100 border-green-200", icon: CheckCircle2 },
  }[p]);

  if (isLoading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> {isAr ? "جارى إعداد خطة المراجعة..." : "Preparing revision plan..."}
    </div>
  );

  if (!regInfo || !["approved", "activated"].includes(regInfo.request_status)) {
    return (
      <div className="bg-surface-elevated rounded-lg border border-amber-200 p-8 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <p className="text-sm text-muted-foreground">
          {isAr ? "سيُنشئ المساعد الذكى خطة مراجعتك بعد تفعيل حسابك." : "The AI assistant will build your revision plan after account activation."}
        </p>
      </div>
    );
  }

  const highPriority = revisionSlots.filter(s => s.priority === "high");
  const medPriority = revisionSlots.filter(s => s.priority === "medium");
  const lowPriority = revisionSlots.filter(s => s.priority === "low");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "خطة المراجعة الذكية" : "Smart Revision Plan"}</h2>
      </div>

      {/* AI Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
        <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">{isAr ? "جدولة ذكية مبنية على أدائك الفعلي" : "Smart scheduling based on your actual performance"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAr
              ? `${revisionSlots.length} مادة • المواد الأضعف تأخذ أولوية أعلى في الجدول`
              : `${revisionSlots.length} subjects • Weaker subjects get higher priority in the schedule`}
          </p>
        </div>
      </div>

      {/* Priority Legend */}
      {revisionSlots.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: isAr ? "أولوية عالية" : "High Priority", count: highPriority.length, color: "text-red-700 bg-red-50 border-red-200", desc: isAr ? "أقل من 50%" : "< 50%" },
            { label: isAr ? "أولوية متوسطة" : "Medium Priority", count: medPriority.length, color: "text-amber-700 bg-amber-50 border-amber-200", desc: isAr ? "50% - 74%" : "50%-74%" },
            { label: isAr ? "مراجعة خفيفة" : "Light Review", count: lowPriority.length, color: "text-green-700 bg-green-50 border-green-200", desc: isAr ? "75% فأكثر" : "75%+" },
          ].map((item) => (
            <div key={item.label} className={`p-3 rounded-lg border text-center ${item.color}`}>
              <p className="text-xl font-bold">{item.count}</p>
              <p className="text-xs font-medium mt-0.5">{item.label}</p>
              <p className="text-[10px] opacity-70">{item.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Weekly Grid */}
      {revisionSlots.length > 0 ? (
        <div className="bg-surface-elevated rounded-lg border border-border p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">{isAr ? "الجدول الأسبوعي المقترح" : "Suggested Weekly Schedule"}</h3>
          <div className="grid grid-cols-5 gap-2">
            {(isAr ? DAYS_AR : DAYS_EN).map((day, idx) => (
              <div key={day} className="bg-muted/20 border border-border rounded-lg p-2 min-h-[160px]">
                <p className="text-xs font-semibold text-foreground mb-2 truncate pb-1 border-b border-border">{day}</p>
                {weeklyPlan[idx].length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/50 italic text-center mt-4">{isAr ? "راحة" : "Rest"}</p>
                ) : (
                  <div className="space-y-1.5">
                    {weeklyPlan[idx].map((slot, i) => {
                      const style = priorityStyle(slot.priority);
                      const Icon = style.icon;
                      return (
                        <div key={i} className={`rounded border px-1.5 py-1 ${style.cls}`}>
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: slot.color }} />
                            <span className="text-[9px] font-medium truncate text-foreground leading-tight">
                              {isAr ? slot.subjectAr : slot.subject}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Icon className="w-2.5 h-2.5 shrink-0 text-muted-foreground" />
                            <span className="text-[8px] text-muted-foreground">{slot.minutes}{isAr ? " د" : "min"}</span>
                            {slot.avgScore !== null && (
                              <span className="text-[8px] text-muted-foreground ms-auto">{slot.avgScore}%</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-[8px] text-muted-foreground text-center pt-1">
                      ~{SESSION_DURATIONS[idx]}{isAr ? " دقيقة" : "min"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-surface-elevated rounded-lg border border-border p-12 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-1">{isAr ? "لا توجد مواد لجدولتها" : "No subjects to schedule"}</h3>
          <p className="text-sm text-muted-foreground">{isAr ? "سيظهر الجدول عند تحديد المرحلة والصف الدراسي." : "The schedule will appear when your stage and grade are set."}</p>
        </div>
      )}

      {/* Subject Priority Breakdown */}
      {revisionSlots.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground text-sm">{isAr ? "تفاصيل أولويات المراجعة" : "Revision Priority Details"}</h3>
          {revisionSlots.map((slot) => {
            const style = priorityStyle(slot.priority);
            const Icon = style.icon;
            return (
              <div key={slot.subject} className={`rounded-lg border p-3 flex items-center gap-3 ${style.cls}`}>
                <div className="w-3 h-8 rounded-full shrink-0" style={{ backgroundColor: slot.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{isAr ? slot.subjectAr : slot.subject}</span>
                    <span className={`text-[10px] border px-1.5 py-0.5 rounded-full ${style.badge} flex items-center gap-1`}>
                      <Icon className="w-2.5 h-2.5" />
                      {isAr
                        ? slot.priority === "high" ? "أولوية عالية" : slot.priority === "medium" ? "متوسطة" : "خفيفة"
                        : slot.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    {slot.avgScore !== null ? (
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${slot.avgScore < 50 ? "bg-red-500" : slot.avgScore < 75 ? "bg-amber-500" : "bg-green-500"}`}
                            style={{ width: `${slot.avgScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-foreground shrink-0">{slot.avgScore}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">{isAr ? "لا توجد درجات بعد" : "No grades yet"}</span>
                    )}
                    <span className="text-xs text-muted-foreground shrink-0">{slot.minutes}{isAr ? " د/يوم" : "min/day"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
