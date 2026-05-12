import { useState, useCallback, useEffect } from "react";
import { sendChatMessage, type ChatHistoryEntry } from "@/services/aiService";
import {
  listSchoolChats,
  createSchoolChat,
  insertChatMessage,
  loadChatMessages,
  touchSchoolChat,
  deleteSchoolChat,
  deleteMessageById,
  type SchoolChatListItem,
} from "@/services/schoolAssistantChats";
import { useAuth } from "@/contexts/AuthContext";

const HISTORY_WINDOW = 6;

export interface SchoolChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  provider?: string;
  model?: string;
}

export function useSchoolAIChat() {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const [chats, setChats] = useState<SchoolChatListItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SchoolChatMessage[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshChats = useCallback(async () => {
    if (!uid) {
      setChats([]);
      return;
    }
    setLoadingList(true);
    try {
      const rows = await listSchoolChats(uid);
      setChats(rows);
    } catch {
      setChats([]);
    } finally {
      setLoadingList(false);
    }
  }, [uid]);

  useEffect(() => {
    void refreshChats();
  }, [refreshChats]);

  const openChat = useCallback(
    async (chatId: string) => {
      if (!uid) return;
      setLoadingMessages(true);
      setError(null);
      setActiveChatId(chatId);
      try {
        const rows = await loadChatMessages(chatId);
        setMessages(
          rows.map(
            (r: {
              id: string;
              role: string;
              content: string;
              provider?: string;
              model?: string;
              created_at: string | null;
            }) => ({
              id: r.id,
              role: r.role as "user" | "assistant",
              content: r.content,
              timestamp: new Date(r.created_at ?? Date.now()),
              provider: r.provider,
              model: r.model,
            }),
          ),
        );
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load chat");
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [uid],
  );

  const startNewChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || loading || !uid) return;

      const userMsg: SchoolChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: t,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      let chatId = activeChatId;
      let persistedUserMessageId: string | null = null;
      try {
        if (!chatId) {
          const created = await createSchoolChat(uid, t);
          chatId = created.id;
          setActiveChatId(chatId);
          await refreshChats();
        }

        persistedUserMessageId = await insertChatMessage({ chatId, role: "user", content: t });

        const recent: ChatHistoryEntry[] = messages
          .slice(-HISTORY_WINDOW)
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await sendChatMessage({
          user_id: uid,
          role: "school",
          message: t,
          chat_id: chatId,
          history: recent,
        });

        await insertChatMessage({
          chatId,
          role: "assistant",
          content: response.response,
          provider: response.provider,
          model: response.model,
        });
        await touchSchoolChat(chatId);

        const assistantMsg: SchoolChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.response,
          timestamp: new Date(),
          provider: response.provider,
          model: response.model,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        await refreshChats();
      } catch (err: unknown) {
        if (persistedUserMessageId) {
          await deleteMessageById(persistedUserMessageId).catch(() => {});
        }
        setError(err instanceof Error ? err.message : "فشل الاتصال بالوكيل الذكي.");
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      } finally {
        setLoading(false);
      }
    },
    [uid, activeChatId, loading, messages, refreshChats],
  );

  const removeChat = useCallback(
    async (chatId: string) => {
      if (!uid) return;
      try {
        await deleteSchoolChat(chatId, uid);
        if (activeChatId === chatId) startNewChat();
        await refreshChats();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "تعذر حذف المحادثة");
      }
    },
    [uid, activeChatId, refreshChats, startNewChat],
  );

  return {
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
    refreshChats,
  };
}
