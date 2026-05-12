import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmitTransfer } from "@/hooks/useGovernanceData";
import { useGovernorates, useAdministrations, useSchools } from "@/hooks/useRealData";
import { DocumentUpload } from "@/components/governance/DocumentUpload";
import { toast } from "sonner";
import { ArrowRightLeft, CheckCircle2 } from "lucide-react";

export function TransferRequestForm() {
  const { isAr } = useTranslation();
  const { user } = useAuth();
  const submitMutation = useSubmitTransfer();

  const [entityType, setEntityType] = useState("teacher");
  const [reason, setReason] = useState("");
  const [docsUrl, setDocsUrl] = useState<string | null>(null);
  const [curGovId, setCurGovId] = useState("");
  const [curAdminId, setCurAdminId] = useState("");
  const [curSchoolId, setCurSchoolId] = useState("");
  const [tgtGovId, setTgtGovId] = useState("");
  const [tgtAdminId, setTgtAdminId] = useState("");
  const [tgtSchoolId, setTgtSchoolId] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: governorates } = useGovernorates();
  const { data: curAdmins } = useAdministrations(curGovId || undefined);
  const { data: curSchools } = useSchools(curAdminId || undefined);
  const { data: tgtAdmins } = useAdministrations(tgtGovId || undefined);
  const { data: tgtSchools } = useSchools(tgtAdminId || undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await submitMutation.mutateAsync({
        user_id: user.id,
        entity_type: entityType,
        entity_id: user.id,
        current_school_id: curSchoolId || null,
        target_school_id: tgtSchoolId || null,
        current_administration_id: curAdminId || null,
        target_administration_id: tgtAdminId || null,
        reason: reason || null,
        supporting_docs_url: docsUrl,
        request_status: "submitted",
      });
      setSubmitted(true);
      toast.success(isAr ? "تم تقديم طلب النقل" : "Transfer request submitted");
    } catch (err: any) { toast.error(err.message); }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center p-8 bg-surface-elevated rounded-lg border border-border">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-foreground mb-2">{isAr ? "تم تقديم طلب النقل" : "Transfer Request Submitted"}</h2>
        <p className="text-sm text-muted-foreground">{isAr ? "سيتم مراجعة الطلب" : "Your request will be reviewed"}</p>
      </div>
    );
  }

  const fieldCls = "w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20";
  const types = [
    { id: "student", en: "Student", ar: "طالب" },
    { id: "teacher", en: "Teacher", ar: "معلم" },
    { id: "staff", en: "School Staff", ar: "موظف مدرسة" },
    { id: "principal", en: "Principal", ar: "مدير مدرسة" },
  ];

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <ArrowRightLeft className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">{isAr ? "طلب نقل" : "Transfer Request"}</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{isAr ? "نوع النقل" : "Transfer Type"}</label>
            <select value={entityType} onChange={e => setEntityType(e.target.value)} className={fieldCls}>
              {types.map(t => <option key={t.id} value={t.id}>{isAr ? t.ar : t.en}</option>)}
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1">{isAr ? "النطاق الحالى" : "Current Scope"}</h3>
              <select value={curGovId} onChange={e => setCurGovId(e.target.value)} className={fieldCls}>
                <option value="">{isAr ? "المحافظة" : "Governorate"}</option>
                {governorates?.map(g => <option key={g.id} value={g.id}>{isAr ? g.name_ar : g.name}</option>)}
              </select>
              {curGovId && <select value={curAdminId} onChange={e => setCurAdminId(e.target.value)} className={fieldCls}>
                <option value="">{isAr ? "الإدارة" : "Administration"}</option>
                {curAdmins?.map(a => <option key={a.id} value={a.id}>{isAr ? a.name_ar : a.name}</option>)}
              </select>}
              {curAdminId && <select value={curSchoolId} onChange={e => setCurSchoolId(e.target.value)} className={fieldCls}>
                <option value="">{isAr ? "المدرسة" : "School"}</option>
                {curSchools?.map(s => <option key={s.id} value={s.id}>{isAr ? s.name_ar : s.name}</option>)}
              </select>}
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1">{isAr ? "النطاق المطلوب" : "Target Scope"}</h3>
              <select value={tgtGovId} onChange={e => setTgtGovId(e.target.value)} className={fieldCls}>
                <option value="">{isAr ? "المحافظة" : "Governorate"}</option>
                {governorates?.map(g => <option key={g.id} value={g.id}>{isAr ? g.name_ar : g.name}</option>)}
              </select>
              {tgtGovId && <select value={tgtAdminId} onChange={e => setTgtAdminId(e.target.value)} className={fieldCls}>
                <option value="">{isAr ? "الإدارة" : "Administration"}</option>
                {tgtAdmins?.map(a => <option key={a.id} value={a.id}>{isAr ? a.name_ar : a.name}</option>)}
              </select>}
              {tgtAdminId && <select value={tgtSchoolId} onChange={e => setTgtSchoolId(e.target.value)} className={fieldCls}>
                <option value="">{isAr ? "المدرسة" : "School"}</option>
                {tgtSchools?.map(s => <option key={s.id} value={s.id}>{isAr ? s.name_ar : s.name}</option>)}
              </select>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{isAr ? "السبب" : "Reason"}</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className={fieldCls} />
          </div>

          <DocumentUpload
            requestType="transfer"
            onUploadComplete={(path) => setDocsUrl(path)}
            existingUrl={docsUrl}
          />
        </div>
      </div>
      <button type="submit" disabled={submitMutation.isPending} className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-navy-light transition-colors disabled:opacity-50">
        {submitMutation.isPending ? (isAr ? "جارى..." : "Submitting...") : (isAr ? "تقديم طلب النقل" : "Submit Transfer Request")}
      </button>
    </form>
  );
}
