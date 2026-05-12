import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { useParentChildLinkRequests, useSubmitParentChildLink } from "@/hooks/useGovernanceData";
import { useParentChildren } from "@/hooks/useStudentData";
import { Users, AlertTriangle, Plus, UserPlus, Search, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

export function MultiChildSupport() {
  const { lang } = useTranslation();
  const { user, profile } = useAuth();
  const { data: linkRequests, isLoading: loadingRequests } = useParentChildLinkRequests();
  const { data: dbChildren, isLoading: loadingDb } = useParentChildren();
  
  const submitLink = useSubmitParentChildLink();
  const isAr = lang === "ar";

  const [showAddForm, setShowAddForm] = useState(false);
  const [childName, setChildName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [relation, setRelation] = useState("father");

  // Filter requests for this user
  const myRequests = (linkRequests || []).filter(req => req.parent_user_id === user?.id);
  
  // Pending requests
  const pendingRequests = myRequests.filter(req => ["submitted", "under_review", "pending"].includes(req.request_status));

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName || !relation) {
      toast.error(isAr ? "يرجى إكمال الحقول المطلوبة" : "Please complete required fields");
      return;
    }

    try {
      await submitLink.mutateAsync({
        parent_user_id: user?.id,
        parent_name: profile?.full_name || user?.email,
        parent_national_id: profile?.national_id,
        child_name: childName,
        child_student_code: studentCode,
        relation_type: relation,
        request_status: "submitted"
      } as any);
      
      toast.success(isAr ? "تم إرسال طلب الربط بنجاح" : "Link request submitted successfully");
      setShowAddForm(false);
      setChildName("");
      setStudentCode("");
      setNationalId("");
    } catch (err: any) {
      toast.error(err.message || "Error");
    }
  };

  const isLoading = loadingRequests || loadingDb;

  if (isLoading) {
    return (
      <div className="bg-surface-elevated rounded-lg border border-border p-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-sm text-muted-foreground">{isAr ? "جارى تحميل بيانات الأبناء..." : "Loading children data..."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">{isAr ? "إدارة الأبناء" : "Children Management"}</h3>
          <p className="text-sm text-muted-foreground">{isAr ? "متابعة الأبناء المرتبطين بحسابك" : "Manage children linked to your account"}</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {showAddForm ? (isAr ? "إلغاء" : "Cancel") : (
            <>
              <Plus className="w-4 h-4" />
              {isAr ? "ربط ابن جديد" : "Link New Child"}
            </>
          )}
        </button>
      </div>

      {/* Add Child Form */}
      {showAddForm && (
        <div className="bg-surface-elevated rounded-lg border border-primary/20 p-6 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-primary" />
            <h4 className="font-bold text-foreground">{isAr ? "طلب ربط ابن جديد" : "New Child Link Request"}</h4>
          </div>
          <form onSubmit={handleAddChild} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{isAr ? "اسم الابن بالكامل" : "Full Child Name"}</label>
              <input 
                type="text" 
                value={childName} 
                onChange={e => setChildName(e.target.value)}
                placeholder={isAr ? "أدخل الاسم كما هو في شهادة الميلاد" : "Enter name as in birth certificate"}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{isAr ? "كود الطالب (إن وجد)" : "Student Code (if available)"}</label>
              <input 
                type="text" 
                value={studentCode} 
                onChange={e => setStudentCode(e.target.value)}
                placeholder="123456789"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{isAr ? "صلة القرابة" : "Relation Type"}</label>
              <select 
                value={relation} 
                onChange={e => setRelation(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:ring-1 focus:ring-primary"
              >
                <option value="father">{isAr ? "أب" : "Father"}</option>
                <option value="mother">{isAr ? "أم" : "Mother"}</option>
                <option value="guardian">{isAr ? "وصي شرعي" : "Legal Guardian"}</option>
              </select>
            </div>
            <div className="flex items-end">
              <button 
                type="submit" 
                disabled={submitLink.isPending}
                className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {submitLink.isPending ? (isAr ? "جارى الإرسال..." : "Sending...") : (isAr ? "إرسال طلب الربط" : "Submit Request")}
              </button>
            </div>
          </form>
          <p className="text-[10px] text-muted-foreground mt-4 italic">
            {isAr 
              ? "* سيتم مراجعة الطلب من قبل إدارة المدرسة للتأكد من صلة القرابة." 
              : "* The request will be reviewed by the school administration to verify the relation."}
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Linked Children Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <h4 className="font-bold text-foreground text-sm">{isAr ? "الأبناء المرتبطون حالياً" : "Currently Linked Children"}</h4>
          </div>

          {(dbChildren || []).length === 0 && myRequests.filter(r => r.request_status === "approved").length === 0 ? (
            <div className="bg-surface-elevated rounded-lg border border-dashed border-border p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {isAr 
                  ? "لا يوجد أبناء مرتبطون تلقائياً بالرقم القومى. يمكنك استخدام زر 'ربط ابن جديد' لإضافتهم يدوياً." 
                  : "No children linked automatically via National ID. Use 'Link New Child' to add them manually."}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Children from Students table (Auto-linked) */}
              {(dbChildren || []).map((child) => (
                <div key={child.id} className="bg-surface-elevated rounded-lg border border-border p-4 hover:border-primary/30 transition-colors group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {isAr ? "رابط تلقائى" : "Auto-Linked"}
                    </span>
                  </div>
                  <h5 className="font-bold text-foreground">{child.full_name_ar || child.full_name}</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    {child.schools?.name_ar || child.schools?.name || (isAr ? "مدرسة غير محددة" : "School not specified")}
                  </p>
                  <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                    <div className="text-[10px] text-muted-foreground">
                      {isAr ? "كود الطالب:" : "Code:"} <span className="font-mono text-foreground">{child.student_code || "N/A"}</span>
                    </div>
                    <button className="text-[10px] font-bold text-primary hover:underline">{isAr ? "عرض التقارير" : "View Reports"}</button>
                  </div>
                </div>
              ))}

              {/* Children from Approved Requests */}
              {myRequests.filter(r => r.request_status === "approved").map((req) => (
                <div key={req.id} className="bg-surface-elevated rounded-lg border border-border p-4 hover:border-primary/30 transition-colors group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {isAr ? "تم الربط" : "Linked"}
                    </span>
                  </div>
                  <h5 className="font-bold text-foreground">{req.child_name}</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isAr ? "تم التأكد من صلة القرابة" : "Relationship Verified"}
                  </p>
                  <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                    <div className="text-[10px] text-muted-foreground">
                      {isAr ? "الحالة:" : "Status:"} <span className="text-green-600 font-bold">{isAr ? "نشط" : "Active"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Tracker Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h4 className="font-bold text-foreground text-sm">{isAr ? "حالة الطلبات الحالية" : "Request Status Tracker"}</h4>
          </div>

          <div className="bg-surface-elevated rounded-lg border border-border divide-y divide-border">
            {pendingRequests.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-[10px] text-muted-foreground">{isAr ? "لا يوجد طلبات معلقة حالياً" : "No pending requests"}</p>
              </div>
            ) : (
              pendingRequests.map((req) => (
                <div key={req.id} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-foreground">{req.child_name}</span>
                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase font-bold">
                      {isAr ? "قيد المراجعة" : "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 w-1/2"></div>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2">
                    {isAr ? "تم التقديم بتاريخ:" : "Submitted on:"} {new Date(req.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
            <h5 className="text-xs font-bold text-primary mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {isAr ? "ملاحظة هامة" : "Important Note"}
            </h5>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {isAr 
                ? "يتم الربط التلقائى بناءً على الرقم القومى لولى الأمر المسجل في قاعدة بيانات الطلاب بوزارة التربية والتعليم. إذا لم يظهر ابنك، يرجى تقديم طلب يدوي مع إرفاق المستندات اللازمة."
                : "Automatic linking is based on the parent's National ID registered in the MOE database. If your child doesn't appear, please submit a manual request with required documents."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
