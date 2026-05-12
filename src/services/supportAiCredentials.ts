import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SupportAiCredentialRow = Database["public"]["Tables"]["support_ai_api_credentials"]["Row"];

type Ins = Database["public"]["Tables"]["support_ai_api_credentials"]["Insert"];

export async function listSupportAiCredentials(): Promise<SupportAiCredentialRow[]> {
  const { data, error } = await supabase
    .from("support_ai_api_credentials")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SupportAiCredentialRow[];
}

export async function addSupportAiCredential(params: {
  label: string;
  provider: string;
  model: string;
  api_key: string;
  created_by: string;
  makeActive?: boolean;
}): Promise<SupportAiCredentialRow> {
  const insert: Ins = {
    label: params.label.trim() || params.provider,
    provider: params.provider,
    model: params.model,
    api_key: params.provider === "ollama" ? "" : params.api_key.trim(),
    created_by: params.created_by,
    is_active: params.makeActive ?? false,
  };
  const { data, error } = await supabase.from("support_ai_api_credentials").insert(insert).select().single();
  if (error) {
    const hint = [error.message, error.hint, error.details].filter(Boolean).join(" — ");
    throw new Error(hint || "Insert failed");
  }
  return data as SupportAiCredentialRow;
}

export async function activateSupportAiCredential(id: string): Promise<void> {
  const { error } = await supabase.from("support_ai_api_credentials").update({ is_active: true }).eq("id", id);
  if (error) throw error;
}

export async function deleteSupportAiCredential(id: string): Promise<void> {
  const { error } = await supabase.from("support_ai_api_credentials").delete().eq("id", id);
  if (error) throw error;
}

export async function updateSupportAiCredentialKey(id: string, api_key: string): Promise<void> {
  const { error } = await supabase.from("support_ai_api_credentials").update({ api_key: api_key.trim() }).eq("id", id);
  if (error) throw error;
}

/** Extract OpenRouter-style keys from pasted text: JSON array of {key}, JSON objects per line, or one sk-… key per line. */
export function parseOpenRouterKeysFromPaste(text: string): string[] {
  const t = text.trim();
  if (!t) return [];

  if (t.startsWith("[")) {
    try {
      const arr = JSON.parse(t) as unknown;
      if (Array.isArray(arr)) {
        const out: string[] = [];
        for (const item of arr) {
          if (item && typeof item === "object" && "key" in item) {
            const k = (item as { key: unknown }).key;
            if (typeof k === "string" && k.trim().length > 0) out.push(k.trim());
          }
        }
        if (out.length > 0) return [...new Set(out)];
      }
    } catch {
      /* line mode below */
    }
  }

  const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const out: string[] = [];
  for (const line of lines) {
    if (line.startsWith("{")) {
      try {
        const o = JSON.parse(line) as { key?: string };
        if (o.key?.trim()) {
          out.push(o.key.trim());
          continue;
        }
      } catch {
        /* regex fallback */
      }
      const quoted = line.match(/"key"\s*:\s*"([^"]+)"/);
      if (quoted?.[1]) {
        out.push(quoted[1].trim());
        continue;
      }
      continue;
    }
    const quoted = line.match(/"key"\s*:\s*"([^"]+)"/);
    if (quoted?.[1]) {
      out.push(quoted[1].trim());
      continue;
    }
    if (/^sk-[a-z0-9_-]+$/i.test(line.replace(/\s/g, ""))) {
      out.push(line.replace(/\s/g, ""));
    }
  }
  return [...new Set(out)];
}

/** Save many OpenRouter keys with labels `1`, `2`, …; optionally activate the row with label `activateLabelNumber` (1-based). */
export async function bulkAddOpenRouterCredentials(params: {
  keys: string[];
  model: string;
  created_by: string;
  activateLabelNumber?: number | null;
}): Promise<{ created: SupportAiCredentialRow[]; activatedId: string | null }> {
  const keys = [...new Set(params.keys.map(k => k.trim()).filter(k => k.length > 0))];
  if (keys.length === 0) throw new Error("No keys to import");

  const created: SupportAiCredentialRow[] = [];
  for (let i = 0; i < keys.length; i++) {
    const row = await addSupportAiCredential({
      label: String(i + 1),
      provider: "openrouter",
      model: params.model.trim(),
      api_key: keys[i],
      created_by: params.created_by,
      makeActive: false,
    });
    created.push(row);
  }

  let activatedId: string | null = null;
  const n = params.activateLabelNumber;
  if (typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= created.length) {
    await activateSupportAiCredential(created[n - 1].id);
    activatedId = created[n - 1].id;
  }

  return { created, activatedId };
}
