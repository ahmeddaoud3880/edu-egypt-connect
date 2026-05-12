const AI_BASE_URL = import.meta.env.VITE_AI_API_URL || "http://localhost:8000";

export interface ChatHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  user_id: string;
  role: string;
  message: string;
  provider?: string;
  model?: string;
  /** Pass the active chat_id so the agent loads session memory (last 8 msgs + session_context). */
  chat_id?: string | null;
  /** Recent in-memory turns to give the agent short-term context. */
  history?: ChatHistoryEntry[];
}

export interface ChatResponse {
  response: string;
  user_id: string;
  role: string;
  provider: string;
  model: string;
  support_ui?: Record<string, unknown> | null;
}

/** Cache metadata from GET /providers for the OpenRouter free-model list. */
export interface OpenRouterFreeModelsMeta {
  fetched_at?: string | null;
  count?: number;
  source?: string;
  error?: string | null;
  ttl_seconds?: number;
}

export interface AIProvider {
  id: string;
  name: string;
  configured: boolean;
  default_model: string;
  models: { id: string; name: string }[];
  openrouter_free_models?: OpenRouterFreeModelsMeta;
}

function readFastApiErrorDetail(body: Record<string, unknown>): string {
  const d = body.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d
      .map((x: unknown) => {
        if (x && typeof x === "object" && "msg" in x) return String((x as { msg: string }).msg);
        return JSON.stringify(x);
      })
      .join("; ");
  }
  return "AI service error";
}

export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${AI_BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(readFastApiErrorDetail(err));
  }
  return res.json();
}

export async function getProviders(): Promise<AIProvider[]> {
  const res = await fetch(`${AI_BASE_URL}/providers`);
  if (!res.ok) throw new Error("Failed to fetch providers");
  const data = await res.json();
  return data.providers;
}

export async function getCurrentProvider(): Promise<{ provider: string; model: string; available_models: { id: string; name: string }[] }> {
  const res = await fetch(`${AI_BASE_URL}/providers/current`);
  if (!res.ok) throw new Error("Failed to fetch current provider");
  return res.json();
}

export async function setProvider(provider: string, model: string, api_key?: string): Promise<void> {
  const res = await fetch(`${AI_BASE_URL}/providers/set`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, model, api_key }),
  });
  if (!res.ok) throw new Error("Failed to set provider");
}

export async function checkAIHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${AI_BASE_URL}/`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Call after changing active credential in Supabase so the agent picks it up immediately. */
export async function refreshAICredentialsCache(): Promise<void> {
  await fetch(`${AI_BASE_URL}/providers/refresh-cache`, { method: "POST" }).catch(() => {});
}

/** Re-fetch OpenRouter /models on the agent and rebuild the free-tier list (also auto-runs every ~6h). */
export async function refreshOpenRouterFreeModelsList(): Promise<OpenRouterFreeModelsMeta> {
  const res = await fetch(`${AI_BASE_URL}/providers/openrouter/free-models/refresh`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to refresh OpenRouter free models");
  const data = (await res.json()) as { openrouter_free_models?: OpenRouterFreeModelsMeta };
  return data.openrouter_free_models ?? {};
}
