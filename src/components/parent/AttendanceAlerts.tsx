import { useState, useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  CalendarCheck, CheckCircle2, XCircle, Clock, Users, Loader2,
  ChevronDown, ChevronUp, BookOpen,
} from "lucide-react";
import { useMyChildren, useChildAttendance } from "@/hooks/useParentData";

const STATUS_STYLE: Record<string, { color: string; bg: string; icon: React.ElementType; labelAr: string; labelEn: string }> = {
  present: { color: "text-green-700", bg: "bg-green-100", icon: CheckCircle2, labelAr: "حاضر", labelEn: "Present" },
  absent:  { color: "text-red-700",   bg: "bg-red-100",   icon: XCircle,      labelAr: "غائب",  labelEn: "Absent"  },
  late:    { color: "text-amber-700", bg: "bg-amber-100", icon: Clock,        labelAr: "متأخر", labelEn: "Late"    },
};

interface SubjectGroup {
  subjectId: string;
  subjectName: string;
  records: any[];
  presentCount: number;
  absentCount: number;
  lateCount: number;
  rate: number;
}

function deriveSubjectGroups(records: any[], isAr: boolean): SubjectGroup[] {
  const map = new Map<string, SubjectGroup>();

  for (const r of records) {
    const tcas = r.classes?.teacher_class_assignments || [];

    if (tcas.length === 0) {
      // No subject info — put under "General" bucket
      const key = "__general__";
      if (!map.has(key)) {
        map.set(key, {
          subjectId: key,
          subjectName: isAr ? "عام" : "General",
          records: [],
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          rate: 0,
        });
      }
      const g = map.get(key)!;
      g.records.push(r);
      if (r.status === "present") g.presentCount++;
      else if (r.status === "absent") g.absentCount++;
      else if (r.status === "late") g.lateCount++;
    } else {
      // Each TCA = one subject; share the attendance record across subjects of the same class
      const seen = new Set<string>();
      for (const tca of tcas) {
        const sub = tca.subjects;
        const key = sub?.id || tca.subject_id || "__unknown__";
        if (seen.has(key)) continue;
        seen.add(key);
        const name = (isAr ? sub?.name_ar : sub?.name) || sub?.name || sub?.name_ar || (isAr ? "مادة" : "Subject");
        if (!map.has(key)) {
          map.set(key, {
            subjectId: key,
            subjectName: name,
            records: [],
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            rate: 0,
          });
        }
        const g = map.get(key)!;
        // Avoid duplicate dates per subject
        const alreadyDate = g.records.some((x: any) => x.date === r.date && x.id === r.id);
        if (!alreadyDate) {
          g.records.push(r);
          if (r.status === "present") g.presentCount++;
          else if (r.status === "absent") g.absentCount++;
          else if (r.status === "late") g.lateCount++;
        }
      }
    }
  }

  // Compute rates
  for (const g of map.values()) {
    const total = g.records.length;
    g.rate = total > 0 ? Math.round((g.presentCount / total) * 100) : 100;
  }

  return Array.from(map.values()).sort((a, b) => a.subjectName.localeCompare(b.subjectName, "ar"));
}

function SubjectRow({ group, isAr }: { group: SubjectGroup; isAr: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const rateColor = group.rate >= 90 ? "text-green-700" : group.rate >= 75 ? "text-amber-700" : "text-red-700";
  const rateBg   = group.rate >= 90 ? "bg-green-50 border-green-200" : group.rate >= 75 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Subject header row — clickable */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-surface-elevated hover:bg-muted/40 transition-colors text-start"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{group.subjectName}</p>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span className="text-green-600">✓ {group.presentCount}</span>
            <span className="text-red-600">✗ {group.absentCount}</span>
            {group.lateCount > 0 && <span className="text-amber-600">⏱ {group.lateCount}</span>}
          </div>
        </div>
        <div className={`text-sm font-bold px-2.5 py-1 rounded-full border ${rateColor} ${rateBg} shrink-0`}>
          {group.rate}%
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {/* Drill-down details */}
      {expanded && (
        <div className="border-t border-border">
          {group.records.length === 0 ? (
            <p className="p-4 text-sm text-center text-muted-foreground">
              {isAr ? "لا سجلات" : "No records"}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/20 border-b border-border">
                  <th className="text-start p-3 text-xs font-medium text-muted-foreground">
                    {isAr ? "التاريخ" : "Date"}
                  </th>
                  <th className="text-start p-3 text-xs font-medium text-muted-foreground">
                    {isAr ? "الفصل" : "Class"}
                  </th>
                  <th className="text-center p-3 text-xs font-medium text-muted-foreground">
                    {isAr ? "الحالة" : "Status"}
                  </th>
                  {group.records.some((r: any) => r.notes) && (
                    <th className="text-start p-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">
                      {isAr ? "ملاحظة" : "Note"}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {group.records.map((r: any, idx: number) => {
                  const s = STATUS_STYLE[r.status] || STATUS_STYLE.present;
                  const Icon = s.icon;
                  return (
                    <tr
                      key={`${r.id}-${idx}`}
                      className={`border-b border-border/40 ${idx % 2 === 0 ? "" : "bg-muted/5"}`}
                    >
                      <td className="p-3 text-foreground text-xs font-mono">
                        {new Date(r.date).toLocaleDateString(isAr ? "ar-EG" : "en-US")}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {r.classes?.name || "—"}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
                          <Icon className="w-3 h-3" />
                          {isAr ? s.labelAr : s.labelEn}
                        </span>
                      </td>
                      {group.records.some((x: any) => x.notes) && (
                        <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell">
                          {r.notes || "—"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export function AttendanceAlerts() {
  const { isAr } = useTranslation();
  const { data: children = [], isLoading } = useMyChildren();
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>();
  const childId = selectedChildId || children[0]?.student_id;

  const { data: records = [], isLoading: recordsLoading } = useChildAttendance(childId);

  const subjectGroups = useMemo(() => deriveSubjectGroups(records, isAr), [records, isAr]);

  const totalPresent = records.filter((r: any) => r.status === "present").length;
  const totalAbsent  = records.filter((r: any) => r.status === "absent").length;
  const totalLate    = records.filter((r: any) => r.status === "late").length;
  const attendanceRate = records.length > 0 ? Math.round((totalPresent / records.length) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarCheck className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "سجل الحضور والغياب" : "Attendance Record"}</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : children.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-border rounded-lg bg-surface-elevated">
          <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">{isAr ? "لا يوجد أبناء مرتبطون" : "No Linked Children"}</h3>
          <p className="text-sm text-muted-foreground">
            {isAr ? "ستظهر سجلات الحضور هنا بعد ربط حسابات أبنائك." : "Attendance records will appear here after linking your children's accounts."}
          </p>
        </div>
      ) : (
        <>
          {children.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {children.map((c) => (
                <button
                  key={c.student_id}
                  onClick={() => setSelectedChildId(c.student_id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${childId === c.student_id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  {c.full_name || (isAr ? "ابن/بنت" : "Child")}
                </button>
              ))}
            </div>
          )}

          {/* Overall summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: isAr ? "حضور" : "Present",        count: totalPresent,   color: "text-green-600 bg-green-50 border-green-200" },
              { label: isAr ? "غياب" : "Absent",         count: totalAbsent,    color: "text-red-600 bg-red-50 border-red-200" },
              { label: isAr ? "تأخير" : "Late",          count: totalLate,      color: "text-amber-600 bg-amber-50 border-amber-200" },
              {
                label: isAr ? "نسبة الحضور" : "Rate",
                count: attendanceRate !== null ? `${attendanceRate}%` : "—",
                color: attendanceRate !== null && attendanceRate >= 90
                  ? "text-green-700 bg-green-50 border-green-200"
                  : "text-primary bg-primary/5 border-primary/20",
              },
            ].map((s) => (
              <div key={s.label} className={`p-4 rounded-lg border text-center ${s.color}`}>
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Absent alert */}
          {totalAbsent > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-700">
                {isAr ? `⚠️ تسجيل ${totalAbsent} يوم غياب` : `⚠️ ${totalAbsent} absence day(s) recorded`}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {isAr ? "يُرجى التواصل مع المدرسة إذا كان الغياب بدون إذن." : "Please contact the school if absence is unexcused."}
              </p>
            </div>
          )}

          {/* Per-subject breakdown */}
          {recordsLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-lg">
              <p className="text-sm text-muted-foreground">{isAr ? "لا توجد سجلات حضور بعد" : "No attendance records yet"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {isAr ? "الحضور حسب المادة — اضغط للتفاصيل" : "Attendance by Subject — tap for details"}
              </p>
              {subjectGroups.map((g) => (
                <SubjectRow key={g.subjectId} group={g} isAr={isAr} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
