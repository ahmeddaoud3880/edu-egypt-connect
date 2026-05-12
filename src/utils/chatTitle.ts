/** Short title for a chat thread from the first user message (UI + DB). */
export function titleFromFirstMessage(text: string, maxLen = 72): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "محادثة جديدة";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}
