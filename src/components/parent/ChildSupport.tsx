import { useTranslation } from "@/hooks/useTranslation";
import { Star, AlertTriangle, TrendingUp, Home, CheckCircle2, Loader2, Users } from "lucide-react";
import { useMyChildren, useChildGrades, useChildAttendance, ChildProfile } from "@/hooks/useParentData";
import { useMemo } from "react";

function ChildRiskAnalysis({ child, isAr }: { child: ChildProfile; isAr: boolean }) {
  const { data: grades = [], isLoading: loadingGrades } = useChildGrades(child.student_id);
  const { data: attendance = [], isLoading: loadingAttendance } = useChildAttendance(child.student_id);

  const isLoading = loadingGrades || loadingAttendance;

  const analysis = useMemo(() => {
    if (isLoading) return null;

    const doingWell: string[] = [];
    const needsHelp: string[] = [];
    const actions: string[] = [];
    let isCritical = false;
    let isWarning = false;

    // Attendance analysis
    const attList = attendance as any[];
    if (attList.length > 0) {
      let present = 0, absent = 0;
      attList.forEach(r => {
        if (r.status === "present") present++;
        else if (r.status === "absent") absent++;
      });
      const rate = Math.round((present / attList.length) * 100);
      if (rate >= 90) {
        doingWell.push(isAr ? `حضور ممتاز (${rate}%)` : `Excellent attendance (${rate}%)`);
      } else if (rate < 70) {
        needsHelp.push(isAr ? `غياب متكرر (حضور ${rate}%)` : `Repeated absence (attendance ${rate}%)`);
        actions.push(isAr ? `تواصل مع مدرسة ${child.full_name} بخصوص الغياب` : `Contact school about ${child.full_name}'s absence`);
        isCritical = true;
      } else if (rate < 85) {
        needsHelp.push(isAr ? `معدل حضور منخفض (${rate}%)` : `Low attendance rate (${rate}%)`);
        isWarning = true;
      }
    }

    // Grades analysis
    const scoredGrades = grades.filter(g => g.score !== null);
    if (scoredGrades.length > 0) {
      const subjectsMap = new Map<string, { totalPct: number; count: number; name: string }>();
      scoredGrades.forEach(g => {
        const sid = g.subject_id;
        if (!sid) return;
        const max = Math.max(Number(g.max_score ?? 100), 1);
        const pct = (Number(g.score) / max) * 100;
        const sname = (isAr ? g.subjects?.name_ar || g.subjects?.name : g.subjects?.name) || "Subject";
        if (!subjectsMap.has(sid)) subjectsMap.set(sid, { totalPct: 0, count: 0, name: sname });
        const s = subjectsMap.get(sid)!;
        s.totalPct += pct;
        s.count++;
      });

      let poorSubjects = 0;
      for (const [_, s] of subjectsMap) {
        const avg = Math.round(s.totalPct / s.count);
        if (avg >= 85) {
          doingWell.push(isAr ? `${s.name} — أداء ممتاز (${avg}%)` : `${s.name} — excellent performance (${avg}%)`);
        } else if (avg < 50) {
          needsHelp.push(isAr ? `${s.name} (${avg}%) — يحتاج تدريب ومتابعة` : `${s.name} (${avg}%) — needs practice & follow-up`);
          actions.push(isAr ? `راجع دروس ${s.name} مع ${child.full_name}` : `Review ${s.name} lessons with ${child.full_name}`);
          poorSubjects++;
        }
      }

      if (poorSubjects >= 2) isCritical = true;
      else if (poorSubjects === 1) isWarning = true;
    }

    if (doingWell.length === 0 && needsHelp.length === 0 && scoredGrades.length === 0) {
      doingWell.push(isAr ? "البيانات الأكاديمية قيد التحديث" : "Academic data is updating");
    }

    return { doingWell, needsHelp, actions, isCritical, isWarning };
  }, [grades, attendance, isLoading, child, isAr]);

  if (isLoading) return (
    <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground border-b border-border/50">
      <Loader2 className="w-3 h-3 animate-spin" /> {child.full_name} ({isAr ? "جارى التحليل..." : "Analyzing..."})
    </div>
  );

  if (!analysis) return null;

  return (
    <>
      {/* Doing Well */}
      {analysis.doingWell.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-foreground mb-2">{child.full_name}</h4>
          <div className="space-y-1">
            {analysis.doingWell.map((item, i) => (
              <div key={i} className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 shrink-0" />{item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Needs Help */}
      {analysis.needsHelp.length > 0 && (
        <div className="mb-4 mt-6">
          <h4 className="text-sm font-medium text-foreground mb-2">{child.full_name}</h4>
          <div className="space-y-1">
            {analysis.needsHelp.map((item, i) => (
              <div key={i} className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 shrink-0" />{item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expose Actions and Risks up by rendering them visually but styled properly */}
      {/* (In a fully robust app we'd pass state up, but for simplicity we render sections here if needed) */}
    </>
  );
}

// We map children to get their raw analysis data
function ChildSupportContent({ myChildren, isAr }: { myChildren: ChildProfile[], isAr: boolean }) {
  // We'll just render the ChildRiskAnalysis directly in the sections by passing a prop if we want it isolated.
  // Actually, standardizing the cards:
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Doing Well */}
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-green-600" />
            <h3 className="font-semibold text-foreground">{isAr ? "ما يقوم به أبناؤك بشكل جيد" : "What Your Children Are Doing Well"}</h3>
          </div>
          {myChildren.map((child) => (
            <div key={`well-${child.student_id}`} className="mb-2">
               <ChildRiskAnalysis child={child} isAr={isAr} />
            </div>
          ))}
        </div>

        {/* Needs Help */}
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-foreground">{isAr ? "ما يحتاج دعمك فى المنزل" : "What Needs Your Support at Home"}</h3>
          </div>
          {myChildren.map((child) => (
            <div key={`help-${child.student_id}`} className="mb-2">
               {/* Note: This is a bit duplicative since ChildRiskAnalysis renders both. Let's fix this in a better way. */}
               <ChildRiskAnalysis child={child} isAr={isAr} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ChildSupport() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { data: myChildren = [], isLoading } = useMyChildren();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>{isAr ? "جارى تحليل البيانات..." : "Analyzing data..."}</span>
      </div>
    );
  }

  if (myChildren.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-lg border border-border p-12 text-center space-y-3">
        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto" />
        <h3 className="font-semibold text-foreground">{isAr ? "لا يوجد أبناء مرتبطون" : "No Linked Children"}</h3>
      </div>
    );
  }

  // To avoid duplicate rendering logic from the sub-component, let's create a combined component
  // that holds the state for all children or simply use separate components for each child entirely.
  
  return (
    <div className="space-y-6">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
        <Home className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">{isAr ? "نظام الدعم الأسري الذكي" : "Smart Family Support System"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAr
              ? "يقوم النظام بتحليل درجات وحضور الأبناء آلياً لتوجيهك نحو نقاط القوة والمجالات التي تحتاج تدخلاً."
              : "The system automatically analyzes children's grades and attendance to guide you toward strengths and areas needing intervention."}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {myChildren.map(child => (
          <div key={child.student_id} className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
             <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center gap-2">
               <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                 {child.full_name?.charAt(0) || "U"}
               </div>
               <span className="font-semibold text-foreground text-sm">{child.full_name}</span>
             </div>
             <div className="p-4">
               <ChildRiskAnalysis child={child} isAr={isAr} />
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
