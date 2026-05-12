import { useTranslation } from "@/hooks/useTranslation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const byRole: any[] = [];

const COLORS = ["hsl(220 40% 13%)", "hsl(42 75% 50%)", "hsl(0 84% 60%)", "hsl(142 71% 45%)", "hsl(220 70% 50%)", "hsl(280 60% 50%)", "hsl(30 80% 55%)"];

const byPriority: any[] = [];

const recentRequests: any[] = [];

export function UserSupportRequests() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Role */}
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{isAr ? "التذاكر حسب الدور" : "Tickets by Role"}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byRole} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
              <YAxis type="category" dataKey={isAr ? "roleAr" : "role"} tick={{ fontSize: 10, fill: "hsl(220 10% 45%)" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" fill="hsl(220 40% 13%)" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Priority */}
        <div className="bg-surface-elevated rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">{isAr ? "التذاكر حسب الأولوية" : "Tickets by Priority"}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byPriority} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey={isAr ? "nameAr" : "name"} label={({ name, value }) => `${name}: ${value}`}>
                {byPriority.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">{isAr ? "أحدث الطلبات" : "Recent Requests"}</h3>
        <div className="space-y-2">
          {recentRequests.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 bg-surface rounded border border-border">
              <div>
                <span className="text-xs font-mono text-muted-foreground">{r.id}</span>
                <span className="mx-2 text-sm text-foreground">{isAr ? r.issueAr : r.issue}</span>
                <span className="text-xs text-muted-foreground">— {isAr ? r.userAr : r.user}</span>
              </div>
              <span className="text-xs text-muted-foreground">{r.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
