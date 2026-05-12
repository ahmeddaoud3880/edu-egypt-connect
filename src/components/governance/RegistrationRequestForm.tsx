import { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { useGovernorates, useAdministrations, useSchools, useStages, useDistricts } from "@/hooks/useRealData";
import { useSubmitRegistration } from "@/hooks/useGovernanceData";
import { DocumentUpload } from "@/components/governance/DocumentUpload";
import { toast } from "sonner";
import { FileText, CheckCircle2, AlertTriangle } from "lucide-react";

type AppRole = "ministry" | "directorate" | "administration" | "school" | "teacher" | "student" | "parent" | "support";

const ROLE_OPTIONS: { id: AppRole; en: string; ar: string; needsSchool: boolean; needsAdmin: boolean; needsGov: boolean }[] = [
  { id: "student", en: "Student", ar: "طالب", needsSchool: true, needsAdmin: true, needsGov: true },
  { id: "parent", en: "Parent / Guardian", ar: "ولى أمر", needsSchool: true, needsAdmin: true, needsGov: true },
  { id: "teacher", en: "Teacher", ar: "معلم", needsSchool: true, needsAdmin: true, needsGov: true },
  { id: "school", en: "School Leadership", ar: "قيادة مدرسة", needsSchool: true, needsAdmin: true, needsGov: true },
  { id: "administration", en: "Administration Leadership", ar: "قيادة إدارة", needsSchool: false, needsAdmin: true, needsGov: true },
  { id: "directorate", en: "Directorate Leadership", ar: "قيادة مديرية", needsSchool: false, needsAdmin: false, needsGov: true },
  { id: "ministry", en: "Ministry Leadership", ar: "قيادة وزارة", needsSchool: false, needsAdmin: false, needsGov: false },
  { id: "support", en: "Technical Support", ar: "دعم فنى", needsSchool: false, needsAdmin: false, needsGov: false },
];

function validateNationalId(id: string): boolean {
  return /^\d{14}$/.test(id);
}

function validateLegalName(name: string): boolean {
  const words = name.trim().split(/\s+/).filter(w => w.length > 0);
  return words.length >= 3;
}

export function RegistrationRequestForm() {
  const { isAr } = useTranslation();
  const { user } = useAuth();
  const submitMutation = useSubmitRegistration();

  const [fullName, setFullName] = useState("");
  const [fullNameAr, setFullNameAr] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [parentNationalId, setParentNationalId] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [requestedRole, setRequestedRole] = useState<AppRole>("student");
  const [governorateId, setGovernorateId] = useState("");
  const [administrationId, setAdministrationId] = useState("");
  const [stageId, setStageId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [gradeNumber, setGradeNumber] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [docsUrl, setDocsUrl] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const roleConfig = ROLE_OPTIONS.find(r => r.id === requestedRole)!;
  const { data: governorates } = useGovernorates();
  const { data: administrations } = useAdministrations(governorateId || undefined);
  const { data: stages } = useStages();
  const { data: districts } = useDistricts(governorateId || undefined);
  const { data: schools } = useSchools(administrationId || undefined, stageId || undefined, districtId || undefined, gender);

  useEffect(() => { setAdministrationId(""); setDistrictId(""); setSchoolId(""); }, [governorateId]);
  useEffect(() => { setDistrictId(""); setSchoolId(""); }, [administrationId]);
  useEffect(() => { setSchoolId(""); }, [stageId, districtId, gender]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!nationalId.trim()) errs.nationalId = isAr ? "الرقم القومى مطلوب" : "National ID is required";
    else if (!validateNationalId(nationalId)) errs.nationalId = isAr ? "الرقم القومى يجب أن يتكون من 14 رقماً" : "National ID must be exactly 14 digits";
    
    if (requestedRole === "student") {
      if (!parentNationalId.trim()) errs.parentNationalId = isAr ? "الرقم القومى لولى الأمر مطلوب" : "Parent National ID is required";
      else if (!validateNationalId(parentNationalId)) errs.parentNationalId = isAr ? "الرقم القومى يجب أن يتكون من 14 رقماً" : "Parent National ID must be 14 digits";
      else if (nationalId === parentNationalId) errs.parentNationalId = isAr ? "لا يمكن تطابق رقم الطالب مع ولى الأمر" : "Student and Parent IDs cannot match";
      if (!gradeNumber.trim() || isNaN(Number(gradeNumber)) || Number(gradeNumber) < 1 || Number(gradeNumber) > 12)
        errs.gradeNumber = isAr ? "رقم الصف مطلوب (من 1 إلى 12)" : "Grade number is required (1 to 12)";
    }
    if (requestedRole === "teacher" && gradeNumber.trim() && (isNaN(Number(gradeNumber)) || Number(gradeNumber) < 1 || Number(gradeNumber) > 12)) {
      errs.gradeNumber = isAr ? "رقم الصف غير صحيح (من 1 إلى 12)" : "Invalid grade number (1 to 12)";
    }

    if (!fullName.trim()) errs.fullName = isAr ? "الاسم القانونى الكامل مطلوب" : "Full legal name is required";
    else if (!validateLegalName(fullName)) errs.fullName = isAr ? "يجب إدخال الاسم الثلاثى أو الرباعى كما هو فى بطاقة الرقم القومى" : "Enter triple or quadruple legal name as shown on the national ID card";
    if (fullNameAr.trim() && !validateLegalName(fullNameAr)) errs.fullNameAr = isAr ? "يجب إدخال الاسم الثلاثى أو الرباعى بالعربية" : "Enter triple or quadruple legal name in Arabic";
    if (!email.trim()) errs.email = isAr ? "البريد الإلكترونى مطلوب" : "Email is required";
    if (roleConfig.needsGov && !governorateId) errs.governorate = isAr ? "يجب اختيار المحافظة" : "Governorate is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast.error(isAr ? "يرجى تصحيح الأخطاء أدناه" : "Please correct the errors below"); return; }
    try {
      await submitMutation.mutateAsync({
        user_id: user?.id || null,
        full_name: fullName.trim(),
        full_name_ar: fullNameAr.trim() || fullName.trim(),
        email: email.trim(),
        phone: phone || null,
        national_id: nationalId.trim(),
        parent_national_id: requestedRole === "student" ? parentNationalId.trim() : null,
        gender: gender,
        requested_role: requestedRole,
        governorate_id: governorateId || null,
        administration_id: administrationId || null,
        district_id: districtId || null,
        stage_id: stageId || null,
        school_id: schoolId || null,
        grade_number: gradeNumber ? Number(gradeNumber) : null,
        notes: notes || null,
        supporting_docs_url: docsUrl,
        request_status: "submitted",
      });
      setSubmitted(true);
      toast.success(isAr ? "تم تقديم الطلب بنجاح" : "Request submitted successfully");
    } catch (err: any) { toast.error(err.message || "Error submitting request"); }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center p-8 bg-surface-elevated rounded-lg border border-border">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-foreground mb-2">{isAr ? "تم تقديم طلب التسجيل" : "Registration Request Submitted"}</h2>
        <p className="text-sm text-muted-foreground mb-4">{isAr ? "طلبك قيد المراجعة. ستتلقى إشعاراً عند الموافقة أو عند الحاجة لمعلومات إضافية." : "Your request is under review. You will be notified upon approval or if additional information is needed."}</p>
        <div className="p-3 bg-muted rounded text-xs text-muted-foreground">{isAr ? "الحالة: مُقدَّم — في انتظار المراجعة" : "Status: Submitted — Awaiting Review"}</div>
      </div>
    );
  }

  const fieldCls = "w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20";
  const errorFieldCls = "w-full px-4 py-2.5 border border-red-400 rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-red-200";
  const labelCls = "block text-sm font-medium text-foreground mb-1.5";
  const errorCls = "text-xs text-red-600 mt-1 flex items-center gap-1";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">{isAr ? "نموذج طلب التسجيل الرسمى" : "Official Registration Request Form"}</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-6">{isAr ? "أكمل النموذج أدناه بالبيانات الرسمية. يجب أن تتطابق البيانات مع الوثائق الرسمية (بطاقة الرقم القومى / شهادة الميلاد)." : "Complete the form below with official data. All information must match official documents (National ID card / Birth certificate)."}</p>

        {/* Official Identity Section */}
        <div className="p-4 bg-muted/50 rounded-lg border border-border mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            {isAr ? "بيانات الهوية الرسمية" : "Official Identity Information"}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">{isAr ? "الاسم الثلاثى أو الرباعى كما هو فى شهادة الميلاد أو بطاقة الرقم القومى. لا يُقبل الأسماء المختصرة أو ألقاب الشهرة." : "Triple or quadruple legal name exactly as shown on the birth certificate or national ID card. Nicknames or shortened names are not accepted."}</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{isAr ? "الرقم القومى *" : "National ID *"} <span className="text-xs text-muted-foreground font-normal">({isAr ? "14 رقماً" : "14 digits"})</span></label>
              <input type="text" value={nationalId} onChange={e => { setNationalId(e.target.value.replace(/\D/g, "")); setErrors(prev => ({ ...prev, nationalId: "" })); }} className={errors.nationalId ? errorFieldCls : fieldCls} maxLength={14} placeholder={isAr ? "أدخل الرقم القومى المكون من 14 رقم" : "Enter 14-digit National ID"} dir="ltr" />
              {errors.nationalId && <p className={errorCls}><AlertTriangle className="w-3 h-3" />{errors.nationalId}</p>}
            </div>
            <div>
              <label className={labelCls}>{isAr ? "الدور المطلوب *" : "Requested Role *"}</label>
              <select value={requestedRole} onChange={e => { setRequestedRole(e.target.value as AppRole); setErrors(prev => ({ ...prev, parentNationalId: "" })); }} className={fieldCls}>
                {ROLE_OPTIONS.map(r => <option key={r.id} value={r.id}>{isAr ? r.ar : r.en}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{isAr ? "الجنس *" : "Gender *"}</label>
              <select value={gender} onChange={e => setGender(e.target.value as "male" | "female")} className={fieldCls}>
                <option value="male">{isAr ? "ذكر" : "Male"}</option>
                <option value="female">{isAr ? "أنثى" : "Female"}</option>
              </select>
            </div>
            {requestedRole === "student" && (
              <div>
                <label className={labelCls}>{isAr ? "الرقم القومى لولى الأمر *" : "Parent National ID *"}</label>
                <input type="text" value={parentNationalId} onChange={e => { setParentNationalId(e.target.value.replace(/\D/g, "")); setErrors(prev => ({ ...prev, parentNationalId: "" })); }} className={errors.parentNationalId ? errorFieldCls : fieldCls} maxLength={14} placeholder={isAr ? "14 رقم لولى الأمر" : "14-digit Parent ID"} dir="ltr" />
                {errors.parentNationalId && <p className={errorCls}><AlertTriangle className="w-3 h-3" />{errors.parentNationalId}</p>}
              </div>
            )}
            <div>
              <label className={labelCls}>{isAr ? "الاسم القانونى الكامل (إنجليزى) *" : "Full Legal Name (English) *"}</label>
              <input type="text" value={fullName} onChange={e => { setFullName(e.target.value); setErrors(prev => ({ ...prev, fullName: "" })); }} className={errors.fullName ? errorFieldCls : fieldCls} placeholder={isAr ? "الاسم الثلاثى أو الرباعى بالإنجليزية" : "Triple or quadruple name as on official documents"} />
              {errors.fullName && <p className={errorCls}><AlertTriangle className="w-3 h-3" />{errors.fullName}</p>}
            </div>
            <div>
              <label className={labelCls}>{isAr ? "الاسم القانونى الكامل (عربى) *" : "Full Legal Name (Arabic) *"}</label>
              <input type="text" value={fullNameAr} onChange={e => { setFullNameAr(e.target.value); setErrors(prev => ({ ...prev, fullNameAr: "" })); }} className={errors.fullNameAr ? errorFieldCls : fieldCls} dir="rtl" placeholder={isAr ? "الاسم الثلاثى أو الرباعى كما فى بطاقة الرقم القومى" : "Triple or quadruple name in Arabic"} />
              {errors.fullNameAr && <p className={errorCls}><AlertTriangle className="w-3 h-3" />{errors.fullNameAr}</p>}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{isAr ? "البريد الإلكترونى *" : "Email *"}</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: "" })); }} className={errors.email ? errorFieldCls : fieldCls} required />
            {errors.email && <p className={errorCls}><AlertTriangle className="w-3 h-3" />{errors.email}</p>}
          </div>
          <div>
            <label className={labelCls}>{isAr ? "الهاتف" : "Phone"}</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={fieldCls} />
          </div>

          {roleConfig.needsSchool && (
            <div>
              <label className={labelCls}>{isAr ? "المرحلة الدراسية *" : "Educational Stage *"}</label>
              <select value={stageId} onChange={e => setStageId(e.target.value)} className={fieldCls}>
                <option value="">{isAr ? "اختر المرحلة" : "Select stage"}</option>
                {stages?.map(s => <option key={s.id} value={s.id}>{isAr ? s.name_ar || s.name : s.name || s.name_ar}</option>)}
              </select>
            </div>
          )}

          {(requestedRole === "student" || requestedRole === "teacher") && (
            <div>
              <label className={labelCls}>
                {isAr ? "رقم الصف" : "Grade Number"}
                {requestedRole === "student" && " *"}
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={gradeNumber}
                onChange={e => { setGradeNumber(e.target.value); setErrors(prev => ({ ...prev, gradeNumber: "" })); }}
                className={errors.gradeNumber ? errorFieldCls : fieldCls}
                placeholder={isAr ? "مثال: 3 (للصف الثالث)" : "e.g. 3"}
                dir="ltr"
              />
              {errors.gradeNumber && <p className={errorCls}><AlertTriangle className="w-3 h-3" />{errors.gradeNumber}</p>}
            </div>
          )}

          {roleConfig.needsGov && (
            <div>
              <label className={labelCls}>{isAr ? "المحافظة *" : "Governorate *"}</label>
              <select value={governorateId} onChange={e => setGovernorateId(e.target.value)} className={errors.governorate ? errorFieldCls : fieldCls}>
                <option value="">{isAr ? "اختر المحافظة" : "Select governorate"}</option>
                {governorates?.map(g => <option key={g.id} value={g.id}>{isAr ? g.name_ar || g.name : g.name || g.name_ar}</option>)}
              </select>
              {errors.governorate && <p className={errorCls}><AlertTriangle className="w-3 h-3" />{errors.governorate}</p>}
            </div>
          )}

          {roleConfig.needsAdmin && governorateId && (
            <div>
              <label className={labelCls}>{isAr ? "الإدارة التعليمية *" : "Administration *"}</label>
              <select value={administrationId} onChange={e => setAdministrationId(e.target.value)} className={fieldCls}>
                <option value="">{isAr ? "اختر الإدارة" : "Select administration"}</option>
                {administrations?.map(a => <option key={a.id} value={a.id}>{isAr ? a.name_ar || a.name : a.name || a.name_ar}</option>)}
              </select>
            </div>
          )}

          {roleConfig.needsSchool && administrationId && (
            <>
              <div>
                <label className={labelCls}>{isAr ? "القسم / المركز *" : "District / Center *"}</label>
                <select value={districtId} onChange={e => setDistrictId(e.target.value)} className={fieldCls}>
                  <option value="">{isAr ? "اختر القسم/المركز" : "Select district"}</option>
                  {districts?.map(d => <option key={d.id} value={d.id}>{isAr ? d.name_ar || d.name : d.name || d.name_ar}</option>)}
                </select>
              </div>

              {stageId && districtId && (
                <div>
                  <label className={labelCls}>{isAr ? "المدرسة *" : "School *"}</label>
                  <select value={schoolId} onChange={e => setSchoolId(e.target.value)} className={fieldCls}>
                    <option value="">{isAr ? "اختر المدرسة" : "Select school"}</option>
                    {schools?.map(s => <option key={s.id} value={s.id}>{isAr ? s.name_ar || s.name : s.name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* Document Upload */}
        <div className="mt-6">
          <DocumentUpload
            requestType="registration"
            onUploadComplete={(path) => setDocsUrl(path)}
            existingUrl={docsUrl}
          />
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label className={labelCls}>{isAr ? "ملاحظات / سبب الطلب" : "Notes / Request Reason"}</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={fieldCls} />
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg border border-border">
        <p className="text-xs text-muted-foreground">
          <strong>{isAr ? "ملاحظة:" : "Note:"}</strong>{" "}
          {isAr ? "بعد التقديم، سيتم مراجعة طلبك من قبل الجهة المختصة حسب الدور المطلوب. لن يتم تفعيل الحساب إلا بعد الموافقة. يجب أن تتطابق البيانات مع الوثائق الرسمية." : "After submission, your request will be reviewed by the appropriate authority. Your account will not be activated until approved. All data must match official documents."}
        </p>
      </div>

      <button type="submit" disabled={submitMutation.isPending} className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-navy-light transition-colors disabled:opacity-50">
        {submitMutation.isPending ? (isAr ? "جارى التقديم..." : "Submitting...") : (isAr ? "تقديم الطلب" : "Submit Request")}
      </button>
    </form>
  );
}
