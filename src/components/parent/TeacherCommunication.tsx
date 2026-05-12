import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { MessageSquare, Bell, Users, Loader2 } from "lucide-react";
import {
  useMyChildren,
  useChildTeachersForMessaging,
  useParentSchoolStaffContacts,
} from "@/hooks/useParentData";
import { useSendNotification } from "@/hooks/useNotifications";
import { ConversationPanel } from "@/components/shared/ConversationPanel";
import { toast } from "sonner";

type Mode = "chat" | "notify";

interface Contact {
  user_id: string;
  display_name: string;
  sub_label?: string;
}

function NotificationForm({
  isAr,
  contacts,
}: {
  isAr: boolean;
  contacts: Contact[];
}) {
  const [recipientId, setRecipientId] = useState(contacts[0]?.user_id || "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const sendNotification = useSendNotification();

  useEffect(() => {
    if (contacts.length > 0 && !contacts.some((c) => c.user_id === recipientId)) {
      setRecipientId(contacts[0].user_id);
    }
  }, [contacts]);

  const handleSend = async () => {
    if (!recipientId || !title.trim()) {
      toast.error(isAr ? "اختر المستلم وأدخل الموضوع" : "Pick a recipient and enter subject");
      return;
    }
    try {
      await sendNotification.mutateAsync({
        recipient_id: recipientId,
        title: title.trim(),
        title_ar: title.trim(),
        body: body || undefined,
        body_ar: body || undefined,
        type: "message",
        related_type: "parent_message",
      });
      setSent(true);
      setTitle("");
      setBody("");
      toast.success(isAr ? "تم إرسال الإشعار" : "Notification sent");
      setTimeout(() => setSent(false), 4000);
    } catch {
      toast.error(isAr ? "تعذّر الإرسال" : "Failed to send");
    }
  };

  if (contacts.length === 0) {
    return (
      <div className="bg-surface-elevated border border-border rounded-xl p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {isAr ? "لا توجد جهات اتصال متاحة" : "No contacts available"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated border border-border rounded-xl p-5 space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          {isAr ? "المستلم" : "Recipient"}
        </label>
        <select
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
        >
          {contacts.map((c) => (
            <option key={c.user_id} value={c.user_id}>
              {c.display_name}{c.sub_label ? ` (${c.sub_label})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          {isAr ? "الموضوع" : "Subject"}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          {isAr ? "الرسالة" : "Message"}
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <button
        disabled={!title.trim() || !recipientId || sendNotification.isPending}
        onClick={() => void handleSend()}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
      >
        {sendNotification.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {sent ? (isAr ? "✓ تم الإرسال" : "✓ Sent") : (isAr ? "إرسال إشعار" : "Send Notification")}
      </button>
    </div>
  );
}

export function TeacherCommunication() {
  const { isAr } = useTranslation();
  const { data: children = [], isLoading } = useMyChildren();
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [mode, setMode] = useState<Mode>("chat");

  useEffect(() => {
    if (children.length === 0) { setSelectedStudentId(""); return; }
    setSelectedStudentId((prev) => {
      if (prev && children.some((c) => c.student_id === prev)) return prev;
      return children[0].student_id;
    });
  }, [children]);

  const selectedChild = useMemo(
    () => children.find((c) => c.student_id === selectedStudentId),
    [children, selectedStudentId],
  );

  const { data: teacherRows = [] } = useChildTeachersForMessaging(selectedStudentId || undefined);
  const { data: schoolStaff = [] } = useParentSchoolStaffContacts(selectedChild?.school_id ?? undefined);

  const contacts: Contact[] = useMemo(() => [
    ...teacherRows.map((t) => ({
      user_id: t.teacherUserId,
      display_name: t.teacherName || (isAr ? "معلم" : "Teacher"),
      sub_label: t.subjectLabel + (t.className ? ` — ${t.className}` : ""),
    })),
    ...schoolStaff.map((s) => ({
      user_id: s.recipient_user_id,
      display_name: s.display_name || (isAr ? "قيادة المدرسة" : "School Staff"),
      sub_label: s.school_name
        ? `${isAr ? "قيادة" : "Admin"} — ${s.school_name}`
        : (isAr ? "إدارة المدرسة" : "School Administration"),
    })),
  ], [teacherRows, schoolStaff, isAr]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="p-10 text-center border border-dashed border-border rounded-lg bg-surface-elevated">
        <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
        <h3 className="font-semibold text-foreground mb-1">
          {isAr ? "لا يوجد أبناء مرتبطون" : "No Linked Children"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {isAr
            ? "سيظهر هنا التواصل مع معلمي أبنائك بعد ربط حساباتهم"
            : "Teacher communication will appear here after linking your children's accounts"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">{isAr ? "التواصل مع المعلمين" : "Teacher Communication"}</h2>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map((c) => (
            <button
              key={c.student_id}
              onClick={() => setSelectedStudentId(c.student_id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedStudentId === c.student_id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {c.full_name || (isAr ? "ابن/بنت" : "Child")}
            </button>
          ))}
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl w-fit">
        {(["chat", "notify"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "chat"
              ? <><MessageSquare className="w-4 h-4" /> {isAr ? "دردشة مباشرة" : "Live Chat"}</>
              : <><Bell className="w-4 h-4" /> {isAr ? "إرسال إشعار" : "Send Notification"}</>}
          </button>
        ))}
      </div>

      {mode === "chat" && (
        <ConversationPanel
          contacts={contacts}
          title={isAr ? "المحادثات مع المعلمين والإدارة" : "Messages with Teachers & Admin"}
        />
      )}

      {mode === "notify" && (
        <NotificationForm isAr={isAr} contacts={contacts} />
      )}
    </div>
  );
}
