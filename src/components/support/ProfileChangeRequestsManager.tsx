import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { CheckCircle, XCircle, Clock, User, Loader2, Edit } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface ProfileChangeRequest {
  id: string;
  user_id: string;
  requested_changes: Record<string, string>;
  reason: string | null;
  status: string;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  requester?: {
    email: string;
    full_name_ar: string | null;
    full_name: string | null;
    role: string | null;
  };
}

function useProfileChangeRequests(statusFilter: string) {
  return useQuery({
    queryKey: ["profile_change_requests", statusFilter],
    queryFn: async (): Promise<ProfileChangeRequest[]> => {
      const { data, error } = await (supabase as any)
        .from("profile_change_requests")
        .select("*")
        .eq("status", statusFilter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data?.length) return [];

      // Enrich with user info
      const enriched = await Promise.all(
        (data as ProfileChangeRequest[]).map(async (req) => {
          const { data: prof } = await (supabase as any)
            .from("profiles")
            .select("full_name, full_name_ar")
            .eq("id", req.user_id)
            .maybeSingle();
          const { data: roleRow } = await (supabase as any)
            .from("user_roles")
            .select("role")
            .eq("user_id", req.user_id)
            .limit(1)
            .maybeSingle();
          const { data: users } = await (supabase as any).rpc("get_all_users");
          const authUser = (users || []).find((u: any) => u.id === req.user_id);
          return {
            ...req,
            requested_changes: req.requested_changes as Record<string, string>,
            requester: {
              email: authUser?.email || "unknown",
              full_name_ar: prof?.full_name_ar || null,
              full_name: prof?.full_name || null,
              role: roleRow?.role || null,
            },
          };
        })
      );
      return enriched;
    },
    staleTime: 30_000,
  });
}

function useReviewRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      action,
      notes,
    }: {
      requestId: string;
      action: "approved" | "rejected";
      notes: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any)
        .from("profile_change_requests")
        .update({
          status: action,
          notes: notes || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      if (error) throw error;

      // If approved, apply the changes to profiles table
      if (action === "approved") {
        const { data: req } = await (supabase as any)
          .from("profile_change_requests")
          .select("user_id, requested_changes")
          .eq("id", requestId)
          .maybeSingle();
        if (req?.requested_changes) {
          await (supabase as any)
            .from("profiles")
            .update(req.requested_changes)
            .eq("id", req.user_id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile_change_requests"] });
    },
  });
}

function RequestCard({
  req,
  isAr,
}: {
  req: ProfileChangeRequest;
  isAr: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);
  const reviewMut = useReviewRequest();

  const handleAction = async (action: "approved" | "rejected") => {
    try {
      await reviewMut.mutateAsync({ requestId: req.id, action, notes });
      toast.success(
        action === "approved"
          ? (isAr ? "تم قبول الطلب وتطبيق التغييرات" : "Request approved and changes applied")
          : (isAr ? "تم رفض الطلب" : "Request rejected")
      );
      setShowForm(false);
    } catch {
      toast.error(isAr ? "حدث خطأ" : "An error occurred");
    }
  };

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(req.created_at!), { addSuffix: true, locale: isAr ? ar : enUS });
    } catch { return ""; }
  })();

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="p-4 bg-surface-elevated">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">
                {req.requester?.full_name_ar || req.requester?.full_name || req.requester?.email || "?"}
              </p>
              <p className="text-xs text-muted-foreground">{req.requester?.email}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {req.requester?.role && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                    {req.requester.role}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
              </div>
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shrink-0 ${
            req.status === "pending" ? "bg-amber-100 text-amber-700"
            : req.status === "approved" ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
          }`}>
            {req.status === "pending" ? <Clock className="w-3 h-3" /> : req.status === "approved" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {isAr
              ? req.status === "pending" ? "قيد الانتظار" : req.status === "approved" ? "مقبول" : "مرفوض"
              : req.status}
          </span>
        </div>

        {/* Requested changes */}
        <div className="mt-3 bg-muted/30 rounded-lg p-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {isAr ? "التغييرات المطلوبة:" : "Requested changes:"}
          </p>
          {Object.entries(req.requested_changes).map(([field, value]) => (
            <div key={field} className="flex items-center gap-2 text-xs">
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{field}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
          {req.reason && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              {isAr ? "السبب: " : "Reason: "}{req.reason}
            </p>
          )}
        </div>

        {/* Action buttons for pending */}
        {req.status === "pending" && (
          <div className="mt-3">
            {!showForm ? (
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowForm(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Edit className="w-3 h-3" />
                  {isAr ? "مراجعة" : "Review"}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder={isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}
                  className="w-full border border-border rounded-lg px-3 py-2 text-xs bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <div className="flex gap-2">
                  <button
                    disabled={reviewMut.isPending}
                    onClick={() => void handleAction("approved")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {reviewMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                    {isAr ? "قبول وتطبيق" : "Approve & Apply"}
                  </button>
                  <button
                    disabled={reviewMut.isPending}
                    onClick={() => void handleAction("rejected")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-3 h-3" />
                    {isAr ? "رفض" : "Reject"}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground border border-border hover:bg-muted transition-colors"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Review notes if reviewed */}
        {req.notes && req.status !== "pending" && (
          <p className="mt-2 text-xs text-muted-foreground italic">
            {isAr ? "ملاحظات المراجع: " : "Reviewer notes: "}{req.notes}
          </p>
        )}
      </div>
    </div>
  );
}

export function ProfileChangeRequestsManager() {
  const { isAr } = useTranslation();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const { data: requests = [], isLoading } = useProfileChangeRequests(filter);

  return (
    <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex items-center gap-2">
        <Edit className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">{isAr ? "طلبات تعديل البيانات" : "Profile Change Requests"}</h2>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl w-fit">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isAr
              ? s === "pending" ? "قيد الانتظار" : s === "approved" ? "مقبولة" : "مرفوضة"
              : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-border rounded-xl">
          <Clock className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {isAr ? "لا توجد طلبات" : "No requests found"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <RequestCard key={req.id} req={req} isAr={isAr} />
          ))}
        </div>
      )}
    </div>
  );
}
