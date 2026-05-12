import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { ClipboardList, CheckCircle2, XCircle, Clock, Loader2, Save } from "lucide-react";
import { useMyTeacherClasses, useClassStudents, useClassAttendance, useRecordAttendance } from "@/hooks/useTeacherData";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "present", labelAr: "حاضر", labelEn: "Present", icon: CheckCircle2, color: "text-green-600" },
  { value: "absent", labelAr: "غائب", labelEn: "Absent", icon: XCircle, color: "text-red-600" },
  { value: "late", labelAr: "متأخر", labelEn: "Late", icon: Clock, color: "text-amber-600" },
];

export function AttendanceMarking() {
  const { isAr } = useTranslation();
  const { data: classes = [] } = useMyTeacherClasses();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});

  const { data: students = [] } = useClassStudents(selectedClassId || undefined);
  const { data: existing = [] } = useClassAttendance(selectedClassId || undefined, date);
  const recordAttendance = useRecordAttendance();

  // Pre-fill from existing records when loaded
  const existingMap: Record<string, string> = {};
  existing.forEach((r) => { existingMap[r.student_id] = r.status; });

  const setStatus = (studentId: string, status: string) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const getStatus = (studentId: string) =>
    attendanceMap[studentId] ?? existingMap[studentId] ?? "present";

  const handleSave = async () => {
    if (!selectedClassId) return;
    const records = students.map((s) => ({
      student_id: s.student_id,
      class_id: selectedClassId,
      date,
      status: getStatus(s.student_id),
    }));
    try {
      await recordAttendance.mutateAsync(records);
      toast.success(isAr ? "تم حفظ الحضور بنجاح" : "Attendance saved successfully");
      setAttendanceMap({});
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const uniqueClasses = [...new Map(classes.map((c) => [c.class_id, c])).values()];
  const presentCount = students.filter((s) => getStatus(s.student_id) === "present").length;
  const absentCount = students.filter((s) => getStatus(s.student_id) === "absent").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "تسجيل الحضور" : "Attendance Marking"}</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "الفصل" : "Class"}</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{isAr ? "-- اختر فصلاً --" : "-- Select a class --"}</option>
            {uniqueClasses.map((c) => (
              <option key={c.class_id} value={c.class_id}>{c.classes?.name || c.class_id}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "التاريخ" : "Date"}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {selectedClassId && students.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: isAr ? "حاضر" : "Present", count: presentCount, color: "text-green-600 bg-green-50 border-green-200" },
              { label: isAr ? "غائب" : "Absent", count: absentCount, color: "text-red-600 bg-red-50 border-red-200" },
              { label: isAr ? "متأخر" : "Late", count: students.filter((s) => getStatus(s.student_id) === "late").length, color: "text-amber-600 bg-amber-50 border-amber-200" },
            ].map((item) => (
              <div key={item.label} className={`p-3 rounded-lg border text-center ${item.color}`}>
                <p className="text-lg font-bold">{item.count}</p>
                <p className="text-xs">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Student list */}
          <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="text-start p-3 font-medium text-muted-foreground text-xs">{isAr ? "الطالب" : "Student"}</th>
                  <th className="text-center p-3 font-medium text-muted-foreground text-xs">{isAr ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => (
                  <tr key={s.student_id} className={`border-b border-border/50 ${idx % 2 === 0 ? "" : "bg-muted/5"}`}>
                    <td className="p-3 font-medium text-foreground">{s.full_name || (isAr ? "طالب" : "Student")}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        {STATUS_OPTIONS.map((opt) => {
                          const active = getStatus(s.student_id) === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setStatus(s.student_id, opt.value)}
                              title={isAr ? opt.labelAr : opt.labelEn}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${active ? `${opt.color} bg-current/10 border-current/30` : "text-muted-foreground border-border hover:border-muted-foreground/50"}`}
                            >
                              <opt.icon className={`w-3.5 h-3.5 ${active ? "" : "opacity-40"}`} />
                              {isAr ? opt.labelAr : opt.labelEn}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleSave}
            disabled={recordAttendance.isPending}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {recordAttendance.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{isAr ? "جارى الحفظ..." : "Saving..."}</>
            ) : (
              <><Save className="w-4 h-4" />{isAr ? "حفظ الحضور" : "Save Attendance"}</>
            )}
          </button>
        </>
      )}

      {selectedClassId && students.length === 0 && (
        <div className="bg-muted/30 rounded-lg p-8 text-center">
          <p className="text-sm text-muted-foreground">{isAr ? "لا يوجد طلاب في هذا الفصل" : "No students in this class"}</p>
        </div>
      )}

      {!selectedClassId && (
        <div className="bg-muted/30 rounded-lg p-8 text-center">
          <p className="text-sm text-muted-foreground">{isAr ? "اختر فصلاً للبدء" : "Select a class to begin"}</p>
        </div>
      )}
    </div>
  );
}
