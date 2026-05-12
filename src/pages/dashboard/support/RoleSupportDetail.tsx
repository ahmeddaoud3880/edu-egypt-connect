import { useParams, Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ArrowLeft, Users, Bot } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const issueTypes = [
  { type: "Login", typeAr: "دخول", count: 4 },
  { type: "Dashboard", typeAr: "لوحة", count: 2 },
  { type: "Data", typeAr: "بيانات", count: 1 },
  { type: "Translation", typeAr: "ترجمة", count: 1 },
];

export default function RoleSupportDetail() {
  const { roleId } = useParams();
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  return (
    <div className="space-y-6">
      <Link to="/dashboard?role=support" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" />{isAr ? "العودة" : "Back"}</Link>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h1 className="text-xl font-bold text-foreground">{isAr ? "تفاصيل دعم الدور" : "Role Support Detail"} — {roleId || "Teacher"}</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: isAr ? "تذاكر مفتوحة" : "Open Tickets", value: "8" },
          { label: isAr ? "حرجة" : "Critical", value: "2" },
          { label: isAr ? "متوسط الحل" : "Avg Resolution", value: "3.5h" },
        ].map((k) => (
          <div key={k.label} className="bg-surface-elevated rounded-lg border border-border p-4">
            <div className="text-[10px] text-muted-foreground mb-1">{k.label}</div>
            <div className="text-lg font-bold text-foreground">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{isAr ? "المشكلات حسب النوع" : "Issues by Type"}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={issueTypes}><CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" /><XAxis dataKey={isAr ? "typeAr" : "type"} tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} /><YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} /><Tooltip /><Bar dataKey="count" fill="hsl(220 40% 13%)" radius={[2, 2, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4"><Bot className="w-5 h-5 text-gold" /><h3 className="font-semibold text-foreground">{isAr ? "توصيات" : "AI Recommendations"}</h3></div>
        <div className="space-y-2">
          {[isAr ? "مشاكل الدخول الأكثر شيوعا — فحص خدمة المصادقة" : "Login issues most common — check authentication service", isAr ? "مراجعة صلاحيات دور المعلم" : "Review teacher role permissions"].map((r, i) => (
            <div key={i} className="p-3 bg-gold-light rounded border border-gold/20 text-sm text-foreground/80">{r}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
