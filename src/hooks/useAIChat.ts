import { useState, useCallback } from "react";
import { sendChatMessage, type ChatHistoryEntry } from "@/services/aiService";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  provider?: string;
  model?: string;
}

const HISTORY_WINDOW = 6; // last N turns sent to the agent for short-term memory

export function useAIChat(agentRole: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const recent: ChatHistoryEntry[] = messages
        .slice(-HISTORY_WINDOW)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await sendChatMessage({
        user_id: user?.id || "",
        role: agentRole,
        message: text,
        history: recent,
      });

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
        provider: response.provider,
        model: response.model,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.message || "Failed to connect to AI. Make sure the agent server is running.");
    } finally {
      setLoading(false);
    }
  }, [user, agentRole, loading, messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, sendMessage, clearMessages };
}
