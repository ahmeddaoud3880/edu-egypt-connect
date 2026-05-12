import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CHAT_ASSISTANT_MARKDOWN_CLASS } from "@/components/chat/chatMarkdownProse";
import { useSupportAIChat } from "@/hooks/useSupportAIChat";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Bot,
  Send,
  Loader2,
  AlertCircle,
  Zap,
  Search,
  MessageSquarePlus,
  History,
  Trash2,
  Database,
  Link2,
} from "lucide-react";
import type { SupportMatchCard, DisambiguationItem, ClarificationQuestion } from "@/hooks/useSupportAIChat";

export function SupportAIAssistant() {
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
  } = useSupportAIChat();

  const [input, setInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const QUICK_INFO = isAr
    ? [
        { label: "سجلات نشاط مستخدم", prompt: null, needsName: true, icon: "📋" },
        { label: "درجات طالب", prompt: null, needsName: true, icon: "📊" },
        { label: "حضور طالب", prompt: null, needsName: true, icon: "📅" },
        { label: "بيانات كاملة", prompt: null, needsName: true, icon: "👤" },
      ]
    : [
        { label: "Activity logs", prompt: null, needsName: true, icon: "📋" },
        { label: "Grades", prompt: null, needsName: true, icon: "📊" },
        { label: "Attendance", prompt: null, needsName: true, icon: "📅" },
        { label: "Full profile", prompt: null, needsName: true, icon: "👤" },
      ];

  function handleSend() {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  }

  function handleSearchSend() {
    const q = searchInput.trim();
    if (!q) return;
    sendMessage(isAr ? `ابحث عن: ${q}` : `Search for: ${q}`);
    setSearchInput("");
    setShowSearchBar(false);
  }

  function handleQuickWithName(label: string) {
    const actionMap: Record<string, string> = {
      "سجلات نشاط مستخدم": "اعرض سجلات نشاط",
      "درجات طالب": "اعرض درجات",
      "حضور طالب": "اعرض سجل الحضور",
      "بيانات كاملة": "اعرض البيانات الكاملة",
      "Activity logs": "Show activity logs for",
      "Grades": "Show grades for",
      "Attendance": "Show attendance for",
      "Full profile": "Show full profile for",
    };
    const action = actionMap[label] || label;
    const q = searchInput.trim();
    if (q) {
      sendMessage(isAr ? `${action}: ${q}` : `${action}: ${q}`);
      setSearchInput("");
      setShowSearchBar(false);
    } else {
      setShowSearchBar(true);
      setInput(isAr ? `${action}: ` : `${action}: `);
    }
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

  function ClarificationCard({ q, onSend }: { q: ClarificationQuestion; onSend: (msg: string) => void }) {
    const question = isAr ? q.question_ar : q.question_en;
    const opts = q.hint_options ?? [];
    return (
      <div className="mt-3 rounded-xl border border-blue-200/70 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800/40 p-3 space-y-2.5" dir={isAr ? "rtl" : "ltr"}>
        <div className="flex items-start gap-2">
          <span className="text-base shrink-0">🔍</span>
          <p className="text-sm font-medium text-foreground leading-snug">{question}</p>
        </div>
        {opts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {opts.map(opt => (
              <button
                key={opt}
                type="button"
                disabled={loading}
                onClick={() => onSend(isAr ? `${q.question_ar.split("؟")[0]}: ${opt}` : `${opt}`)}
                className="text-xs px-2.5 py-1 rounded-full border border-blue-300/70 bg-white dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors disabled:opacity-50 font-medium"
              >
                {opt}
              </button>
            ))}
            <button
              type="button"
              disabled={loading}
              onClick={() => onSend(isAr ? "لا أعرف" : "I don't know")}
              className="text-xs px-2.5 py-1 rounded-full border border-muted-foreground/30 bg-muted/40 text-muted-foreground hover:bg-muted/70 transition-colors disabled:opacity-50"
            >
              {isAr ? "لا أعرف" : "Don't know"}
            </button>
          </div>
        )}
        {opts.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            {isAr ? "اكتب إجابتك في مربع الرسائل أدناه." : "Type your answer in the message box below."}
          </p>
        )}
        {q.matches_analyzed != null && (
          <p className="text-[10px] text-muted-foreground/60">
            {isAr ? `تحليل ${q.matches_analyzed} نتيجة — حقل: ${q.clarifier_type}` : `Analyzed ${q.matches_analyzed} results — field: ${q.clarifier_type}`}
          </p>
        )}
      </div>
    );
  }

  function DisambiguationPicker({ items, onPick }: { items: DisambiguationItem[]; onPick: (msg: string) => void }) {
    return (
      <div className="mt-3 space-y-1.5" dir={isAr ? "rtl" : "ltr"}>
        <p className="text-xs font-semibold text-amber-700 mb-2">
          {isAr ? "تم العثور على أكثر من شخص — اختر أحدهم:" : "Multiple results — pick one:"}
        </p>
        {items.map(item => (
          <button
            key={item.n}
            type="button"
            onClick={() => onPick(item.pick_message)}
            disabled={loading}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-amber-200/70 bg-amber-50/60 hover:bg-amber-100/80 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 dark:border-amber-800/40 text-start transition-colors disabled:opacity-50 group"
          >
            <span className="w-6 h-6 shrink-0 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center group-hover:bg-amber-600">
              {item.n}
            </span>
            <span className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground block truncate">{item.name}</span>
              <span className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <span className="text-amber-600 font-medium">{item.role_ar}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span>{item.source_badge_ar}</span>
                </span>
                {item.masked_email && (
                  <span className="font-mono text-muted-foreground/70">{item.masked_email}</span>
                )}
              </span>
            </span>
            <span className="shrink-0 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
              {isAr ? "اختر ←" : "→ pick"}
            </span>
          </button>
        ))}
        <p className="text-[11px] text-muted-foreground pt-1">
          {isAr
            ? "أو اكتب اسمًا أكثر تفصيلاً / اسم المدرسة / البريد الإلكتروني في مربع الرسالة."
            : "Or type a more specific name / school / email in the message box."}
        </p>
      </div>
    );
  }

  function MatchCards({ cards }: { cards: SupportMatchCard[] }) {
    return (
      <div className="mt-3 space-y-2" dir={isAr ? "rtl" : "ltr"}>
        {cards.map((c, idx) => {
          const title = isAr ? c.source_label_ar || c.source_label_en : c.source_label_en || c.source_label_ar;
          const linked = !!c.auth_linked;
          return (
            <div
              key={`${c.source_table}-${idx}`}
              className="rounded-lg border border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-800/40 p-3 text-xs space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Database className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-semibold text-foreground">{title}</span>
                <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{c.source_table}</code>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    linked ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {linked
                    ? isAr
                      ? "مرتبط بحساب المنصة"
                      : "Linked to platform account"
                    : isAr
                      ? "غير مرتبط بمعرّف حساب"
                      : "No auth user id on row"}
                </span>
              </div>
              {c.profile_linked_via === "email_lookup" && (
                <p className="text-[10px] text-amber-800/90 flex items-start gap-1">
                  <Link2 className="w-3 h-3 mt-0.5 shrink-0" />
                  {isAr
                    ? "تم ربط معرّف الحساب عبر تطابق البريد مع جدول profiles."
                    : "Auth user id resolved by matching email to profiles."}
                </p>
              )}
              {c.profile_linked_via === "national_id_lookup" && (
                <p className="text-[10px] text-amber-800/90 flex items-start gap-1">
                  <Link2 className="w-3 h-3 mt-0.5 shrink-0" />
                  {isAr
                    ? "تم ربط معرّف الحساب عبر تطابق الرقم القومي مع جدول profiles."
                    : "Auth user id resolved by matching national_id to profiles."}
                </p>
              )}
              {c.registration_request_id && (
                <p className="text-[10px] text-muted-foreground">
                  {isAr ? "معرّف طلب التسجيل:" : "Registration request id:"}{" "}
                  <code className="text-foreground">{c.registration_request_id}</code>
                </p>
              )}
              {c.row_preview && Object.keys(c.row_preview).length > 0 && (
                <dl className="grid gap-1 sm:grid-cols-2 border-t border-amber-200/50 pt-2 mt-1">
                  {Object.entries(c.row_preview).map(([k, v]) => (
                    <div key={k} className="min-w-0">
                      <dt className="text-[10px] text-muted-foreground uppercase tracking-wide">{k}</dt>
                      <dd className="text-[11px] text-foreground break-words">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {c.related_tables_hint && c.related_tables_hint.length > 0 && (
                <div className="border-t border-amber-200/50 pt-2 mt-1">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">
                    {isAr ? "جداول مرتبطة منطقياً (عند وجود user_id)" : "Typically related tables (when user_id exists)"}
                  </p>
                  <p className="text-[10px] text-foreground leading-relaxed">{c.related_tables_hint.join(" · ")}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-elevated rounded-lg border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Search className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">
                {isAr ? "وكيل خدمة العملاء الذكى" : "Support AI Agent"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "صلاحية كاملة لعرض بيانات أى مستخدم وسجلات النشاط — تُحفظ المحادثات فى حسابك تلقائياً."
                  : "Full access to any user's data and logs — conversations are saved to your account."}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          ⚠️{" "}
          {isAr
            ? "هذا الوكيل يرى بيانات جميع المستخدمين. استخدم بمسؤولية."
            : "This agent has full read access to all users. Use responsibly."}
        </div>
      </div>

      <div
        className={`flex flex-col lg:flex-row gap-4 ${isAr ? "lg:flex-row-reverse" : ""}`}
        dir={isAr ? "rtl" : "ltr"}
      >
        <aside className="lg:w-72 shrink-0 bg-surface-elevated rounded-lg border border-border flex flex-col max-h-[560px] lg:max-h-[620px]">
          <div className="p-3 border-b border-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <History className="w-4 h-4 text-amber-600" />
              {isAr ? "المحادثات" : "History"}
            </div>
            <button
              type="button"
              onClick={startNewChat}
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              {isAr ? "جديدة" : "New"}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingList && (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                {isAr ? "جارٍ التحميل…" : "Loading…"}
              </p>
            )}
            {!loadingList && chats.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center leading-relaxed">
                {isAr
                  ? "لا توجد محادثات محفوظة بعد. ابدأ بطلب جديد — سيُستخدم أول رسالة كعنوان للمحادثة."
                  : "No saved chats yet. Send a message — the first line becomes the chat title."}
              </p>
            )}
            {chats.map(c => (
              <div
                key={c.id}
                className={`group rounded-lg border transition-colors ${
                  activeChatId === c.id
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-border bg-background/40 hover:bg-muted/40"
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
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm(isAr ? "حذف هذه المحادثة نهائياً؟" : "Delete this chat permanently?")) {
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
                <Bot className="w-10 h-10 text-amber-500/40" />
                <p className="text-sm font-medium text-foreground">
                  {isAr ? "ابحث عن أى مستخدم" : "Search for any user"}
                </p>
                {/* Smart name search bar */}
                <div className="w-full max-w-sm">
                  <div className="flex gap-2">
                    <input
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSearchSend()}
                      placeholder={isAr ? "اكتب الاسم أو جزء منه…" : "Type a name or fragment…"}
                      className="flex-1 text-sm bg-background border border-amber-300/70 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 text-foreground placeholder:text-muted-foreground/70"
                      dir={isAr ? "rtl" : "ltr"}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSearchSend}
                      disabled={!searchInput.trim() || loading}
                      className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 shrink-0"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    {isAr
                      ? "يكفي الاسم الأول — الوكيل سيسألك عن التفاصيل إن تعدد النتائج"
                      : "First name alone is fine — the agent will ask for details if multiple results appear"}
                  </p>
                </div>
                {/* Quick action chips (need name first) */}
                <div className="w-full max-w-sm">
                  <p className="text-[11px] text-muted-foreground mb-2 font-medium">
                    {isAr ? "أو اختر إجراءً بعد كتابة الاسم أعلاه:" : "Or pick an action after typing a name:"}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {QUICK_INFO.map(q => (
                      <button
                        key={q.label}
                        type="button"
                        onClick={() => handleQuickWithName(q.label)}
                        disabled={loading}
                        className="text-xs px-3 py-1.5 bg-amber-500/10 text-amber-700 rounded-full hover:bg-amber-500/20 disabled:opacity-50 flex items-center gap-1"
                      >
                        <span>{q.icon}</span>
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}
                >
                  {msg.role === "assistant" && msg.supportUi?.clarify_first_pending && (
                    <div className="mb-2 text-xs rounded-lg border border-amber-300/60 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200 leading-snug">
                      {isAr ? (
                        <>
                          بحث قصير مع عدة نتائج — سيطرح الوكيل سؤالاً واحداً لتضييق النطاق قبل عرض الأسماء.
                          {msg.supportUi?.at_result_cap ? " العدد المعروض قد يبلغ الحد الأقصى (١٥) وقد يوجد المزيد في النظام." : ""}
                        </>
                      ) : (
                        <>
                          Short query with several matches — the agent will ask one clarifying question before listing names.
                          {msg.supportUi?.at_result_cap ? " Results are capped at 15; more rows may exist in the database." : ""}
                        </>
                      )}
                    </div>
                  )}
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className={CHAT_ASSISTANT_MARKDOWN_CLASS} dir={isAr ? "rtl" : "ltr"}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  {/* Clarification question card (tool-driven, count > 5) */}
                  {msg.role === "assistant" && msg.supportUi?.clarification_question && (
                    <ClarificationCard
                      q={msg.supportUi.clarification_question}
                      onSend={answer => sendMessage(answer)}
                    />
                  )}
                  {/* Disambiguation picker (count 2-5, pick by number) */}
                  {msg.role === "assistant" && msg.supportUi?.disambiguation_list && msg.supportUi.disambiguation_list.length > 0 && (
                    <DisambiguationPicker
                      items={msg.supportUi.disambiguation_list}
                      onPick={pickMsg => sendMessage(pickMsg)}
                    />
                  )}
                  {/* Detailed match cards (single result or no disambiguation list) */}
                  {msg.role === "assistant" && !msg.supportUi?.disambiguation_list && !msg.supportUi?.clarification_question && msg.supportUi?.match_cards && msg.supportUi.match_cards.length > 0 && (
                    <MatchCards cards={msg.supportUi.match_cards} />
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
                  <span className="text-xs text-muted-foreground">{isAr ? "يعمل…" : "Working…"}</span>
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
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder={isAr ? "اكتب طلبك…" : "Type your request…"}
              disabled={loading || loadingMessages}
              className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary disabled:opacity-50"
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
