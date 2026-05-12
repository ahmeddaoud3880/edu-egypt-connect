import { useParams, Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Bot, Clock, User, AlertTriangle } from "lucide-react";

export default function TicketDetail() {
  const { ticketId } = useParams();
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  const history = [
    { time: "10:34 AM", action: isAr ? "تم إنشاء التذكرة" : "Ticket created", by: isAr ? "النظام" : "System" },
    { time: "10:45 AM", action: isAr ? "تم التعيين إلى م. طارق" : "Assigned to Eng. Tarek", by: isAr ? "مدير الدعم" : "Support Manager" },
    { time: "11:02 AM", action: isAr ? "بدء التحقيق" : "Investigation started", by: isAr ? "م. طارق" : "Eng. Tarek" },
    { time: "11:30 AM", action: isAr ? "تم التصعيد إلى L2" : "Escalated to L2", by: isAr ? "م. طارق" : "Eng. Tarek" },
  ];

  return (
    <div className="space-y-6">
      <Link to="/dashboard?role=support" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" />{isAr ? "العودة" : "Back"}</Link>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{isAr ? "تفاصيل التذكرة" : "Ticket Detail"} — {ticketId}</h1>
            <p className="text-sm text-muted-foreground mt-1">{isAr ? "تعذر تسجيل الدخول — دور المعلم" : "Login failure — Teacher role"}</p>
          </div>
          <StatusBadge status="critical" label={isAr ? "حرج" : "Critical"} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isAr ? "النوع" : "Type", value: isAr ? "دخول / وصول" : "Login / Access" },
          { label: isAr ? "المسؤول" : "Owner", value: isAr ? "م. طارق" : "Eng. Tarek" },
          { label: isAr ? "الدور المتأثر" : "Affected Role", value: isAr ? "معلم" : "Teacher" },
          { label: isAr ? "منذ" : "Open Since", value: "2h 15m" },
        ].map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <div className="text-[10px] text-muted-foreground mb-1">{k.label}</div>
            <div className="text-sm font-semibold text-foreground">{k.value}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-surface-elevated p-1 rounded-lg border border-border">
          {[
            { v: "details", l: isAr ? "التفاصيل" : "Details" },
            { v: "history", l: isAr ? "السجل" : "History" },
            { v: "ai", l: isAr ? "توصيات" : "AI" },
          ].map((t) => <TabsTrigger key={t.v} value={t.v} className="text-xs">{t.l}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="details">
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-3">{isAr ? "وصف المشكلة" : "Issue Description"}</h3>
            <p className="text-sm text-muted-foreground mb-4">{isAr ? "عدة معلمين أبلغوا عن عدم قدرتهم على تسجيل الدخول. تظهر رسالة خطأ 'مهلة زمنية' عند محاولة الدخول. المشكلة تؤثر على أكثر من 120 معلم فى 3 مدارس." : "Multiple teachers reported inability to log in. An error message 'timeout' appears when attempting to login. The issue affects 120+ teachers across 3 schools."}</p>
            <h3 className="font-semibold text-foreground mb-3">{isAr ? "خطوات إعادة الإنتاج" : "Steps to Reproduce"}</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>1. {isAr ? "فتح صفحة الدخول" : "Open login page"}</p>
              <p>2. {isAr ? "إدخال بيانات المعلم" : "Enter teacher credentials"}</p>
              <p>3. {isAr ? "الضغط على دخول" : "Click login"}</p>
              <p>4. {isAr ? "تظهر رسالة مهلة زمنية بعد 30 ثانية" : "Timeout message appears after 30 seconds"}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">{isAr ? "سجل الحالة" : "Status History"}</h3>
            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-surface rounded border border-border">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{h.time}</span><span className="text-xs font-medium text-foreground">{h.by}</span></div>
                    <p className="text-sm text-foreground mt-1">{h.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <div className="bg-surface-elevated rounded-lg border border-border p-6">
            <div className="flex items-center gap-2 mb-4"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{isAr ? "توصيات الذكاء الاصطناعى" : "AI Recommendations"}</h3></div>
            <div className="space-y-2">
              {[isAr ? "فحص سجلات خدمة المصادقة — احتمال كبير لمشكلة فى الخادم" : "Check authentication service logs — likely a server-side issue", isAr ? "مراجعة حالة قاعدة البيانات — قد يكون هناك ضغط" : "Review database status — may be under heavy load", isAr ? "إخطار المدارس المتأثرة بوجود حل قيد التنفيذ" : "Notify affected schools that a fix is in progress"].map((r, i) => (
                <div key={i} className="p-3 bg-gold-light rounded border border-gold/20 text-sm text-foreground/80">{r}</div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2">
        <button className="text-xs px-4 py-2 bg-primary text-primary-foreground rounded">{isAr ? "تم الحل" : "Mark Resolved"}</button>
        <button className="text-xs px-4 py-2 border border-border rounded text-foreground">{isAr ? "قيد التنفيذ" : "Mark In Progress"}</button>
        <button className="text-xs px-4 py-2 border border-border rounded text-foreground">{isAr ? "تصعيد" : "Escalate"}</button>
        <button className="text-xs px-4 py-2 border border-border rounded text-foreground">{isAr ? "إعادة تعيين" : "Reassign"}</button>
        <button className="text-xs px-4 py-2 border border-border rounded text-foreground">{isAr ? "طلب معلومات" : "Request Info"}</button>
        <button className="text-xs px-4 py-2 border border-border rounded text-foreground">{isAr ? "تصدير" : "Export"}</button>
      </div>
    </div>
  );
}
