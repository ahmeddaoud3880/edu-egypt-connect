import { useParams, Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ArrowLeft, Globe, Bot } from "lucide-react";

export default function TranslationIssueDetail() {
  const { issueId } = useParams();
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  const missingLabels = [
    { key: "student.gradeLabel", page: "Student Grades View", pageAr: "عرض درجات الطالب" },
    { key: "student.assessmentType", page: "Student Grades View", pageAr: "عرض درجات الطالب" },
  ];

  return (
    <div className="space-y-6">
      <Link to="/dashboard?role=support" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" />{isAr ? "العودة" : "Back"}</Link>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-xl font-bold text-foreground">{isAr ? "تفاصيل مشكلة الترجمة" : "Translation Issue Detail"}</h1><p className="text-sm text-muted-foreground mt-1">{isAr ? "تسميات عربية مفقودة فى بوابة الطالب" : "Missing Arabic labels in Student Portal"}</p></div>
          <StatusBadge status="warning" label={isAr ? "تحذير" : "Warning"} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: isAr ? "تسميات مفقودة" : "Missing Labels", value: missingLabels.length.toString() },
          { label: isAr ? "الصفحة المتأثرة" : "Affected Page", value: isAr ? "عرض الدرجات" : "Grades View" },
          { label: isAr ? "اللغة" : "Language", value: isAr ? "العربية" : "Arabic" },
        ].map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <div className="text-[10px] text-muted-foreground mb-1">{k.label}</div>
            <div className="text-sm font-semibold text-foreground">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{isAr ? "التسميات المفقودة" : "Missing Labels"}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-start p-2 text-muted-foreground font-medium">{isAr ? "المفتاح" : "Key"}</th>
              <th className="text-start p-2 text-muted-foreground font-medium">{isAr ? "الصفحة" : "Page"}</th>
              <th className="text-center p-2 text-muted-foreground font-medium">{isAr ? "الحالة" : "Status"}</th>
            </tr></thead>
            <tbody>
              {missingLabels.map((l) => (
                <tr key={l.key} className="border-b border-border last:border-0">
                  <td className="p-2 font-mono text-xs text-foreground">{l.key}</td>
                  <td className="p-2 text-foreground">{isAr ? l.pageAr : l.page}</td>
                  <td className="p-2 text-center"><StatusBadge status="warning" label={isAr ? "مفقود" : "Missing"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{isAr ? "توصيات" : "AI Recommendations"}</h3></div>
        <div className="space-y-2">
          {[isAr ? "أضف الترجمات المفقودة فى ملف translations.ts" : "Add missing translations in translations.ts file", isAr ? "تحقق من صفحات أخرى فى بوابة الطالب" : "Check other pages in student portal for similar issues"].map((r, i) => (
            <div key={i} className="p-3 bg-gold-light rounded border border-gold/20 text-sm text-foreground/80">{r}</div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button className="text-xs px-4 py-2 bg-primary text-primary-foreground rounded">{isAr ? "تم الإصلاح" : "Mark Fixed"}</button>
        <button className="text-xs px-4 py-2 border border-border rounded text-foreground">{isAr ? "فتح الصفحة المتأثرة" : "Open Affected Page"}</button>
      </div>
    </div>
  );
}
