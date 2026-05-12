import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmitRoleChange } from "@/hooks/useGovernanceData";
import { useGovernorates, useAdministrations, useSchools } from "@/hooks/useRealData";
import { toast } from "sonner";
import { UserCog, CheckCircle2 } from "lucide-react";

const ROLES = [
  { id: "teacher", en: "Teacher", ar: "معلم" },
  { id: "school", en: "School Leadership", ar: "قيادة مدرسة" },
  { id: "administration", en: "Administration Leadership", ar: "قيادة إدارة" },
  { id: "directorate", en: "Directorate Leadership", ar: "قيادة مديرية" },
  { id: "ministry", en: "Ministry Leadership", ar: "قيادة وزارة" },
  { id: "support", en: "Technical Support", ar: "دعم فنى" },
];

export function RoleChangeRequestForm() {
  const { isAr } = useTranslation();
  const { user, role: currentRole } = useAuth();
  const submitMutation = useSubmitRoleChange();

  const [requestedRole, setRequestedRole] = useState("");
  const [reason, setReason] = useState("");
  const [govId, setGovId] = useState("");
  const [adminId, setAdminId] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: governorates } = useGovernorates();
  const { data: administrations } = useAdministrations(govId || undefined);
  const { data: schools } = useSchools(adminId || undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentRole || !requestedRole) return;
    if (requestedRole === currentRole) {
      toast.error(isAr ? "الدور المطلوب مطابق للدور الحالى" : "Requested role is the same as current role");
      return;
    }
    try {
      await submitMutation.mutateAsync({
        user_id: user.id,
        old_role: currentRole,
        requested_role: requestedRole,
        reason: reason || null,
        scope_governorate_id: govId || null,
        scope_administration_id: adminId || null,
        scope_school_id: schoolId || null,
        request_status: "submitted",
      });
      setSubmitted(true);
      toast.success(isAr ? "تم تقديم طلب تغيير الدور" : "Role change request submitted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center p-8 bg-surface-elevated rounded-lg border border-border">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-foreground mb-2">{isAr ? "تم تقديم طلب تغيير الدور" : "Role Change Request Submitted"}</h2>
        <p className="text-sm text-muted-foreground">{isAr ? "سيتم مراجعة الطلب من الجهة المختصة" : "Your request will be reviewed by the appropriate authority"}</p>
      </div>
    );
  }

  const fieldCls = "w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserCog className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">{isAr ? "طلب تغيير الدور" : "Role Change Request"}</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{isAr ? "الدور الحالى" : "Current Role"}</label>
            <input value={currentRole || ""} disabled className={`${fieldCls} opacity-60`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{isAr ? "الدور المطلوب *" : "Requested Role *"}</label>
            <select value={requestedRole} onChange={e => setRequestedRole(e.target.value)} className={fieldCls} required>
              <option value="">{isAr ? "اختر الدور" : "Select role"}</option>
              {ROLES.filter(r => r.id !== currentRole).map(r => (
                <option key={r.id} value={r.id}>{isAr ? r.ar : r.en}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{isAr ? "المحافظة" : "Governorate"}</label>
            <select value={govId} onChange={e => setGovId(e.target.value)} className={fieldCls}>
              <option value="">{isAr ? "اختر" : "Select"}</option>
              {governorates?.map(g => <option key={g.id} value={g.id}>{isAr ? g.name_ar : g.name}</option>)}
            </select>
          </div>
          {govId && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{isAr ? "الإدارة" : "Administration"}</label>
              <select value={adminId} onChange={e => setAdminId(e.target.value)} className={fieldCls}>
                <option value="">{isAr ? "اختر" : "Select"}</option>
                {administrations?.map(a => <option key={a.id} value={a.id}>{isAr ? a.name_ar : a.name}</option>)}
              </select>
            </div>
          )}
          {adminId && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{isAr ? "المدرسة" : "School"}</label>
              <select value={schoolId} onChange={e => setSchoolId(e.target.value)} className={fieldCls}>
                <option value="">{isAr ? "اختر" : "Select"}</option>
                {schools?.map(s => <option key={s.id} value={s.id}>{isAr ? s.name_ar : s.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{isAr ? "السبب *" : "Reason *"}</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className={fieldCls} required />
          </div>
        </div>
      </div>
      <button type="submit" disabled={submitMutation.isPending} className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-navy-light transition-colors disabled:opacity-50">
        {submitMutation.isPending ? (isAr ? "جارى..." : "Submitting...") : (isAr ? "تقديم الطلب" : "Submit Request")}
      </button>
    </form>
  );
}
