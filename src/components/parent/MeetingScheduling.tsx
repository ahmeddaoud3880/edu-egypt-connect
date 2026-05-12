import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { useParentChildLinkRequests } from "@/hooks/useGovernanceData";
import { CalendarDays, Clock, Users, Plus } from "lucide-react";

export function MeetingScheduling() {
  const { lang } = useTranslation();
  const { user } = useAuth();
  const { data: linkRequests, isLoading } = useParentChildLinkRequests();
  const isAr = lang === "ar";

  const myChildren = (linkRequests || []).filter(
    (req) => req.parent_user_id === user?.id && req.request_status === "approved"
  );

  if (isLoading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
      <Clock className="w-4 h-4 animate-spin" /> {isAr ? "جارى التحميل..." : "Loading..."}
    </div>
  );

  if (myChildren.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-lg border border-border p-8 text-center space-y-3">
        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto" />
        <p className="text-sm text-muted-foreground">
          {isAr ? "أضف أبناءك أولاً لحجز مواعيد مع معلميهم." : "Add your children first to schedule meetings with their teachers."}
        </p>
      </div>
    );
  }

  const today = new Date();
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "جدولة الاجتماعات" : "Meeting Scheduling"}</h2>
      </div>

      {/* Week view */}
      <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{isAr ? "هذا الأسبوع" : "This Week"}</p>
          <button
            disabled
            className="flex items-center gap-1 text-xs text-primary bg-primary/5 border border-primary/20 px-3 py-1 rounded-full opacity-60 cursor-not-allowed"
          >
            <Plus className="w-3 h-3" />
            {isAr ? "حجز موعد (قريباً)" : "Book Meeting (soon)"}
          </button>
        </div>
        <div className="grid grid-cols-5 divide-x divide-border">
          {weekDays.map((d) => (
            <div key={d.toISOString()} className="p-3 min-h-[100px]">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                {d.toLocaleDateString(isAr ? "ar-EG" : "en-GB", { weekday: "short" })}
              </p>
              <p className="text-xs text-muted-foreground/60">{d.getDate()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming meetings empty */}
      <div className="bg-surface-elevated rounded-lg border border-border p-8 text-center space-y-3">
        <CalendarDays className="w-8 h-8 text-muted-foreground/30 mx-auto" />
        <h3 className="font-semibold text-foreground text-sm">{isAr ? "لا توجد مواعيد قادمة" : "No Upcoming Meetings"}</h3>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          {isAr
            ? "يمكنك حجز مواعيد مع معلمى أبنائك لمناقشة تقدمهم الأكاديمى."
            : "You can book meetings with your children's teachers to discuss their academic progress."}
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-full text-xs text-primary font-medium">
          <Clock className="w-3 h-3" />
          {isAr ? "قيد التطوير — نظام الحجز قريباً" : "In Development — Booking system coming soon"}
        </div>
      </div>
    </div>
  );
}
