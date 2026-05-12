import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { titleFromFirstMessage } from "@/utils/chatTitle";
import {
  loadChatMessages,
  insertChatMessage,
  deleteMessageById,
} from "@/services/supportAssistantChats";
import type { RagBook } from "@/services/ragService";

export const STUDENT_ASSISTANT_SCOPE = "student" as const;

export type StudentChatListItem = {
  id: string;
  title: string;
  created_at: string | null;
  updated_at: string | null;
};

function baseSessionContext(extra?: Record<string, unknown>) {
  return {
    turn_count: 0,
    searched_users: [],
    active_user_id: null,
    open_clarifier_type: null,
    thread_ar: "",
    last_updated: null,
    ...(extra || {}),
  };
}

export async function listStudentChats(userId: string): Promise<StudentChatListItem[]> {
  const { data, error } = await supabase
    .from("ai_chats")
    .select("id, title, created_at, updated_at")
    .eq("user_id", userId)
    .eq("assistant_scope", STUDENT_ASSISTANT_SCOPE)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StudentChatListItem[];
}

export async function createStudentChat(
  userId: string,
  firstUserMessage: string,
  opts?: { session_context?: Record<string, unknown> },
) {
  const title = titleFromFirstMessage(firstUserMessage);
  const session_context = baseSessionContext(opts?.session_context);
  const insert: Database["public"]["Tables"]["ai_chats"]["Insert"] = {
    user_id: userId,
    title,
    assistant_scope: STUDENT_ASSISTANT_SCOPE,
    session_context,
  };
  const { data, error } = await supabase.from("ai_chats").insert(insert).select("id, title").single();
  if (error) throw error;
  return data as { id: string; title: string };
}

export async function touchStudentChat(chatId: string) {
  const { error } = await supabase
    .from("ai_chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId);
  if (error) throw error;
}

export async function deleteStudentChat(chatId: string, userId: string) {
  const { error } = await supabase
    .from("ai_chats")
    .delete()
    .eq("id", chatId)
    .eq("user_id", userId)
    .eq("assistant_scope", STUDENT_ASSISTANT_SCOPE);
  if (error) throw error;
}

export async function fetchStudentChatSessionBook(chatId: string): Promise<{ id: string; title: string } | null> {
  const { data, error } = await supabase.from("ai_chats").select("session_context").eq("id", chatId).maybeSingle();
  if (error || !data?.session_context || typeof data.session_context !== "object") return null;
  const ctx = data.session_context as Record<string, unknown>;
  const id = ctx.active_rag_book_id;
  const title = ctx.active_rag_book_title;
  if (typeof id === "string" && id.length > 0) {
    return { id, title: typeof title === "string" ? title : "" };
  }
  return null;
}

export async function updateStudentChatFocusBook(chatId: string, userId: string, book: RagBook | null) {
  const { data, error } = await supabase
    .from("ai_chats")
    .select("session_context")
    .eq("id", chatId)
    .eq("user_id", userId)
    .eq("assistant_scope", STUDENT_ASSISTANT_SCOPE)
    .maybeSingle();
  if (error) throw error;
  const prev =
    data?.session_context && typeof data.session_context === "object" && !Array.isArray(data.session_context)
      ? { ...(data.session_context as Record<string, unknown>) }
      : {};
  const ctx: Record<string, unknown> = { ...prev };
  if (book) {
    ctx.active_rag_book_id = book.id;
    ctx.active_rag_book_title = book.title_ar || book.title;
  } else {
    delete ctx.active_rag_book_id;
    delete ctx.active_rag_book_title;
  }
  const { error: uerr } = await supabase
    .from("ai_chats")
    .update({ session_context: ctx as Database["public"]["Tables"]["ai_chats"]["Insert"]["session_context"] })
    .eq("id", chatId)
    .eq("user_id", userId);
  if (uerr) throw uerr;
}
export { loadChatMessages, insertChatMessage, deleteMessageById };
