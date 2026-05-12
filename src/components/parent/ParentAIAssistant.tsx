import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CHAT_ASSISTANT_MARKDOWN_CLASS } from "@/components/chat/chatMarkdownProse";
import { useAIChat } from "@/hooks/useAIChat";
import { useTranslation } from "@/hooks/useTranslation";
import { Bot, Send, Trash2, Loader2, AlertCircle, Zap } from "lucide-react";

export function ParentAIAssistant() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { messages, loading, error, sendMessage, clearMessages } = useAIChat("parent");
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const QUICK = isAr
    ? ["كيف أداء أبنائى هذا الشهر؟", "ما هى الواجبات المطلوبة؟", "كيف حضور أبنائى؟", "اعرض درجات أبنائى"]
    : ["How are my children doing this month?", "What assignments are due?", "How is my children's attendance?", "Show my children's grades"];

  function handleSend() {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-elevated rounded-lg border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Bot className="w-5 h-5 text-primary" /></div>
            <div>
              <h2 className="font-semibold text-foreground">{isAr ? "المساعد الذكى لولى الأمر" : "AI Parent Assistant"}</h2>
              <p className="text-xs text-muted-foreground">{isAr ? "متابعة أداء أبنائك بيانات حقيقية" : "Track your children's real performance data"}</p>
            </div>
          </div>
          {messages.length > 0 && <button onClick={clearMessages} className="text-xs text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>}
        </div>
      </div>
      <div className="bg-surface-elevated rounded-lg border border-border">
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <Bot className="w-10 h-10 text-primary/40" />
              <p className="text-sm text-muted-foreground">{isAr ? "اسأل عن أداء أبنائك" : "Ask about your children's performance"}</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {QUICK.map(q => <button key={q} onClick={() => sendMessage(q)} className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20">{q}</button>)}
              </div>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div className={CHAT_ASSISTANT_MARKDOWN_CLASS} dir={isAr ? "rtl" : "ltr"}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                )}
                {msg.role === "assistant" && msg.model && <div className="mt-1 text-[10px] opacity-50 flex items-center gap-1"><Zap className="w-2.5 h-2.5" />{msg.provider}/{msg.model}</div>}
              </div>
            </div>
          ))}
          {loading && <div className="flex"><div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">{isAr ? "يفكر..." : "Thinking..."}</span></div></div>}
          {error && <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-border p-3 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder={isAr ? "اكتب سؤالك..." : "Type your question..."} className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary" dir={isAr ? "rtl" : "ltr"} />
          <button onClick={handleSend} disabled={!input.trim() || loading} className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
