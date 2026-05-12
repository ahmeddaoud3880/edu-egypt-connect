import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  useMyConversations,
  useConversationMessages,
  useStartConversation,
  useSendMessage,
  useMarkConversationRead,
  type Conversation,
} from "@/hooks/useMessaging";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";

interface ConversationPanelProps {
  /** Pre-filtered contacts to start new conversations with */
  contacts?: Array<{
    user_id: string;
    display_name: string;
    sub_label?: string;
  }>;
  /** Title for the panel */
  title?: string;
}

function MessageBubble({
  msg,
  isMine,
  isAr,
}: {
  msg: { content: string; sender_id: string; created_at: string | null };
  isMine: boolean;
  isAr: boolean;
}) {
  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(msg.created_at!), {
        addSuffix: true,
        locale: isAr ? ar : enUS,
      });
    } catch {
      return "";
    }
  })();

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
          isMine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-surface-elevated border border-border rounded-bl-sm"
        }`}
      >
        <p className="text-sm leading-relaxed break-words">{msg.content}</p>
        <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
          {timeAgo}
        </p>
      </div>
    </div>
  );
}

function ChatWindow({
  conv,
  isAr,
  userId,
  onBack,
}: {
  conv: Conversation;
  isAr: boolean;
  userId: string;
  onBack: () => void;
}) {
  const { data: messages = [], isLoading } = useConversationMessages(conv.id);
  const markRead = useMarkConversationRead();
  const sendMsg = useSendMessage();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (conv.id) markRead.mutate(conv.id);
  }, [conv.id, messages.length]);

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setText("");
    try {
      await sendMsg.mutateAsync({ conversationId: conv.id, content });
    } catch {
      toast.error(isAr ? "تعذّر إرسال الرسالة" : "Failed to send");
    }
  };

  const roleFallback = conv.other_participant?.role === "school"
    ? (isAr ? "قيادة المدرسة" : "School Admin")
    : conv.other_participant?.role === "teacher"
    ? (isAr ? "معلم" : "Teacher")
    : (isAr ? "مستخدم" : "User");
  const otherName = isAr
    ? (conv.other_participant?.full_name_ar || conv.other_participant?.full_name || roleFallback)
    : (conv.other_participant?.full_name || conv.other_participant?.full_name_ar || roleFallback);

  const title = isAr
    ? (conv.subject_ar || conv.subject || otherName)
    : (conv.subject || conv.subject_ar || otherName);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <button onClick={onBack} className="p-1.5 rounded hover:bg-muted transition-colors">
          {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-primary text-xs font-bold">
            {(otherName || "?")[0]?.toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium">{otherName}</p>
          {title !== otherName && <p className="text-xs text-muted-foreground">{title}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            {isAr ? "لا رسائل بعد. ابدأ المحادثة!" : "No messages yet. Start the conversation!"}
          </p>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} msg={m} isMine={m.sender_id === userId} isAr={isAr} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-border shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder={isAr ? "اكتب رسالتك…" : "Type a message…"}
            className="flex-1 border border-border rounded-full px-4 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            dir={isAr ? "rtl" : "ltr"}
          />
          <button
            onClick={() => void send()}
            disabled={!text.trim() || sendMsg.isPending}
            className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 shrink-0 hover:bg-primary/90 transition-colors"
          >
            {sendMsg.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConversationPanel({ contacts = [], title }: ConversationPanelProps) {
  const { user } = useAuth();
  const { isAr } = useTranslation();
  const { data: conversations = [], isLoading } = useMyConversations();
  const startConv = useStartConversation();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [showNewContact, setShowNewContact] = useState(false);

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  const startNewConversation = async (contact: { user_id: string; display_name: string; sub_label?: string }) => {
    if (!user) return;
    try {
      const convId = await startConv.mutateAsync({
        otherUserId: contact.user_id,
        subject: contact.display_name,
        subject_ar: contact.display_name,
      });
      setSelectedConvId(convId);
      setShowNewContact(false);
    } catch {
      toast.error(isAr ? "تعذّر بدء المحادثة" : "Failed to start conversation");
    }
  };

  const formatTime = (dt: string | null) => {
    if (!dt) return "";
    try {
      return formatDistanceToNow(new Date(dt), { addSuffix: true, locale: isAr ? ar : enUS });
    } catch { return ""; }
  };

  return (
    <div className="bg-surface-elevated border border-border rounded-xl overflow-hidden" style={{ height: "520px" }} dir={isAr ? "rtl" : "ltr"}>
      {selectedConv && !showNewContact ? (
        <ChatWindow
          conv={selectedConv}
          isAr={isAr}
          userId={user!.id}
          onBack={() => setSelectedConvId(null)}
        />
      ) : showNewContact ? (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
            <button onClick={() => setShowNewContact(false)} className="p-1.5 rounded hover:bg-muted">
              {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <span className="text-sm font-medium">{isAr ? "محادثة جديدة" : "New Conversation"}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {contacts.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-8">
                {isAr ? "لا توجد جهات اتصال" : "No contacts available"}
              </p>
            ) : (
              contacts.map((c) => (
                <button
                  key={c.user_id}
                  onClick={() => void startNewConversation(c)}
                  disabled={startConv.isPending}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors border border-border text-start"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary text-sm font-bold">
                      {c.display_name[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.display_name}</p>
                    {c.sub_label && <p className="text-xs text-muted-foreground">{c.sub_label}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Conversation list header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">{title || (isAr ? "الرسائل" : "Messages")}</span>
            </div>
            {contacts.length > 0 && (
              <button
                onClick={() => setShowNewContact(true)}
                className="text-xs px-2.5 py-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                + {isAr ? "محادثة جديدة" : "New"}
              </button>
            )}
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <MessageSquare className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {isAr ? "لا توجد محادثات بعد" : "No conversations yet"}
                </p>
                {contacts.length > 0 && (
                  <button
                    onClick={() => setShowNewContact(true)}
                    className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg"
                  >
                    {isAr ? "ابدأ محادثة" : "Start a conversation"}
                  </button>
                )}
              </div>
            ) : (
              conversations.map((conv) => {
                const listRoleFallback = conv.other_participant?.role === "school"
                  ? (isAr ? "قيادة المدرسة" : "School Admin")
                  : conv.other_participant?.role === "teacher"
                  ? (isAr ? "معلم" : "Teacher")
                  : "?";
                const otherName = isAr
                  ? (conv.other_participant?.full_name_ar || conv.other_participant?.full_name || listRoleFallback)
                  : (conv.other_participant?.full_name || conv.other_participant?.full_name_ar || listRoleFallback);
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/60 transition-colors border-b border-border/50 last:border-b-0 text-start"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 relative">
                      <span className="text-primary text-sm font-bold">
                        {otherName[0]?.toUpperCase()}
                      </span>
                      {(conv.unread_count || 0) > 0 && (
                        <span className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-destructive text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <p className={`text-sm truncate ${(conv.unread_count || 0) > 0 ? "font-semibold" : "font-medium"}`}>
                          {otherName}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      {conv.last_message && (
                        <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
