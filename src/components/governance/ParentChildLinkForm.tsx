import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmitParentChildLink } from "@/hooks/useGovernanceData";
import { useGovernorates, useAdministrations, useSchools } from "@/hooks/useRealData";
import { toast } from "sonner";
import { Link2, CheckCircle2, AlertTriangle } from "lucide-react";

function validateNationalId(id: string): boolean {
  return /^\d{14}$/.test(id);
}

function validateLegalName(name: string): boolean {
  return name.trim().split(/\s+/).filter(w => w.length > 0).length >= 3;
}

export function ParentChildLinkForm() {
  const { isAr } = useTranslation();
  const { user, profile } = useAuth();
  const submitMutation = useSubmitParentChildLink();

  const [childName, setChildName] = useState("");
  const [childCode, setChildCode] = useState("");
  const [parentNationalId, setParentNationalId] = useState("");
  const [relationType, setRelationType] = useState("parent");
  const [govId, setGovId] = useState("");
  const [adminId, setAdminId] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: governorates } = useGovernorates();
  const { data: administrations } = useAdministrations(govId || undefined);
  const { data: schools } = useSchools(adminId || undefined);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!parentNationalId.trim()) {
      errs.parentNationalId = isAr ? "الرقم القومى لولى الأمر مطلوب" : "Parent National ID is required";
    } else if (!validateNationalId(parentNationalId)) {
      errs.parentNationalId = isAr ? "الرقم القومى يجب أن يتكون من 14 رقماً" : "National ID must be 14 digits";
    }
    if (!childName.trim()) {
      errs.childName = isAr ? "اسم الطالب مطلوب" : "Child name is required";
    } else if (!validateLegalName(childName)) {
      errs.childName = isAr ? "يجب إدخال الاسم الثلاثى أو الرباعى للطالب" : "Enter child's triple or quadruple legal name";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!validate()) { toast.error(isAr ? "يرجى تصحيح الأخطاء" : "Please correct errors"); return; }
    try {
      await submitMutation.mutateAsync({
        parent_user_id: user.id,
        parent_name: profile?.full_name || "",
        parent_national_id: parentNationalId.trim(),
        child_name: childName.trim(),
        child_student_code: childCode || null,
        child_school_id: schoolId || null,
        relation_type: relationType,
        request_status: "submitted",
        verification_status: "pending",
      });
      setSubmitted(true);
      toast.success(isAr ? "تم تقديم طلب الربط" : "Link request submitted");
    } catch (err: any) { toast.error(err.message); }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center p-8 bg-surface-elevated rounded-lg border border-border">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-foreground mb-2">{isAr ? "تم تقديم طلب ربط ولى الأمر" : "Parent-Child Link Request Submitted"}</h2>
        <p className="text-sm text-muted-foreground">{isAr ? "ستقوم المدرسة بالتحقق والمراجعة" : "The school will verify and review"}</p>
      </div>
    );
  }

  const fieldCls = "w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20";
  const errorFieldCls = "w-full px-4 py-2.5 border border-red-400 rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-red-200";
  const errorCls = "text-xs text-red-600 mt-1 flex items-center gap-1";

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">{isAr ? "طلب ربط ولى أمر بطالب" : "Parent-Child Link Request"}</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {isAr ? "لا يمكن الربط المباشر. يجب تقديم طلب وتتم المراجعة من المدرسة. يجب أن تتطابق البيانات مع الوثائق الرسمية." : "Direct linking is not allowed. A request must be submitted and reviewed by the school. Data must match official documents."}
        </p>

        {/* Identity Section */}
        <div className="p-4 bg-muted/50 rounded-lg border border-border mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">{isAr ? "بيانات الهوية الرسمية" : "Official Identity Information"}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {isAr ? "الرقم القومى لولى الأمر *" : "Parent National ID *"}
                <span className="text-xs text-muted-foreground font-normal ms-1">({isAr ? "14 رقماً" : "14 digits"})</span>
              </label>
              <input
                type="text"
                value={parentNationalId}
                onChange={e => { setParentNationalId(e.target.value.replace(/\D/g, "")); setErrors(prev => ({...prev, parentNationalId: ""})); }}
                className={errors.parentNationalId ? errorFieldCls : fieldCls}
                maxLength={14}
                dir="ltr"
              />
              {errors.parentNationalId && <p className={errorCls}><AlertTriangle className="w-3 h-3" />{errors.parentNationalId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {isAr ? "اسم الطالب القانونى الكامل *" : "Child's Full Legal Name *"}
              </label>
              <p className="text-[10px] text-muted-foreground mb-1">
                {isAr ? "الاسم الثلاثى أو الرباعى كما فى شهادة الميلاد" : "Triple or quadruple name as on birth certificate"}
              </p>
              <input
                type="text"
                value={childName}
                onChange={e => { setChildName(e.target.value); setErrors(prev => ({...prev, childName: ""})); }}
                className={errors.childName ? errorFieldCls : fieldCls}
              />
              {errors.childName && <p className={errorCls}><AlertTriangle className="w-3 h-3" />{errors.childName}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{isAr ? "كود الطالب" : "Student Code"}</label>
            <input type="text" value={childCode} onChange={e => setChildCode(e.target.value)} className={fieldCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{isAr ? "صلة القرابة" : "Relation Type"}</label>
            <select value={relationType} onChange={e => setRelationType(e.target.value)} className={fieldCls}>
              <option value="parent">{isAr ? "ولى أمر (أب/أم)" : "Parent (Father/Mother)"}</option>
              <option value="guardian">{isAr ? "وصى شرعى" : "Legal Guardian"}</option>
              <option value="relative">{isAr ? "قريب مفوّض" : "Authorized Relative"}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{isAr ? "المحافظة" : "Governorate"}</label>
            <select value={govId} onChange={e => setGovId(e.target.value)} className={fieldCls}>
              <option value="">{isAr ? "اختر" : "Select"}</option>
              {governorates?.map(g => <option key={g.id} value={g.id}>{isAr ? g.name_ar : g.name}</option>)}
            </select>
          </div>
          {govId && <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{isAr ? "الإدارة" : "Administration"}</label>
            <select value={adminId} onChange={e => setAdminId(e.target.value)} className={fieldCls}>
              <option value="">{isAr ? "اختر" : "Select"}</option>
              {administrations?.map(a => <option key={a.id} value={a.id}>{isAr ? a.name_ar : a.name}</option>)}
            </select>
          </div>}
          {adminId && <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{isAr ? "مدرسة الطالب" : "Child's School"}</label>
            <select value={schoolId} onChange={e => setSchoolId(e.target.value)} className={fieldCls}>
              <option value="">{isAr ? "اختر" : "Select"}</option>
              {schools?.map(s => <option key={s.id} value={s.id}>{isAr ? s.name_ar : s.name}</option>)}
            </select>
          </div>}
        </div>
      </div>
      <button type="submit" disabled={submitMutation.isPending} className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-navy-light transition-colors disabled:opacity-50">
        {submitMutation.isPending ? (isAr ? "جارى..." : "Submitting...") : (isAr ? "تقديم طلب الربط" : "Submit Link Request")}
      </button>
    </form>
  );
}
