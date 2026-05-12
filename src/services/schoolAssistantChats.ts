import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { titleFromFirstMessage } from "@/utils/chatTitle";
import {
  loadChatMessages,
  insertChatMessage,
  deleteMessageById,
} from "@/services/supportAssistantChats";

export const SCHOOL_ASSISTANT_SCOPE = "school" as const;

export type SchoolChatListItem = {
  id: string;
  title: string;
  created_at: string | null;
  updated_at: string | null;
};

function baseSessionContext() {
  return {
    turn_count: 0,
    searched_users: [],
    active_user_id: null,
    open_clarifier_type: null,
    thread_ar: "",
    last_updated: null,
  };
}

export async function listSchoolChats(userId: string): Promise<SchoolChatListItem[]> {
  const { data, error } = await supabase
    .from("ai_chats")
    .select("id, title, created_at, updated_at")
    .eq("user_id", userId)
    .eq("assistant_scope", SCHOOL_ASSISTANT_SCOPE)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SchoolChatListItem[];
}

export async function createSchoolChat(userId: string, firstUserMessage: string) {
  const title = titleFromFirstMessage(firstUserMessage);
  const insert: Database["public"]["Tables"]["ai_chats"]["Insert"] = {
    user_id: userId,
    title,
    assistant_scope: SCHOOL_ASSISTANT_SCOPE,
    session_context: baseSessionContext() as Database["public"]["Tables"]["ai_chats"]["Insert"]["session_context"],
  };
  const { data, error } = await supabase.from("ai_chats").insert(insert).select("id, title").single();
  if (error) throw error;
  return data as { id: string; title: string };
}

export async function touchSchoolChat(chatId: string) {
  const { error } = await supabase
    .from("ai_chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId);
  if (error) throw error;
}

export async function deleteSchoolChat(chatId: string, userId: string) {
  const { error } = await supabase
    .from("ai_chats")
    .delete()
    .eq("id", chatId)
    .eq("user_id", userId)
    .eq("assistant_scope", SCHOOL_ASSISTANT_SCOPE);
  if (error) throw error;
}

export { loadChatMessages, insertChatMessage, deleteMessageById };
