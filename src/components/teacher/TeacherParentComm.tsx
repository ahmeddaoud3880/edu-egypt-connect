import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { MessageSquare, Users, Send, Bell, CheckCircle2, Loader2, ChevronDown } from "lucide-react";
import { useSendNotification } from "@/hooks/useNotifications";
import { useMyTeacherClasses } from "@/hooks/useTeacherData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TeacherParentRecipientRow {
  recipient_user_id: string;
  parent_display_name: string;
  student_id: string;
  student_name: string;
}

function useTeacherParentRecipients(classId: string | undefined) {
  return useQuery({
    queryKey: ["teacher_parent_recipients", classId],
    queryFn: async (): Promise<TeacherParentRecipientRow[]> => {
      if (!classId) return [];
      const { data, error } = await (supabase as any).rpc("teacher_parent_recipients_for_class", {
        p_class_id: classId,
      });
      if (error) throw error;
      return (data || []) as TeacherParentRecipientRow[];
    },
    enabled: !!classId,
    staleTime: 1000 * 60 * 2,
  });
}

export function TeacherParentComm() {
  const { isAr } = useTranslation();
  const sendNotification = useSendNotification();
  const { data: assignments = [], isLoading: classesLoading } = useMyTeacherClasses();

  const [classId, setClassId] = useState<string>("");
  const [recipientKey, setRecipientKey] = useState<string>("");
  const [advancedRecipientId, setAdvancedRecipientId] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [body, setBody] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [notifType, setNotifType] = useState("general");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (assignments.length === 0) {
      setClassId("");
      return;
    }
    setClassId((prev) => {
      const ids = new Set(assignments.map((a) => a.class_id));
      if (prev && ids.has(prev)) return prev;
      return assignments[0].class_id;
    });
  }, [assignments]);

  const { data: recipientRows = [], isLoading: parentsLoading, error: parentsErr } =
    useTeacherParentRecipients(classId || undefined);

  const recipientOptions = useMemo(() => {
    const map = new Map<
      string,
      { recipient_user_id: string; parent_display_name: string; students: { id: string; name: string }[] }
    >();
    for (const r of recipientRows) {
      const k = r.recipient_user_id;
      if (!map.has(k)) {
        map.set(k, {
          recipient_user_id: k,
          parent_display_name: r.parent_display_name,
          students: [],
        });
      }
      map.get(k)!.students.push({ id: r.student_id, name: r.student_name });
    }
    for (const g of map.values()) {
      g.students.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    }
    return [...map.values()].sort((a, b) =>
      a.parent_display_name.localeCompare(b.parent_display_name, "ar"),
    );
  }, [recipientRows]);

  useEffect(() => {
    setRecipientKey("");
  }, [classId, recipientRows]);

  const resolvedRecipientId = showAdvanced ? advancedRecipientId.trim() : recipientKey;

  const handleSend = async () => {
    if (!resolvedRecipientId) {
      toast.error(isAr ? "اختر ولي أمراً من القائمة أو أدخل معرّفاً في المتقدم" : "Pick a parent or use Advanced");
      return;
    }
    const titleEn = title.trim() || titleAr.trim() || (isAr ? "رسالة من المعلم" : "Message from teacher");
    const titleArFinal = titleAr.trim() || title.trim() || titleEn;

    try {
      await sendNotification.mutateAsync({
        recipient_id: resolvedRecipientId,
        title: titleEn,
        title_ar: titleArFinal,
        body: body.trim() || undefined,
        body_ar: bodyAr.trim() || body.trim() || undefined,
        type: notifType,
      });
      setSent(true);
      setRecipientKey("");
      setAdvancedRecipientId("");
      setTitle("");
      setTitleAr("");
      setBody("");
      setBodyAr("");
      toast.success(isAr ? "تم إرسال الإشعار بنجاح" : "Notification sent successfully");
      setTimeout(() => setSent(false), 3000);
    } catch (e: any) {
      toast.error(e.message || "Error sending notification");
    }
  };

  const selectedClassLabel = useMemo(() => {
    const a = assignments.find((x) => x.class_id === classId);
    if (!a) return "";
    const cn = a.classes?.name || "";
    const sub = a.subjects?.name_ar || a.subjects?.name || "";
    return [cn, sub].filter(Boolean).join(" — ");
  }, [assignments, classId]);

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">{isAr ? "التواصل مع أولياء الأمور" : "Parent Communication"}</h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="border border-border rounded-lg overflow-hidden bg-muted/5">
            <div className="p-3 border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground">
              {isAr ? "أولياء أمور فصلك" : "Parents in your classes"}
            </div>
            <div className="p-4 space-y-3 max-h-[320px] overflow-y-auto">
              {classesLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isAr ? "جارٍ التحميل..." : "Loading..."}
                </div>
              ) : assignments.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <Users className="w-8 h-8 text-muted-foreground/20" />
                  {isAr ? "لا توجد حصص مسندة بعد." : "No class assignments yet."}
                </div>
              ) : parentsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isAr ? "جارٍ جلب الأولياء..." : "Loading parents..."}
                </div>
              ) : parentsErr ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  {isAr
                    ? "تعذّر جلب قائمة الأولياء. طبّق ترحيل قاعدة البيانات `teacher_parent_recipients_for_class` أو استخدم «متقدم»."
                    : "Could not load parents. Apply DB migration or use Advanced."}
                </p>
              ) : recipientOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {isAr
                    ? "لا يوجد حساب ولي أمر مرتبط بهؤلاء الطلاب بعد (رقم قومي / ربط الحساب)."
                    : "No linked parent accounts for these students yet."}
                </p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {recipientOptions.map((o) => (
                    <li
                      key={o.recipient_user_id}
                      className="p-2 rounded-md border border-border bg-background/80"
                    >
                      <span className="font-medium text-foreground">{o.parent_display_name}</span>
                      <span className="text-muted-foreground block mt-0.5">
                        {isAr ? "الطلاب: " : "Students: "}
                        {o.students.map((s) => s.name).join(isAr ? "، " : ", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{isAr ? "إرسال إشعار لولي الأمر" : "Send Notification to Parent"}</h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "الفصل / المادة" : "Class / subject"}</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                disabled={assignments.length === 0}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                dir={isAr ? "rtl" : "ltr"}
              >
                {assignments.map((a) => (
                  <option key={a.id} value={a.class_id}>
                    {a.classes?.name || a.class_id}
                    {a.subjects?.name_ar || a.subjects?.name
                      ? ` — ${a.subjects?.name_ar || a.subjects?.name}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {!showAdvanced && (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  {isAr ? "ولي الأمر" : "Parent recipient"}
                </label>
                <select
                  value={recipientKey}
                  onChange={(e) => setRecipientKey(e.target.value)}
                  disabled={!classId || recipientOptions.length === 0}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  dir={isAr ? "rtl" : "ltr"}
                >
                  <option value="">{isAr ? "— اختر ولي أمر —" : "— Choose parent —"}</option>
                  {recipientOptions.map((o) => (
                    <option key={o.recipient_user_id} value={o.recipient_user_id}>
                      {o.parent_display_name}
                      {" — "}
                      {o.students.map((s) => s.name).join(", ")}
                    </option>
                  ))}
                </select>
                {selectedClassLabel && (
                  <p className="text-[10px] text-muted-foreground mt-1">{selectedClassLabel}</p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              {isAr ? "متقدم: إدخال معرّف مستخدم يدوياً" : "Advanced: manual user ID"}
            </button>
            {showAdvanced && (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">user_id (UUID)</label>
                <input
                  type="text"
                  value={advancedRecipientId}
                  onChange={(e) => setAdvancedRecipientId(e.target.value)}
                  placeholder={isAr ? "للدعم الفني فقط" : "Support use only"}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  dir="ltr"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "نوع الإشعار" : "Notification Type"}</label>
              <select
                value={notifType}
                onChange={(e) => setNotifType(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="general">{isAr ? "عام" : "General"}</option>
                <option value="grade">{isAr ? "درجة / تقييم" : "Grade / Assessment"}</option>
                <option value="attendance">{isAr ? "غياب / حضور" : "Attendance"}</option>
                <option value="assignment">{isAr ? "واجب" : "Assignment"}</option>
                <option value="meeting">{isAr ? "اجتماع" : "Meeting"}</option>
                <option value="announcement">{isAr ? "إعلان" : "Announcement"}</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {isAr ? "العنوان (EN)" : "Title (EN)"}{" "}
                  <span className="text-[10px] opacity-80">{isAr ? "(اختياري)" : "(optional)"}</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {isAr ? "العنوان (AR)" : "Title (AR)"}{" "}
                  <span className="text-[10px] opacity-80">{isAr ? "(اختياري)" : "(optional)"}</span>
                </label>
                <input
                  type="text"
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  dir="rtl"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground -mt-2">
              {isAr
                ? "إن تركنا العنوان فارغاً يُستخدم عنواناً افتراضياً بسيطاً."
                : "If both titles are empty, a short default subject is used."}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {isAr ? "التفاصيل (EN)" : "Details (EN)"}{" "}
                  <span className="text-[10px] opacity-80">{isAr ? "(اختياري)" : "(optional)"}</span>
                </label>
                <textarea
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {isAr ? "التفاصيل (AR)" : "Details (AR)"}{" "}
                  <span className="text-[10px] opacity-80">{isAr ? "(اختياري)" : "(optional)"}</span>
                </label>
                <textarea
                  rows={3}
                  value={bodyAr}
                  onChange={(e) => setBodyAr(e.target.value)}
                  dir="rtl"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={sendNotification.isPending}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sent ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {isAr ? "تم الإرسال!" : "Sent!"}
                </>
              ) : sendNotification.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isAr ? "جارٍ الإرسال..." : "Sending..."}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {isAr ? "إرسال الإشعار" : "Send Notification"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
