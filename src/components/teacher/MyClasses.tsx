import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { BookOpen, Users, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { useMyTeacherClasses, useClassStudents } from "@/hooks/useTeacherData";

export function MyClasses() {
  const { isAr } = useTranslation();
  const { data: classes = [], isLoading, error } = useMyTeacherClasses();
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const { data: students = [], isLoading: studentsLoading } = useClassStudents(selectedClassId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">{isAr ? "خطأ في تحميل الفصول" : "Error loading classes"}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "فصولي الدراسية" : "My Classes"}</h2>
        <span className="ms-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
          {classes.length}
        </span>
      </div>

      {classes.length === 0 ? (
        <div className="bg-surface-elevated rounded-lg border border-border p-10 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <h3 className="font-semibold text-foreground">{isAr ? "لا توجد فصول معيّنة بعد" : "No Classes Assigned Yet"}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {isAr ? "ستظهر فصولك هنا بعد أن تقوم قيادة المدرسة بتعيينك على الفصول والمواد." : "Your classes will appear here after school leadership assigns you to classes and subjects."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {classes.map((c) => (
            <div
              key={c.id}
              className={`bg-surface-elevated rounded-lg border p-5 cursor-pointer transition-all hover:shadow-md ${selectedClassId === c.class_id ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
              onClick={() => setSelectedClassId(selectedClassId === c.class_id ? undefined : c.class_id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    {c.classes?.name || (isAr ? "فصل" : "Class")}
                  </h3>
                  {c.subjects && (
                    <p className="text-xs text-primary mt-0.5">
                      {isAr ? c.subjects.name_ar || c.subjects.name : c.subjects.name}
                    </p>
                  )}
                  {c.classes?.grade_number && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isAr ? `الصف ${c.classes.grade_number}` : `Grade ${c.classes.grade_number}`}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{c.academic_year}</p>
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${selectedClassId === c.class_id ? "rotate-90" : ""}`} />
              </div>

              {/* Students list */}
              {selectedClassId === c.class_id && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">
                      {isAr ? "طلاب الفصل" : "Class Students"}
                      {!studentsLoading && ` (${students.length})`}
                    </span>
                  </div>
                  {studentsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : students.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      {isAr ? "لا يوجد طلاب مسجلون بعد" : "No students enrolled yet"}
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {students.map((s) => (
                        <li key={s.enrollment_id} className="flex items-center gap-2 text-xs">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                            {(s.full_name || "?")[0]}
                          </span>
                          <span className="text-foreground">{s.full_name || (isAr ? "طالب" : "Student")}</span>
                          {s.national_id && (
                            <span className="text-muted-foreground font-mono">{s.national_id.slice(-4)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
