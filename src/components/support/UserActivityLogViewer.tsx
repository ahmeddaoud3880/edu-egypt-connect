import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Search, User, Clock, Activity, Shield, ChevronDown, ChevronUp,
  GraduationCap, BookOpen, BarChart3, Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface UserSearchResult {
  id: string;
  email: string;
  full_name: string | null;
  full_name_ar: string | null;
  role: string | null;
  school_name: string | null;
  national_id: string | null;
  created_at: string;
}

function useUserSearch(query: string) {
  return useQuery({
    queryKey: ["support_user_search", query],
    queryFn: async (): Promise<UserSearchResult[]> => {
      if (!query || query.length < 3) return [];
      // Get all users from auth
      const { data: users, error } = await (supabase as any).rpc("get_all_users");
      if (error) throw error;
      const q = query.toLowerCase();
      const filtered = ((users || []) as any[]).filter(
        (u: any) => u.email?.toLowerCase().includes(q)
      );

      // Enrich with profiles
      const enriched = await Promise.all(
        filtered.slice(0, 10).map(async (u: any) => {
          const [profileRes, roleRes] = await Promise.all([
            (supabase as any).from("profiles").select("full_name, full_name_ar, national_id, school_id").eq("id", u.id).maybeSingle(),
            (supabase as any).from("user_roles").select("role").eq("user_id", u.id).limit(1).maybeSingle(),
          ]);
          const profile = profileRes.data;
          let school_name: string | null = null;
          if (profile?.school_id) {
            const { data: school } = await (supabase as any).from("schools").select("name_ar, name").eq("id", profile.school_id).maybeSingle();
            school_name = school?.name_ar || school?.name || null;
          }
          return {
            id: u.id,
            email: u.email,
            full_name: profile?.full_name || null,
            full_name_ar: profile?.full_name_ar || null,
            role: roleRes.data?.role || null,
            school_name,
            national_id: profile?.national_id || null,
            created_at: u.created_at,
          } as UserSearchResult;
        })
      );

      return enriched;
    },
    enabled: query.length >= 3,
    staleTime: 30_000,
  });
}

function useUserActivityLogs(userId: string | null) {
  return useQuery({
    queryKey: ["user_activity_logs", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await (supabase as any)
        .from("user_activity_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!userId,
  });
}

function useUserGrades(userId: string | null) {
  return useQuery({
    queryKey: ["support_user_grades", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: student } = await (supabase as any).from("students").select("id").eq("user_id", userId).maybeSingle();
      if (!student) return [];
      const { data } = await (supabase as any)
        .from("grades")
        .select("*, subjects(name_ar, name)")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!userId,
  });
}

function useUserAttendance(userId: string | null) {
  return useQuery({
    queryKey: ["support_user_attendance", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: student } = await (supabase as any).from("students").select("id").eq("user_id", userId).maybeSingle();
      if (!student) return [];
      const { data } = await (supabase as any)
        .from("attendance_records")
        .select("*, classes(name)")
        .eq("student_id", student.id)
        .order("date", { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!userId,
  });
}

export function UserActivityLogViewer({ schoolFilter }: { schoolFilter?: string }) {
  const { isAr } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [viewSection, setViewSection] = useState<"logs" | "grades" | "attendance">("logs");
  const [logsExpanded, setLogsExpanded] = useState(true);

  const { data: searchResults = [], isLoading: searching } = useUserSearch(searchQuery);
  const { data: activityLogs = [], isLoading: logsLoading } = useUserActivityLogs(selectedUser?.id || null);
  const { data: grades = [] } = useUserGrades(viewSection === "grades" ? (selectedUser?.id || null) : null);
  const { data: attendance = [] } = useUserAttendance(viewSection === "attendance" ? (selectedUser?.id || null) : null);

  const timeAgo = (dt: string) => {
    try {
      return formatDistanceToNow(new Date(dt), { addSuffix: true, locale: isAr ? ar : enUS });
    } catch { return dt; }
  };

  return (
    <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">{isAr ? "عارض سجل نشاط المستخدمين" : "User Activity Log Viewer"}</h2>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setSearchQuery(searchInput); }}
            placeholder={isAr ? "ابحث بالبريد الإلكتروني..." : "Search by email..."}
            className="w-full ps-10 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          onClick={() => setSearchQuery(searchInput)}
          disabled={searchInput.length < 3}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {isAr ? "بحث" : "Search"}
        </button>
      </div>

      {/* Search results */}
      {searchQuery.length >= 3 && (
        <div className="border border-border rounded-xl overflow-hidden">
          {searching ? (
            <div className="flex justify-center p-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : searchResults.length === 0 ? (
            <p className="p-4 text-sm text-center text-muted-foreground">
              {isAr ? "لا نتائج" : "No results"}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedUser(u); setSearchQuery(""); setSearchInput(""); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-start"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name_ar || u.full_name || u.email}</p>
                    <p className="text-xs text-muted-foreground">{u.email} · {u.role || "?"}</p>
                  </div>
                  {u.school_name && (
                    <span className="ms-auto text-xs bg-muted px-2 py-0.5 rounded-full shrink-0">{u.school_name}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected user view */}
      {selectedUser && (
        <div className="border border-border rounded-xl overflow-hidden">
          {/* User header */}
          <div className="bg-primary/5 border-b border-border p-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{selectedUser.full_name_ar || selectedUser.full_name || "—"}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                    {selectedUser.role || "?"}
                  </span>
                  {selectedUser.school_name && (
                    <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                      {selectedUser.school_name}
                    </span>
                  )}
                  {selectedUser.national_id && (
                    <span className="text-xs font-mono text-muted-foreground">{selectedUser.national_id}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedUser(null)}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted"
            >
              {isAr ? "إغلاق" : "Close"}
            </button>
          </div>

          {/* Section tabs */}
          <div className="flex border-b border-border">
            {(["logs", "grades", "attendance"] as const).map((s) => {
              const label = s === "logs"
                ? (isAr ? "السجل" : "Activity Log")
                : s === "grades"
                  ? (isAr ? "الدرجات" : "Grades")
                  : (isAr ? "الحضور" : "Attendance");
              const Icon = s === "logs" ? Activity : s === "grades" ? BarChart3 : GraduationCap;
              return (
                <button
                  key={s}
                  onClick={() => setViewSection(s)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                    viewSection === s
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              );
            })}
          </div>

          {/* Activity logs */}
          {viewSection === "logs" && (
            <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
              {logsLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : activityLogs.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  {isAr ? "لا سجلات نشاط" : "No activity logs"}
                </p>
              ) : (
                activityLogs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{log.action_type}</p>
                      {log.details && (
                        <p className="text-xs text-muted-foreground mt-0.5 break-all">
                          {typeof log.details === "string" ? log.details : JSON.stringify(log.details)}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground/70 mt-1">{timeAgo(log.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Grades */}
          {viewSection === "grades" && (
            <div className="max-h-80 overflow-y-auto">
              {grades.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  {isAr ? "لا درجات مسجلة" : "No grades recorded"}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="p-3 text-start font-medium">{isAr ? "المادة" : "Subject"}</th>
                      <th className="p-3 text-end font-medium">{isAr ? "الدرجة" : "Score"}</th>
                      <th className="p-3 text-end font-medium hidden sm:table-cell">{isAr ? "التاريخ" : "Date"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map((g: any) => (
                      <tr key={g.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="p-3">{g.subjects?.name_ar || g.subjects?.name || "—"}</td>
                        <td className="p-3 text-end font-mono">
                          {g.score ?? "—"} / {g.max_score ?? 100}
                          <span className={`ms-1 text-xs ${((g.score ?? 0) / (g.max_score ?? 100)) >= 0.85 ? "text-green-600" : "text-amber-600"}`}>
                            ({Math.round(((g.score ?? 0) / (g.max_score ?? 100)) * 100)}%)
                          </span>
                        </td>
                        <td className="p-3 text-end text-xs text-muted-foreground hidden sm:table-cell">
                          {g.grade_date ? new Date(g.grade_date).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Attendance */}
          {viewSection === "attendance" && (
            <div className="max-h-80 overflow-y-auto">
              {attendance.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  {isAr ? "لا سجلات حضور" : "No attendance records"}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="p-3 text-start font-medium">{isAr ? "التاريخ" : "Date"}</th>
                      <th className="p-3 text-start font-medium">{isAr ? "الفصل" : "Class"}</th>
                      <th className="p-3 text-start font-medium">{isAr ? "الحالة" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((a: any) => (
                      <tr key={a.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="p-3 font-mono text-xs">{a.date}</td>
                        <td className="p-3 text-xs text-muted-foreground">{a.classes?.name || "—"}</td>
                        <td className="p-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            a.status === "present" ? "bg-green-100 text-green-700"
                            : a.status === "absent" ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                          }`}>
                            {isAr
                              ? a.status === "present" ? "حاضر" : a.status === "absent" ? "غائب" : "متأخر"
                              : a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
