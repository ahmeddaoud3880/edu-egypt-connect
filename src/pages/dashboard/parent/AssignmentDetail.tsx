import { useParams, Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ArrowLeft, BookOpen, Bot } from "lucide-react";

export default function ParentAssignmentDetail() {
  const { assignmentId } = useParams();
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  return (
    <div className="space-y-6">
      <Link to="/dashboard?role=parent" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" />{isAr ? "العودة" : "Back"}</Link>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{isAr ? "تفاصيل الواجب" : "Assignment Detail"}</h1>
            <p className="text-sm text-muted-foreground mt-1">ID: {assignmentId}</p>
          </div>
          <StatusBadge status="critical" label={isAr ? "متأخر" : "Overdue"} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: isAr ? "المادة" : "Subject", value: isAr ? "العلوم" : "Science" },
          { label: isAr ? "الطالب" : "Student", value: isAr ? "أحمد محمد" : "Ahmed Mohamed" },
          { label: isAr ? "تاريخ التسليم" : "Due Date", value: "Mar 28, 2026" },
        ].map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <div className="text-[10px] text-muted-foreground mb-1">{k.label}</div>
            <div className="text-sm font-semibold text-foreground">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-3">{isAr ? "وصف الواجب" : "Assignment Description"}</h3>
        <p className="text-sm text-muted-foreground">{isAr ? "كتابة تقرير معمل عن تجربة الفصل الخامس — الأحماض والقواعد. يجب أن يتضمن التقرير: الهدف، الأدوات، الخطوات، النتائج، والاستنتاج." : "Write a lab report on Chapter 5 experiment — Acids and Bases. The report must include: objective, materials, procedure, results, and conclusion."}</p>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-3">{isAr ? "ملاحظة المعلم" : "Teacher Note"}</h3>
        <p className="text-sm text-muted-foreground">{isAr ? "لم يتم التسليم بعد. يرجى متابعة الطالب فى المنزل." : "Not yet submitted. Please follow up with the student at home."}</p>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{isAr ? "توصيات" : "AI Recommendations"}</h3></div>
        <div className="space-y-2">
          {[isAr ? "ساعد أحمد فى بدء التقرير — ابدأ بكتابة الهدف معه" : "Help Ahmed start the report — begin by writing the objective together", isAr ? "خصص 30 دقيقة هذا المساء لإكمال الواجب" : "Dedicate 30 minutes this evening to complete the assignment"].map((r, i) => (
            <div key={i} className="p-3 bg-gold-light rounded border border-gold/20 text-sm text-foreground/80">{r}</div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button className="text-xs px-4 py-2 bg-primary text-primary-foreground rounded">{isAr ? "إرسال رسالة للمعلم" : "Message Teacher"}</button>
        <button className="text-xs px-4 py-2 border border-border rounded text-foreground">{isAr ? "تم الاطلاع" : "Acknowledge"}</button>
      </div>
    </div>
  );
}
