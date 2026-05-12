import { useTranslation } from "@/hooks/useTranslation";
import { useMyChildren } from "@/hooks/useParentData";
import { Newspaper, Clock, School, CheckCircle2 } from "lucide-react";

export function SchoolNotices() {
  const { lang } = useTranslation();
  const { data: children = [], isLoading } = useMyChildren();
  const isAr = lang === "ar";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
        <Clock className="w-4 h-4 animate-spin" /> {isAr ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Newspaper className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">{isAr ? "إعلانات المدرسة" : "School Notices"}</h2>
        <span className="ms-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">0</span>
      </div>

      {children.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-xs text-green-800">
            {isAr
              ? `حسابك مرتبط بـ ${children.length} طالب. ستصلك إعلانات مدارسهم هنا تلقائياً بعد تفعيل النشر من المدرسة — لا تحتاج تفعيلاً يدوياً منك.`
              : `You're linked to ${children.length} student(s). You'll see notices here once the school posts them — there's nothing separate to turn on in your account.`}
          </p>
        </div>
      )}

      {children.length === 0 ? (
        <div className="bg-surface-elevated rounded-lg border border-border p-8 text-center space-y-3">
          <School className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">
            {isAr ? "أضف أبناءك لاستقبال إعلانات مدارسهم." : "Add your children to receive their school notices."}
          </p>
        </div>
      ) : (
        <div className="bg-surface-elevated rounded-lg border border-border p-10 text-center space-y-3">
          <Newspaper className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <h3 className="font-semibold text-foreground">{isAr ? "لا توجد إعلانات جديدة" : "No New Notices"}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {isAr
              ? "عندما تنشر المدرسة إعلاناً أو دورياً رسمياً، سيصلك هنا فوراً."
              : "When the school posts a notice or official circular, it will appear here immediately."}
          </p>
        </div>
      )}

      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-full text-xs text-primary font-medium">
          <Clock className="w-3 h-3" />
          {isAr ? "قيد التطوير — نظام الإعلانات المدرسية قريباً" : "In Development — School notices system coming soon"}
        </div>
      </div>
    </div>
  );
}
