import { useState, useCallback, useEffect } from "react";
import { sendChatMessage } from "@/services/aiService";
import {
  listSupportChats,
  createSupportChat,
  insertChatMessage,
  loadChatMessages,
  touchSupportChat,
  deleteSupportChat,
  deleteMessageById,
  type SupportChatListItem,
} from "@/services/supportAssistantChats";
import { useAuth } from "@/contexts/AuthContext";

export interface SupportMatchCard {
  source_table?: string;
  source_label_en?: string;
  source_label_ar?: string;
  auth_user_id?: string | null;
  auth_linked?: boolean;
  profile_linked_via?: string;
  registration_request_id?: string;
  row_preview?: Record<string, string | number | null | undefined>;
  related_tables_hint?: string[];
}

export interface DisambiguationItem {
  n: number;
  name: string;
  role_ar: string;
  masked_email?: string;
  source_badge_ar: string;
  source_table: string;
  auth_user_id?: string | null;
  registration_request_id?: string | null;
  pick_message: string;
}

export interface ClarificationQuestion {
  clarifier_type: string;
  question_ar: string;
  question_en: string;
  hint_options?: string[];
  matches_analyzed?: number;
}

export interface SupportUI {
  match_cards?: SupportMatchCard[];
  disambiguation_list?: DisambiguationItem[];
  clarification_question?: ClarificationQuestion;
  search_query?: string;
  searched_sources?: string[];
  count?: number;
  disambiguation_needed?: boolean;
  clarify_first?: boolean;
  clarify_first_pending?: boolean;
  at_result_cap?: boolean;
  short_query?: boolean;
}

export interface SupportChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  provider?: string;
  model?: string;
  supportUi?: SupportUI | null;
}

export function useSupportAIChat() {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const [chats, setChats] = useState<SupportChatListItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
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
      const rows = await listSupportChats(uid);
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
              support_attachments?: unknown;
              created_at: string | null;
            }) => {
              const meta = r.support_attachments as { support_ui?: SupportUI } | null | undefined;
              return {
                id: r.id,
                role: r.role as "user" | "assistant",
                content: r.content,
                timestamp: new Date(r.created_at ?? Date.now()),
                provider: r.provider,
                model: r.model,
                supportUi: meta?.support_ui ?? null,
              };
            }
          )
        );
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load chat");
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [uid]
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

      const userMsg: SupportChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: t,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      let chatId = activeChatId;
      let persistedUserMessageId: string | null = null;
      try {
        if (!chatId) {
          const created = await createSupportChat(uid, t);
          chatId = created.id;
          setActiveChatId(chatId);
          await refreshChats();
        }

        persistedUserMessageId = await insertChatMessage({ chatId, role: "user", content: t });

        const response = await sendChatMessage({
          user_id: uid,
          role: "support",
          message: t,
          chat_id: chatId,
        });

        const supportUi = (response.support_ui ?? null) as SupportUI | null;

        try {
          await insertChatMessage({
            chatId,
            role: "assistant",
            content: response.response,
            provider: response.provider,
            model: response.model,
            supportAttachments: supportUi ? { support_ui: supportUi } : null,
          });
        } catch {
          await insertChatMessage({
            chatId,
            role: "assistant",
            content: response.response,
            provider: response.provider,
            model: response.model,
          });
        }
        await touchSupportChat(chatId);

        const assistantMsg: SupportChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.response,
          timestamp: new Date(),
          provider: response.provider,
          model: response.model,
          supportUi,
        };
        setMessages(prev => [...prev, assistantMsg]);
        await refreshChats();
      } catch (err: unknown) {
        if (persistedUserMessageId) {
          await deleteMessageById(persistedUserMessageId).catch(() => {});
        }
        setError(err instanceof Error ? err.message : "فشل الاتصال بالوكيل الذكي.");
        setMessages(prev => prev.filter(m => m.id !== userMsg.id));
      } finally {
        setLoading(false);
      }
    },
    [uid, activeChatId, loading, refreshChats]
  );

  const removeChat = useCallback(
    async (chatId: string) => {
      if (!uid) return;
      try {
        await deleteSupportChat(chatId, uid);
        if (activeChatId === chatId) startNewChat();
        await refreshChats();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "تعذر حذف المحادثة");
      }
    },
    [uid, activeChatId, refreshChats, startNewChat]
  );

  const clearCurrentThread = useCallback(() => {
    startNewChat();
  }, [startNewChat]);

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
    clearCurrentThread,
    refreshChats,
  };
}
