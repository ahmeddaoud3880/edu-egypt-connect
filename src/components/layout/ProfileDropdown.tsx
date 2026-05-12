import { useRef, useEffect } from "react";
import { UserCog, LogOut, Edit, ChevronDown, Shield, Building } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useNavigate } from "react-router-dom";

interface ProfileDropdownProps {
  open: boolean;
  onClose: () => void;
  onRequestEdit?: () => void;
}

export function ProfileDropdown({ open, onClose, onRequestEdit }: ProfileDropdownProps) {
  const { user, profile, role, signOut } = useAuth();
  const { isAr, t } = useTranslation();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  const displayName = isAr
    ? (profile?.full_name_ar || profile?.full_name || user?.user_metadata?.full_name || "مستخدم النظام")
    : (profile?.full_name || user?.user_metadata?.full_name || "System User");

  const roleLabel = role
    ? t(`role.${role}` as any) || role
    : (isAr ? "مستخدم" : "User");

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

  const handleLogout = async () => {
    onClose();
    await signOut();
    navigate("/login");
  };

  if (!open) return null;

  return (
    <>
      <div
        ref={panelRef}
        className="absolute top-full end-[-0.5rem] sm:end-0 mt-2 w-[calc(100vw-2rem)] sm:w-64 max-w-[300px] bg-surface-elevated border border-border rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Profile header */}
        <div className="px-4 py-4 border-b border-border bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
              <UserCog className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-3 h-3 text-primary/70" />
                <span className="text-[10px] text-primary/70 font-medium">{roleLabel}</span>
              </div>
            </div>
          </div>
          {profile?.school_id && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
              <Building className="w-3 h-3" />
              <span>{isAr ? "مرتبط بمدرسة" : "School assigned"}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="py-1">
          <button
            onClick={() => { onClose(); onRequestEdit?.(); }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-start"
          >
            <Edit className="w-4 h-4 text-muted-foreground" />
            <span>{isAr ? "طلب تعديل البيانات" : "Request Profile Changes"}</span>
          </button>

          <div className="border-t border-border my-1" />

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-destructive/10 text-destructive transition-colors text-start"
          >
            <LogOut className="w-4 h-4" />
            <span>{isAr ? "تسجيل الخروج" : "Sign Out"}</span>
          </button>
        </div>
      </div>

    </>
  );
}

/** Trigger button — shows avatar + name + chevron */
export function ProfileDropdownTrigger({
  onClick,
  displayName,
  roleLabel,
}: {
  onClick: () => void;
  displayName: string;
  roleLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 ps-3 border-s border-border hover:bg-muted/60 rounded transition-colors px-2 py-1"
    >
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
        <UserCog className="w-3.5 h-3.5 text-primary-foreground" />
      </div>
      <div className="hidden sm:block text-start">
        <div className="text-xs font-medium">{displayName}</div>
        <div className="text-[10px] text-muted-foreground">{roleLabel}</div>
      </div>
      <ChevronDown className="w-3 h-3 text-muted-foreground" />
    </button>
  );
}
