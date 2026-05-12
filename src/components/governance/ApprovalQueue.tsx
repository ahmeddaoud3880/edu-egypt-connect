import { useState, useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import {
  useRegistrationRequests,
  useRoleChangeRequests,
  useTransferRequests,
  useParentChildLinkRequests,
  usePerformApprovalAction,
  canApproveRole,
  type RegistrationRequest,
} from "@/hooks/useGovernanceData";
import { toast } from "sonner";
import {
  ClipboardList, CheckCircle2, XCircle, RotateCcw, ArrowUpRight,
  UserCog, Clock, AlertTriangle, Eye, ShieldCheck, ShieldAlert,
  Users, ChevronDown, ChevronUp, Link as LinkIcon, GraduationCap
} from "lucide-react";
import { ApprovalHistoryPanel } from "./ApprovalHistoryPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  waiting_higher_approval: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  returned: "bg-amber-100 text-amber-800",
  escalated: "bg-purple-100 text-purple-800",
  activated: "bg-emerald-100 text-emerald-800",
  suspended: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  draft: { en: "Draft", ar: "مسودة" },
  submitted: { en: "Submitted", ar: "مُقدَّم" },
  under_review: { en: "Under Review", ar: "قيد المراجعة" },
  waiting_higher_approval: { en: "Waiting Higher Approval", ar: "في انتظار موافقة أعلى" },
  approved: { en: "Approved", ar: "مُوافَق" },
  rejected: { en: "Rejected", ar: "مرفوض" },
  returned: { en: "Returned for Completion", ar: "مُعاد للاستكمال" },
  escalated: { en: "Escalated", ar: "مُصعَّد" },
  activated: { en: "Activated", ar: "مُفعَّل" },
  suspended: { en: "Suspended", ar: "مُعلَّق" },
};

const ROLE_LABELS: Record<string, { en: string; ar: string }> = {
  ministry: { en: "Ministry Leadership", ar: "قيادة الوزارة" },
  directorate: { en: "Directorate Leadership", ar: "قيادة المديرية" },
  administration: { en: "Administration Leadership", ar: "قيادة الإدارة" },
  school: { en: "School Leadership", ar: "قيادة المدرسة" },
  teacher: { en: "Teacher", ar: "معلم" },
  student: { en: "Student", ar: "طالب" },
  parent: { en: "Parent", ar: "ولى أمر" },
  support: { en: "Technical Support", ar: "دعم فنى" },
};

const IDENTITY_STATUS = {
  verified: { en: "Identity Verified", ar: "تم التحقق من الهوية", cls: "text-green-700 bg-green-50" },
  mismatch: { en: "Identity Mismatch", ar: "عدم تطابق الهوية", cls: "text-red-700 bg-red-50" },
  missing: { en: "National ID Missing", ar: "الرقم القومى مفقود", cls: "text-amber-700 bg-amber-50" },
  correction: { en: "Returned for Identity Correction", ar: "مُعاد لتصحيح الهوية", cls: "text-orange-700 bg-orange-50" },
};

function getIdentityStatus(req: RegistrationRequest) {
  if (!req.national_id) return "missing";
  if (req.request_status === "returned") return "correction";
  if (req.national_id.length === 14) return "verified";
  return "mismatch";
}

type QueueTab = "registrations" | "role_changes" | "transfers" | "parent_links";

export function ApprovalQueue() {
  const { isAr } = useTranslation();
  const { user, role: authRole } = useAuth();
  const [activeTab, setActiveTab] = useState<QueueTab>("registrations");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [viewingFamilyFor, setViewingFamilyFor] = useState<RegistrationRequest | null>(null);

  const performAction = usePerformApprovalAction();

  const { data: registrations, isLoading: regLoading } = useRegistrationRequests(statusFilter);
  const { data: roleChanges } = useRoleChangeRequests();
  const { data: transfers } = useTransferRequests();
  const { data: parentLinks } = useParentChildLinkRequests();

  const filteredRegistrations = registrations?.filter(req => {
    if (!authRole) return false;
    if (req.user_id === user?.id) return false;
    return canApproveRole(authRole, req.requested_role);
  }) || [];

  const handleAction = async (
    requestId: string,
    actionType: string,
    newStatus: string,
    requestType: string,
    tableName: string
  ) => {
    try {
      await performAction.mutateAsync({
        requestType,
        requestId,
        actionType,
        newStatus,
        notes: actionNotes,
        tableName,
      });
      toast.success(isAr ? "تم تنفيذ الإجراء بنجاح" : "Action performed successfully");
      setActionNotes("");
      setSelectedRequest(null);
    } catch (err: any) {
      toast.error(err.message || "Error");
    }
  };

  const tabs: { id: QueueTab; en: string; ar: string; count: number }[] = [
    { id: "registrations", en: "Registration Requests", ar: "طلبات التسجيل", count: filteredRegistrations.length },
    { id: "role_changes", en: "Role Changes", ar: "تغيير الأدوار", count: roleChanges?.length || 0 },
    { id: "transfers", en: "Transfers", ar: "طلبات النقل", count: transfers?.length || 0 },
    { id: "parent_links", en: "Parent-Child Links", ar: "ربط ولى الأمر", count: parentLinks?.length || 0 },
  ];

  const statusFilters = ["all", "submitted", "under_review", "waiting_higher_approval", "approved", "rejected", "escalated", "suspended"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">
            {isAr ? "قائمة الموافقات والمراجعة" : "Approval & Review Queue"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {isAr ? "مراجعة واعتماد الطلبات المعلقة حسب صلاحيات دورك — مع التحقق من بيانات الهوية الرسمية" : "Review and approve pending requests based on your role permissions — with official identity verification"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-surface-elevated text-muted-foreground hover:bg-muted border border-border"
            }`}
          >
            {isAr ? tab.ar : tab.en}
            <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-background/20">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Status Filter */}
      {activeTab === "registrations" && (
        <div className="flex flex-wrap gap-1.5">
          {statusFilters.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border"
              }`}
            >
              {s === "all" ? (isAr ? "الكل" : "All") : (isAr ? STATUS_LABELS[s]?.ar : STATUS_LABELS[s]?.en) || s}
            </button>
          ))}
        </div>
      )}

      {/* Registration Requests Table */}
      {activeTab === "registrations" && (
        <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الاسم القانونى" : "Legal Name"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الرقم القومى" : "National ID"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "رقم الوالد/الابن" : "Parent/Child ID"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الدور المطلوب" : "Requested Role"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "النطاق" : "Scope"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "التحقق" : "Identity"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "صلة قرابة" : "Family Link"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "التاريخ" : "Date"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الحالة" : "Status"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {regLoading ? (
                  <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">{isAr ? "جارى التحميل..." : "Loading..."}</td></tr>
                ) : filteredRegistrations.length === 0 ? (
                  <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">{isAr ? "لا توجد طلبات" : "No requests found"}</td></tr>
                ) : filteredRegistrations.map(req => {
                  const idStatus = getIdentityStatus(req);
                  const idInfo = IDENTITY_STATUS[idStatus];
                  return (
                  <tr key={req.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium text-foreground text-xs">{isAr ? req.full_name_ar || req.full_name : req.full_name}</div>
                      <div className="text-[10px] text-muted-foreground">{req.email}</div>
                    </td>
                    <td className="p-3">
                      <span className="text-xs font-mono text-foreground">{req.national_id || "—"}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs font-mono text-muted-foreground">{req.parent_national_id || "—"}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs font-medium">{isAr ? ROLE_LABELS[req.requested_role]?.ar : ROLE_LABELS[req.requested_role]?.en}</span>
                    </td>
                    <td className="p-3 text-[10px] text-muted-foreground">
                      {req.governorate_id ? (isAr ? "محافظة" : "Gov") : ""}
                      {req.administration_id ? (isAr ? " / إدارة" : " / Admin") : ""}
                      {req.school_id ? (isAr ? " / مدرسة" : " / School") : ""}
                      {!req.governorate_id && !req.administration_id && !req.school_id && "—"}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${idInfo.cls}`}>
                        {idStatus === "verified" ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {isAr ? idInfo.ar : idInfo.en}
                      </span>
                    </td>
                    <td className="p-3">
                      {req.requested_role === "student" && req.parent_national_id ? (
                        <button 
                          onClick={() => setViewingFamilyFor(req)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-all text-[10px] font-bold"
                        >
                          <LinkIcon className="w-3 h-3" />
                          {isAr ? "عرض الروابط" : "View Links"}
                        </button>
                      ) : req.requested_role === "parent" && registrations?.some(r => r.parent_national_id === req.national_id) ? (
                        <button 
                          onClick={() => setViewingFamilyFor(req)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-all text-[10px] font-bold"
                        >
                          <Users className="w-3 h-3" />
                          {isAr ? "عرض الأبناء" : "View Children"}
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[req.request_status] || "bg-muted"}`}>
                        {isAr ? STATUS_LABELS[req.request_status]?.ar : STATUS_LABELS[req.request_status]?.en}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {(req.request_status === "submitted" || req.request_status === "under_review") && (
                          <>
                            <button onClick={() => handleAction(req.id, "approve", "approved", "registration", "registration_requests")} className="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors" title={isAr ? "موافقة" : "Approve"}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleAction(req.id, "reject", "rejected", "registration", "registration_requests")} className="p-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors" title={isAr ? "رفض" : "Reject"}>
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleAction(req.id, "return", "returned", "registration", "registration_requests")} className="p-1.5 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors" title={isAr ? "إعادة لتصحيح الهوية" : "Return for Identity Correction"}>
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleAction(req.id, "escalate", "escalated", "registration", "registration_requests")} className="p-1.5 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors" title={isAr ? "تصعيد" : "Escalate"}>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {req.request_status === "approved" && (
                          <button onClick={() => handleAction(req.id, "activate", "activated", "registration", "registration_requests")} className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs font-medium transition-colors">
                            {isAr ? "تفعيل" : "Activate"}
                          </button>
                        )}
                        {req.request_status !== "suspended" && req.request_status !== "rejected" && (
                          <button onClick={() => handleAction(req.id, "suspend", "suspended", "registration", "registration_requests")} className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title={isAr ? "تعليق" : "Suspend"}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => setSelectedRequest(selectedRequest === req.id ? null : req.id)} className="p-1.5 rounded bg-muted text-muted-foreground hover:bg-border transition-colors" title={isAr ? "السجل" : "History"}>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {selectedRequest === req.id && (
                        <div className="mt-2">
                          <ApprovalHistoryPanel requestId={req.id} />
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Role Changes Table */}
      {activeTab === "role_changes" && (
        <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "المستخدم" : "User"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الدور الحالى" : "Current Role"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الدور المطلوب" : "Requested Role"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "السبب" : "Reason"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الحالة" : "Status"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {!roleChanges?.length ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{isAr ? "لا توجد طلبات" : "No requests"}</td></tr>
                ) : roleChanges.filter(r => r.user_id !== user?.id).map(req => (
                  <tr key={req.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3 text-xs">{req.user_id?.slice(0, 8)}...</td>
                    <td className="p-3 text-xs">{isAr ? ROLE_LABELS[req.old_role]?.ar : ROLE_LABELS[req.old_role]?.en}</td>
                    <td className="p-3 text-xs font-medium">{isAr ? ROLE_LABELS[req.requested_role]?.ar : ROLE_LABELS[req.requested_role]?.en}</td>
                    <td className="p-3 text-xs text-muted-foreground">{req.reason || "—"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[req.request_status] || "bg-muted"}`}>
                        {isAr ? STATUS_LABELS[req.request_status]?.ar : STATUS_LABELS[req.request_status]?.en}
                      </span>
                    </td>
                    <td className="p-3">
                      {(req.request_status === "submitted" || req.request_status === "under_review") && (
                        <div className="flex gap-1">
                          <button onClick={() => handleAction(req.id, "approve", "approved", "role_change", "role_change_requests")} className="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleAction(req.id, "reject", "rejected", "role_change", "role_change_requests")} className="p-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200"><XCircle className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleAction(req.id, "escalate", "escalated", "role_change", "role_change_requests")} className="p-1.5 rounded bg-purple-100 text-purple-700 hover:bg-purple-200"><ArrowUpRight className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transfers Table */}
      {activeTab === "transfers" && (
        <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "النوع" : "Type"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "السبب" : "Reason"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الحالة" : "Status"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "التاريخ" : "Date"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {!transfers?.length ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{isAr ? "لا توجد طلبات" : "No requests"}</td></tr>
                ) : transfers.filter(r => r.user_id !== user?.id).map(req => (
                  <tr key={req.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3 text-xs font-medium capitalize">{req.entity_type}</td>
                    <td className="p-3 text-xs text-muted-foreground">{req.reason || "—"}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[req.request_status]}`}>{isAr ? STATUS_LABELS[req.request_status]?.ar : STATUS_LABELS[req.request_status]?.en}</span></td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      {(req.request_status === "submitted") && (
                        <div className="flex gap-1">
                          <button onClick={() => handleAction(req.id, "approve", "approved", "transfer", "transfer_requests")} className="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleAction(req.id, "reject", "rejected", "transfer", "transfer_requests")} className="p-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200"><XCircle className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Parent-Child Links Table */}
      {activeTab === "parent_links" && (
        <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "ولى الأمر" : "Parent"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الرقم القومى" : "National ID"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الطالب" : "Child"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "كود الطالب" : "Student Code"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "نوع العلاقة" : "Relation"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الحالة" : "Status"}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {!parentLinks?.length ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{isAr ? "لا توجد طلبات" : "No requests"}</td></tr>
                ) : parentLinks.filter(r => r.parent_user_id !== user?.id).map(req => (
                  <tr key={req.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3 text-xs">
                      <div className="font-medium text-foreground">{req.profiles?.full_name_ar || req.profiles?.full_name || req.parent_name}</div>
                      {req.parent_name.includes("@") && <div className="text-[10px] text-muted-foreground">{req.parent_name}</div>}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">{req.parent_national_id || req.profiles?.national_id || "—"}</td>
                    <td className="p-3 text-xs">{req.child_name}</td>
                    <td className="p-3 text-xs text-muted-foreground">{req.child_student_code || "—"}</td>
                    <td className="p-3 text-xs capitalize">{req.relation_type}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[req.request_status]}`}>{isAr ? STATUS_LABELS[req.request_status]?.ar : STATUS_LABELS[req.request_status]?.en}</span></td>
                    <td className="p-3">
                      {(req.request_status === "submitted") && (
                        <div className="flex gap-1">
                          <button onClick={() => handleAction(req.id, "approve", "approved", "parent_child_link", "parent_child_link_requests")} className="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleAction(req.id, "reject", "rejected", "parent_child_link", "parent_child_link_requests")} className="p-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200"><XCircle className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Family Links Modal */}
      <Dialog open={!!viewingFamilyFor} onOpenChange={() => setViewingFamilyFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {isAr ? "الروابط الأسرية لـ " : "Family Links for "} {viewingFamilyFor?.full_name_ar || viewingFamilyFor?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {viewingFamilyFor?.requested_role === "student" && (
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <h4 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {isAr ? "ولي الأمر المرتبط" : "Linked Parent"}
                </h4>
                {registrations?.find(r => r.requested_role === "parent" && r.national_id === viewingFamilyFor.parent_national_id) ? (
                  (() => {
                    const p = registrations.find(r => r.requested_role === "parent" && r.national_id === viewingFamilyFor.parent_national_id)!;
                    return (
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-200">
                        <div>
                          <p className="text-xs font-bold text-foreground">{p.full_name_ar || p.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.email}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[p.request_status]}`}>
                          {isAr ? STATUS_LABELS[p.request_status]?.ar : STATUS_LABELS[p.request_status]?.en}
                        </span>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-xs text-indigo-400 italic">
                    {isAr ? "لم يتم العثور على طلب تسجيل لولي الأمر بهذا الرقم القومي بعد." : "No parent registration found for this ID yet."}
                  </p>
                )}
                
                <h4 className="text-sm font-bold text-amber-900 mt-6 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {isAr ? "الإخوة المرتبطون" : "Linked Siblings"}
                </h4>
                <div className="space-y-2">
                  {registrations?.filter(r => r.requested_role === "student" && r.parent_national_id === viewingFamilyFor.parent_national_id && r.id !== viewingFamilyFor.id).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                      <div>
                        <p className="text-xs font-bold text-foreground">{s.full_name_ar || s.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{s.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[s.request_status]}`}>
                        {isAr ? STATUS_LABELS[s.request_status]?.ar : STATUS_LABELS[s.request_status]?.en}
                      </span>
                    </div>
                  ))}
                  {registrations?.filter(r => r.requested_role === "student" && r.parent_national_id === viewingFamilyFor.parent_national_id && r.id !== viewingFamilyFor.id).length === 0 && (
                    <p className="text-xs text-amber-600/60 italic">{isAr ? "لا يوجد إخوة مسجلون." : "No registered siblings."}</p>
                  )}
                </div>
              </div>
            )}

            {viewingFamilyFor?.requested_role === "parent" && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <h4 className="text-sm font-bold text-emerald-900 mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  {isAr ? "الأبناء المرتبطون" : "Linked Children"}
                </h4>
                <div className="space-y-2">
                  {registrations?.filter(r => r.requested_role === "student" && r.parent_national_id === viewingFamilyFor.national_id).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-200">
                      <div>
                        <p className="text-xs font-bold text-foreground">{s.full_name_ar || s.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{s.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[s.request_status]}`}>
                        {isAr ? STATUS_LABELS[s.request_status]?.ar : STATUS_LABELS[s.request_status]?.en}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
