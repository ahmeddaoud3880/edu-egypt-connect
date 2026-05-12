import { useParams, Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ArrowLeft, CalendarDays, Bot } from "lucide-react";

export default function MeetingDetail() {
  const { meetingId } = useParams();
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  return (
    <div className="space-y-6">
      <Link to="/dashboard?role=parent" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" />{isAr ? "العودة" : "Back"}</Link>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{isAr ? "تفاصيل الاجتماع" : "Meeting Detail"}</h1>
            <p className="text-sm text-muted-foreground mt-1">{isAr ? "اجتماع أولياء الأمور" : "Parent-Teacher Meeting"}</p>
          </div>
          <StatusBadge status="pending" label={isAr ? "فى الانتظار" : "Pending"} />
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: isAr ? "التاريخ" : "Date", value: "Apr 2, 2026" },
          { label: isAr ? "الوقت" : "Time", value: "10:00 AM" },
          { label: isAr ? "المعلم" : "Teacher", value: isAr ? "أ. محمد سالم" : "Mr. Mohamed Salem" },
          { label: isAr ? "الطالب" : "Student", value: isAr ? "أحمد محمد" : "Ahmed Mohamed" },
        ].map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <div className="text-[10px] text-muted-foreground mb-1">{k.label}</div>
            <div className="text-sm font-semibold text-foreground">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-3">{isAr ? "سياق الاجتماع" : "Meeting Context"}</h3>
        <p className="text-sm text-muted-foreground">{isAr ? "مناقشة حالة الغياب المتكرر لأحمد وتراجع أدائه فى الرياضيات. المعلم يقترح خطة تحسين تتطلب تعاون ولى الأمر." : "Discussion of Ahmed's repeated absences and declining math performance. The teacher suggests an improvement plan requiring parent cooperation."}</p>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-3">{isAr ? "أجندة مقترحة" : "Suggested Agenda"}</h3>
        <div className="space-y-2">
          {[
            isAr ? "مراجعة سجل الحضور الشهرى" : "Review monthly attendance record",
            isAr ? "مناقشة أداء الرياضيات والعلوم" : "Discuss Math and Science performance",
            isAr ? "الاتفاق على خطة تحسين" : "Agree on an improvement plan",
            isAr ? "جدولة متابعة بعد أسبوعين" : "Schedule a follow-up in 2 weeks",
          ].map((a, i) => (
            <div key={i} className="p-2 bg-surface rounded border border-border text-sm text-foreground flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">{i + 1}</span>{a}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{isAr ? "نصائح للاجتماع" : "Meeting Tips"}</h3></div>
        <div className="space-y-2">
          {[isAr ? "اسأل عن خطة التحسين المقترحة وما دورك فيها" : "Ask about the proposed improvement plan and your role in it", isAr ? "اطلب تقريرا أسبوعيا عن أداء أحمد" : "Request a weekly report on Ahmed's performance"].map((r, i) => (
            <div key={i} className="p-3 bg-gold-light rounded border border-gold/20 text-sm text-foreground/80">{r}</div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button className="text-xs px-4 py-2 bg-primary text-primary-foreground rounded">{isAr ? "تأكيد الحضور" : "Confirm Attendance"}</button>
        <button className="text-xs px-4 py-2 border border-border rounded text-foreground">{isAr ? "طلب تغيير الموعد" : "Request Reschedule"}</button>
        <button className="text-xs px-4 py-2 border border-border rounded text-foreground">{isAr ? "إلغاء" : "Cancel"}</button>
      </div>
    </div>
  );
}
