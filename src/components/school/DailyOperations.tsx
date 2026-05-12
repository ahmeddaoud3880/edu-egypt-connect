import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Users, BookOpen, GraduationCap, Plus, Loader2, CheckCircle2,
  LayoutGrid, ChevronRight, ChevronDown, UserMinus, AlertCircle,
  Hash, School, UserPlus, Trash2, ListX, ArrowLeftRight,
} from "lucide-react";
import {
  useSchoolClasses, useSchoolStudents, useCreateClass,
  useEnrollStudentInClass, useClassEnrollments, useUnenrollStudentFromClass,
  useClearClassEnrollments, useDeleteClass, useTransferStudentBetweenClasses,
  useSchoolClassEnrollmentCounts,
} from "@/hooks/useSchoolAdminData";
import { useStages } from "@/hooks/useRealData";
import { toast } from "sonner";

// ─── Arabic grade system ──────────────────────────────────────────────────────

const AR_ORD = ["", "أولى", "ثانية", "ثالثة", "رابعة", "خامسة", "سادسة"];

interface GradeOption { value: number; labelAr: string; labelEn: string }

function getGradeOptions(stageName: string | null | undefined): GradeOption[] {
  const n = (stageName ?? "").trim();
  if (n.includes("رياض")) {
    return [
      { value: 1, labelAr: "KG1 – رياض أطفال أولى", labelEn: "KG 1" },
      { value: 2, labelAr: "KG2 – رياض أطفال ثانية", labelEn: "KG 2" },
    ];
  }
  if (n.includes("ابتدائ")) {
    return Array.from({ length: 6 }, (_, i) => ({
      value: i + 1,
      labelAr: `${AR_ORD[i + 1]} ابتدائي`,
      labelEn: `Grade ${i + 1} – Primary`,
    }));
  }
  if (n.includes("اعداد") || n.includes("إعداد")) {
    return Array.from({ length: 3 }, (_, i) => ({
      value: i + 1,
      labelAr: `${AR_ORD[i + 1]} إعدادي`,
      labelEn: `Grade ${i + 1} – Preparatory`,
    }));
  }
  if (n.includes("ثانو")) {
    const suffix = n.includes("تجار") ? "ثانوي تجاري"
      : n.includes("زراع") ? "ثانوي زراعي"
      : n.includes("صناع") ? "ثانوي صناعي"
      : "ثانوي";
    return Array.from({ length: 3 }, (_, i) => ({
      value: i + 1,
      labelAr: `${AR_ORD[i + 1]} ${suffix}`,
      labelEn: `Grade ${i + 1} – Secondary`,
    }));
  }
  return Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    labelAr: AR_ORD[i + 1] ? `${AR_ORD[i + 1]} – الصف ${i + 1}` : `الصف ${i + 1}`,
    labelEn: `Grade ${i + 1}`,
  }));
}

function gradeLabel(
  grade: number | null,
  stageName: string | null | undefined,
  isAr: boolean,
): string {
  if (!grade) return stageName ? (isAr ? stageName : stageName) : "—";
  const opts = getGradeOptions(stageName);
  const found = opts.find((o) => o.value === grade);
  if (found) return isAr ? found.labelAr : found.labelEn;
  return isAr ? `الصف ${grade}` : `Grade ${grade}`;
}

// ─── ClassCard ────────────────────────────────────────────────────────────────

interface ClassCardProps {
  cls: any;
  isAr: boolean;
  isOpen: boolean;
  onToggle: () => void;
  allStudents: any[];
  allClasses: any[];
  stages: any[];
  onEnrollSuccess: (classId: string) => void;
  onClassRemoved: (classId: string) => void;
  /** Enrollment count from school-wide query (shown when row collapsed). */
  rosterPreviewCount: number;
}

function ClassCard({
  cls, isAr, isOpen, onToggle, allStudents, allClasses, stages, onEnrollSuccess, onClassRemoved,
  rosterPreviewCount,
}: ClassCardProps) {
  const stageObj = (stages as any[]).find((s) => s.id === cls.stage_id);
  const stageNameDisplay = isAr ? (stageObj?.name_ar ?? stageObj?.name ?? null) : (stageObj?.name ?? null);

  const { data: enrollments = [], isLoading: enrollLoading } = useClassEnrollments(isOpen ? cls.id : null);
  const unenroll = useUnenrollStudentFromClass();
  const enroll = useEnrollStudentInClass();
  const transfer = useTransferStudentBetweenClasses();
  const clearClass = useClearClassEnrollments();
  const deleteClass = useDeleteClass();

  const [addingStudent, setAddingStudent] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [showAllSchoolStudents, setShowAllSchoolStudents] = useState(false);

  // Transfer state: keyed by enrollment id
  const [transferEnrId, setTransferEnrId] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState("");

  const enrolledStudentIds = new Set(enrollments.map((e) => e.student_id));

  const matchingStudents = allStudents.filter((s) => {
    const sameGrade = cls.grade_number != null ? s.grade_number === cls.grade_number : true;
    const sameStage = cls.stage_id ? s.stage_id === cls.stage_id : true;
    return sameGrade && sameStage;
  });
  const matchingNotEnrolled = matchingStudents.filter((s) => !enrolledStudentIds.has(s.id));
  const allSchoolNotEnrolled = allStudents.filter((s) => !enrolledStudentIds.has(s.id));
  const availableToEnroll = showAllSchoolStudents ? allSchoolNotEnrolled : matchingNotEnrolled;
  const noStudentsWithSameGradeStage = matchingStudents.length === 0;
  const allMatchingEnrolled = matchingStudents.length > 0 && matchingNotEnrolled.length === 0;

  const handleEnroll = async () => {
    if (!selectedStudentId) return;
    const picked = allStudents.find((s) => s.id === selectedStudentId);
    try {
      await enroll.mutateAsync({ student_id: selectedStudentId, class_id: cls.id });
      if (
        picked &&
        ((cls.grade_number != null && picked.grade_number !== cls.grade_number) ||
          (cls.stage_id && picked.stage_id !== cls.stage_id))
      ) {
        toast.message(isAr ? "تم التسجيل" : "Enrolled", {
          description: isAr
            ? "الطالب بصف/مرحلة مختلفة عن تعريف الفصل — راجع بيانات الطالب لاحقاً إن لزم"
            : "Student grade/stage differs from class — update student record if needed",
        });
      } else {
        toast.success(isAr ? "تم تسجيل الطالب بنجاح ✓" : "Student enrolled successfully ✓");
      }
      setSelectedStudentId("");
      setAddingStudent(false);
      setShowAllSchoolStudents(false);
      onEnrollSuccess(cls.id);
    } catch (e: any) {
      if (e.message === "already_enrolled") {
        toast.error(isAr ? "هذا الطالب مسجل بالفعل في هذا الفصل" : "Student is already enrolled in this class");
      } else {
        toast.error(e.message);
      }
    }
  };

  const handleTransfer = async (enr: any) => {
    if (!transferTarget) return;
    try {
      await transfer.mutateAsync({
        enrollment_id: enr.id,
        student_id: enr.student_id,
        from_class_id: cls.id,
        to_class_id: transferTarget,
      });
      toast.success(isAr ? "تم نقل الطالب بنجاح ✓" : "Student transferred successfully ✓");
      setTransferEnrId(null);
      setTransferTarget("");
    } catch (e: any) {
      if (e.message === "already_enrolled_in_target") {
        toast.error(isAr ? "الطالب مسجل بالفعل في الفصل المختار" : "Student already enrolled in target class");
      } else {
        toast.error(e.message);
      }
    }
  };

  const handleClearClass = async () => {
    if (!enrollments.length) {
      toast.message(isAr ? "الفصل فارغ" : "Class is already empty");
      return;
    }
    if (!confirm(isAr
      ? `إزالة ${enrollments.length} طالب/ة من هذا الفصل؟ (حسابات الطلاب تبقى)`
      : `Remove ${enrollments.length} student(s) from this class? (accounts stay)`)) return;
    try {
      await clearClass.mutateAsync({ class_id: cls.id });
      toast.success(isAr ? "تم إفراغ الفصل" : "Class roster cleared");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeleteClass = async () => {
    const msg = isAr
      ? `حذف الفصل «${cls.name}» نهائياً؟ سيتم حذف التسجيلات والبيانات المرتبطة بالفصل.`
      : `Permanently delete class "${cls.name}"? Enrollments and linked class data will be removed.`;
    if (!confirm(msg)) return;
    try {
      await deleteClass.mutateAsync({ class_id: cls.id });
      toast.success(isAr ? "تم حذف الفصل" : "Class deleted");
      onClassRemoved(cls.id);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUnenroll = async (enrollmentId: string, studentName: string) => {
    if (!confirm(isAr ? `هل تريد إزالة ${studentName} من الفصل؟` : `Remove ${studentName} from this class?`)) return;
    try {
      await unenroll.mutateAsync({ enrollment_id: enrollmentId, class_id: cls.id });
      toast.success(isAr ? "تم حذف الطالب من الفصل" : "Student removed from class");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const capacityUsed =
    isOpen && !enrollLoading ? enrollments.length : rosterPreviewCount;
  const capacityTotal = cls.capacity ?? "∞";
  const capacityPct = cls.capacity ? Math.round((capacityUsed / cls.capacity) * 100) : null;

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${isOpen ? "border-primary/40 shadow-md" : "border-border hover:border-primary/30 hover:shadow-sm"}`}>
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-start bg-surface-elevated hover:bg-primary/5 transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <School className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm">{cls.name}</span>
            {cls.grade_number && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {gradeLabel(cls.grade_number, stageObj?.name_ar ?? stageObj?.name, isAr)}
              </span>
            )}
            {cls.class_code && (
              <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">{cls.class_code}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              {isAr ? `${capacityUsed} / ${capacityTotal} طالب` : `${capacityUsed} / ${capacityTotal} students`}
            </span>
            {capacityPct !== null && (
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${capacityPct >= 90 ? "bg-red-400" : capacityPct >= 70 ? "bg-amber-400" : "bg-green-400"}`}
                    style={{ width: `${Math.min(capacityPct, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{capacityPct}%</span>
              </div>
            )}
          </div>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {/* Expanded panel */}
      {isOpen && (
        <div className="border-t border-border bg-background/60 p-4 space-y-4">
          {enrollLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Enrolled students list */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {isAr ? "الطلاب المسجلون" : "Enrolled Students"} ({enrollments.length})
                </h4>
                {enrollments.length === 0 ? (
                  <div className="text-center py-5 border border-dashed border-border rounded-lg">
                    <GraduationCap className="w-7 h-7 text-muted-foreground/30 mx-auto mb-1.5" />
                    <p className="text-xs text-muted-foreground">{isAr ? "لا يوجد طلاب في هذا الفصل بعد" : "No students in this class yet"}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {enrollments.map((enr, idx) => {
                      const st = enr.students as any;
                      const stStageObj = (stages as any[]).find((s) => s.id === st?.stage_id);
                      const isTransferring = transferEnrId === enr.id;

                      // Only show classes with the exact same grade + stage as THIS student
                      const sameGradeClasses = allClasses.filter(
                        (c) =>
                          c.id !== cls.id &&
                          c.grade_number === st?.grade_number &&
                          c.stage_id === st?.stage_id,
                      );

                      return (
                        <div key={enr.id} className="rounded-lg bg-surface-elevated border border-border/50 hover:border-border transition-colors overflow-hidden">
                          <div className="flex items-center gap-2 p-2.5">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {st?.full_name ?? (isAr ? "طالب" : "Student")}
                              </p>
                              {st?.grade_number && (
                                <p className="text-xs text-muted-foreground">
                                  {gradeLabel(st.grade_number, stStageObj?.name_ar ?? stStageObj?.name, isAr)}
                                </p>
                              )}
                            </div>
                            {st?.national_id && (
                              <span className="text-xs text-muted-foreground font-mono hidden sm:block">{st.national_id}</span>
                            )}
                            {/* Transfer button — only when there are classes with the same grade */}
                            {sameGradeClasses.length > 0 && !isTransferring && (
                              <button
                                onClick={() => { setTransferEnrId(enr.id); setTransferTarget(""); }}
                                disabled={transfer.isPending}
                                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-40"
                                title={isAr ? "نقل إلى فصل بنفس الصف" : "Transfer to same-grade class"}
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleUnenroll(enr.id, st?.full_name ?? "")}
                              disabled={unenroll.isPending || isTransferring}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                              title={isAr ? "إزالة من الفصل" : "Remove from class"}
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Inline transfer row */}
                          {isTransferring && (
                            <div className="border-t border-blue-200/60 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 flex flex-wrap items-center gap-2">
                              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="text-xs text-blue-700 dark:text-blue-300 font-medium shrink-0">
                                {isAr
                                  ? `نقل من ${cls.name} إلى:`
                                  : `Move from ${cls.name} to:`}
                              </span>
                              <select
                                value={transferTarget}
                                onChange={(e) => setTransferTarget(e.target.value)}
                                className="flex-1 min-w-0 text-xs border border-blue-300 rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-blue-400"
                              >
                                <option value="">{isAr ? "— اختر الفصل —" : "— Select class —"}</option>
                                {sameGradeClasses.map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleTransfer(enr)}
                                disabled={!transferTarget || transfer.isPending}
                                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 flex items-center gap-1.5 shrink-0"
                              >
                                {transfer.isPending
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <CheckCircle2 className="w-3 h-3" />}
                                {isAr ? "نقل" : "Move"}
                              </button>
                              <button
                                onClick={() => { setTransferEnrId(null); setTransferTarget(""); }}
                                className="px-2 py-1.5 text-xs text-muted-foreground border border-border rounded-lg hover:bg-muted shrink-0"
                              >
                                {isAr ? "إلغاء" : "Cancel"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add student to class */}
              <div className="border-t border-border/50 pt-3">
                {!addingStudent ? (
                  <button
                    onClick={() => { setAddingStudent(true); setShowAllSchoolStudents(false); setSelectedStudentId(""); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-primary/40 rounded-lg text-sm text-primary hover:bg-primary/5 transition-colors font-medium"
                  >
                    <UserPlus className="w-4 h-4" />
                    {isAr ? "إضافة طالب إلى الفصل" : "Add Student to Class"}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {isAr ? "اختر طالباً" : "Select a Student"}
                      {!showAllSchoolStudents && cls.grade_number != null && (
                        <span className="ms-1 normal-case font-normal text-primary">
                          {isAr
                            ? `— مطابق لـ ${gradeLabel(cls.grade_number, stageObj?.name_ar ?? stageObj?.name, true)}`
                            : `— matches ${gradeLabel(cls.grade_number, stageObj?.name_ar ?? stageObj?.name, false)}`}
                        </span>
                      )}
                      {showAllSchoolStudents && (
                        <span className="ms-1 normal-case font-normal text-amber-700 dark:text-amber-400">
                          {isAr ? "— كل طلاب المدرسة غير المسجلين هنا" : "— all school students not in this class"}
                        </span>
                      )}
                    </h4>
                    {availableToEnroll.length === 0 ? (
                      <div className="space-y-2">
                        <div className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
                          noStudentsWithSameGradeStage && !showAllSchoolStudents
                            ? "bg-blue-50 border border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-100"
                            : "bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-100"
                        }`}>
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p>
                              {showAllSchoolStudents || (noStudentsWithSameGradeStage && allSchoolNotEnrolled.length === 0)
                                ? isAr
                                  ? "لا يوجد طلاب يمكن إضافتهم (الكل مسجل هنا، أو لا يوجد طلاب في المدرسة)."
                                  : "No students to add (all are in this class, or no students in school)."
                                : allMatchingEnrolled
                                  ? isAr
                                    ? "كل طلاب نفس الصف والمرحلة مسجلون بالفعل في هذا الفصل."
                                    : "All matching grade/stage students are already in this class."
                                  : isAr
                                    ? "لا يوجد طلاب للاختيار."
                                    : "No students to select."}
                            </p>
                            {!showAllSchoolStudents && noStudentsWithSameGradeStage && allSchoolNotEnrolled.length > 0 && (
                              <p className="opacity-90">
                                {isAr
                                  ? "لا يوجد في المدرسة طلاب بنفس رقم الصف والمرحلة المعرّفة للفصل. استخدم الزر أدناه لعرض كل الطلاب غير المسجلين في الفصل."
                                  : "No students match this class grade+stage. Use the button below to list all unenrolled school students."}
                              </p>
                            )}
                          </div>
                        </div>
                        {!showAllSchoolStudents && allSchoolNotEnrolled.length > 0 && (
                          <button
                            type="button"
                            onClick={() => { setShowAllSchoolStudents(true); setSelectedStudentId(""); }}
                            className="w-full py-2 text-sm font-medium text-primary border border-primary/40 rounded-lg hover:bg-primary/5"
                          >
                            {isAr ? "عرض كل طلاب المدرسة غير المسجلين في هذا الفصل" : "Show all unenrolled school students"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                          {availableToEnroll.map((s) => {
                            const sStageObj = (stages as any[]).find((st) => st.id === s.stage_id);
                            return (
                              <label
                                key={s.id}
                                className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                  selectedStudentId === s.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/30 bg-surface-elevated"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`enroll-${cls.id}`}
                                  value={s.id}
                                  checked={selectedStudentId === s.id}
                                  onChange={() => setSelectedStudentId(s.id)}
                                  className="accent-primary"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{s.full_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {gradeLabel(s.grade_number, sStageObj?.name_ar ?? sStageObj?.name, isAr)}
                                  </p>
                                </div>
                                {showAllSchoolStudents &&
                                  ((cls.grade_number != null && s.grade_number !== cls.grade_number) ||
                                    (cls.stage_id && s.stage_id !== cls.stage_id)) && (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
                                    {isAr ? "غير مطابق للفصل" : "Off-class profile"}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleEnroll}
                            disabled={!selectedStudentId || enroll.isPending}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                          >
                            {enroll.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            {isAr ? "تسجيل" : "Enroll"}
                          </button>
                          <button
                            onClick={() => { setAddingStudent(false); setSelectedStudentId(""); setShowAllSchoolStudents(false); }}
                            className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted"
                          >
                            {isAr ? "إلغاء" : "Cancel"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-destructive/25 bg-destructive/5 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-destructive">
                  {isAr ? "إجراءات على الفصل" : "Class actions"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleClearClass}
                    disabled={clearClass.isPending || enrollments.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-orange-300 text-orange-800 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-200 disabled:opacity-45"
                  >
                    {clearClass.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListX className="w-3.5 h-3.5" />}
                    {isAr ? "إزالة كل الطلاب من الفصل" : "Remove all students"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteClass}
                    disabled={deleteClass.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-red-400 text-red-800 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200 disabled:opacity-45"
                  >
                    {deleteClass.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    {isAr ? "حذف الفصل نهائياً" : "Delete class permanently"}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {isAr
                    ? "حذف الفصل يحذف التسجيلات والواجبات المرتبطة به وفق إعدادات قاعدة البيانات."
                    : "Deleting the class removes enrollments and related records per database rules."}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DailyOperations() {
  const { isAr } = useTranslation();
  const { data: classes = [], isLoading: classesLoading } = useSchoolClasses();
  const { data: students = [], isLoading: studentsLoading } = useSchoolStudents();
  const { data: enrollmentCounts = {} } = useSchoolClassEnrollmentCounts();
  const { data: stages = [] } = useStages();

  const totalEnrolledInClasses = Object.values(enrollmentCounts).reduce((a, b) => a + b, 0);
  const avgClassSize =
    classes.length > 0 ? Math.round((totalEnrolledInClasses / classes.length) * 10) / 10 : 0;

  const createClass = useCreateClass();

  const [openClassId, setOpenClassId] = useState<string | null>(null);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [classForm, setClassForm] = useState({
    name: "", grade_number: "", stage_id: "", capacity: "40", class_code: "",
  });
  const [activeTab, setActiveTab] = useState<"classes" | "all_students">("classes");

  const handleToggleClass = (id: string) => setOpenClassId((prev) => (prev === id ? null : id));

  const handleStageChange = (stageId: string) => {
    setClassForm({ ...classForm, stage_id: stageId, grade_number: "" });
  };

  const selectedStageObj = (stages as any[]).find((s) => s.id === classForm.stage_id);
  const gradeOptions = getGradeOptions(selectedStageObj?.name_ar ?? selectedStageObj?.name);

  const handleCreateClass = async () => {
    if (!classForm.name.trim()) {
      toast.error(isAr ? "اسم الفصل مطلوب" : "Class name is required");
      return;
    }
    try {
      await createClass.mutateAsync({
        name: classForm.name.trim(),
        grade_number: classForm.grade_number ? Number(classForm.grade_number) : null,
        stage_id: classForm.stage_id || null,
        capacity: classForm.capacity ? Number(classForm.capacity) : 40,
        class_code: classForm.class_code || null,
      } as any);
      toast.success(isAr ? "تم إنشاء الفصل بنجاح ✓" : "Class created successfully ✓");
      setShowCreateClass(false);
      setClassForm({ name: "", grade_number: "", stage_id: "", capacity: "40", class_code: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: isAr ? "الفصول" : "Classes", count: classes.length, icon: BookOpen, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
          { label: isAr ? "الطلاب" : "Students", count: students.length, icon: GraduationCap, color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
          {
            label: isAr ? "متوسط الفصل (مسجّلون)" : "Avg class (enrolled)",
            count: avgClassSize,
            icon: Users,
            color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
          },
        ].map((s) => (
          <div key={s.label} className="bg-surface-elevated rounded-xl border border-border p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center shrink-0`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-tight">{s.count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
        {[
          { id: "classes" as const, label: isAr ? "إدارة الفصول" : "Manage Classes", icon: LayoutGrid },
          { id: "all_students" as const, label: isAr ? "كل الطلاب" : "All Students", icon: GraduationCap },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Classes tab ─────────────────────────────────────── */}
      {activeTab === "classes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isAr
                ? "انقر على أي فصل لعرض طلابه والتعديل"
                : "Click any class to view students & manage enrollment"}
            </p>
            <button
              onClick={() => setShowCreateClass(!showCreateClass)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {isAr ? "فصل جديد" : "New Class"}
            </button>
          </div>

          {/* Create class form */}
          {showCreateClass && (
            <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                {isAr ? "بيانات الفصل الجديد" : "New Class Details"}
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Class name */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "اسم الفصل *" : "Class Name *"}</label>
                  <input
                    type="text"
                    value={classForm.name}
                    onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder={isAr ? "مثال: 3أ" : "e.g. 3A"}
                  />
                </div>

                {/* Stage */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "المرحلة الدراسية" : "Stage"}</label>
                  <select
                    value={classForm.stage_id}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">{isAr ? "اختر المرحلة" : "Select stage"}</option>
                    {(stages as any[]).map((s: any) => (
                      <option key={s.id} value={s.id}>{isAr ? s.name_ar || s.name : s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Grade — smart select based on stage */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "الصف" : "Grade"}</label>
                  <select
                    value={classForm.grade_number}
                    onChange={(e) => setClassForm({ ...classForm, grade_number: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={!classForm.stage_id}
                  >
                    <option value="">
                      {!classForm.stage_id
                        ? isAr ? "اختر المرحلة أولاً" : "Select stage first"
                        : isAr ? "اختر الصف" : "Select grade"}
                    </option>
                    {gradeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {isAr ? o.labelAr : o.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "السعة القصوى" : "Capacity"}</label>
                  <input
                    type="number"
                    min={1}
                    value={classForm.capacity}
                    onChange={(e) => setClassForm({ ...classForm, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Class code */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "كود الفصل" : "Class Code"}</label>
                  <input
                    type="text"
                    value={classForm.class_code}
                    onChange={(e) => setClassForm({ ...classForm, class_code: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="CL-3A-2025"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateClass}
                  disabled={createClass.isPending}
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 hover:bg-primary/90"
                >
                  {createClass.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {isAr ? "إنشاء الفصل" : "Create Class"}
                </button>
                <button
                  onClick={() => setShowCreateClass(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>
          )}

          {/* Classes list */}
          {classesLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : classes.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border rounded-xl">
              <BookOpen className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">{isAr ? "لا توجد فصول بعد" : "No classes yet"}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {isAr ? "أنشئ فصلاً أولاً من الزر بالأعلى" : "Create your first class using the button above"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {classes.map((c) => (
                <ClassCard
                  key={c.id}
                  cls={c}
                  isAr={isAr}
                  isOpen={openClassId === c.id}
                  onToggle={() => handleToggleClass(c.id)}
                  allStudents={students}
                  allClasses={classes}
                  stages={stages as any[]}
                  rosterPreviewCount={enrollmentCounts[c.id] ?? 0}
                  onEnrollSuccess={() => {}}
                  onClassRemoved={(id) => {
                    setOpenClassId((open) => (open === id ? null : open));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── All Students tab ─────────────────────────────────── */}
      {activeTab === "all_students" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {isAr ? "جميع طلاب المدرسة المسجلون" : "All registered students in this school"}
          </p>
          {studentsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : students.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-border rounded-xl">
              <GraduationCap className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{isAr ? "لا يوجد طلاب بعد" : "No students yet"}</p>
            </div>
          ) : (
            <div className="bg-surface-elevated border border-border rounded-xl overflow-hidden">
              <div className="p-3 border-b border-border bg-muted/20 flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{students.length} {isAr ? "طالب" : "students"}</span>
              </div>
              <div className="divide-y divide-border">
                {students.map((s, idx) => {
                  const stageObj = (stages as any[]).find((st) => st.id === s.stage_id);
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 hover:bg-muted/10 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {gradeLabel(s.grade_number, stageObj?.name_ar ?? stageObj?.name, isAr)}
                        </p>
                      </div>
                      {s.national_id && (
                        <span className="text-xs text-muted-foreground font-mono hidden sm:block">{s.national_id}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
