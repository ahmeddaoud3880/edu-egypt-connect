import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useGovernorates, useAdministrations, useSchools, useStages } from "@/hooks/useRealData";
import { useDemoMode } from "@/hooks/useDemoMode";
import { supabase } from "@/integrations/supabase/client";
import {
  Landmark, Building2, School, Users, GraduationCap,
  UserCheck, Headphones, BookOpen, FileText, AlertTriangle,
  CheckCircle2, Search, HelpCircle, LogIn, TestTube, Loader2,
  Database, ChevronDown, ChevronUp, Settings, Eye, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

type AppRole = "ministry" | "directorate" | "administration" | "school" | "teacher" | "student" | "parent" | "support" | "super_admin";

const roles: { id: AppRole; label: string; ar: string; desc: string; icon: any; needsSchool: boolean }[] = [
  { id: "student", label: "Student", ar: "طالب", desc: "Learning portal", icon: GraduationCap, needsSchool: true },
  { id: "parent", label: "Parent / Guardian", ar: "ولى أمر", desc: "Child follow-up", icon: UserCheck, needsSchool: true },
  { id: "teacher", label: "Teacher", ar: "معلم", desc: "Classroom management", icon: Users, needsSchool: true },
  { id: "school", label: "School Leadership", ar: "قيادة المدرسة", desc: "School administration", icon: School, needsSchool: true },
  { id: "administration", label: "Administration Leadership", ar: "قيادة الإدارة", desc: "District management", icon: Building2, needsSchool: false },
  { id: "directorate", label: "Directorate Leadership", ar: "قيادة المديرية", desc: "Governorate management", icon: Building2, needsSchool: false },
  { id: "ministry", label: "Ministry Leadership", ar: "قيادة الوزارة", desc: "National oversight", icon: Landmark, needsSchool: false },
  { id: "support", label: "Technical Support", ar: "الدعم الفنى", desc: "Platform support", icon: Headphones, needsSchool: false },
];

const DEMO_ACCOUNTS = [
  { role: "ministry", email: "demo-ministry@edu.gov.eg", password: "Demo@2026!", label: "Ministry Leadership", ar: "قيادة الوزارة", scope_en: "National Level", scope_ar: "المستوى الوطنى", icon: Landmark },
  { role: "directorate", email: "demo-directorate@edu.gov.eg", password: "Demo@2026!", label: "Directorate Leadership", ar: "قيادة المديرية", scope_en: "Cairo Governorate", scope_ar: "محافظة القاهرة", icon: Building2 },
  { role: "administration", email: "demo-admin@edu.gov.eg", password: "Demo@2026!", label: "Administration Leadership", ar: "قيادة الإدارة", scope_en: "East Cairo Admin", scope_ar: "إدارة شرق القاهرة", icon: Building2 },
  { role: "school", email: "demo-school@edu.gov.eg", password: "Demo@2026!", label: "School Leadership", ar: "قيادة المدرسة", scope_en: "Al-Orman School", scope_ar: "مدرسة الأورمان", icon: School },
  { role: "teacher", email: "demo-teacher@edu.gov.eg", password: "Demo@2026!", label: "Teacher", ar: "معلم", scope_en: "Al-Orman School", scope_ar: "مدرسة الأورمان", icon: Users },
  { role: "student", email: "demo-student@edu.gov.eg", password: "Demo@2026!", label: "Student", ar: "طالب", scope_en: "Al-Orman School", scope_ar: "مدرسة الأورمان", icon: GraduationCap },
  { role: "parent", email: "demo-parent@edu.gov.eg", password: "Demo@2026!", label: "Parent / Guardian", ar: "ولى أمر", scope_en: "Linked to student", scope_ar: "مرتبط بالطالب", icon: UserCheck },
  { role: "support", email: "demo-support@edu.gov.eg", password: "Demo@2026!", label: "Technical Support", ar: "الدعم الفنى", scope_en: "Platform-wide", scope_ar: "المنصة بالكامل", icon: Headphones },
];

function validateNationalId(id: string): boolean {
  return /^\d{14}$/.test(id);
}
function validateLegalName(name: string): boolean {
  return name.trim().split(/\s+/).filter(w => w.length > 0).length >= 3;
}

export default function Login() {
  const { isDemoVisible } = useDemoMode();
  const [searchParams] = useSearchParams();
  const { signIn, user, role: userRole } = useAuth();
  const { t, isAr } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [demoExpanded, setDemoExpanded] = useState(false);
  const [seedingFromLogin, setSeedingFromLogin] = useState(false);
  const [testAccounts, setTestAccounts] = useState<any[]>([]);
  const [loadingTestAccounts, setLoadingTestAccounts] = useState(false);
  // Registration request state
  const [step, setStep] = useState(1); // 1=role, 2=school/scope, 3=identity, 4=confirm
  const [selectedRole, setSelectedRole] = useState<AppRole>("teacher");
  const [governorateId, setGovernorateId] = useState("");
  const [administrationId, setAdministrationId] = useState("");
  const [stageId, setStageId] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [schoolId, setSchoolId] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [fullName, setFullName] = useState("");
  const [fullNameAr, setFullNameAr] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [parentNationalId, setParentNationalId] = useState("");
  const [gradeNumber, setGradeNumber] = useState<number | "">("");
  const [submitted, setSubmitted] = useState(false);
  const [showMissingSchool, setShowMissingSchool] = useState(false);
  const [missingSchoolName, setMissingSchoolName] = useState("");
  const [missingSchoolNotes, setMissingSchoolNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const roleConfig = roles.find(r => r.id === selectedRole)!;
  const needsSchool = roleConfig.needsSchool;
  const needsAdmin = ["student","parent","teacher","school","administration"].includes(selectedRole);
  const needsGov = ["student","parent","teacher","school","administration","directorate"].includes(selectedRole);

  const { data: governorates } = useGovernorates();
  const { data: stages } = useStages();
  const { data: administrations } = useAdministrations(governorateId || undefined);
  const { data: schools } = useSchools(administrationId || undefined, stageId || undefined, undefined, gender || undefined);

  const filteredSchools = schools?.filter(s =>
    !schoolSearch || s.name.toLowerCase().includes(schoolSearch.toLowerCase()) || s.name_ar.includes(schoolSearch)
  );

  useEffect(() => {
    const fetchTestAccounts = async () => {
      setLoadingTestAccounts(true);
      try {
        const { data, error } = await supabase
          .from("registration_requests")
          .select("email, full_name, requested_role, user_id, national_id, parent_national_id, request_status")
          .eq("request_status", "approved")
          .order("created_at", { ascending: true })
          .limit(25);
        
        if (error) throw error;

        const accounts = (data || []).map((a: any) => ({ ...a, _password: "123123" }));
        accounts.push({
          email: "support@edu-egypt-connect.eg",
          full_name: "الدعم الفني",
          requested_role: "support",
          request_status: "approved",
          _password: "Support@123456"
        });

        setTestAccounts(accounts);
      } catch (err) {
        console.error("Error fetching test accounts:", err);
      }
      setLoadingTestAccounts(false);
    };
    fetchTestAccounts();
  }, []);

  if (user && userRole) {
    navigate(`/dashboard?role=${userRole}`, { replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      if (error.includes("Email not confirmed")) {
        toast.error(isAr 
          ? "البريد الإلكتروني لم يتم تأكيده. يمكنك إلغاء هذا المتطلب من إعدادات Supabase Dashboard (Authentication -> Settings -> Disable Confirm Email)." 
          : "Email not confirmed. You can disable this requirement in Supabase Dashboard (Authentication -> Settings -> Disable Confirm Email).");
      } else {
        toast.error(error);
      }
    } else {
      toast.success(isAr ? "تم تسجيل الدخول بنجاح" : "Signed in successfully");
      setTimeout(() => navigate("/dashboard", { replace: true }), 500);
    }
    setSubmitting(false);
  };

  const handleDemoLogin = async (demoEmail: string, demoRole: string) => {
    setSubmitting(true);
    const { error } = await signIn(demoEmail, "Demo@2026!");
    if (error) {
      toast.error(isAr
        ? `فشل تسجيل الدخول: ${error}. يرجى الضغط على «إنشاء الحسابات» أولاً.`
        : `Login failed: ${error}. Please click "Seed Accounts" first.`);
    } else {
      toast.success(isAr ? "تم تسجيل الدخول بنجاح" : "Signed in successfully");
      setTimeout(() => navigate("/dashboard", { replace: true }), 500);
    }
    setSubmitting(false);
  };

  const handleMissingSchoolSubmit = async () => {
    if (!missingSchoolName.trim()) {
      toast.error(isAr ? "يرجى إدخال اسم المدرسة" : "Please enter the school name");
      return;
    }
    try {
      const { error } = await (supabase.from("support_tickets") as any).insert({
        ticket_number: `SCH-${Date.now()}`,
        subject: `Missing School Request: ${missingSchoolName}`,
        subject_ar: `طلب إضافة مدرسة: ${missingSchoolName}`,
        description: `Governorate: ${governorateId}, Administration: ${administrationId}, School Name: ${missingSchoolName}. Notes: ${missingSchoolNotes}`,
        category: "school_review",
        priority: "medium",
        submitted_by: null,
      } as any);
      if (error) throw error;
      toast.success(isAr ? "تم إرسال طلب مراجعة المدرسة بنجاح" : "School review request submitted successfully");
      setShowMissingSchool(false);
    } catch (err: any) {
      toast.error(err.message || "Error");
    }
  };

  const validateStep3 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!nationalId.trim()) errs.nationalId = isAr ? "الرقم القومى مطلوب" : "National ID is required";
    else if (!validateNationalId(nationalId)) errs.nationalId = isAr ? "الرقم القومى يجب أن يتكون من 14 رقماً" : "National ID must be exactly 14 digits";
    if (!fullName.trim()) errs.fullName = isAr ? "الاسم القانونى الكامل مطلوب" : "Full legal name is required";
    else if (!validateLegalName(fullName)) errs.fullName = isAr ? "يجب إدخال الاسم الثلاثى أو الرباعى" : "Enter triple or quadruple legal name";
    if (fullNameAr.trim() && !validateLegalName(fullNameAr)) errs.fullNameAr = isAr ? "يجب إدخال الاسم الثلاثى أو الرباعى بالعربية" : "Enter triple or quadruple legal name in Arabic";
    if (!regEmail.trim()) errs.email = isAr ? "البريد الإلكترونى مطلوب" : "Email is required";
    if (!regPassword || regPassword.length < 6) errs.password = isAr ? "كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegistrationSubmit = async () => {
    if (!validateStep3()) {
      toast.error(isAr ? "يرجى تصحيح الأخطاء" : "Please correct errors");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create auth account (will NOT have active role)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword,
        options: { data: { full_name: fullName.trim() } },
      });
      if (signUpError) throw signUpError;

      // 2. Submit registration request (Link with user_id)
      const { error: reqError } = await supabase.from("registration_requests").insert({
        user_id: signUpData.user?.id,
        full_name: fullName.trim(),
        full_name_ar: fullNameAr.trim() || fullName.trim(),
        email: regEmail.trim(),
        phone: phone || null,
        national_id: nationalId.trim(),
        requested_role: selectedRole,
        governorate_id: governorateId || null,
        administration_id: administrationId || null,
        stage_id: stageId || null,
        gender: gender || null,
        school_id: schoolId || null,
        parent_national_id: (selectedRole === "student" || selectedRole === "parent") ? parentNationalId.trim() : null,
        grade_number: selectedRole === "student" && gradeNumber !== "" ? gradeNumber : null,
        notes: notes || null,
        request_status: "submitted",
      } as any);
      if (reqError) throw reqError;

      // Sign out immediately — account is inactive until approval
      await supabase.auth.signOut();

      setSubmitted(true);
      toast.success(isAr ? "تم تقديم طلب التسجيل الرسمى" : "Official registration request submitted");
    } catch (err: any) {
      toast.error(err.message || "Error");
    }
    setSubmitting(false);
  };

  const fieldCls = "w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20";
  const errorFieldCls = "w-full px-4 py-2.5 border border-red-400 rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-red-200";
  const labelCls = "block text-sm font-medium text-foreground mb-1.5";
  const errorCls = "text-xs text-red-600 mt-1 flex items-center gap-1";

  if (submitted) {
    return (
      <div>
        <section className="bg-primary text-primary-foreground">
          <div className="container-gov py-16">
            <h1 className="text-3xl font-bold mb-4">{isAr ? "تم تقديم طلب التسجيل الرسمى" : "Official Registration Request Submitted"}</h1>
          </div>
        </section>
        <section className="bg-background">
          <div className="container-gov section-padding">
            <div className="max-w-lg mx-auto text-center p-8 bg-surface-elevated rounded-lg border border-border">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-3">{isAr ? "طلبك قيد المراجعة" : "Your Request is Under Review"}</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {isAr
                  ? "تم تقديم طلب التسجيل الرسمى بنجاح. سيتم مراجعته من قبل الجهة المختصة حسب التسلسل الإدارى. لن يتم تفعيل حسابك إلا بعد الموافقة والتفعيل من الجهة الأعلى."
                  : "Your official registration request has been submitted successfully. It will be reviewed by the appropriate authority. Your account will remain inactive until approved and activated by the authorized higher role."}
              </p>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800 mb-4">
                <AlertTriangle className="w-4 h-4 inline-block me-1" />
                {isAr
                  ? "الحالة: مُقدَّم — في انتظار المراجعة. لا يمكنك الوصول إلى لوحة التحكم حتى يتم تفعيل الحساب."
                  : "Status: Submitted — Awaiting Review. You cannot access the dashboard until your account is activated."}
              </div>
              <Link to="/login" className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-navy-light transition-colors">
                {isAr ? "العودة لتسجيل الدخول" : "Return to Sign In"}
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <section className="bg-primary text-primary-foreground">
        <div className="container-gov py-16 lg:py-20">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px w-8 bg-gold"></div>
            <span className="text-gold text-xs font-semibold tracking-wide uppercase">
              {isAr ? "بوابة الدخول" : "Access Portal"}
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">
            {isAr ? "بوابة الدخول — Access Portal" : "Access Portal — بوابة الدخول"}
          </h1>
          <p className="text-primary-foreground/70 max-w-2xl">
            {mode === "login"
              ? (isAr ? "سجل دخولك للوصول إلى لوحة التحكم." : "Sign in to access your dashboard.")
              : (isAr ? "تقديم طلب تسجيل رسمى — لن يتم تفعيل الحساب إلا بعد الموافقة." : "Submit an official registration request — account will not be activated until approved.")}
          </p>
        </div>
      </section>

      <section className="bg-background">
        <div className="container-gov section-padding">
          <div className="max-w-2xl mx-auto">
            {/* Mode tabs */}
            <div className="flex border border-border rounded-lg overflow-hidden mb-8">
              <button onClick={() => { setMode("login"); setStep(1); }} className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === "login" ? "bg-primary text-primary-foreground" : "bg-surface-elevated text-muted-foreground hover:bg-muted"}`}>
                {isAr ? "تسجيل الدخول" : "Sign In"}
              </button>
              <button onClick={() => setMode("register")} className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === "register" ? "bg-primary text-primary-foreground" : "bg-surface-elevated text-muted-foreground hover:bg-muted"}`}>
                {isAr ? "طلب تسجيل رسمى" : "Official Registration Request"}
              </button>
            </div>

            {/* LOGIN FORM */}
            {mode === "login" && (
              <div className="max-w-md mx-auto">
                <form onSubmit={handleLogin} className="p-8 bg-surface-elevated rounded-lg border border-border space-y-4">
                  <h3 className="font-bold text-foreground text-center mb-4">{isAr ? "تسجيل الدخول" : "Sign In"}</h3>
                  <div>
                    <label className={labelCls}>{isAr ? "البريد الإلكترونى" : "Email"}</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={fieldCls} required />
                  </div>
                  <div>
                    <label className={labelCls}>{isAr ? "كلمة المرور" : "Password"}</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={fieldCls} required minLength={6} placeholder="••••••••" />
                  </div>
                  <button type="submit" disabled={submitting} className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-navy-light transition-colors disabled:opacity-50">
                    {submitting ? (isAr ? "جارى..." : "Loading...") : (isAr ? "تسجيل الدخول" : "Sign In")}
                  </button>
                  <p className="text-xs text-muted-foreground text-center">
                    {isAr ? "لمشاكل الحساب، تواصل مع مدير المؤسسة أو اتصل بالدعم على 19119." : "For account issues, contact your institution's administrator or call support at 19119."}
                  </p>
                </form>

                {/* Original Approved Accounts Only */}
                <div className="mt-10 border-2 rounded-lg bg-surface-elevated overflow-hidden border-indigo-200 shadow-sm">
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-indigo-200">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                        {isAr ? "الحسابات الأصلية المعتمدة" : "Original Approved Accounts"}
                      </p>
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-white/50 rounded-full border border-indigo-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-medium text-indigo-700">{isAr ? "محدثة الآن" : "Live Update"}</span>
                      </div>
                    </div>
                      
                    {loadingTestAccounts ? (
                      <div className="flex flex-col items-center justify-center p-8 space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        <p className="text-xs text-indigo-400 animate-pulse">{isAr ? "جارى جلب الحسابات..." : "Fetching accounts..."}</p>
                      </div>
                    ) : testAccounts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {testAccounts.map((acc, i) => {
                          const roleInfo = roles.find(r => r.id === acc.requested_role);
                          const Icon = roleInfo?.icon || UserCheck;
                          const isStudent = acc.requested_role === "student";
                          const isParent = acc.requested_role === "parent";
                          const isApproved = acc.request_status === "approved";

                          return (
                            <div key={i} className={`group relative p-5 bg-white border border-indigo-100 rounded-2xl shadow-sm hover:shadow-xl hover:border-indigo-400 transition-all duration-500 transform hover:-translate-y-1.5 ${isStudent ? 'ring-2 ring-amber-300 bg-gradient-to-br from-amber-50 to-white' : 'bg-gradient-to-br from-white to-indigo-50/30'}`}>
                              <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${isStudent ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-indigo-600 text-white shadow-indigo-200'}`}>
                                    <Icon className="w-6 h-6" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center flex-wrap gap-2 mb-1">
                                      <p className="text-sm font-black text-indigo-950 leading-tight">{acc.full_name}</p>
                                      {isStudent && <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase shadow-sm">STUDENT</span>}
                                      {isParent && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold uppercase">{isAr ? "ولى أمر" : "PARENT"}</span>}
                                    </div>
                                    <p className="text-xs text-indigo-500 font-medium break-all">{acc.email}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEmail(acc.email);
                                      setPassword(acc._password || "123"); 
                                      toast.success(isAr ? `تم اختيار حساب: ${acc.full_name}` : `Selected: ${acc.full_name}`);
                                      window.scrollTo({ top: 0, behavior: "smooth" });
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-md bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100`}
                                  >
                                    <LogIn className="w-4 h-4" />
                                    {isAr ? "دخول سريع" : "Quick Login"}
                                  </button>
                                </div>
                              </div>
                              {isStudent && <div className="absolute top-3 end-3 w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-10 text-center bg-white/40 rounded-2xl border-2 border-dashed border-indigo-100">
                        <Users className="w-10 h-10 text-indigo-200 mx-auto mb-3" />
                        <p className="text-xs text-indigo-400 italic">
                          {isAr ? "لا توجد حسابات أصلية معتمدة حالياً للظهور هنا." : "No original approved accounts found yet."}
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-indigo-100/50 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <p className="text-[9px] text-indigo-400 italic">
                        {isAr ? "الحسابات المميزة باللون الأصفر هي حسابات طلاب." : "Cards highlighted in amber are student accounts."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* REGISTRATION REQUEST FLOW */}
            {mode === "register" && (
              <div className="space-y-6">
                {/* Progress */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {[1,2,3,4].map(s => (
                    <div key={s} className={`flex items-center gap-1 ${s <= step ? "text-primary" : "text-muted-foreground"}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${s <= step ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{s}</div>
                      {s < 4 && <div className={`w-8 h-0.5 ${s < step ? "bg-primary" : "bg-border"}`} />}
                    </div>
                  ))}
                </div>

                {/* Step 1: Role selection */}
                {step === 1 && (
                  <div className="p-6 bg-surface-elevated rounded-lg border border-border">
                    <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      {isAr ? "الخطوة 1: اختيار الدور المطلوب" : "Step 1: Select Requested Role"}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {roles.map(r => (
                        <button key={r.id} onClick={() => { setSelectedRole(r.id); setGovernorateId(""); setAdministrationId(""); setSchoolId(""); }}
                          className={`p-4 rounded-lg border-2 text-center transition-all ${selectedRole === r.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                          <r.icon className={`w-6 h-6 mx-auto mb-2 ${selectedRole === r.id ? "text-primary" : "text-muted-foreground"}`} />
                          <p className="text-xs font-medium">{isAr ? r.ar : r.label}</p>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setStep(2)} className="mt-6 w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-navy-light transition-colors">
                      {isAr ? "التالى" : "Next"}
                    </button>
                  </div>
                )}

                {/* Step 2: Role-specific scope */}
                {step === 2 && (() => {
                  // What each role needs
                  const isMinistryOrSupport = ["ministry", "support"].includes(selectedRole);
                  const isDirectorate = selectedRole === "directorate";
                  const isAdministration = selectedRole === "administration";
                  const isSchoolRole = selectedRole === "school";
                  const isTeacher = selectedRole === "teacher";
                  const isStudent = selectedRole === "student";
                  const isParent = selectedRole === "parent";

                  const needsGovField = !isMinistryOrSupport && !isParent;
                  const needsAdminField = ["administration", "school", "teacher", "student"].includes(selectedRole);
                  const needsSchoolField = ["school", "teacher", "student"].includes(selectedRole);

                  // Grade labels
                  const stageName = stages?.find(s => s.id === stageId)?.name_ar ?? "";
                  const gradeOptions = stageName.includes("ابتدائ") ? [1,2,3,4,5,6]
                    : stageName.includes("اعداد") || stageName.includes("إعداد") ? [7,8,9]
                    : stageName.includes("ثانو") ? [10,11,12]
                    : stageName.includes("رياض") ? [0] : [];
                  const gradeLabels: Record<number, string> = {
                    0: isAr ? "رياض الأطفال" : "KG",
                    1: isAr ? "الصف الأول الابتدائى" : "Grade 1",
                    2: isAr ? "الصف الثانى الابتدائى" : "Grade 2",
                    3: isAr ? "الصف الثالث الابتدائى" : "Grade 3",
                    4: isAr ? "الصف الرابع الابتدائى" : "Grade 4",
                    5: isAr ? "الصف الخامس الابتدائى" : "Grade 5",
                    6: isAr ? "الصف السادس الابتدائى" : "Grade 6",
                    7: isAr ? "الصف الأول الإعدادى" : "Grade 7",
                    8: isAr ? "الصف الثانى الإعدادى" : "Grade 8",
                    9: isAr ? "الصف الثالث الإعدادى" : "Grade 9",
                    10: isAr ? "الصف الأول الثانوى" : "Grade 10",
                    11: isAr ? "الصف الثانى الثانوى" : "Grade 11",
                    12: isAr ? "الصف الثالث الثانوى" : "Grade 12",
                  };

                  const stepDescriptions: Record<string, { en: string; ar: string }> = {
                    ministry:       { en: "No scope needed — you manage the entire platform.", ar: "لا يلزم تحديد نطاق — أنت مسؤول عن المنصة بالكامل." },
                    support:        { en: "No scope needed — you have platform-wide access.", ar: "لا يلزم تحديد نطاق — لديك وصول كامل للمنصة." },
                    directorate:    { en: "Select your governorate — you manage all administrations within it.", ar: "اختر محافظتك — أنت مسؤول عن جميع الإدارات بها." },
                    administration: { en: "Select your governorate and administration — you manage all schools within it.", ar: "اختر محافظتك وإدارتك — أنت مسؤول عن جميع المدارس بها." },
                    school:         { en: "Select your school — you manage all teachers and students in it.", ar: "اختر مدرستك — أنت مسؤول عن جميع المعلمين والطلاب بها." },
                    teacher:        { en: "Select your school — you manage students in your assigned classes.", ar: "اختر مدرستك — أنت مسؤول عن الطلاب في فصولك." },
                    student:        { en: "Select your school, stage and grade to load your subjects automatically.", ar: "اختر مدرستك ومرحلتك وصفك لتُحمَّل موادك الدراسية تلقائياً." },
                    parent:         { en: "Enter your children's national IDs to link your account to them.", ar: "أدخل أرقام الهوية القومية لأبنائك لربط حسابك بهم." },
                  };

                  const desc = stepDescriptions[selectedRole];

                  return (
                    <div className="p-6 bg-surface-elevated rounded-lg border border-border space-y-5">
                      <div>
                        <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
                          <School className="w-5 h-5 text-primary" />
                          {isAr ? "الخطوة 2: بيانات النطاق" : "Step 2: Scope Information"}
                        </h3>
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                          {isAr ? desc.ar : desc.en}
                        </p>
                      </div>

                      {/* Ministry / Support: no extra fields */}
                      {isMinistryOrSupport && (
                        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                          <p className="text-sm text-green-800">
                            {isAr ? "يمكنك المتابعة مباشرة إلى الخطوة التالية." : "You can proceed directly to the next step."}
                          </p>
                        </div>
                      )}

                      {/* Parent: children national IDs */}
                      {isParent && (
                        <div className="space-y-4">
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                            {isAr
                              ? "أدخل الرقم القومى لكل ابن تريد ربطه بحسابك. يمكنك ربط أبناء متعددين."
                              : "Enter the national ID for each child you want to link. You can link multiple children."}
                          </div>
                          <div>
                            <label className={labelCls}>{isAr ? "الرقم القومى للابن الأول *" : "Child 1 National ID *"}</label>
                            <input type="text" value={parentNationalId}
                              onChange={e => setParentNationalId(e.target.value.replace(/\D/g, ""))}
                              className={fieldCls} maxLength={14} dir="ltr"
                              placeholder={isAr ? "14 رقماً" : "14 digits"} />
                          </div>
                          <div>
                            <label className={labelCls}>{isAr ? "الرقم القومى للابن الثانى (اختيارى)" : "Child 2 National ID (optional)"}</label>
                            <input type="text" value={notes.startsWith("child2:") ? notes.replace("child2:", "") : ""}
                              onChange={e => setNotes(e.target.value ? `child2:${e.target.value.replace(/\D/g, "")}` : "")}
                              className={fieldCls} maxLength={14} dir="ltr"
                              placeholder={isAr ? "14 رقماً" : "14 digits"} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {isAr
                              ? "⚠ سيتم التحقق من صحة الأرقام القومية وإرسال طلب الربط للمدرسة للموافقة عليه."
                              : "⚠ National IDs will be verified and a link request sent to the school for approval."}
                          </p>
                        </div>
                      )}

                      {/* Governorate */}
                      {needsGovField && (
                        <div>
                          <label className={labelCls}>{isAr ? "المحافظة *" : "Governorate *"}</label>
                          <select value={governorateId}
                            onChange={e => { setGovernorateId(e.target.value); setAdministrationId(""); setSchoolId(""); }}
                            className={fieldCls}>
                            <option value="">{isAr ? "اختر المحافظة" : "Select governorate"}</option>
                            {governorates?.map(g => <option key={g.id} value={g.id}>{isAr ? g.name_ar : g.name}</option>)}
                          </select>
                        </div>
                      )}

                      {/* Administration */}
                      {needsAdminField && governorateId && (
                        <div>
                          <label className={labelCls}>{isAr ? "الإدارة التعليمية *" : "Administration *"}</label>
                          <select value={administrationId}
                            onChange={e => { setAdministrationId(e.target.value); setSchoolId(""); }}
                            className={fieldCls}>
                            <option value="">{isAr ? "اختر الإدارة" : "Select administration"}</option>
                            {administrations?.map(a => <option key={a.id} value={a.id}>{isAr ? a.name_ar : a.name}</option>)}
                          </select>
                        </div>
                      )}

                      {/* Stage + Gender (student only) */}
                      {isStudent && administrationId && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>{isAr ? "المرحلة الدراسية *" : "Educational Stage *"}</label>
                            <select value={stageId} onChange={e => { setStageId(e.target.value); setSchoolId(""); setGradeNumber(""); }} className={fieldCls}>
                              <option value="">{isAr ? "اختر المرحلة" : "Select stage"}</option>
                              {stages?.map(s => <option key={s.id} value={s.id}>{isAr ? s.name_ar : s.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>{isAr ? "نوع المدرسة *" : "School Gender Type *"}</label>
                            <select value={gender} onChange={e => { setGender(e.target.value as any); setSchoolId(""); }} className={fieldCls}>
                              <option value="">{isAr ? "الكل (مشترك)" : "All (Mixed)"}</option>
                              <option value="male">{isAr ? "بنين" : "Boys"}</option>
                              <option value="female">{isAr ? "بنات" : "Girls"}</option>
                            </select>
                          </div>
                          {stageId && gradeOptions.length > 0 && (
                            <div className="md:col-span-2">
                              <label className={labelCls}>{isAr ? "الصف الدراسى *" : "Grade / Year *"}</label>
                              <select value={gradeNumber}
                                onChange={e => setGradeNumber(e.target.value === "" ? "" : Number(e.target.value))}
                                className={fieldCls}>
                                <option value="">{isAr ? "اختر الصف" : "Select grade"}</option>
                                {gradeOptions.map(g => (
                                  <option key={g} value={g}>{gradeLabels[g]}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Student: Parent National ID for auto-linking */}
                      {isStudent && administrationId && (
                        <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg space-y-3">
                          <label className={labelCls}>
                            {isAr ? "الرقم القومى لولى الأمر *" : "Parent's National ID *"}
                            <span className="text-[10px] text-muted-foreground font-normal ms-2">({isAr ? "لربط الحساب تلقائياً" : "For automatic linking"})</span>
                          </label>
                          <input 
                            type="text" 
                            value={parentNationalId}
                            onChange={e => setParentNationalId(e.target.value.replace(/\D/g, ""))}
                            className={fieldCls} 
                            maxLength={14} 
                            dir="ltr"
                            placeholder={isAr ? "أدخل 14 رقماً" : "Enter 14 digits"} 
                          />
                          <p className="text-[10px] text-muted-foreground italic">
                            {isAr 
                              ? "سيتم استخدام هذا الرقم لربط حسابك بحساب والدك تلقائياً فور تفعيله." 
                              : "This ID will be used to automatically link your account to your parent's profile upon activation."}
                          </p>
                        </div>
                      )}

                      {/* Teacher: gender type for school filter */}
                      {isTeacher && administrationId && (
                        <div>
                          <label className={labelCls}>{isAr ? "نوع المدرسة *" : "School Gender Type *"}</label>
                          <select value={gender} onChange={e => { setGender(e.target.value as any); setSchoolId(""); }} className={fieldCls}>
                            <option value="">{isAr ? "الكل (مشترك)" : "All (Mixed)"}</option>
                            <option value="male">{isAr ? "بنين" : "Boys"}</option>
                            <option value="female">{isAr ? "بنات" : "Girls"}</option>
                          </select>
                        </div>
                      )}

                      {/* School selection */}
                      {needsSchoolField && administrationId && (
                        <div>
                          <label className={labelCls}>{isAr ? "البحث عن المدرسة *" : "Search for School *"}</label>
                          <div className="relative">
                            <Search className="w-4 h-4 absolute start-3 top-3 text-muted-foreground" />
                            <input type="text" value={schoolSearch} onChange={e => setSchoolSearch(e.target.value)}
                              className={`${fieldCls} ps-10`}
                              placeholder={isAr ? "ابحث عن اسم المدرسة..." : "Search school name..."} />
                          </div>
                          <select value={schoolId} onChange={e => setSchoolId(e.target.value)} className={`${fieldCls} mt-2`}>
                            <option value="">{isAr ? "اختر المدرسة" : "Select school"}</option>
                            {filteredSchools?.map(s => <option key={s.id} value={s.id}>{isAr ? s.name_ar : s.name}</option>)}
                          </select>
                          <button onClick={() => setShowMissingSchool(true)}
                            className="mt-3 flex items-center gap-2 text-xs text-amber-700 hover:text-amber-900 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 w-full transition-colors">
                            <HelpCircle className="w-4 h-4" />
                            {isAr ? "المدرسة غير موجودة؟ تواصل مع الدعم" : "School not listed? Contact Support"}
                          </button>
                          {showMissingSchool && (
                            <div className="mt-3 p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
                              <h4 className="text-sm font-semibold text-amber-900">{isAr ? "طلب مراجعة مدرسة غير مُسجّلة" : "Request School Review"}</h4>
                              <input type="text" value={missingSchoolName} onChange={e => setMissingSchoolName(e.target.value)}
                                className={fieldCls} placeholder={isAr ? "اسم المدرسة" : "School name"} />
                              <textarea value={missingSchoolNotes} onChange={e => setMissingSchoolNotes(e.target.value)}
                                className={fieldCls} rows={2} placeholder={isAr ? "ملاحظات إضافية" : "Additional notes"} />
                              <div className="flex gap-2">
                                <button onClick={handleMissingSchoolSubmit}
                                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700">
                                  {isAr ? "إرسال طلب المراجعة" : "Submit Review Request"}
                                </button>
                                <button onClick={() => setShowMissingSchool(false)}
                                  className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-xs">
                                  {isAr ? "إلغاء" : "Cancel"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-3 mt-6">
                        <button onClick={() => setStep(1)}
                          className="flex-1 py-3 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors">
                          {isAr ? "السابق" : "Previous"}
                        </button>
                        <button onClick={() => {
                          if (needsGovField && !governorateId) { toast.error(isAr ? "يجب اختيار المحافظة" : "Governorate required"); return; }
                          if (needsAdminField && !administrationId) { toast.error(isAr ? "يجب اختيار الإدارة" : "Administration required"); return; }
                          if (needsSchoolField && !schoolId) { toast.error(isAr ? "يجب اختيار المدرسة" : "School required"); return; }
                          if (isStudent && !stageId) { toast.error(isAr ? "يجب اختيار المرحلة الدراسية" : "Stage required"); return; }
                          if (isStudent && gradeNumber === "") { toast.error(isAr ? "يجب اختيار الصف الدراسى" : "Grade required"); return; }
                          if (isParent && !parentNationalId) { toast.error(isAr ? "يجب إدخال الرقم القومى للابن" : "Child national ID required"); return; }
                          setStep(3);
                        }} className="flex-1 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-navy-light transition-colors">
                          {isAr ? "التالى" : "Next"}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Step 3: Identity & credentials */}

                {step === 3 && (
                  <div className="p-6 bg-surface-elevated rounded-lg border border-border space-y-4">
                    <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      {isAr ? "الخطوة 3: بيانات الهوية الرسمية" : "Step 3: Official Identity Information"}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      {isAr
                        ? "الاسم الثلاثى أو الرباعى كما هو فى شهادة الميلاد أو بطاقة الرقم القومى. لا يُقبل الأسماء المختصرة أو ألقاب الشهرة."
                        : "Triple or quadruple legal name exactly as shown on the birth certificate or national ID card. Nicknames or shortened names are not accepted."}
                    </p>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>{isAr ? "الرقم القومى *" : "National ID *"} <span className="text-xs text-muted-foreground font-normal">({isAr ? "14 رقماً" : "14 digits"})</span></label>
                        <input type="text" value={nationalId} onChange={e => { setNationalId(e.target.value.replace(/\D/g, "")); setErrors(p => ({...p, nationalId: ""})); }} className={errors.nationalId ? errorFieldCls : fieldCls} maxLength={14} dir="ltr"
                          placeholder={isAr ? "الرقم القومى المكون من 14 رقم" : "14-digit National ID"} />
                        {errors.nationalId && <p className={errorCls}><AlertTriangle className="w-3 h-3" />{errors.nationalId}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>{isAr ? "الهاتف" : "Phone"}</label>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={fieldCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{isAr ? "الاسم القانونى الكامل (إنجليزى) *" : "Full Legal Name (English) *"}</label>
                        <input type="text" value={fullName} onChange={e => { setFullName(e.target.value); setErrors(p => ({...p, fullName: ""})); }} className={errors.fullName ? errorFieldCls : fieldCls}
                          placeholder={isAr ? "الاسم الثلاثى أو الرباعى" : "Triple or quadruple name"} />
                        {errors.fullName && <p className={errorCls}><AlertTriangle className="w-3 h-3" />{errors.fullName}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>{isAr ? "الاسم القانونى الكامل (عربى)" : "Full Legal Name (Arabic)"}</label>
                        <input type="text" value={fullNameAr} onChange={e => { setFullNameAr(e.target.value); setErrors(p => ({...p, fullNameAr: ""})); }} className={errors.fullNameAr ? errorFieldCls : fieldCls} dir="rtl"
                          placeholder={isAr ? "كما فى بطاقة الرقم القومى" : "As on national ID card"} />
                        {errors.fullNameAr && <p className={errorCls}><AlertTriangle className="w-3 h-3" />{errors.fullNameAr}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>{isAr ? "البريد الإلكترونى *" : "Email *"}</label>
                        <input type="email" value={regEmail} onChange={e => { setRegEmail(e.target.value); setErrors(p => ({...p, email: ""})); }} className={errors.email ? errorFieldCls : fieldCls} />
                        {errors.email && <p className={errorCls}><AlertTriangle className="w-3 h-3" />{errors.email}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>{isAr ? "كلمة المرور *" : "Password *"}</label>
                        <input type="password" value={regPassword} onChange={e => { setRegPassword(e.target.value); setErrors(p => ({...p, password: ""})); }} className={errors.password ? errorFieldCls : fieldCls} minLength={6} placeholder="••••••••" />
                        {errors.password && <p className={errorCls}><AlertTriangle className="w-3 h-3" />{errors.password}</p>}
                      </div>
                      {selectedRole === "student" && (
                        <div className="md:col-span-2">
                          <label className={labelCls}>{isAr ? "الرقم القومى لولى الأمر *" : "Parent National ID *"}</label>
                          <input type="text" value={parentNationalId} onChange={e => setParentNationalId(e.target.value.replace(/\D/g, ""))} className={fieldCls} maxLength={14} dir="ltr"
                            placeholder={isAr ? "لربط حساب الطالب بولى الأمر" : "To link student to parent"} />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={labelCls}>{isAr ? "ملاحظات / سبب الطلب" : "Notes / Request Reason"}</label>
                      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={fieldCls} />
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button onClick={() => setStep(2)} className="flex-1 py-3 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors">
                        {isAr ? "السابق" : "Previous"}
                      </button>
                      <button onClick={() => { if (validateStep3()) setStep(4); }} className="flex-1 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-navy-light transition-colors">
                        {isAr ? "مراجعة الطلب" : "Review Request"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Confirmation */}
                {step === 4 && (
                  <div className="p-6 bg-surface-elevated rounded-lg border border-border space-y-4">
                    <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      {isAr ? "الخطوة 4: مراجعة وتأكيد الطلب" : "Step 4: Review & Confirm"}
                    </h3>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">{isAr ? "الدور المطلوب" : "Requested Role"}</span><span className="font-medium">{isAr ? roleConfig.ar : roleConfig.label}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{isAr ? "الرقم القومى" : "National ID"}</span><span className="font-mono">{nationalId}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{isAr ? "الاسم" : "Name"}</span><span>{fullName}</span></div>
                      {fullNameAr && <div className="flex justify-between"><span className="text-muted-foreground">{isAr ? "الاسم بالعربية" : "Arabic Name"}</span><span dir="rtl">{fullNameAr}</span></div>}
                      <div className="flex justify-between"><span className="text-muted-foreground">{isAr ? "البريد" : "Email"}</span><span>{regEmail}</span></div>
                      {phone && <div className="flex justify-between"><span className="text-muted-foreground">{isAr ? "الهاتف" : "Phone"}</span><span>{phone}</span></div>}
                      {selectedRole === "student" && parentNationalId && <div className="flex justify-between"><span className="text-muted-foreground">{isAr ? "رقم ولى الأمر" : "Parent ID"}</span><span className="font-mono">{parentNationalId}</span></div>}
                    </div>

                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 inline-block me-1" />
                      {isAr
                        ? "بعد التقديم، سيبقى حسابك غير مفعّل حتى تتم الموافقة عليه وتفعيله من قبل الجهة المختصة. لا يمكنك الوصول إلى لوحة التحكم قبل التفعيل."
                        : "After submission, your account will remain inactive until approved and activated by the authorized authority. You cannot access the dashboard before activation."}
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => setStep(3)} className="flex-1 py-3 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors">
                        {isAr ? "تعديل" : "Edit"}
                      </button>
                      <button onClick={handleRegistrationSubmit} disabled={submitting} className="flex-1 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-navy-light transition-colors disabled:opacity-50">
                        {submitting ? (isAr ? "جارى التقديم..." : "Submitting...") : (isAr ? "تقديم الطلب الرسمى" : "Submit Official Request")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
