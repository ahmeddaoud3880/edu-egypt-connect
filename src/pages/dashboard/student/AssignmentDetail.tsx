import { useTranslation } from "@/hooks/useTranslation";
import { useState } from "react";
import { FileText, Clock, Bot, CheckCircle2 } from "lucide-react";

const assignment = {
  title: { en: "Fractions Worksheet Ch.7", ar: "ورقة عمل الكسور فصل 7" },
  subject: { en: "Mathematics", ar: "رياضيات" },
  teacher: { en: "Mr. Mohamed Abdelrahman", ar: "أ. محمد عبد الرحمن" },
  due: "2026-03-30",
  status: "pending",
  description: {
    en: "Complete exercises 1-15 on page 142. Show all work including finding common denominators. Submit in class tomorrow.",
    ar: "أكمل التمارين 1-15 فى صفحة 142. اعرض كل الخطوات بما فى ذلك إيجاد المقام المشترك. سلّم فى الحصة غداً."
  },
  teacherNote: {
    en: "Focus on exercises 8-15 which involve word problems. Review the examples on page 140 first.",
    ar: "ركّز على التمارين 8-15 التى تتضمن مسائل كلامية. راجع الأمثلة فى صفحة 140 أولاً."
  },
};

export default function AssignmentDetail() {
  const { lang } = useTranslation();
  const [activeTab, setActiveTab] = useState("details");

  const tabs = [
    { id: "details", label: { en: "Details", ar: "التفاصيل" } },
    { id: "teacherNote", label: { en: "Teacher Note", ar: "ملاحظة المعلم" } },
    { id: "ai", label: { en: "AI Help", ar: "مساعدة ذكية" } },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-2"><FileText className="w-5 h-5 text-primary" /></div>
        <h1 className="text-xl font-bold text-foreground">{lang === "ar" ? assignment.title.ar : assignment.title.en}</h1>
        <p className="text-sm text-muted-foreground mt-1">{lang === "ar" ? assignment.subject.ar : assignment.subject.en} — {lang === "ar" ? assignment.teacher.ar : assignment.teacher.en}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-elevated rounded-lg border border-border p-4 text-center">
          <Clock className="w-5 h-5 mx-auto text-amber-600" />
          <div className="text-sm font-bold text-foreground mt-1">{assignment.due}</div>
          <div className="text-xs text-muted-foreground">{lang === "ar" ? "الموعد النهائى" : "Due Date"}</div>
        </div>
        <div className="bg-surface-elevated rounded-lg border border-border p-4 text-center">
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">{lang === "ar" ? "معلق" : "Pending"}</span>
          <div className="text-xs text-muted-foreground mt-2">{lang === "ar" ? "الحالة" : "Status"}</div>
        </div>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {lang === "ar" ? tab.label.ar : tab.label.en}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "details" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-3">{lang === "ar" ? "وصف المهمة" : "Assignment Description"}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{lang === "ar" ? assignment.description.ar : assignment.description.en}</p>
          <div className="flex gap-2 mt-4">
            <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> {lang === "ar" ? "تحديد كمكتمل" : "Mark Complete"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "teacherNote" && (
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-3">{lang === "ar" ? "ملاحظة المعلم" : "Teacher Note"}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{lang === "ar" ? assignment.teacherNote.ar : assignment.teacherNote.en}</p>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="bg-gold-light rounded-lg border border-gold/20 p-6">
          <div className="flex items-center gap-2 mb-3"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{lang === "ar" ? "مساعدة الذكاء الاصطناعى" : "AI Help"}</h3></div>
          <p className="text-xs text-foreground/80 mb-4">{lang === "ar" ? "هل تحتاج مساعدة فى هذا الواجب؟ جرّب الإجراءات التالية:" : "Need help with this assignment? Try these actions:"}</p>
          <div className="flex flex-wrap gap-2">
            {[
              { en: "Explain the Topic", ar: "اشرح الموضوع" },
              { en: "Easier Explanation", ar: "شرح أسهل" },
              { en: "Step-by-Step Guide", ar: "دليل خطوة بخطوة" },
              { en: "Practice Similar Problems", ar: "تمرّن على مسائل مشابهة" },
            ].map((a) => (
              <button key={a.en} className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90">{lang === "ar" ? a.ar : a.en}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
