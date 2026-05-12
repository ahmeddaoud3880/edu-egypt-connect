import type { ElementType } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Bell, AlertCircle, CheckCircle2, Info, BookOpen, ClipboardList, Calendar, Check } from "lucide-react";
import { useMyNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/useNotifications";
import { useStudentRegistrationInfo } from "@/hooks/useStudentData";

const TYPE_ICON: Record<string, ElementType> = {
  grade: BookOpen,
  attendance: ClipboardList,
  assignment: ClipboardList,
  meeting: Calendar,
  announcement: Bell,
  general: Info,
};

const TYPE_COLOR: Record<string, string> = {
  grade: "text-blue-600 bg-blue-50 border-blue-200",
  attendance: "text-amber-600 bg-amber-50 border-amber-200",
  assignment: "text-purple-600 bg-purple-50 border-purple-200",
  meeting: "text-green-600 bg-green-50 border-green-200",
  announcement: "text-primary bg-primary/5 border-primary/20",
  general: "text-muted-foreground bg-muted border-border",
};

export function NotificationsAlerts() {
  const { isAr } = useTranslation();
  const { data: regInfo } = useStudentRegistrationInfo();
  const isActivated = regInfo && ["approved", "activated"].includes(regInfo.request_status);

  const { data: notifications = [], unreadCount } = useMyNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "الإشعارات والتنبيهات" : "Notifications & Alerts"}</h2>
        {unreadCount > 0 && (
          <span className="ms-auto text-xs bg-destructive text-white px-2 py-0.5 rounded-full font-bold">
            {unreadCount}
          </span>
        )}
        {unreadCount === 0 && (
          <span className="ms-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {notifications.length}
          </span>
        )}
      </div>

      {/* Account status */}
      {isActivated ? (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">
              {isAr ? "حسابك مفعّل ✓" : "Your account is active ✓"}
            </p>
            <p className="text-xs text-green-600">
              {isAr ? "أهلاً بك في منصة تعليم مصر الرقمية" : "Welcome to Egypt Digital Education Platform"}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {isAr ? "حسابك قيد المراجعة" : "Account pending review"}
            </p>
            <p className="text-xs text-amber-600">
              {isAr ? "ستصلك إشعارات فور الموافقة على طلب التسجيل." : "You will receive notifications once your registration is approved."}
            </p>
          </div>
        </div>
      )}

      {/* Mark all read button */}
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            {isAr ? "تحديد الكل كمقروء" : "Mark all as read"}
          </button>
        </div>
      )}

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <div className="bg-surface-elevated rounded-lg border border-border p-10 text-center space-y-3">
          <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <h3 className="font-semibold text-foreground">{isAr ? "لا توجد إشعارات" : "No Notifications"}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {isAr
              ? "ستظهر هنا إشعارات المواعيد والواجبات والتنبيهات من معلميك."
              : "Upcoming deadlines, assignments, and teacher alerts will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type] || Info;
            const colorCls = TYPE_COLOR[n.type] || TYPE_COLOR.general;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-4 border rounded-lg transition-colors cursor-pointer ${n.is_read ? "opacity-70" : "shadow-sm"} ${colorCls}`}
                onClick={() => { if (!n.is_read) markRead.mutate(n.id); }}
              >
                <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{isAr ? (n.title_ar || n.title) : n.title}</p>
                  {(n.body || n.body_ar) && (
                    <p className="text-xs mt-0.5 opacity-80">{isAr ? (n.body_ar || n.body) : n.body}</p>
                  )}
                  <p className="text-[10px] mt-1 opacity-60">
                    {new Date(n.created_at).toLocaleString(isAr ? "ar-EG" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                    {n.sender_role && (
                      <span className="ms-2 uppercase font-medium">{n.sender_role}</span>
                    )}
                  </p>
                </div>
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-current shrink-0 mt-1.5" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
