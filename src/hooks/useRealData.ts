import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMode, applyDemoFilter } from "./useDemoMode";

export function useGovernorates() {
  return useQuery({
    queryKey: ["governorates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governorates")
        .select("*")
        .order("name"); // Order by name (usually contains Arabic or English)
      if (error) throw error;
      return data;
    },
  });
}

export function useStages() {
  return useQuery({
    queryKey: ["stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stages")
        .select("*")
        .order("name_ar");
      if (error) throw error;
      return data;
    },
  });
}

export function useAdministrations(governorateId?: string) {
  return useQuery({
    queryKey: ["administrations", governorateId],
    queryFn: async () => {
      let q = supabase.from("administrations").select("*").order("name_ar");
      if (governorateId) q = q.eq("governorate_id", governorateId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useDistricts(governorateId?: string) {
  return useQuery({
    queryKey: ["districts", governorateId],
    queryFn: async () => {
      let q = supabase.from("districts").select("*").order("name");
      if (governorateId) q = q.eq("governorate_id", governorateId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useSchools(administrationId?: string, stageId?: string, districtId?: string, gender?: string) {
  const { isDemoVisible } = useDemoMode();
  return useQuery({
    queryKey: ["schools", administrationId, stageId, districtId, isDemoVisible],
    queryFn: async () => {
      let q = supabase.from("schools").select("*").order("name_ar");
      if (administrationId) q = q.eq("administration_id", administrationId);
      if (stageId) q = q.eq("stage_id", stageId);
      if (districtId) q = q.eq("district_id", districtId);
      if (gender === "male") q = q.in("gender_type", ["مشترك", "بنين"]);
      if (gender === "female") q = q.in("gender_type", ["مشترك", "بنات"]);
      q = applyDemoFilter(q, isDemoVisible);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useSupportTickets() {
  const { isDemoVisible } = useDemoMode();
  return useQuery({
    queryKey: ["support_tickets", isDemoVisible],
    queryFn: async () => {
      let q = supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      q = applyDemoFilter(q, isDemoVisible);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useStudents(schoolId?: string) {
  const { isDemoVisible } = useDemoMode();
  return useQuery({
    queryKey: ["students", schoolId, isDemoVisible],
    queryFn: async () => {
      let q = supabase.from("students").select("*").order("full_name");
      if (schoolId) q = q.eq("school_id", schoolId);
      q = applyDemoFilter(q, isDemoVisible);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useTeachers(schoolId?: string) {
  const { isDemoVisible } = useDemoMode();
  return useQuery({
    queryKey: ["teachers", schoolId, isDemoVisible],
    queryFn: async () => {
      let q = supabase.from("teachers").select("*").order("full_name");
      if (schoolId) q = q.eq("school_id", schoolId);
      q = applyDemoFilter(q, isDemoVisible);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useNationalStats() {
  return useQuery({
    queryKey: ["national_stats"],
    queryFn: async () => {
      const { data: govs } = await supabase.from("governorates").select("total_schools, total_students, total_teachers");
      if (!govs) return { schools: 0, students: 0, teachers: 0, governorates: 0 };
      return {
        governorates: govs.length,
        schools: govs.reduce((s, g) => s + (g.total_schools || 0), 0),
        students: govs.reduce((s, g) => s + (g.total_students || 0), 0),
        teachers: govs.reduce((s, g) => s + (g.total_teachers || 0), 0),
      };
    },
  });
}

export function useTicketStats() {
  const { isDemoVisible } = useDemoMode();
  return useQuery({
    queryKey: ["ticket_stats", isDemoVisible],
    queryFn: async () => {
      let q = supabase.from("support_tickets").select("status, priority, is_demo");
      q = applyDemoFilter(q, isDemoVisible);
      const { data, error } = await q;
      if (error) throw error;
      const total = data?.length || 0;
      const open = data?.filter(t => t.status === "open").length || 0;
      const inProgress = data?.filter(t => t.status === "in_progress").length || 0;
      const resolved = data?.filter(t => t.status === "resolved").length || 0;
      const escalated = data?.filter(t => t.status === "escalated").length || 0;
      const critical = data?.filter(t => t.priority === "critical").length || 0;
      const high = data?.filter(t => t.priority === "high").length || 0;
      return { total, open, inProgress, resolved, escalated, critical, high };
    },
  });
}
