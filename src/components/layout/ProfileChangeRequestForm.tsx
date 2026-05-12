import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { X, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
}

export function ProfileChangeRequestForm({ onClose }: Props) {
  const { user, profile } = useAuth();
  const { isAr } = useTranslation();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    full_name_ar: profile?.full_name_ar || "",
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    reason: "",
  });

  // Check pending request
  const { data: pending } = useQuery({
    queryKey: ["profile-change-requests", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("profile_change_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const changes: Record<string, string> = {};
      if (form.full_name_ar !== (profile?.full_name_ar || "")) changes.full_name_ar = form.full_name_ar;
      if (form.full_name !== (profile?.full_name || "")) changes.full_name = form.full_name;
      if (form.phone !== (profile?.phone || "")) changes.phone = form.phone;
      if (Object.keys(changes).length === 0) throw new Error("no_changes");
      const { error } = await (supabase as any)
        .from("profile_change_requests")
        .insert({ user_id: user.id, requested_changes: changes, reason: form.reason });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile-change-requests", user?.id] });
      toast.success(isAr ? "تم إرسال طلب التعديل" : "Request submitted");
      onClose();
    },
    onError: (e: any) => {
      if (e.message === "no_changes") {
        toast.error(isAr ? "لم تقم بتغيير أي بيانات" : "No changes made");
      } else {
        toast.error(isAr ? "حدث خطأ" : "Error submitting request");
      }
    },
  });

  const statusIcon = (s: string) => {
    if (s === "pending") return <Clock className="w-4 h-4 text-amber-500" />;
    if (s === "approved") return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" dir={isAr ? "rtl" : "ltr"}>
      <div className="bg-surface-elevated border border-border rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">
            {isAr ? "طلب تعديل البيانات الشخصية" : "Request Profile Changes"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {pending ? (
          <div className="p-6 text-center space-y-3">
            <div className="flex justify-center">{statusIcon(pending.status)}</div>
            <p className="text-sm font-medium">
              {isAr ? "لديك طلب تعديل قيد المراجعة" : "You have a pending request"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "سيتم مراجعة طلبك من قِبَل الدعم الفني أو قيادة المدرسة"
                : "Your request will be reviewed by support or school leadership"}
            </p>
            <div className="text-xs bg-muted rounded-lg p-3 text-start">
              {Object.entries(pending.requested_changes as Record<string, string>).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="font-medium">{k}:</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "أدخل البيانات الجديدة. سيتم إرسال طلبك للمراجعة والموافقة."
                : "Enter your updated information. It will be sent for review and approval."}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {isAr ? "الاسم بالعربية" : "Arabic Name"}
                </label>
                <input
                  type="text"
                  value={form.full_name_ar}
                  onChange={(e) => setForm({ ...form, full_name_ar: e.target.value })}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {isAr ? "الاسم بالإنجليزية" : "English Name"}
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {isAr ? "رقم الهاتف" : "Phone"}
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {isAr ? "سبب التعديل" : "Reason"}
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={2}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>

            <button
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submit.isPending
                ? (isAr ? "جاري الإرسال..." : "Submitting...")
                : (isAr ? "إرسال الطلب" : "Submit Request")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
