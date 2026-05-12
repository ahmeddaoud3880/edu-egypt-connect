import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Clock, BookOpen, Users, Calendar, GraduationCap } from "lucide-react";
import { useMyTeacherClasses } from "@/hooks/useTeacherData";

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu"];

const COLORS = [
  "bg-blue-50 border-blue-200 text-blue-800",
  "bg-green-50 border-green-200 text-green-800",
  "bg-purple-50 border-purple-200 text-purple-800",
  "bg-amber-50 border-amber-200 text-amber-800",
  "bg-rose-50 border-rose-200 text-rose-800",
  "bg-cyan-50 border-cyan-200 text-cyan-800",
];

export function MySchedule() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { data: classes = [], isLoading } = useMyTeacherClasses();

  const today = new Date().getDay(); // 0=Sun
  const todayIndex = today === 5 || today === 6 ? -1 : today; // Friday/Saturday = no school

  // Deduplicate classes for display
  const uniqueClasses = [...new Map(classes.map((c) => [c.class_id, c])).values()];

  // Build a weekly grid: spread classes across days 0-4 deterministically
  const daySlots: Record<number, typeof classes> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
  uniqueClasses.forEach((cls, idx) => {
    const day = idx % 5;
    daySlots[day].push(cls);
  });

  const todayClasses = todayIndex >= 0 ? (daySlots[todayIndex] || []) : [];

  const weekStats = {
    totalClasses: uniqueClasses.length,
    subjects: new Set(classes.map((c) => c.subject_id).filter(Boolean)).size,
    totalSessions: classes.length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: isAr ? "الفصول" : "Classes", value: weekStats.totalClasses, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: isAr ? "المواد" : "Subjects", value: weekStats.subjects, icon: BookOpen, color: "text-green-600 bg-green-50" },
          { label: isAr ? "إجمالى الحصص" : "Total Sessions", value: weekStats.totalSessions, icon: Calendar, color: "text-purple-600 bg-purple-50" },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-elevated rounded-lg border border-border p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "—" : stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Today's Classes */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">{isAr ? "حصص اليوم" : "Today's Classes"}</h2>
          {todayIndex >= 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {isAr ? DAYS_AR[todayIndex] : DAYS_EN[todayIndex]}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : todayIndex < 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-lg bg-muted/5">
            <Calendar className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{isAr ? "لا دراسة اليوم" : "No school today"}</p>
          </div>
        ) : todayClasses.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-lg bg-muted/5">
            <GraduationCap className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {isAr ? "لا توجد حصص مسجلة لليوم" : "No sessions assigned for today"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayClasses.map((cls, idx) => (
              <div
                key={cls.id}
                className={`flex items-center gap-4 p-4 rounded-lg border ${COLORS[idx % COLORS.length]}`}
              >
                <div className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center font-bold text-sm shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {isAr ? cls.subjects?.name_ar || cls.subjects?.name : cls.subjects?.name || cls.subjects?.name_ar || (isAr ? "مادة غير محددة" : "Unknown Subject")}
                  </p>
                  <p className="text-xs opacity-70 mt-0.5">
                    {cls.classes?.name || cls.class_id}
                  </p>
                </div>
                <div className="text-xs opacity-70 shrink-0">
                  {isAr ? `الفترة ${idx + 1}` : `Period ${idx + 1}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Timetable */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h2 className="font-semibold text-foreground mb-4">{isAr ? "الجدول الأسبوعى" : "Weekly Timetable"}</h2>
        <div className="grid grid-cols-5 gap-3">
          {DAYS_AR.map((dayAr, dayIdx) => {
            const isToday = dayIdx === todayIndex;
            const slots = daySlots[dayIdx] || [];
            return (
              <div
                key={dayIdx}
                className={`rounded-lg border p-3 ${isToday ? "border-primary bg-primary/5" : "border-border bg-surface"}`}
              >
                <div className={`text-xs font-semibold mb-2 text-center ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {isAr ? dayAr : DAYS_EN[dayIdx]}
                </div>
                {slots.length === 0 ? (
                  <div className="text-center text-muted-foreground/40 text-xs py-2">—</div>
                ) : (
                  <div className="space-y-1.5">
                    {slots.map((cls, idx) => (
                      <div
                        key={cls.id}
                        className={`text-xs p-1.5 rounded text-center truncate ${COLORS[idx % COLORS.length]}`}
                        title={isAr ? cls.subjects?.name_ar || cls.classes?.name : cls.subjects?.name || cls.classes?.name}
                      >
                        {isAr
                          ? (cls.subjects?.name_ar || cls.subjects?.name || cls.classes?.name || "—")
                          : (cls.subjects?.name || cls.subjects?.name_ar || cls.classes?.name || "—")}
                      </div>
                    ))}
                  </div>
                )}
                <div className={`text-center text-xs mt-2 ${isToday ? "text-primary font-medium" : "text-muted-foreground/50"}`}>
                  {slots.length} {isAr ? "حصة" : "session"}
                </div>
              </div>
            );
          })}
        </div>

        {!isLoading && uniqueClasses.length === 0 && (
          <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20 flex items-center gap-3">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-primary font-medium">
              {isAr
                ? "بمجرد إسناد الجدول الدراسى لك من إدارة المدرسة، ستظهر حصصك هنا."
                : "Once the school assigns your timetable, your sessions will appear here."}
            </p>
          </div>
        )}
      </div>

      {/* Class Roster Summary */}
      {uniqueClasses.length > 0 && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">{isAr ? "فصولى المُسندة" : "My Assigned Classes"}</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {uniqueClasses.map((cls, idx) => (
              <div key={cls.class_id} className={`p-3 rounded-lg border ${COLORS[idx % COLORS.length]}`}>
                <p className="font-semibold text-sm">{cls.classes?.name || cls.class_id}</p>
                {cls.subjects && (
                  <p className="text-xs mt-0.5 opacity-80">
                    {isAr ? cls.subjects.name_ar || cls.subjects.name : cls.subjects.name || cls.subjects.name_ar}
                  </p>
                )}
                <p className="text-xs mt-1 opacity-60">{cls.academic_year}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
