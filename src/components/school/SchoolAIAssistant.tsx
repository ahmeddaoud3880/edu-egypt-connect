import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSchoolAIChat } from "@/hooks/useSchoolAIChat";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Bot,
  Send,
  Trash2,
  Loader2,
  AlertCircle,
  Zap,
  MessageSquarePlus,
} from "lucide-react";
import { CHAT_ASSISTANT_MARKDOWN_CLASS } from "@/components/chat/chatMarkdownProse";

const QUICK_QUESTIONS = {
  ar: [
    "كيف أتابع غياب الطلاب هذا الأسبوع؟",
    "ملخص سريع عن أداء فصول المدرسة",
    "ما خطوات الموافقة على طلبات تغيير المواد؟",
    "اقتراحات لتحسين تواصل أولياء الأمور",
  ],
  en: [
    "How do I track student absences this week?",
    "Quick summary of class performance",
    "What are the steps for subject-change approvals?",
    "Ideas to improve parent communication",
  ],
};

export function SchoolAIAssistant() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const {
    chats,
    activeChatId,
    messages,
    loading,
    loadingList,
    loadingMessages,
    error,
    sendMessage,
    openChat,
    startNewChat,
    removeChat,
  } = useSchoolAIChat();

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleSend() {
    if (!input.trim()) return;
    void sendMessage(input.trim());
    setInput("");
  }

  function formatChatDate(iso: string | null) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString(isAr ? "ar-EG" : "en-GB", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-elevated rounded-lg border border-border p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{isAr ? "المساعد الذكى للمدرسة" : "AI School Assistant"}</h2>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "محادثات محفوظة في حسابك — Markdown في الردود — نفس آلية الطالب والمعلم (ذاكرة الجلسة عبر الخادم)"
                  : "Saved chats on your account — Markdown replies — session memory via the agent like student/teacher flows"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => startNewChat()}
            className="text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            {isAr ? "محادثة جديدة" : "New chat"}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <aside className="lg:w-64 shrink-0 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase px-1">
            {isAr ? "المحادثات" : "Chats"}
          </p>
          {loadingList ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : chats.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1 py-4">{isAr ? "لا محادثات بعد." : "No chats yet."}</p>
          ) : (
            <div className="space-y-1 max-h-[420px] overflow-y-auto pe-1">
              {chats.map((c) => (
                <div
                  key={c.id}
                  className={`group rounded-lg border transition-colors ${
                    activeChatId === c.id ? "border-primary bg-primary/5" : "border-border bg-surface hover:bg-muted/40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void openChat(c.id)}
                    className="w-full text-start px-3 py-2.5"
                  >
                    <div className="text-xs font-medium text-foreground line-clamp-2 leading-snug">{c.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {formatChatDate(c.updated_at || c.created_at)}
                    </div>
                  </button>
                  <div className="flex justify-end px-2 pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      title={isAr ? "حذف المحادثة" : "Delete chat"}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(isAr ? "حذف هذه المحادثة؟" : "Delete this chat?")) {
                          void removeChat(c.id);
                        }
                      }}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        <div className="flex-1 bg-surface-elevated rounded-lg border border-border min-w-0">
          {loadingMessages && (
            <div className="flex items-center justify-center h-14 border-b border-border text-xs text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {isAr ? "جارٍ فتح المحادثة…" : "Opening chat…"}
            </div>
          )}
          <div className="h-[500px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !loadingMessages && (
              <div
                className="flex flex-col items-center justify-center h-full gap-4 text-center px-4 py-6"
                dir={isAr ? "rtl" : "ltr"}
              >
                <Bot className="w-10 h-10 text-primary/40" />
                <p className="text-sm font-medium text-foreground">
                  {isAr ? "ابدأ محادثة أو اختر من الجانب" : "Start a chat or pick one from the sidebar"}
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {QUICK_QUESTIONS[isAr ? "ar" : "en"].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void sendMessage(q)}
                      disabled={loading}
                      className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className={CHAT_ASSISTANT_MARKDOWN_CLASS} dir={isAr ? "rtl" : "ltr"}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  {msg.role === "assistant" && msg.model && (
                    <div className="mt-1 text-[10px] opacity-50 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" />
                      {msg.provider}/{msg.model}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{isAr ? "يفكر…" : "Thinking…"}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border p-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={isAr ? "اكتب سؤالك…" : "Type your question…"}
              disabled={loading || loadingMessages}
              className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary disabled:opacity-50"
              dir={isAr ? "rtl" : "ltr"}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || loading || loadingMessages}
              className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
