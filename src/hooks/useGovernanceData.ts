import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoMode, applyDemoFilter } from "./useDemoMode";

// Types
export type RequestStatus = "draft" | "submitted" | "under_review" | "waiting_higher_approval" | "approved" | "rejected" | "returned" | "escalated" | "activated" | "suspended";

export interface RegistrationRequest {
  id: string;
  user_id: string | null;
  full_name: string;
  full_name_ar: string;
  email: string;
  phone: string | null;
  national_id: string | null;
  parent_national_id: string | null;
  gender: string | null;
  requested_role: string;
  governorate_id: string | null;
  administration_id: string | null;
  district_id: string | null;
  stage_id: string | null;
  grade_number: number | null;
  school_id: string | null;
  request_status: string;
  notes: string | null;
  rejection_reason: string | null;
  supporting_docs_placeholder: string | null;
  supporting_docs_url: string | null;
  approved_by: string | null;
  approved_at: string | null;
  escalation_target: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleChangeRequest {
  id: string;
  user_id: string;
  old_role: string;
  requested_role: string;
  scope_governorate_id: string | null;
  scope_administration_id: string | null;
  scope_school_id: string | null;
  reason: string | null;
  request_status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransferRequest {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  current_school_id: string | null;
  target_school_id: string | null;
  current_administration_id: string | null;
  target_administration_id: string | null;
  reason: string | null;
  request_status: string;
  current_scope_approved: boolean;
  target_scope_approved: boolean;
  higher_level_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  supporting_docs_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParentChildLinkRequest {
  id: string;
  parent_user_id: string;
  parent_name: string;
  parent_national_id: string | null;
  child_name: string;
  child_student_code: string | null;
  child_school_id: string | null;
  relation_type: string;
  verification_status: string;
  request_status: string;
  review_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  supporting_docs_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalAction {
  id: string;
  request_type: string;
  request_id: string;
  action_type: string;
  performed_by: string;
  performer_role: string | null;
  performer_name: string | null;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
}

export interface UserScopeAssignment {
  id: string;
  user_id: string;
  role: string;
  governorate_id: string | null;
  administration_id: string | null;
  school_id: string | null;
  assigned_by: string | null;
  assigned_at: string;
  is_active: boolean;
  notes: string | null;
}

// Approval hierarchy
export const APPROVAL_HIERARCHY: Record<string, string[]> = {
  student: ["school", "support"],
  parent: ["school", "support"],
  teacher: ["school", "administration", "support"],
  school: ["administration", "directorate", "support"],
  administration: ["directorate", "ministry", "support"],
  directorate: ["ministry", "support"],
  ministry: ["ministry", "support"],
  support: ["ministry", "support"],
};

export function canApproveRole(approverRole: string, targetRole: string): boolean {
  const chain = APPROVAL_HIERARCHY[targetRole];
  return chain ? chain.includes(approverRole) : false;
}

// Hooks
export function useUserScope() {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ["user_scope", user?.id, role],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_scope_assignments" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as unknown as UserScopeAssignment;

      const { data: prof } = await supabase
        .from("profiles")
        .select("school_id, governorate_id")
        .eq("id", user.id)
        .maybeSingle();
      if (prof?.school_id && role) {
        return {
          id: "profile-fallback",
          user_id: user.id,
          role,
          governorate_id: prof.governorate_id,
          administration_id: null,
          school_id: prof.school_id,
          assigned_by: null,
          assigned_at: new Date().toISOString(),
          is_active: true,
          notes: "profile_fallback",
        } as UserScopeAssignment;
      }
      return null;
    },
    enabled: !!user,
  });
}

export function useDemoConfig() {
  return useQuery({
    queryKey: ["demo_config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("demo_config" as any).select("*");
      if (error) throw error;
      const config: Record<string, string> = {};
      (data || []).forEach((r: any) => { config[r.key] = r.value; });
      return config;
    },
  });
}

export function useToggleDemoData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (showDemo: boolean) => {
      const { error } = await supabase
        .from("demo_config" as any)
        .update({ value: showDemo ? "true" : "false", updated_at: new Date().toISOString() } as any)
        .eq("key", "show_demo_data");
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate ALL queries so every page recalculates without demo data
      queryClient.invalidateQueries();
    },
  });
}

export function useRegistrationRequests(statusFilter?: string) {
  const { role } = useAuth();
  const { data: scope } = useUserScope();
  const { isDemoVisible } = useDemoMode();

  return useQuery({
    queryKey: ["registration_requests", statusFilter, role, scope?.id, isDemoVisible],
    queryFn: async () => {
      let q = supabase.from("registration_requests").select("*").order("created_at", { ascending: false });
      if (statusFilter && statusFilter !== "all") q = q.eq("request_status", statusFilter);

      // Global demo data filtering
      q = applyDemoFilter(q, isDemoVisible);

      // Scope-based filtering
      if (scope) {
        if (role === "school" && scope.school_id) {
          q = q.eq("school_id", scope.school_id);
        } else if (role === "administration" && scope.administration_id) {
          q = q.eq("administration_id", scope.administration_id);
        } else if (role === "directorate" && scope.governorate_id) {
          q = q.eq("governorate_id", scope.governorate_id);
        }
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as RegistrationRequest[];
    },
  });
}

export function useRoleChangeRequests() {
  const { role } = useAuth();
  const { data: scope } = useUserScope();
  const { isDemoVisible } = useDemoMode();
  return useQuery({
    queryKey: ["role_change_requests", role, scope?.id, isDemoVisible],
    queryFn: async () => {
      let q = (supabase as any).from("role_change_requests").select("*").order("created_at", { ascending: false });
      q = applyDemoFilter(q, isDemoVisible);
      if (scope) {
        if (role === "school" && scope.school_id) q = q.eq("scope_school_id", scope.school_id);
        else if (role === "administration" && scope.administration_id) q = q.eq("scope_administration_id", scope.administration_id);
        else if (role === "directorate" && scope.governorate_id) q = q.eq("scope_governorate_id", scope.governorate_id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as RoleChangeRequest[];
    },
  });
}

export function useTransferRequests() {
  const { role } = useAuth();
  const { data: scope } = useUserScope();
  const { isDemoVisible } = useDemoMode();
  return useQuery({
    queryKey: ["transfer_requests", role, scope?.id, isDemoVisible],
    queryFn: async () => {
      let q = (supabase as any).from("transfer_requests").select("*").order("created_at", { ascending: false });
      q = applyDemoFilter(q, isDemoVisible);
      if (scope) {
        if (role === "school" && scope.school_id) {
          q = q.or(`current_school_id.eq.${scope.school_id},target_school_id.eq.${scope.school_id}`);
        } else if (role === "administration" && scope.administration_id) {
          q = q.or(`current_administration_id.eq.${scope.administration_id},target_administration_id.eq.${scope.administration_id}`);
        }
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as TransferRequest[];
    },
  });
}

export function useParentChildLinkRequests() {
  const { role } = useAuth();
  const { data: scope } = useUserScope();
  const { isDemoVisible } = useDemoMode();
  return useQuery({
    queryKey: ["parent_child_link_requests", role, scope?.id, isDemoVisible],
    queryFn: async () => {
      let q = (supabase as any)
        .from("parent_child_link_requests")
        .select("*, profiles:parent_user_id(national_id, full_name, full_name_ar)")
        .order("created_at", { ascending: false });
      q = applyDemoFilter(q, isDemoVisible);
      if (scope && role === "school" && scope.school_id) {
        q = q.eq("child_school_id", scope.school_id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useApprovalActions(requestId?: string) {
  return useQuery({
    queryKey: ["approval_actions", requestId],
    queryFn: async () => {
      let q = (supabase as any).from("approval_actions").select("*").order("created_at", { ascending: true });
      if (requestId) q = q.eq("request_id", requestId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ApprovalAction[];
    },
    enabled: !!requestId,
  });
}

export function useRequestStatusHistory(requestId?: string) {
  return useQuery({
    queryKey: ["request_status_history", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_status_history" as any)
        .select("*")
        .eq("request_id", requestId)
        .order("changed_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!requestId,
  });
}

export function usePerformApprovalAction() {
  const queryClient = useQueryClient();
  const { user, role, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      requestType,
      requestId,
      actionType,
      newStatus,
      notes,
      tableName,
    }: {
      requestType: string;
      requestId: string;
      actionType: string;
      newStatus: string;
      notes?: string;
      tableName: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Get current status first
      const { data: currentData } = await supabase
        .from(tableName as any)
        .select("request_status")
        .eq("id", requestId)
        .single();
      const oldStatus = (currentData as any)?.request_status || null;

      const updatePayload: any = { request_status: newStatus };
      if (["approved", "activated", "rejected"].includes(newStatus)) {
        updatePayload.approved_by = user.id;
        updatePayload.approved_at = new Date().toISOString();
      }
      if (newStatus === "rejected" && notes) {
        updatePayload.rejection_reason = notes;
      }

      const { error: updateError } = await supabase
        .from(tableName as any)
        .update(updatePayload as any)
        .eq("id", requestId);
      if (updateError) throw updateError;

      // Log approval action
      const { error: logError } = await (supabase as any).from("approval_actions").insert({
        request_type: requestType,
        request_id: requestId,
        action_type: actionType,
        performed_by: user.id,
        performer_role: role,
        performer_name: profile?.full_name || "",
        old_status: oldStatus,
        new_status: newStatus,
        notes: notes || null,
      } as any);
      if (logError) throw logError;

      // If approved, assign the role in user_roles, update profile, and seed student records
      if (newStatus === "approved" && requestType === "registration") {
        const { data: regReq } = await supabase
          .from("registration_requests")
          .select(
            "user_id, requested_role, full_name, full_name_ar, national_id, parent_national_id, stage_id, grade_number, school_id, governorate_id, administration_id",
          )
          .eq("id", requestId)
          .single();

        if (regReq && (regReq as any).user_id) {
          const uid = (regReq as any).user_id as string;
          const reqRole = (regReq as any).requested_role as string;
          const national_id = (regReq as any).national_id as string | null;
          const parent_national_id = (regReq as any).parent_national_id as string | null;
          const stage_id = (regReq as any).stage_id as string | null;
          const grade_number = (regReq as any).grade_number as number | null;
          const school_id = (regReq as any).school_id as string | null;
          const governorate_id = (regReq as any).governorate_id as string | null;
          const administration_id = (regReq as any).administration_id as string | null;
          const full_name = (regReq as any).full_name as string;
          const full_name_ar = (regReq as any).full_name_ar as string;

          // 1. Assign role (ignore conflict if already assigned)
          await (supabase as any).from("user_roles").upsert({
            user_id: uid,
            role: reqRole,
          }, { onConflict: "user_id,role", ignoreDuplicates: true });

          // 2. Update profile (school scope for dashboards)
          await (supabase as any).from("profiles").update({
            full_name,
            full_name_ar,
            national_id,
            school_id,
            governorate_id,
          } as any).eq("id", uid);

          // 3. Scope row — school dashboard filters on this (or profile fallback)
          await (supabase as any).from("user_scope_assignments").upsert(
            {
              user_id: uid,
              role: reqRole,
              governorate_id,
              administration_id,
              school_id,
              assigned_by: user.id,
              is_active: true,
              notes: "Approved registration",
            },
            { onConflict: "user_id,role" },
          );

          // 4. Teacher row for school admin lists
          if (reqRole === "teacher") {
            const { data: existingTeacher } = await (supabase as any)
              .from("teachers")
              .select("id")
              .eq("user_id", uid)
              .maybeSingle();
            if (!existingTeacher) {
              await (supabase as any).from("teachers").insert({
                user_id: uid,
                full_name,
                school_id,
                national_id,
              } as any);
            } else {
              await (supabase as any)
                .from("teachers")
                .update({ full_name, school_id, national_id } as any)
                .eq("id", (existingTeacher as any).id);
            }
          }

          // 5. Student: students + student_profiles
          if (reqRole === "student") {
            const { data: existingStudent } = await (supabase as any)
              .from("students")
              .select("id")
              .eq("user_id", uid)
              .maybeSingle();

            if (!existingStudent) {
              await (supabase as any).from("students").insert({
                user_id: uid,
                full_name,
                national_id,
                parent_national_id,
                school_id,
                grade_number,
                stage_id,
              } as any);
            } else {
              await (supabase as any)
                .from("students")
                .update({
                  full_name,
                  national_id,
                  parent_national_id,
                  school_id,
                  grade_number,
                  stage_id,
                } as any)
                .eq("id", (existingStudent as any).id);
            }

            await (supabase as any).from("student_profiles").upsert(
              {
                user_id: uid,
                full_name,
                full_name_ar,
                national_id,
                grade_number,
                stage_id,
                school_id,
                academic_year: "2025-2026",
              } as any,
              { onConflict: "user_id", ignoreDuplicates: false },
            );
          }
        }
      }

      // Log status history
      await supabase.from("request_status_history" as any).insert({
        request_type: requestType,
        request_id: requestId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: user.id,
        note: notes || `${actionType} by ${role}`,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registration_requests"] });
      queryClient.invalidateQueries({ queryKey: ["role_change_requests"] });
      queryClient.invalidateQueries({ queryKey: ["transfer_requests"] });
      queryClient.invalidateQueries({ queryKey: ["parent_child_link_requests"] });
      queryClient.invalidateQueries({ queryKey: ["approval_actions"] });
      queryClient.invalidateQueries({ queryKey: ["request_status_history"] });
      queryClient.invalidateQueries({ queryKey: ["user_scope"] });
      queryClient.invalidateQueries({ queryKey: ["school_teachers"] });
      queryClient.invalidateQueries({ queryKey: ["school_students"] });
      queryClient.invalidateQueries({ queryKey: ["school_classes"] });
      queryClient.invalidateQueries({ queryKey: ["school_teacher_class_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["school_parents"] });
    },
  });
}

export function useSubmitRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<RegistrationRequest>) => {
      const { error } = await supabase.from("registration_requests").insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["registration_requests"] }),
  });
}

export function useSubmitRoleChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<RoleChangeRequest>) => {
      const { error } = await (supabase as any).from("role_change_requests").insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["role_change_requests"] }),
  });
}

export function useSubmitTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<TransferRequest>) => {
      const { error } = await (supabase as any).from("transfer_requests").insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transfer_requests"] }),
  });
}

export function useSubmitParentChildLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<ParentChildLinkRequest>) => {
      const { error } = await (supabase as any).from("parent_child_link_requests").insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parent_child_link_requests"] }),
  });
}

// File upload helper
export async function uploadGovernanceDoc(file: File, requestId: string, requestType: string): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${requestType}/${requestId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("governance-docs").upload(path, file);
  if (error) throw error;
  return path;
}

export function getGovernanceDocUrl(path: string): string {
  const { data } = supabase.storage.from("governance-docs").getPublicUrl(path);
  return data.publicUrl;
}
