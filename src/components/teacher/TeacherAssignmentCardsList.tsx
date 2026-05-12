import { useState } from "react";
import { Calendar, Loader2, FileText, ChevronRight, Eye, BarChart3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Assignment } from "@/hooks/useTeacherData";
import { useDeleteAssignment } from "@/hooks/useTeacherData";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const TYPE_META: Record<string, { labelAr: string; labelEn: string }> = {
  homework: { labelAr: "واجب منزلى", labelEn: "Homework" },
  quiz: { labelAr: "اختبار قصير", labelEn: "Quiz" },
  exam: { labelAr: "امتحان", labelEn: "Exam" },
  project: { labelAr: "مشروع", labelEn: "Project" },
};

export function TeacherAssignmentCardsList({
  assignments,
  isLoading,
  isAr,
  onInspect,
  onDeleted,
  emptyMessage,
}: {
  assignments: Assignment[];
  isLoading: boolean;
  isAr: boolean;
  onInspect: (a: Assignment) => void;
  /** Close inspector if it was showing this assignment */
  onDeleted?: (assignmentId: string) => void;
  emptyMessage?: string;
}) {
  const [toDelete, setToDelete] = useState<Assignment | null>(null);
  const del = useDeleteAssignment();

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    try {
      await del.mutateAsync({ id: toDelete.id, classId: toDelete.class_id });
      toast.success(isAr ? "تم حذف المهمة." : "Assignment deleted.");
      onDeleted?.(toDelete.id);
      setToDelete(null);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "";
      toast.error(msg || (isAr ? "تعذّر الحذف." : "Delete failed."));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="bg-muted/30 rounded-lg p-8 text-center">
        <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{emptyMessage || (isAr ? "لا توجد مهام" : "No assignments")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {assignments.map((a) => {
          const typeObj = a.assignment_type ? TYPE_META[a.assignment_type] : undefined;
          return (
            <div
              key={a.id}
              className="bg-surface-elevated border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-start gap-4 shadow-sm hover:border-primary/25 transition-colors"
            >
              <button
                type="button"
                onClick={() => onInspect(a)}
                className="flex flex-1 min-w-0 text-start gap-4 group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1">
                    {isAr ? a.title_ar || a.title : a.title}
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 shrink-0" />
                  </h3>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {typeObj && (
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        {isAr ? typeObj.labelAr : typeObj.labelEn}
                      </span>
                    )}
                    {a.due_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(a.due_date).toLocaleDateString(isAr ? "ar-EG" : "en-US")}
                      </span>
                    )}
                    {a.max_score != null && (
                      <span className="text-xs text-muted-foreground">{isAr ? `الدرجة الكاملة: ${a.max_score}` : `Max: ${a.max_score}`}</span>
                    )}
                    {a.quiz_id && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
                        {isAr ? "أسئلة تفاعلية" : "Interactive"}
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{a.description}</p>
                  )}
                </div>
              </button>

              <div className="flex sm:flex-col gap-2 shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => onInspect(a)}
                  className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {isAr ? "عرض الأسئلة" : "Questions"}
                </button>
                <button
                  type="button"
                  onClick={() => onInspect(a)}
                  className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted/50 font-medium"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  {isAr ? "درجات الطلاب" : "Scores"}
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(a)}
                  className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-red-300/70 text-red-700 dark:text-red-400 bg-background hover:bg-red-500/10 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isAr ? "حذف" : "Delete"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAr ? "حذف المهمة؟" : "Delete this assignment?"}</AlertDialogTitle>
            <AlertDialogDescription className="text-start">
              {toDelete &&
                (isAr
                  ? `سيتم حذف «${toDelete.title_ar || toDelete.title}» نهائياً وتسليمات الطلاب المرتبطة بها لا يمكن استرجاعها.`
                  : `«${toDelete.title}» will be removed permanently, including linked student submissions.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>{isAr ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <Button variant="destructive" disabled={del.isPending} onClick={() => void handleConfirmDelete()}>
              {del.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isAr ? "حذف نهائياً" : "Delete permanently"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
