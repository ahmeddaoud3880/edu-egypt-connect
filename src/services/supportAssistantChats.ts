import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { titleFromFirstMessage } from "@/utils/chatTitle";

export const SUPPORT_ASSISTANT_SCOPE = "support" as const;

export type SupportChatListItem = {
  id: string;
  title: string;
  created_at: string | null;
  updated_at: string | null;
};

export async function listSupportChats(userId: string): Promise<SupportChatListItem[]> {
  const { data, error } = await supabase
    .from("ai_chats")
    .select("id, title, created_at, updated_at")
    .eq("user_id", userId)
    .eq("assistant_scope", SUPPORT_ASSISTANT_SCOPE)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SupportChatListItem[];
}

export async function createSupportChat(userId: string, firstUserMessage: string) {
  const title = titleFromFirstMessage(firstUserMessage);
  const insert: Database["public"]["Tables"]["ai_chats"]["Insert"] = {
    user_id: userId,
    title,
    assistant_scope: SUPPORT_ASSISTANT_SCOPE,
  };
  const { data, error } = await supabase.from("ai_chats").insert(insert).select("id, title").single();
  if (error) throw error;
  return data as { id: string; title: string };
}

export async function touchSupportChat(chatId: string) {
  const { error } = await supabase
    .from("ai_chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId);
  if (error) throw error;
}

export async function insertChatMessage(params: {
  chatId: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
  /** JSON stored in `support_attachments` (e.g. `{ support_ui: { match_cards } }` for support assistant). */
  supportAttachments?: Record<string, unknown> | null;
}): Promise<string | null> {
  const payload: Database["public"]["Tables"]["ai_messages"]["Insert"] = {
    chat_id: params.chatId,
    role: params.role,
    content: params.content,
  };
  if (params.provider) payload.provider = params.provider;
  if (params.model) payload.model = params.model;
  if (params.supportAttachments != null)
    payload.support_attachments = params.supportAttachments as Database["public"]["Tables"]["ai_messages"]["Insert"]["support_attachments"];
  const { data, error } = await supabase.from("ai_messages").insert(payload).select("id").single();
  if (error) throw error;
  return data?.id ?? null;
}

export async function loadChatMessages(chatId: string) {
  const fullSelect =
    "id, role, content, provider, model, support_attachments, created_at";
  let { data, error } = await supabase
    .from("ai_messages")
    .select(fullSelect)
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  // Older DBs may not have applied migrations yet — column missing breaks every load.
  if (error) {
    const msg = [error.message, (error as { details?: string }).details].filter(Boolean).join(" ");
    if (/support_attachments|column .* does not exist|schema cache/i.test(msg)) {
      const fb = await supabase
        .from("ai_messages")
        .select("id, role, content, provider, model, created_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      if (!fb.error) return fb.data ?? [];
    }
    throw error;
  }
  return data ?? [];
}

export async function deleteSupportChat(chatId: string, userId: string) {
  const { error } = await supabase.from("ai_chats").delete().eq("id", chatId).eq("user_id", userId);
  if (error) throw error;
}

export async function deleteMessageById(messageId: string) {
  const { error } = await supabase.from("ai_messages").delete().eq("id", messageId);
  if (error) throw error;
}
