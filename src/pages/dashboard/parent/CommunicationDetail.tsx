import { useParams, Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ArrowLeft, MessageSquare, Mail } from "lucide-react";

export default function CommunicationDetail() {
  const { messageId } = useParams();
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  return (
    <div className="space-y-6">
      <Link to="/dashboard?role=parent" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" />{isAr ? "العودة" : "Back"}</Link>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{isAr ? "تفاصيل الرسالة" : "Message Detail"}</h1>
            <p className="text-sm text-muted-foreground mt-1">{isAr ? "أ. محمد سالم — الرياضيات" : "Mr. Mohamed Salem — Mathematics"}</p>
          </div>
          <StatusBadge status="pending" label={isAr ? "غير مقروء" : "Unread"} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: isAr ? "المعلم" : "Teacher", value: isAr ? "أ. محمد سالم" : "Mr. Mohamed Salem" },
          { label: isAr ? "الطالب" : "Student", value: isAr ? "أحمد محمد" : "Ahmed Mohamed" },
          { label: isAr ? "التاريخ" : "Date", value: "Mar 29, 2026" },
        ].map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <div className="text-[10px] text-muted-foreground mb-1">{k.label}</div>
            <div className="text-sm font-semibold text-foreground">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-3">{isAr ? "محتوى الرسالة" : "Message Content"}</h3>
        <div className="p-4 bg-surface rounded border border-border text-sm text-foreground/80 leading-relaxed">
          {isAr
            ? "السيد/ة ولى أمر أحمد، أحمد أداؤه فى الرياضيات يتراجع بشكل ملحوظ. فى آخر اختبار حصل على 55% وهو أقل من المستوى المطلوب. يفقد التركيز أثناء الحصة ولا يسلم الواجبات فى الموعد. أرجو التواصل لمناقشة خطة تحسين."
            : "Dear Ahmed's parent, Ahmed's math performance has been noticeably declining. In the last test he scored 55%, below the required level. He loses focus during class and doesn't submit homework on time. I'd like to discuss an improvement plan."}
        </div>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-3">{isAr ? "سجل التواصل" : "Communication History"}</h3>
        <div className="space-y-2">
          {[
            { date: "Mar 29", from: isAr ? "المعلم" : "Teacher", text: isAr ? "أداء أحمد يحتاج مناقشة" : "Ahmed's performance needs discussion" },
            { date: "Mar 15", from: isAr ? "المعلم" : "Teacher", text: isAr ? "تحذير أول — واجب متأخر" : "First warning — homework overdue" },
            { date: "Mar 10", from: isAr ? "ولى الأمر" : "Parent", text: isAr ? "شكرا — سنتابع فى المنزل" : "Thank you — we'll follow up at home" },
          ].map((h, i) => (
            <div key={i} className="p-3 bg-surface rounded border border-border">
              <div className="flex justify-between mb-1"><span className="text-xs font-medium text-foreground">{h.from}</span><span className="text-xs text-muted-foreground">{h.date}</span></div>
              <p className="text-xs text-muted-foreground">{h.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button className="text-xs px-4 py-2 bg-primary text-primary-foreground rounded inline-flex items-center gap-1"><Mail className="w-3 h-3" />{isAr ? "الرد على المعلم" : "Reply to Teacher"}</button>
        <button className="text-xs px-4 py-2 border border-border rounded text-foreground">{isAr ? "طلب اجتماع" : "Request Meeting"}</button>
        <button className="text-xs px-4 py-2 border border-border rounded text-foreground">{isAr ? "تم الاطلاع" : "Acknowledge"}</button>
      </div>
    </div>
  );
}
