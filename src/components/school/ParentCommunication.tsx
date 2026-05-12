import { useState, useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { MessageSquare, Users, Send, Loader2, UserCircle, AlertCircle, Bell } from "lucide-react";
import { useSchoolParents } from "@/hooks/useSchoolAdminData";
import { useSendNotification } from "@/hooks/useNotifications";
import { ConversationPanel } from "@/components/shared/ConversationPanel";
import { toast } from "sonner";

type CommMode = "chat" | "broadcast";

export function ParentCommunication() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const [commMode, setCommMode] = useState<CommMode>("chat");
  const { data, isLoading, error } = useSchoolParents();
  const send = useSendNotification();

  const linked = data?.linked ?? [];
  const unlinked = data?.unlinked ?? [];

  const [bulkTitle, setBulkTitle] = useState("");
  const [bulkTitleAr, setBulkTitleAr] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [bulkBodyAr, setBulkBodyAr] = useState("");

  const handleBroadcast = async () => {
    if (!bulkTitle.trim() || !bulkTitleAr.trim()) {
      toast.error(isAr ? "عنوان الرسالة مطلوب (عربي وإنجليزي)" : "Title required in both languages");
      return;
    }
    if (linked.length === 0) {
      toast.error(isAr ? "لا يوجد أولياء أمور بحساب مفعّل لإرسال الإشعار" : "No linked parent accounts to notify");
      return;
    }
    try {
      await send.mutateAsync(
        linked.map((p) => ({
          recipient_id: p.user_id,
          title: bulkTitle.trim(),
          title_ar: bulkTitleAr.trim(),
          body: bulkBody.trim() || undefined,
          body_ar: bulkBodyAr.trim() || undefined,
          type: "announcement",
        })),
      );
      toast.success(isAr ? `تم الإرسال إلى ${linked.length} ولي أمر` : `Sent to ${linked.length} parents`);
      setBulkTitle("");
      setBulkTitleAr("");
      setBulkBody("");
      setBulkBodyAr("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const parentContacts = useMemo(() => linked.map((p) => ({
    user_id: p.user_id,
    display_name: p.full_name || p.full_name_ar || (isAr ? "ولي أمر" : "Parent"),
    sub_label: p.students?.map((s: any) => s.full_name).join(", "),
  })), [linked, isAr]);

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">
              {isAr ? "أولياء الأمور والتواصل" : "Parents & communication"}
            </h2>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
              {isAr ? "بحساب: " : "Registered: "}
              {linked.length}
            </span>
            <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">
              {isAr ? "بدون حساب: " : "No account: "}
              {unlinked.length}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
            {(error as Error).message}
          </div>
        )}

        {/* Mode switcher */}
        <div className="flex gap-1 p-1 bg-muted/30 rounded-xl w-fit mb-4">
          {(["chat", "broadcast"] as CommMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setCommMode(m)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                commMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "chat"
                ? <><MessageSquare className="w-4 h-4" /> {isAr ? "دردشة مباشرة" : "Direct Chat"}</>
                : <><Bell className="w-4 h-4" /> {isAr ? "إشعار جماعي" : "Broadcast"}</>}
            </button>
          ))}
        </div>

        {commMode === "chat" && (
          <ConversationPanel
            contacts={parentContacts}
            title={isAr ? "محادثات مع أولياء الأمور" : "Conversations with Parents"}
          />
        )}

        {commMode === "broadcast" && isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : commMode === "broadcast" ? (
          <>
            {/* Broadcast */}
            <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Bell className="w-4 h-4 text-primary" />
                {isAr ? "إشعار لجميع أولياء الأمور المعروفين (حساب مفعّل)" : "Notify all registered parents"}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">{isAr ? "العنوان (EN)" : "Title (EN)"}</label>
                  <input
                    value={bulkTitle}
                    onChange={(e) => setBulkTitle(e.target.value)}
                    className="mt-0.5 w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{isAr ? "العنوان (عربي)" : "Title (AR)"}</label>
                  <input
                    value={bulkTitleAr}
                    onChange={(e) => setBulkTitleAr(e.target.value)}
                    className="mt-0.5 w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
                    dir="rtl"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">{isAr ? "نص إضافي (EN)" : "Body (EN)"}</label>
                  <textarea
                    value={bulkBody}
                    onChange={(e) => setBulkBody(e.target.value)}
                    rows={2}
                    className="mt-0.5 w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
                    dir="ltr"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">{isAr ? "نص إضافي (عربي)" : "Body (AR)"}</label>
                  <textarea
                    value={bulkBodyAr}
                    onChange={(e) => setBulkBodyAr(e.target.value)}
                    rows={2}
                    className="mt-0.5 w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
                    dir="rtl"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleBroadcast()}
                disabled={send.isPending || linked.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isAr ? `إرسال للكل (${linked.length})` : `Send to all (${linked.length})`}
              </button>
            </div>

            {unlinked.length > 0 && (
              <div className="mb-6 flex items-start gap-2 p-3 rounded-lg border border-amber-200/80 bg-amber-50/80 dark:bg-amber-950/20 text-amber-950 dark:text-amber-100 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{isAr ? "أولياء أمور بدون حساب منصة بعد" : "Parents not yet on the platform"}</p>
                  <p className="mt-1 opacity-90">
                    {isAr
                      ? "يظهر الرقم القومي لولي الأمر من بيانات الطالب. بعد تسجيل ولي الأمر بنفس الرقم القومي في الملف الشخصي يظهر هنا تلقائياً."
                      : "National ID comes from the student record. When a parent registers with the same national ID on their profile, they appear here."}
                  </p>
                </div>
              </div>
            )}

            {linked.length === 0 && unlinked.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-border rounded-lg">
                <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {isAr ? "لا يوجد أولياء أمور مرتبطون بعد" : "No linked parents yet"}
                </p>
                <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
                  {isAr
                    ? "تأكد أن بيانات الطلاب تحتوي على الرقم القومي لولي الأمر، وأن ولي الأمر سجّل حساباً وتم اعتماده."
                    : "Ensure students have parent national ID set and parents have registered and been approved."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "ولي الأمر" : "Parent"}</th>
                      <th className="text-start p-3 font-medium text-muted-foreground hidden md:table-cell">
                        {isAr ? "الرقم القومي" : "National ID"}
                      </th>
                      <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الأبناء في المدرسة" : "Children"}</th>
                      <th className="text-end p-3 font-medium text-muted-foreground w-[100px]">{isAr ? "إشعار" : "Notify"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linked.map((p) => (
                      <ParentRow key={p.user_id} parent={p} isAr={isAr} />
                    ))}
                    {unlinked.map((u) => (
                      <tr key={u.parent_national_id} className="border-b border-border/60 bg-muted/5">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <UserCircle className="w-8 h-8 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground italic text-xs">
                              {isAr ? "لا يوجد حساب بعد" : "No account yet"}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-xs hidden md:table-cell">{u.parent_national_id}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {u.children.map((c) => `${c.full_name ?? "—"}${c.grade_number != null ? ` (${isAr ? "ص" : "G"}${c.grade_number})` : ""}`).join(" · ")}
                        </td>
                        <td className="p-3 text-end text-xs text-muted-foreground">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function ParentRow({
  parent,
  isAr,
}: {
  parent: import("@/hooks/useSchoolAdminData").SchoolParentRow;
  isAr: boolean;
}) {
  const send = useSendNotification();
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [open, setOpen] = useState(false);

  const sendOne = async () => {
    if (!title.trim() || !titleAr.trim()) {
      toast.error(isAr ? "أدخل العنوان بالعربي والإنجليزي" : "Enter title in both languages");
      return;
    }
    try {
      await send.mutateAsync({
        recipient_id: parent.user_id,
        title: title.trim(),
        title_ar: titleAr.trim(),
        type: "message",
      });
      toast.success(isAr ? "تم الإرسال" : "Sent");
      setTitle("");
      setTitleAr("");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <tr className="border-b border-border/60 hover:bg-muted/20">
        <td className="p-3">
          <div className="flex items-center gap-2">
            <UserCircle className="w-8 h-8 text-primary/80 shrink-0" />
            <div>
              <p className="font-medium text-foreground">{parent.full_name_ar || parent.full_name || "—"}</p>
              {parent.full_name_ar && parent.full_name && parent.full_name !== parent.full_name_ar && (
                <p className="text-xs text-muted-foreground" dir="ltr">{parent.full_name}</p>
              )}
            </div>
          </div>
        </td>
        <td className="p-3 font-mono text-xs hidden md:table-cell">{parent.national_id}</td>
        <td className="p-3 text-xs">
          {parent.children.map((c) => `${c.full_name ?? "—"}${c.grade_number != null ? ` (${isAr ? "ص" : "G"}${c.grade_number})` : ""}`).join(" · ")}
        </td>
        <td className="p-3 text-end">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {open ? (isAr ? "إغلاق" : "Close") : isAr ? "رسالة" : "Message"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-primary/5 border-b border-border">
          <td colSpan={4} className="p-4">
            <div className="grid md:grid-cols-2 gap-2 max-w-2xl">
              <input
                placeholder={isAr ? "العنوان EN" : "Title EN"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm bg-background"
                dir="ltr"
              />
              <input
                placeholder={isAr ? "العنوان عربي" : "Title AR"}
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm bg-background"
                dir="rtl"
              />
            </div>
            <button
              type="button"
              onClick={() => void sendOne()}
              disabled={send.isPending}
              className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
            >
              {send.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {isAr ? "إرسال" : "Send"}
            </button>
          </td>
        </tr>
      )}
    </>
  );
}
