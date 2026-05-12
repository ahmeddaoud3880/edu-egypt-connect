import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Wrench, Plus, CheckCircle2, AlertCircle, Loader2, Clock, XCircle, Save, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const PRIORITIES = [
  { value: "low", labelAr: "منخفض", labelEn: "Low", color: "text-blue-700 bg-blue-50 border-blue-200" },
  { value: "medium", labelAr: "متوسط", labelEn: "Medium", color: "text-amber-700 bg-amber-50 border-amber-200" },
  { value: "high", labelAr: "عالى", labelEn: "High", color: "text-red-700 bg-red-50 border-red-200" },
];

const CATEGORIES = [
  { value: "maintenance", labelAr: "صيانة", labelEn: "Maintenance" },
  { value: "supplies", labelAr: "توريدات", labelEn: "Supplies" },
  { value: "safety", labelAr: "سلامة", labelEn: "Safety" },
  { value: "facilities", labelAr: "مرافق", labelEn: "Facilities" },
  { value: "technical", labelAr: "تقنية", labelEn: "Technical" },
  { value: "other", labelAr: "أخرى", labelEn: "Other" },
];

export function OperationalIssues() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", priority: "medium", category: "maintenance" });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["school_operational_tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("support_tickets")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("support_tickets").insert({
        user_id: user?.id,
        subject: form.subject,
        description: form.description || null,
        priority: form.priority,
        category: form.category,
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["school_operational_tickets"] });
      setShowForm(false);
      setForm({ subject: "", description: "", priority: "medium", category: "maintenance" });
      toast.success(isAr ? "تم إنشاء البلاغ بنجاح" : "Issue reported successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const closeTicket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("support_tickets").update({ status: "closed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["school_operational_tickets"] }),
  });

  const openTickets = tickets.filter((t: any) => t.status !== "closed" && t.status !== "resolved");
  const closedTickets = tickets.filter((t: any) => t.status === "closed" || t.status === "resolved");

  const getStatusIcon = (status: string) => {
    if (status === "open") return <AlertCircle className="w-4 h-4 text-amber-500" />;
    if (status === "in_progress") return <Clock className="w-4 h-4 text-blue-500" />;
    if (status === "closed" || status === "resolved") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">{isAr ? "إدارة المشكلات التشغيلية" : "Operational Issues Management"}</h2>
          {openTickets.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">{openTickets.length} {isAr ? "مفتوح" : "open"}</span>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isAr ? "إضافة مشكلة" : "Report Issue"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-surface-elevated rounded-lg border border-border p-5 space-y-4">
          <h3 className="font-semibold text-foreground text-sm">{isAr ? "رفع بلاغ جديد" : "Report New Issue"}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "الفئة" : "Category"}</label>
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{isAr ? c.labelAr : c.labelEn}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "الأولوية" : "Priority"}</label>
              <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{isAr ? p.labelAr : p.labelEn}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "عنوان المشكلة" : "Issue Subject"} *</label>
            <input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={isAr ? "وصف مختصر للمشكلة..." : "Brief description of the issue..."} />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{isAr ? "تفاصيل إضافية" : "Details"}</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder={isAr ? "تفاصيل المشكلة والموقع..." : "Issue details and location..."} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => createTicket.mutate()} disabled={!form.subject || createTicket.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {createTicket.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isAr ? "رفع البلاغ" : "Submit Report"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted/50 transition-colors">
              {isAr ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* Open Tickets */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{isAr ? "جارى التحميل..." : "Loading..."}</span>
        </div>
      ) : openTickets.length === 0 ? (
        <div className="bg-surface-elevated rounded-lg border border-border p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-1">{isAr ? "لا توجد مشكلات تشغيلية مفتوحة" : "No open operational issues"}</h3>
          <p className="text-sm text-muted-foreground">{isAr ? "كل شيء يعمل بشكل سليم." : "Everything is running smoothly."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">{isAr ? "البلاغات المفتوحة" : "Open Issues"}</h3>
          {openTickets.map((ticket: any) => {
            const priority = PRIORITIES.find((p) => p.value === ticket.priority);
            const category = CATEGORIES.find((c) => c.value === ticket.category);
            return (
              <div key={ticket.id} className="bg-surface-elevated rounded-lg border border-border p-4 flex items-start gap-3">
                <div className="mt-0.5">{getStatusIcon(ticket.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{ticket.subject}</span>
                    {priority && (
                      <span className={`text-[10px] border px-1.5 py-0.5 rounded-full ${priority.color}`}>
                        {isAr ? priority.labelAr : priority.labelEn}
                      </span>
                    )}
                    {category && (
                      <span className="text-[10px] bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">
                        {isAr ? category.labelAr : category.labelEn}
                      </span>
                    )}
                  </div>
                  {ticket.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(ticket.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-GB")}</p>
                </div>
                <button
                  onClick={() => closeTicket.mutate(ticket.id)}
                  className="p-1.5 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors text-muted-foreground text-xs shrink-0"
                  title={isAr ? "إغلاق البلاغ" : "Close issue"}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Closed */}
      {closedTickets.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">{isAr ? `البلاغات المغلقة (${closedTickets.length})` : `Closed Issues (${closedTickets.length})`}</h3>
          {closedTickets.slice(0, 3).map((ticket: any) => (
            <div key={ticket.id} className="rounded-lg border border-border/50 p-3 opacity-60 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <span className="text-xs text-muted-foreground flex-1 truncate">{ticket.subject}</span>
              <span className="text-[10px] text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-GB")}</span>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-blue-800">{isAr ? "متابعة مع الإدارة التعليمية" : "Follow-up with Education Administration"}</p>
          <p className="text-[10px] text-blue-700 mt-1 leading-relaxed">
            {isAr ? "سيتم تصعيد المشكلات عالية الأولوية آلياً للإدارة التعليمية." : "High priority issues will be escalated automatically to the educational administration."}
          </p>
        </div>
      </div>
    </div>
  );
}
