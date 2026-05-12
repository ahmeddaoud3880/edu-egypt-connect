import { useState, useCallback, useEffect, useRef } from "react";
import { sendChatMessage, type ChatHistoryEntry } from "@/services/aiService";
import {
  listStudentChats,
  createStudentChat,
  insertChatMessage,
  loadChatMessages,
  touchStudentChat,
  deleteStudentChat,
  deleteMessageById,
  fetchStudentChatSessionBook,
  updateStudentChatFocusBook,
  type StudentChatListItem,
} from "@/services/studentAssistantChats";
import { useAuth } from "@/contexts/AuthContext";
import type { RagBook } from "@/services/ragService";

const HISTORY_WINDOW = 6;

export interface StudentChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  provider?: string;
  model?: string;
}

export interface ActiveFocusBook {
  id: string;
  title: string;
}

export function useStudentAIChat(bookIntent: RagBook | null, onBookIntentConsumed?: () => void) {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const [chats, setChats] = useState<StudentChatListItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StudentChatMessage[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFocusBook, setActiveFocusBook] = useState<ActiveFocusBook | null>(null);

  const bookIntentRef = useRef<RagBook | null>(null);
  const pendingManualBookRef = useRef<RagBook | null>(null);

  useEffect(() => {
    bookIntentRef.current = bookIntent;
  }, [bookIntent]);

  const refreshChats = useCallback(async () => {
    if (!uid) {
      setChats([]);
      return;
    }
    setLoadingList(true);
    try {
      const rows = await listStudentChats(uid);
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

  useEffect(() => {
    if (bookIntent) {
      setActiveChatId(null);
      setMessages([]);
      setError(null);
      setActiveFocusBook({ id: bookIntent.id, title: bookIntent.title_ar || bookIntent.title });
      pendingManualBookRef.current = bookIntent;
    }
  }, [bookIntent?.id]);

  const openChat = useCallback(
    async (chatId: string) => {
      if (!uid) return;
      setLoadingMessages(true);
      setError(null);
      setActiveChatId(chatId);
      pendingManualBookRef.current = null;
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
        const meta = await fetchStudentChatSessionBook(chatId);
        setActiveFocusBook(meta);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load chat");
        setMessages([]);
        setActiveFocusBook(null);
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
    setActiveFocusBook(null);
    pendingManualBookRef.current = null;
    onBookIntentConsumed?.();
  }, [onBookIntentConsumed]);

  const applyFocusBook = useCallback(
    async (book: RagBook | null) => {
      if (book) {
        pendingManualBookRef.current = book;
        setActiveFocusBook({ id: book.id, title: book.title_ar || book.title });
      } else {
        pendingManualBookRef.current = null;
        setActiveFocusBook(null);
      }
      if (activeChatId && uid) {
        try {
          await updateStudentChatFocusBook(activeChatId, uid, book);
          setError(null);
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : "تعذر حفظ الكتاب لهذه المحادثة (صلاحيات التخزين).");
        }
      }
    },
    [activeChatId, uid],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || loading || !uid) return;

      const userMsg: StudentChatMessage = {
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
        const focusBook = pendingManualBookRef.current ?? bookIntentRef.current;
        const sessionExtras =
          !chatId && focusBook
            ? {
                active_rag_book_id: focusBook.id,
                active_rag_book_title: focusBook.title_ar || focusBook.title,
              }
            : undefined;

        if (!chatId) {
          const created = await createStudentChat(uid, t, { session_context: sessionExtras });
          chatId = created.id;
          setActiveChatId(chatId);
          if (sessionExtras?.active_rag_book_id) {
            setActiveFocusBook({
              id: sessionExtras.active_rag_book_id,
              title: String(sessionExtras.active_rag_book_title || ""),
            });
          }
          const fromIntent = bookIntentRef.current;
          if (fromIntent && focusBook && fromIntent.id === focusBook.id) {
            bookIntentRef.current = null;
            onBookIntentConsumed?.();
          }
          await refreshChats();
        }

        persistedUserMessageId = await insertChatMessage({ chatId, role: "user", content: t });

        const recent: ChatHistoryEntry[] = messages
          .slice(-HISTORY_WINDOW)
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await sendChatMessage({
          user_id: uid,
          role: "student",
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
        await touchStudentChat(chatId);

        const assistantMsg: StudentChatMessage = {
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
    [uid, activeChatId, loading, messages, refreshChats, onBookIntentConsumed],
  );

  const removeChat = useCallback(
    async (chatId: string) => {
      if (!uid) return;
      try {
        await deleteStudentChat(chatId, uid);
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
    refreshChats,
  };
}
