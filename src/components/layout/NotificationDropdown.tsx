import { useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell, X, Check, CheckCheck, BookOpen, ClipboardList,
  GraduationCap, MessageSquare, AlertTriangle, School,
} from "lucide-react";
import { useMyNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface NotificationDropdownProps {
  open: boolean;
  onClose: () => void;
}

/** Maps notification type → tab for the current role */
function getTabForNotification(type: string, relatedType: string | null, role: string): string | null {
  const map: Record<string, Partial<Record<string, string>>> = {
    student: {
      grade: "grades",
      grades: "grades",
      attendance: "attendance",
      quiz: "assessments",
      assessment: "assessments",
      assignment: "assignments",
      message: "ai",
      general: "overview",
    },
    parent: {
      grade: "grades",
      grades: "grades",
      attendance: "attendance",
      quiz: "grades",
      assignment: "assignments",
      message: "communication",
      school_notice: "notices",
      general: "overview",
    },
    teacher: {
      quiz: "quizzes",
      assignment: "homework",
      message: "parents",
      grade: "gradebook",
      attendance: "attendance",
      general: "overview",
    },
    school: {
      grade: "academics",
      attendance: "daily",
      message: "parents",
      general: "overview",
    },
  };
  const roleMap = map[role] || {};
  return roleMap[type] || roleMap[relatedType || ""] || null;
}

function notifIcon(type: string) {
  const cls = "w-4 h-4";
  switch (type) {
    case "grade": case "grades": return <GraduationCap className={cls} />;
    case "attendance": return <ClipboardList className={cls} />;
    case "quiz": case "assessment": return <BookOpen className={cls} />;
    case "assignment": return <ClipboardList className={cls} />;
    case "message": return <MessageSquare className={cls} />;
    case "school_notice": return <School className={cls} />;
    default: return <AlertTriangle className={cls} />;
  }
}

export function NotificationDropdown({ open, onClose }: NotificationDropdownProps) {
  const { data: notifications = [], unreadCount } = useMyNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const { role } = useAuth();
  const { isAr } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleNotifClick = async (notif: (typeof notifications)[0]) => {
    if (!notif.is_read) {
      await markRead.mutateAsync(notif.id);
    }
    const currentRole = role || searchParams.get("role") || "student";
    const tab = getTabForNotification(notif.type, notif.related_type, currentRole);
    onClose();
    if (tab) {
      navigate(`/dashboard?role=${currentRole}&tab=${tab}`);
    }
  };

  const recent = notifications.slice(0, 20);

  return (
    <div
      ref={panelRef}
      className="absolute top-full end-[-1rem] sm:end-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-[360px] bg-surface-elevated border border-border rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">
            {isAr ? "الإشعارات" : "Notifications"}
          </span>
          {unreadCount > 0 && (
            <span className="text-[10px] bg-destructive text-white rounded-full px-1.5 py-0.5 font-bold leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              title={isAr ? "تحديد الكل كمقروء" : "Mark all read"}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="max-h-96 overflow-y-auto divide-y divide-border">
        {recent.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            {isAr ? "لا توجد إشعارات" : "No notifications"}
          </div>
        ) : (
          recent.map((notif) => {
            const title = isAr ? (notif.title_ar || notif.title) : notif.title;
            const body = isAr ? (notif.body_ar || notif.body) : notif.body;
            const timeAgo = (() => {
              try {
                return formatDistanceToNow(new Date(notif.created_at), {
                  addSuffix: true,
                  locale: isAr ? ar : enUS,
                });
              } catch {
                return "";
              }
            })();

            return (
              <button
                key={notif.id}
                onClick={() => handleNotifClick(notif)}
                className={`w-full text-start flex items-start gap-3 px-4 py-3 hover:bg-muted/60 transition-colors ${
                  !notif.is_read ? "bg-primary/5" : ""
                }`}
              >
                <div
                  className={`mt-0.5 p-1.5 rounded-full shrink-0 ${
                    !notif.is_read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {notifIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-medium truncate ${!notif.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                      {title}
                    </p>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                    )}
                  </div>
                  {body && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{body}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo}</p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {notifications.length > 20 && (
        <div className="px-4 py-2 border-t border-border text-center">
          <span className="text-xs text-muted-foreground">
            {isAr ? `و ${notifications.length - 20} إشعار آخر` : `and ${notifications.length - 20} more`}
          </span>
        </div>
      )}
    </div>
  );
}
