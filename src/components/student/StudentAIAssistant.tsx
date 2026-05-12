import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStudentAIChat } from "@/hooks/useStudentAIChat";
import { useTranslation } from "@/hooks/useTranslation";
import { useStudentRegistrationInfo } from "@/hooks/useStudentData";
import { ragListBooks, type RagBook } from "@/services/ragService";
import {
  Bot,
  Send,
  Loader2,
  AlertCircle,
  Zap,
  MessageSquarePlus,
  Trash2,
  BookOpen,
  Library,
} from "lucide-react";
import { CHAT_ASSISTANT_MARKDOWN_CLASS } from "@/components/chat/chatMarkdownProse";

const QUICK_QUESTIONS = {
  ar: [
    "ما هى درجاتى فى المواد الدراسية؟",
    "كيف حضورى هذا الشهر؟",
    "ما هى الواجبات القادمة؟",
    "ما هى المواد التى أحتاج تحسينها؟",
  ],
  en: [
    "What are my grades in all subjects?",
    "How is my attendance this month?",
    "What are my upcoming assignments?",
    "Which subjects do I need to improve?",
  ],
};

type Props = {
  bookIntent?: RagBook | null;
  onBookIntentConsumed?: () => void;
};

export function StudentAIAssistant({ bookIntent = null, onBookIntentConsumed }: Props) {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { data: regInfo } = useStudentRegistrationInfo();
  const grade = regInfo?.grade_number ?? null;
  const [ragCatalog, setRagCatalog] = useState<RagBook[]>([]);
  const [ragLoading, setRagLoading] = useState(false);

  useEffect(() => {
    if (grade == null) {
      setRagCatalog([]);
      return;
    }
    setRagLoading(true);
    ragListBooks({ grade })
      .then(setRagCatalog)
      .catch(() => setRagCatalog([]))
      .finally(() => setRagLoading(false));
  }, [grade]);

  const readyRagBooks = ragCatalog.filter((b) => (b.total_chunks ?? 0) > 0);

  const {
    chats,
    activeChatId,
    messages,
    activeFocusBook,
    applyFocusBook,
    loading,
    loadingList,
    loadingMessages,
    error,
    sendMessage,
    openChat,
    startNewChat,
    removeChat,
  } = useStudentAIChat(bookIntent ?? null, onBookIntentConsumed);

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleSend() {
    if (!input.trim()) return;
    sendMessage(input.trim());
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
              <h2 className="font-semibold text-foreground">{isAr ? "المساعد الذكى" : "AI Study Assistant"}</h2>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "محادثات محفوظة — اسأل عن درجاتك أو منهجك (مع ذاكرة الجلسة مثل الدعم الفنى)"
                  : "Saved chats — ask about grades or curriculum (session memory like support)"}
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

        {readyRagBooks.length > 0 && (
          <div
            className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2.5"
            dir={isAr ? "rtl" : "ltr"}
          >
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0">
              <Library className="w-4 h-4 text-violet-600" />
              {isAr ? "الكتاب الذى تسأل عنه فى RAG:" : "Textbook for RAG questions:"}
              {ragLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            </div>
            <select
              className="flex-1 min-w-0 text-sm bg-background border border-border rounded-md px-2 py-1.5 text-foreground"
              value={activeFocusBook?.id ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) void applyFocusBook(null);
                else {
                  const b = readyRagBooks.find((x) => x.id === id);
                  if (b) void applyFocusBook(b);
                }
              }}
              disabled={loading || loadingMessages}
            >
              <option value="">{isAr ? "— بدون كتاب محدد (منهج عام / درجات) —" : "— No book (grades & general) —"}</option>
              {readyRagBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {(b.title_ar || b.title) + (b.total_chunks ? ` · ${b.total_chunks} chunks` : "")}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeFocusBook && (
          <div
            className="mt-3 flex items-start gap-2 text-xs rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2.5 text-foreground"
            dir={isAr ? "rtl" : "ltr"}
          >
            <BookOpen className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-violet-800 dark:text-violet-200">
                {isAr ? "نشط الآن:" : "Active:"}
              </span>{" "}
              <strong>{activeFocusBook.title}</strong>
              <span className="text-muted-foreground block mt-0.5">
                {isAr
                  ? "ردود المساعد عن المنهج ستبحث داخل هذا الكتاب أولاً."
                  : "The assistant will search this book first for curriculum answers."}
              </span>
            </div>
          </div>
        )}
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
                    <div className="text-[10px] text-muted-foreground mt-1">{formatChatDate(c.updated_at || c.created_at)}</div>
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
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4 py-6" dir={isAr ? "rtl" : "ltr"}>
                <Bot className="w-10 h-10 text-primary/40" />
                <p className="text-sm font-medium text-foreground">
                  {isAr ? "مرحباً — ابدأ محادثة أو اختر من اليسار" : "Hello — start a chat or pick one on the left"}
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {QUICK_QUESTIONS[lang === "ar" ? "ar" : "en"].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendMessage(q)}
                      disabled={loading}
                      className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
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
