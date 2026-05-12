import { useMemo, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useMyTeacherClasses,
  useStudentAttendanceInClasses,
  useStudentGradeSubjectBreakdown,
  useTeacherRoster,
  type RosterStudent,
} from "@/hooks/useTeacherData";
import { UserCheck, Search, Loader2, BookOpen, TrendingUp, TrendingDown, Activity } from "lucide-react";

export function StudentTracking() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  const { data: roster = [], isLoading: rosterLoad } = useTeacherRoster();
  const { data: tca = [] } = useMyTeacherClasses();

  const classOptions = useMemo(() => {
    const m = new Map<string, string>();
    tca.forEach((r) => {
      const name = r.classes?.name || r.class_id;
      if (r.class_id) m.set(r.class_id, name);
    });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1], isAr ? "ar" : "en"));
  }, [tca, isAr]);

  const [filterClassId, setFilterClassId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const teacherClassIds = useMemo(() => [...new Set(tca.map((r) => r.class_id).filter(Boolean))], [tca]);

  const filteredRoster = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roster.filter((r) => {
      if (filterClassId && !r.enrollments.some((e) => e.class_id === filterClassId)) return false;
      if (!q) return true;
      const name = (r.full_name || "").toLowerCase();
      const nid = (r.national_id || "").toLowerCase();
      return name.includes(q) || nid.includes(q);
    });
  }, [roster, filterClassId, search]);

  const selected = useMemo(
    () => roster.find((r) => r.student_id === selectedId) ?? null,
    [roster, selectedId],
  );

  const studentScopeClassIds = useMemo(() => {
    if (!selected) return [];
    return selected.enrollments.map((e) => e.class_id).filter((cid) => teacherClassIds.includes(cid));
  }, [selected, teacherClassIds]);

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">{isAr ? "متابعة أداء الطلاب" : "Student Performance Tracking"}</h2>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
          <div className="min-w-[180px] flex-1 sm:max-w-xs">
            <label className="block text-[10px] font-medium text-muted-foreground mb-1">
              {isAr ? "تصفية حسب الفصل" : "Filter by class"}
            </label>
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
            >
              <option value="">{isAr ? "كل الطلاب في فصولي" : "All my classes"}</option>
              {classOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? "بحث بالاسم أو الرقم القومي…" : "Search name or national ID…"}
              className="w-full ps-9 pe-3 py-2 border border-border rounded-lg text-sm bg-background"
            />
          </div>
        </div>

        {rosterLoad ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            {isAr ? "جارى تحميل الطلاب…" : "Loading students…"}
          </div>
        ) : classOptions.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-xl bg-muted/10">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {isAr
                ? "لم يتم ربطك بأى فصول بعد. من لوحة الإدارة اربطك بفصولك ليظهر هنا قائمة الطلاب."
                : "You have no classes linked yet — ask admin to assign you to classes."}
            </p>
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-xl bg-muted/10">
            <p className="text-sm text-muted-foreground">{isAr ? "لا يوجد طلاب يطابقون البحث." : "No students match filters."}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRoster.map((r) => (
              <button
                key={r.student_id}
                type="button"
                onClick={() => setSelectedId(r.student_id)}
                className={`text-start rounded-xl border p-4 transition-all hover:border-primary/40 hover:shadow-md ${
                  selectedId === r.student_id ? "border-primary ring-2 ring-primary/15 bg-primary/5" : "border-border bg-background"
                }`}
              >
                <p className="font-medium text-foreground text-sm truncate">{r.full_name || (isAr ? "بدون اسم" : "No name")}</p>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                  {r.enrollments.map((e) => e.class_name).join(isAr ? " · " : " · ")}
                </p>
                {r.grade_number != null && (
                  <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {isAr ? `الصف ${r.grade_number}` : `Grade ${r.grade_number}`}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected ? (
        <StudentPerformancePanel student={selected} scopeClassIds={studentScopeClassIds} isAr={isAr} />
      ) : roster.length > 0 && !rosterLoad ? (
        <p className="text-center text-xs text-muted-foreground">{isAr ? "اختر طالباً من القائمة لعرض تقريره." : "Pick a student to see their summary."}</p>
      ) : null}
    </div>
  );
}

function StudentPerformancePanel({
  student,
  scopeClassIds,
  isAr,
}: {
  student: RosterStudent;
  scopeClassIds: string[];
  isAr: boolean;
}) {
  const { data: breakdown = [], isLoading: gl } = useStudentGradeSubjectBreakdown(student.student_id);
  const { data: att, isLoading: al } = useStudentAttendanceInClasses(student.student_id, scopeClassIds);

  const strengths = breakdown.filter((b) => b.avgPercent >= 75);
  const weaknesses = breakdown.filter((b) => b.avgPercent < 50 && b.count >= 1);

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{student.full_name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{student.enrollments.map((e) => e.class_name).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/40 border border-border">
            <Activity className="w-4 h-4 text-primary" />
            <span>
              {al ? (
                "…"
              ) : att && att.total > 0 ? (
                <>
                  {isAr ? "الحضور (آخر ٩٠ يومًا)" : "Attendance (last 90d)"}:{" "}
                  <strong>{att.ratePct ?? 0}%</strong>
                  {" "}({att.present}/{att.total})
                </>
              ) : (
                isAr ? "لا سجلات حضور حديثة" : "No recent attendance"
              )}
            </span>
          </div>
        </div>
      </div>

      {gl ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> {isAr ? "تحميل الدرجات…" : "Loading grades…"}
        </div>
      ) : breakdown.length === 0 ? (
        <p className="text-sm text-muted-foreground">{isAr ? "لا توجد درجات مسجَّلة لهذا الطالب بعد." : "No grades recorded yet for this student."}</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-green-700/15 bg-green-600/5 p-4">
            <h4 className="text-xs font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {isAr ? "مجالات القوة (متوسط ≧ ٧٥٪)" : "Strengths (avg ≥ 75%)"}
            </h4>
            {strengths.length === 0 ? (
              <p className="text-xs text-muted-foreground">{isAr ? "لا يوجد بعد — ستظهر مع المزيد من الاختبارات." : "None yet."}</p>
            ) : (
              <ul className="space-y-2">
                {strengths.map((s) => (
                  <li key={`${s.subject_id}-${s.name}`} className="flex justify-between text-sm gap-2">
                    <span className="truncate">{isAr ? s.name_ar || s.name : s.name || s.name_ar}</span>
                    <span className="font-semibold text-green-700 dark:text-green-400 shrink-0">{s.avgPercent}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border border-red-700/15 bg-red-600/5 p-4">
            <h4 className="text-xs font-semibold text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              {isAr ? "يحتاج دعماً (متوسط أقل من ٥٠٪)" : "Needs support (avg < 50%)"}
            </h4>
            {weaknesses.length === 0 ? (
              <p className="text-xs text-muted-foreground">{isAr ? "ممتاز — لا مواد ضعيفة وفق المتوسط المحسوب." : "No weak subjects flagged."}</p>
            ) : (
              <ul className="space-y-2">
                {weaknesses.map((s) => (
                  <li key={`w-${s.subject_id}-${s.name}`} className="flex justify-between text-sm gap-2">
                    <span className="truncate">{isAr ? s.name_ar || s.name : s.name || s.name_ar}</span>
                    <span className="font-semibold text-red-700 dark:text-red-400 shrink-0">{s.avgPercent}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="md:col-span-2 rounded-lg border border-border p-4">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">{isAr ? "كل المواد حسب المتوسط المحسوب" : "Subject averages"}</h4>
            <div className="flex flex-wrap gap-2">
              {breakdown.map((s) => (
                <span
                  key={`tag-${s.subject_id}-${s.name}`}
                  className={`text-[11px] px-2 py-1 rounded-full border ${
                    s.avgPercent >= 75
                      ? "border-green-500/30 bg-green-500/10 text-green-800 dark:text-green-200"
                      : s.avgPercent < 50
                        ? "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200"
                        : "border-border bg-muted/40"
                  }`}
                >
                  {isAr ? s.name_ar || s.name : s.name || s.name_ar} · {s.avgPercent}% ({s.count})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
