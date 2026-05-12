import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global demo-data visibility hook.
 * Reads the `show_demo_data` key from `demo_config`.
 * When hidden, all queries should filter out `is_demo = true` records.
 */
export function useDemoMode() {
  const { data, isLoading } = useQuery({
    queryKey: ["demo_config"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("demo_config" as any)
        .select("key, value") as any);
      if (error) throw error;
      const config: Record<string, string> = {};
      (data || []).forEach((r: any) => { config[r.key] = r.value; });
      return config;
    },
    staleTime: 10_000,
  });

  const isDemoVisible = data?.show_demo_data === "true";

  return {
    /** true when demo records should be shown */
    isDemoVisible,
    /** true while loading config */
    isLoading,
    /** raw config map */
    config: data,
  };
}

/**
 * Helper: apply is_demo filter to a Supabase query builder.
 * Call as: applyDemoFilter(query, isDemoVisible)
 * When demo is hidden, adds .eq("is_demo", false)
 * When demo is visible, returns query unchanged.
 */
export function applyDemoFilter(
  query: any,
  isDemoVisible: boolean
): any {
  if (!isDemoVisible) {
    return query.eq("is_demo", false);
  }
  return query;
}
