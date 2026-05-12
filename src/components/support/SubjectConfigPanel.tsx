import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Loader2, Check, X, ChevronDown, ChevronUp, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Stage {
  id: string;
  name_ar: string;
  name: string | null;
}

interface Subject {
  id: string;
  name: string;
  name_ar: string;
  stage_id: string | null;
  grade_number: number | null;
  is_mandatory: boolean | null;
  color: string | null;
}

// Grade labels for Egyptian education stages
const GRADE_LABELS: Record<number, string> = {
  1: "أولى", 2: "ثانية", 3: "ثالثة",
  4: "رابعة", 5: "خامسة", 6: "سادسة",
  7: "أولى إعدادي", 8: "ثانية إعدادي", 9: "ثالثة إعدادي",
  10: "أولى ثانوي", 11: "ثانية ثانوي", 12: "ثالثة ثانوي",
};

export function SubjectConfigPanel() {
  const qc = useQueryClient();
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectNameAr, setNewSubjectNameAr] = useState("");
  const [addingTo, setAddingTo] = useState<{ stage_id: string; grade_number: number | null } | null>(null);

  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ["stages_all"],
    queryFn: async (): Promise<Stage[]> => {
      const { data, error } = await (supabase as any).from("stages").select("*").order("name_ar");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["subjects_all_config"],
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await (supabase as any)
        .from("subjects")
        .select("*")
        .order("grade_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const toggleMandatory = useMutation({
    mutationFn: async ({ id, is_mandatory }: { id: string; is_mandatory: boolean }) => {
      const { error } = await (supabase as any)
        .from("subjects")
        .update({ is_mandatory })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects_all_config"] });
      toast.success("تم التحديث");
    },
    onError: () => toast.error("فشل التحديث"),
  });

  const addSubject = useMutation({
    mutationFn: async (payload: {
      name: string;
      name_ar: string;
      stage_id: string;
      grade_number: number | null;
      is_mandatory: boolean;
    }) => {
      const { error } = await (supabase as any).from("subjects").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects_all_config"] });
      toast.success("تمت إضافة المادة");
      setNewSubjectName("");
      setNewSubjectNameAr("");
      setAddingTo(null);
    },
    onError: () => toast.error("فشلت الإضافة"),
  });

  // Group subjects by stage_id then grade_number
  const subjectsByStageGrade = subjects.reduce<Record<string, Record<string, Subject[]>>>(
    (acc, s) => {
      const stageKey = s.stage_id || "no_stage";
      const gradeKey = s.grade_number != null ? String(s.grade_number) : "all";
      if (!acc[stageKey]) acc[stageKey] = {};
      if (!acc[stageKey][gradeKey]) acc[stageKey][gradeKey] = [];
      acc[stageKey][gradeKey].push(s);
      return acc;
    },
    {}
  );

  if (stagesLoading || subjectsLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stages.map((stage) => {
        const stageSubjects = subjectsByStageGrade[stage.id] || {};
        const grades = Object.keys(stageSubjects).sort((a, b) => Number(a) - Number(b));
        const isOpen = expandedStage === stage.id;
        const totalSubjects = Object.values(stageSubjects).reduce((s, arr) => s + arr.length, 0);

        return (
          <div key={stage.id} className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-5 py-4 bg-surface-elevated text-start hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedStage(isOpen ? null : stage.id)}
            >
              <BookOpen className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-foreground">{stage.name_ar}</span>
                {stage.name && <span className="text-xs text-muted-foreground ms-2">({stage.name})</span>}
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {totalSubjects} مادة
              </span>
              {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {isOpen && (
              <div className="divide-y divide-border border-t border-border">
                {grades.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    لا توجد مواد مسجلة لهذه المرحلة.
                  </div>
                ) : (
                  grades.map((gradeKey) => {
                    const gradeNum = gradeKey === "all" ? null : Number(gradeKey);
                    const gradeLabel = gradeNum != null ? GRADE_LABELS[gradeNum] || `الصف ${gradeNum}` : "جميع الصفوف";
                    const gradeSubjects = stageSubjects[gradeKey];
                    const expandKey = `${stage.id}:${gradeKey}`;
                    const gradeOpen = expandedGrade === expandKey;

                    return (
                      <div key={gradeKey}>
                        <button
                          type="button"
                          className="w-full flex items-center gap-3 px-6 py-3 bg-muted/10 hover:bg-muted/30 transition-colors text-start"
                          onClick={() => setExpandedGrade(gradeOpen ? null : expandKey)}
                        >
                          <span className="text-sm font-medium text-foreground">{gradeLabel}</span>
                          <span className="text-xs text-muted-foreground">({gradeSubjects.length} مادة)</span>
                          <span className="ms-auto text-xs text-muted-foreground">
                            {gradeSubjects.filter(s => s.is_mandatory).length} إلزامية ·{" "}
                            {gradeSubjects.filter(s => !s.is_mandatory).length} اختيارية
                          </span>
                          {gradeOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {gradeOpen && (
                          <div className="px-6 py-3 space-y-2">
                            {gradeSubjects.map((subject) => (
                              <div key={subject.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                                <div
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: subject.color || "#4A90D9" }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">{subject.name_ar}</p>
                                  <p className="text-xs text-muted-foreground">{subject.name}</p>
                                </div>
                                <button
                                  type="button"
                                  disabled={toggleMandatory.isPending}
                                  onClick={() =>
                                    toggleMandatory.mutate({
                                      id: subject.id,
                                      is_mandatory: !subject.is_mandatory,
                                    })
                                  }
                                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                                    subject.is_mandatory
                                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                                  }`}
                                >
                                  {subject.is_mandatory ? (
                                    <><Check className="w-3 h-3" /> إلزامية</>
                                  ) : (
                                    <>اختيارية</>
                                  )}
                                </button>
                              </div>
                            ))}

                            {/* Add new subject inline */}
                            {addingTo?.stage_id === stage.id && addingTo?.grade_number === gradeNum ? (
                              <div className="flex flex-col gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    value={newSubjectNameAr}
                                    onChange={e => setNewSubjectNameAr(e.target.value)}
                                    placeholder="اسم المادة بالعربية"
                                    className="text-sm bg-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary"
                                    dir="rtl"
                                  />
                                  <input
                                    value={newSubjectName}
                                    onChange={e => setNewSubjectName(e.target.value)}
                                    placeholder="Subject name (English)"
                                    className="text-sm bg-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary"
                                    dir="ltr"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    disabled={!newSubjectNameAr.trim() || addSubject.isPending}
                                    onClick={() =>
                                      addSubject.mutate({
                                        name: newSubjectName.trim() || newSubjectNameAr.trim(),
                                        name_ar: newSubjectNameAr.trim(),
                                        stage_id: stage.id,
                                        grade_number: gradeNum,
                                        is_mandatory: false,
                                      })
                                    }
                                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50"
                                  >
                                    {addSubject.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                    إضافة
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setAddingTo(null); setNewSubjectName(""); setNewSubjectNameAr(""); }}
                                    className="px-4 py-2 rounded text-xs text-muted-foreground border border-border hover:bg-muted/30"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAddingTo({ stage_id: stage.id, grade_number: gradeNum })}
                                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                إضافة مادة لهذا الصف
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Add subject for new grade in this stage */}
                <div className="px-6 py-3">
                  {addingTo?.stage_id === stage.id && addingTo?.grade_number == null && grades.length === 0 ? (
                    <div className="flex flex-col gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs text-muted-foreground">ستُضاف للمرحلة دون تحديد صف</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={newSubjectNameAr}
                          onChange={e => setNewSubjectNameAr(e.target.value)}
                          placeholder="اسم المادة بالعربية"
                          className="text-sm bg-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary"
                          dir="rtl"
                        />
                        <input
                          value={newSubjectName}
                          onChange={e => setNewSubjectName(e.target.value)}
                          placeholder="Subject name (English)"
                          className="text-sm bg-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary"
                          dir="ltr"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!newSubjectNameAr.trim() || addSubject.isPending}
                          onClick={() =>
                            addSubject.mutate({
                              name: newSubjectName.trim() || newSubjectNameAr.trim(),
                              name_ar: newSubjectNameAr.trim(),
                              stage_id: stage.id,
                              grade_number: null,
                              is_mandatory: false,
                            })
                          }
                          className="flex-1 flex items-center justify-center gap-1 py-2 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50"
                        >
                          {addSubject.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          إضافة
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAddingTo(null); setNewSubjectName(""); setNewSubjectNameAr(""); }}
                          className="px-4 py-2 rounded text-xs text-muted-foreground border border-border hover:bg-muted/30"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
