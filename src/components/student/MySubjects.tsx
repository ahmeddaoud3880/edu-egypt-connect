import { useMemo, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  BookOpen,
  BookMarked,
  ExternalLink,
  Loader2,
  GraduationCap,
  AlertCircle,
  Library,
} from "lucide-react";
import {
  useStudentRegistrationInfo,
  useSubjectsByStage,
  useMoeEllibraryBooks,
} from "@/hooks/useStudentData";
import {
  MOE_ELIBRARY_PORTAL,
  mapDbStageNameToMoeStage,
  moeGradeLabels,
  filterMoeBooksForStudent,
  moeBooksForSubjectName,
  pickPreferredMoeBook,
} from "@/utils/moeEllibrary";

export function MySubjects() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<"all" | 1 | 2>("all");

  const { data: regInfo, isLoading: regLoading } = useStudentRegistrationInfo();
  const { data: subjects, isLoading: subjectsLoading } = useSubjectsByStage(
    regInfo?.stage_id,
    regInfo?.grade_number ?? null
  );
  const { data: moeCatalog, isLoading: moeLoading, isError: moeError } = useMoeEllibraryBooks();

  const moeStage = useMemo(
    () => (regInfo ? mapDbStageNameToMoeStage(regInfo.stage_name_ar) : null),
    [regInfo]
  );

  const gradeLabels = useMemo(
    () => (moeStage && regInfo ? moeGradeLabels(moeStage, regInfo.grade_number) : null),
    [moeStage, regInfo]
  );

  const studentMoePool = useMemo(() => {
    if (!moeCatalog?.length || !moeStage) return [];
    return filterMoeBooksForStudent(moeCatalog, {
      moeStage,
      gradeLabels,
      semester: selectedSemester,
      studentBookOnly: true,
    });
  }, [moeCatalog, moeStage, gradeLabels, selectedSemester]);

  const isLoading = regLoading || subjectsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>{isAr ? "جارى تحميل موادك الدراسية..." : "Loading your subjects..."}</span>
      </div>
    );
  }

  if (!regInfo || (regInfo.request_status !== "approved" && regInfo.request_status !== "activated")) {
    return (
      <div className="bg-surface-elevated rounded-lg border border-amber-200 p-8 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="font-semibold text-foreground">
          {isAr ? "حسابك قيد المراجعة" : "Account Pending Approval"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {isAr
            ? "ستظهر موادك الدراسية فور موافقة المدرسة على طلب تسجيلك."
            : "Your subjects will appear once the school approves your registration request."}
        </p>
      </div>
    );
  }

  if (!subjects || subjects.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-lg border border-border p-8 text-center space-y-3">
        <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto" />
        <p className="text-sm text-muted-foreground">
          {isAr ? "لم تُحدَّد مواد لصفك ومرحلتك بعد." : "No subjects found for your grade and stage yet."}
        </p>
      </div>
    );
  }

  const subjectColors: Record<string, string> = {
    "#2E7D32": "bg-green-700",
    "#1565C0": "bg-blue-700",
    "#00695C": "bg-teal-700",
    "#E65100": "bg-orange-700",
    "#6A1B9A": "bg-purple-700",
    "#1A237E": "bg-indigo-900",
    "#880E4F": "bg-pink-900",
    "#1B5E20": "bg-green-900",
    "#BF360C": "bg-red-800",
    "#33691E": "bg-lime-800",
    "#4A148C": "bg-purple-900",
    "#006064": "bg-cyan-900",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <GraduationCap className="w-4 h-4 text-primary shrink-0" />
          <h2 className="font-semibold text-foreground">{isAr ? "موادى الدراسية" : "My Subjects"}</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {subjects.length} {isAr ? "مادة" : "subjects"}
          </span>
          {regInfo.grade_number != null && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {isAr ? `الصف ${regInfo.grade_number}` : `Grade ${regInfo.grade_number}`}
            </span>
          )}
        </div>
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          {(
            [
              ["all", isAr ? "كل الفصول" : "All terms"],
              [1, isAr ? "الفصل الأول" : "Term 1"],
              [2, isAr ? "الفصل الثانى" : "Term 2"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => setSelectedSemester(val)}
              className={`px-3 py-1.5 transition-colors ${
                selectedSemester === val
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!moeStage && (
        <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          {isAr
            ? "تعذر ربط مرحلتك تلقائياً بكتب وزارة التربية والتعليم. يمكنك استعراض كل المراحل من بوابة المكتبة."
            : "Your stage name could not be mapped to the Ministry catalog. Browse all stages on the library portal."}
        </div>
      )}

      {moeError && (
        <p className="text-xs text-muted-foreground">
          {isAr
            ? "تعذر تحديث قائمة الكتب من الموقع؛ جارٍ استخدام نسخة محلية قد لا تكون الأحدث."
            : "Could not refresh the live book list; using a bundled snapshot (may be slightly older)."}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Library className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>
          {isAr
            ? "الكتب المرتبطة تُحمَّل من المكتبة الإلكترونية الرسمية للوزارة (حسب صفك والفصل الدراسى)."
            : "Textbook links follow the official MOE e-library (by your grade and selected term)."}
        </span>
        {moeLoading && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject) => {
          const bgClass = subjectColors[subject.color ?? ""] ?? "bg-primary";
          const isSelected = selectedSubject === subject.id;
          const subjectMoe = moeBooksForSubjectName(studentMoePool, subject.name_ar);
          const best = pickPreferredMoeBook(subjectMoe);
          const openHref = best?.link ?? MOE_ELIBRARY_PORTAL;

          return (
            <div
              key={subject.id}
              className={`bg-surface-elevated rounded-lg border transition-all hover:shadow-md ${
                isSelected ? "border-primary ring-1 ring-primary" : "border-border"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedSubject(isSelected ? null : subject.id)}
                className="w-full text-start cursor-pointer"
              >
                <div className={`h-2 rounded-t-lg ${bgClass}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="w-4 h-4 shrink-0" style={{ color: subject.color ?? "#4A90D9" }} />
                      <h3 className="font-semibold text-foreground text-sm leading-tight">
                        {isAr ? subject.name_ar : subject.name}
                      </h3>
                    </div>
                    {subject.subject_code && (
                      <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono shrink-0">
                        {subject.subject_code}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {isAr ? `صف ${subject.grade_number}` : `Grade ${subject.grade_number}`}
                    </span>
                  </div>
                </div>
              </button>

              <div className="px-5 pb-4 flex flex-wrap gap-2">
                <a
                  href={openHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-medium"
                >
                  <BookMarked className="w-3 h-3" />
                  {best
                    ? isAr
                      ? "كتاب الوزارة (PDF)"
                      : "MOE textbook (PDF)"
                    : isAr
                      ? "المكتبة الإلكترونية"
                      : "E-library portal"}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a
                  href={MOE_ELIBRARY_PORTAL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:underline"
                >
                  ellibrary.moe.gov.eg
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {isSelected && subjectMoe.length > 0 && (
                <div className="px-5 pb-4 pt-0 border-t border-border mt-1 space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground pt-2">
                    {isAr ? "كتب الطالب المطابقة من كتالوج الوزارة:" : "Matching student books from the MOE catalog:"}
                  </p>
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto text-[10px]">
                    {subjectMoe.map((b, idx) => (
                      <li key={`${b.link}-${idx}`} className="flex items-start justify-between gap-2">
                        <span className="text-foreground/90 line-clamp-2">{b.subject}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {b.link.toLowerCase().includes("/term1/") ? (isAr ? "ف١" : "T1") : (isAr ? "ف٢" : "T2")}
                        </span>
                        <a
                          href={b.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-primary hover:underline"
                        >
                          PDF
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {isSelected && subjectMoe.length === 0 && moeStage && (
                <p className="px-5 pb-4 text-[10px] text-muted-foreground">
                  {isAr
                    ? "لم يُعثر على كتاب مطابق لهذه المادة في الكتالوج الحالى لهذا الصف والفصل."
                    : "No catalog entry matched this subject for your grade/term."}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground text-center pt-2">
        {isAr
          ? "✦ اضغط على البطاقة لعرض كل كتب الوزارة المرتبطة بالمادة • المصدر: ellibrary.moe.gov.eg"
          : "✦ Expand a card to see all matching Ministry books • Source: ellibrary.moe.gov.eg"}
      </div>
    </div>
  );
}
