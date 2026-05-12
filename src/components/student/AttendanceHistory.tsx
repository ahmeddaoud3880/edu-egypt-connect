import { useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { CalendarCheck, Clock, AlertCircle } from "lucide-react";
import { useStudentRegistrationInfo, useStudentAttendance } from "@/hooks/useStudentData";

function statusLabel(status: string, isAr: boolean): string {
  switch (status) {
    case "present":
      return isAr ? "حاضر" : "Present";
    case "absent":
      return isAr ? "غائب" : "Absent";
    case "late":
      return isAr ? "متأخر" : "Late";
    case "excused":
      return isAr ? "بعذر" : "Excused";
    default:
      return status;
  }
}

export function AttendanceHistory() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { data: regInfo, isLoading: regLoading } = useStudentRegistrationInfo();
  const { data: rows = [], isLoading: attLoading } = useStudentAttendance();

  const stats = useMemo(() => {
    const present = rows.filter((r: { status: string }) => r.status === "present").length;
    const absent = rows.filter((r: { status: string }) => r.status === "absent").length;
    const late = rows.filter((r: { status: string }) => r.status === "late").length;
    const total = rows.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : null;
    return { present, absent, late, total, rate };
  }, [rows]);

  if (regLoading || attLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
        <Clock className="w-4 h-4 animate-spin" /> {isAr ? "جارى التحميل..." : "Loading..."}
      </div>
    );
  }

  if (!regInfo || !["approved", "activated"].includes(regInfo.request_status)) {
    return (
      <div className="bg-surface-elevated rounded-lg border border-amber-200 p-8 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <p className="text-sm text-muted-foreground">
          {isAr ? "ستظهر سجلات الحضور فور تفعيل الحساب من قِبل المدرسة." : "Attendance records will appear once the school activates your account."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarCheck className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "سجل الحضور" : "Attendance History"}</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: isAr ? "حاضر" : "Present", value: stats.total ? String(stats.present) : "—", color: "text-green-600" },
          { label: isAr ? "غائب" : "Absent", value: stats.total ? String(stats.absent) : "—", color: "text-destructive" },
          { label: isAr ? "متأخر" : "Late", value: stats.total ? String(stats.late) : "—", color: "text-amber-600" },
          {
            label: isAr ? "نسبة الحضور" : "Rate",
            value: stats.rate != null ? `${stats.rate}%` : "—",
            color: "text-primary",
          },
        ].map((s) => (
          <div key={s.label} className="bg-surface-elevated rounded-lg border border-border p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="bg-surface-elevated rounded-lg border border-border p-10 text-center space-y-3">
          <CalendarCheck className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <h3 className="font-semibold text-foreground">{isAr ? "لا توجد سجلات حضور بعد" : "No Attendance Yet"}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {isAr
              ? "سيُسجّل معلّمك حضورك وغيابك في الحصص. عند حفظ السجل في النظام، يظهر هنا آخر 120 يوماً."
              : "Your teacher records daily class attendance. Once saved, your last 120 days appear here."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden bg-surface-elevated">
          <div className="px-3 py-2 border-b border-border bg-muted/30 text-xs text-muted-foreground">
            {isAr
              ? `عرض ${rows.length} سجلًا (الأحدث أولاً)`
              : `${rows.length} record(s), newest first`}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-start p-3 font-medium">{isAr ? "التاريخ" : "Date"}</th>
                  <th className="text-start p-3 font-medium hidden sm:table-cell">{isAr ? "الفصل" : "Class"}</th>
                  <th className="text-end p-3 font-medium">{isAr ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => {
                  const cls = r.classes?.name_ar || r.classes?.name || "—";
                  return (
                    <tr key={r.id} className="border-b border-border/80 last:border-0">
                      <td className="p-3 tabular-nums">{r.date}</td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">{cls}</td>
                      <td className="p-3 text-end">
                        <span
                          className={
                            r.status === "present"
                              ? "text-green-700 font-medium"
                              : r.status === "absent"
                                ? "text-destructive font-medium"
                                : "text-amber-700 font-medium"
                          }
                        >
                          {statusLabel(r.status, isAr)}
                        </span>
                        {r.notes ? (
                          <span className="block text-xs text-muted-foreground mt-0.5">{r.notes}</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
