import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Unique per hook instance — Supabase reuses same topic name and rejects .on() after subscribe(). */
function useRealtimeChannelInstanceId() {
  const ref = useRef<string | null>(null);
  if (ref.current === null) {
    ref.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return ref.current;
}

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  sender_role: string | null;
  title: string;
  title_ar: string;
  body: string | null;
  body_ar: string | null;
  type: string;
  related_id: string | null;
  related_type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface SendNotificationPayload {
  recipient_id: string;
  title: string;
  title_ar: string;
  body?: string;
  body_ar?: string;
  type?: string;
  related_id?: string;
  related_type?: string;
}

// Fetch and listen to current user's notifications
export function useMyNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const realtimeInstanceId = useRealtimeChannelInstanceId();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!user,
  });

  // Real-time subscription (topic must be unique per subscriber — layout + tab both use this hook)
  useEffect(() => {
    if (!user) return;
    const topic = `notifications:${user.id}:${realtimeInstanceId}`;
    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, realtimeInstanceId, user?.id]);

  const unreadCount = (query.data || []).filter((n) => !n.is_read).length;

  return { ...query, unreadCount };
}

// Send a notification to one or multiple recipients
export function useSendNotification() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendNotificationPayload | SendNotificationPayload[]) => {
      if (!user) throw new Error("Not authenticated");
      const items = Array.isArray(payload) ? payload : [payload];
      const rows = items.map((p) => ({
        recipient_id: p.recipient_id,
        sender_id: user.id,
        sender_role: role || "system",
        title: p.title,
        title_ar: p.title_ar,
        body: p.body || null,
        body_ar: p.body_ar || null,
        type: p.type || "general",
        related_id: p.related_id || null,
        related_type: p.related_type || null,
        is_read: false,
      }));

      const { error } = await (supabase as any).from("notifications").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      const items = Array.isArray(vars) ? vars : [vars];
      items.forEach((p) => {
        queryClient.invalidateQueries({ queryKey: ["notifications", p.recipient_id] });
      });
    },
  });
}

// Mark a single notification as read
export function useMarkNotificationRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

// Mark all notifications as read
export function useMarkAllNotificationsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}
