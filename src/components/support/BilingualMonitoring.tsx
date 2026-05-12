import { useTranslation } from "@/hooks/useTranslation";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Globe, CheckCircle2, AlertTriangle } from "lucide-react";

const pages = [
  { page: "Ministry Dashboard", pageAr: "لوحة الوزارة", arStatus: "normal" as const, enStatus: "normal" as const, rtlStatus: "normal" as const },
  { page: "Directorate Dashboard", pageAr: "لوحة المديرية", arStatus: "normal" as const, enStatus: "normal" as const, rtlStatus: "normal" as const },
  { page: "Administration Dashboard", pageAr: "لوحة الإدارة", arStatus: "normal" as const, enStatus: "normal" as const, rtlStatus: "normal" as const },
  { page: "School Dashboard", pageAr: "لوحة المدرسة", arStatus: "normal" as const, enStatus: "normal" as const, rtlStatus: "normal" as const },
  { page: "Teacher Workspace", pageAr: "مساحة المعلم", arStatus: "normal" as const, enStatus: "normal" as const, rtlStatus: "normal" as const },
  { page: "Student Portal", pageAr: "بوابة الطالب", arStatus: "normal" as const, enStatus: "normal" as const, rtlStatus: "normal" as const },
  { page: "Parent Portal", pageAr: "بوابة ولى الأمر", arStatus: "normal" as const, enStatus: "normal" as const, rtlStatus: "normal" as const },
  { page: "Support Dashboard", pageAr: "لوحة الدعم", arStatus: "normal" as const, enStatus: "normal" as const, rtlStatus: "normal" as const },
  { page: "Public Pages", pageAr: "الصفحات العامة", arStatus: "normal" as const, enStatus: "normal" as const, rtlStatus: "normal" as const },
  { page: "Login Page", pageAr: "صفحة الدخول", arStatus: "normal" as const, enStatus: "normal" as const, rtlStatus: "normal" as const },
];

const issues: any[] = [];

export function BilingualMonitoring() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  const totalLabels = 100;
  const arCoverage = 100;
  const enCoverage = 100;

  return (
    <div className="space-y-6">
      {/* Coverage Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isAr ? "تغطية العربية" : "Arabic Coverage", value: `${Math.round(arCoverage/totalLabels*100)}%`, color: "text-green-600", icon: Globe },
          { label: isAr ? "تغطية الإنجليزية" : "English Coverage", value: "100%", color: "text-green-600", icon: CheckCircle2 },
          { label: isAr ? "مشكلات RTL" : "RTL Issues", value: "0", color: "text-green-600", icon: CheckCircle2 },
          { label: isAr ? "تحذيرات ترجمة" : "Translation Warnings", value: issues.length.toString(), color: "text-amber-600", icon: AlertTriangle },
        ].map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Page Status */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{isAr ? "حالة الترجمة حسب الصفحة" : "Translation Status by Page"}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-start p-2 text-muted-foreground font-medium">{isAr ? "الصفحة" : "Page"}</th>
              <th className="text-center p-2 text-muted-foreground font-medium">{isAr ? "العربية" : "Arabic"}</th>
              <th className="text-center p-2 text-muted-foreground font-medium">{isAr ? "الإنجليزية" : "English"}</th>
              <th className="text-center p-2 text-muted-foreground font-medium">RTL</th>
            </tr></thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.page} className="border-b border-border last:border-0">
                  <td className="p-2 text-foreground">{isAr ? p.pageAr : p.page}</td>
                  <td className="p-2 text-center"><StatusBadge status={p.arStatus} label={p.arStatus === "normal" ? "✓" : "⚠"} /></td>
                  <td className="p-2 text-center"><StatusBadge status={p.enStatus} label="✓" /></td>
                  <td className="p-2 text-center"><StatusBadge status={p.rtlStatus} label="✓" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Known Issues */}
      {issues.length > 0 && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{isAr ? "مشكلات ترجمة معروفة" : "Known Translation Issues"}</h3>
          <div className="space-y-2">
            {issues.map((issue, i) => (
              <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{isAr ? issue.pageAr : issue.page}</span>
                  <StatusBadge status={issue.severity} label={issue.severity === "warning" ? (isAr ? "تحذير" : "Warning") : (isAr ? "ملاحظة" : "Note")} />
                </div>
                <p className="text-xs text-amber-800">{isAr ? issue.issueAr : issue.issue}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
