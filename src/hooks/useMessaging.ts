import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Conversation {
  id: string;
  participant_ids: string[];
  subject: string | null;
  subject_ar: string | null;
  last_message_at: string | null;
  created_at: string | null;
  /** Populated by join */
  other_participant?: {
    user_id: string;
    full_name: string | null;
    full_name_ar: string | null;
    role?: string;
  };
  last_message?: string;
  unread_count?: number;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string | null;
}

/** Fetch all conversations for the current user */
export function useMyConversations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async (): Promise<Conversation[]> => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("conversations")
        .select("*")
        .contains("participant_ids", [user.id])
        .order("last_message_at", { ascending: false });
      if (error) throw error;

      // For each conversation, get the other participant's profile + last message
      const enriched = await Promise.all(
        (data || []).map(async (conv: Conversation) => {
          const otherId = conv.participant_ids.find((id) => id !== user.id);
          let other_participant: Conversation["other_participant"];

          if (otherId) {
            const { data: prof } = await (supabase as any)
              .from("profiles")
              .select("id, full_name, full_name_ar")
              .eq("id", otherId)
              .maybeSingle();
            const { data: roleRow } = await (supabase as any)
              .from("user_roles")
              .select("role")
              .eq("user_id", otherId)
              .limit(1)
              .maybeSingle();
            other_participant = {
              user_id: otherId,
              full_name: prof?.full_name || null,
              full_name_ar: prof?.full_name_ar || null,
              role: roleRow?.role || undefined,
            };
          }

          // Last message
          const { data: lastMsg } = await (supabase as any)
            .from("conversation_messages")
            .select("content, is_read, sender_id")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Unread count
          const { count } = await (supabase as any)
            .from("conversation_messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("is_read", false)
            .neq("sender_id", user.id);

          return {
            ...conv,
            other_participant,
            last_message: lastMsg?.content || undefined,
            unread_count: count || 0,
          };
        })
      );

      return enriched;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Realtime: listen to new messages that affect our conversations
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`conversations:${user.id}`)
      .on("postgres_changes" as any, {
        event: "*",
        schema: "public",
        table: "conversation_messages",
      }, () => {
        qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      })
      .on("postgres_changes" as any, {
        event: "*",
        schema: "public",
        table: "conversations",
      }, () => {
        qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      })
      .subscribe();

    channelRef.current = channel;
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  const totalUnread = (query.data || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return { ...query, totalUnread };
}

/** Fetch messages in a conversation */
export function useConversationMessages(conversationId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["conversation_messages", conversationId],
    queryFn: async (): Promise<ConversationMessage[]> => {
      if (!conversationId) return [];
      const { data, error } = await (supabase as any)
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ConversationMessage[];
    },
    enabled: !!conversationId,
    refetchInterval: false,
  });

  // Realtime
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`conv_msgs:${conversationId}`)
      .on("postgres_changes" as any, {
        event: "INSERT",
        schema: "public",
        table: "conversation_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["conversation_messages", conversationId] });
        qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, user?.id, qc]);

  return query;
}

/** Find or create a conversation with a specific user */
export function useStartConversation() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      otherUserId,
      subject,
      subject_ar,
    }: {
      otherUserId: string;
      subject?: string;
      subject_ar?: string;
    }): Promise<string> => {
      if (!user) throw new Error("Not authenticated");

      // Check if conversation exists
      const { data: existing } = await (supabase as any)
        .from("conversations")
        .select("id")
        .contains("participant_ids", [user.id, otherUserId])
        .limit(1)
        .maybeSingle();

      if (existing?.id) return existing.id;

      const { data: newConv, error } = await (supabase as any)
        .from("conversations")
        .insert({
          participant_ids: [user.id, otherUserId],
          subject: subject || null,
          subject_ar: subject_ar || null,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      return newConv.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });
}

/** Send a message in a conversation */
export function useSendMessage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error: msgErr } = await (supabase as any)
        .from("conversation_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
        });
      if (msgErr) throw msgErr;

      // Update last_message_at
      await (supabase as any)
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    onSuccess: (_, { conversationId }) => {
      qc.invalidateQueries({ queryKey: ["conversation_messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });
}

/** Mark all messages in a conversation as read */
export function useMarkConversationRead() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) return;
      await (supabase as any)
        .from("conversation_messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .eq("is_read", false);
    },
    onSuccess: (_, conversationId) => {
      qc.invalidateQueries({ queryKey: ["conversation_messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });
}
