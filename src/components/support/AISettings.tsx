import { useState, useEffect, useCallback } from "react";
import {
  getProviders,
  getCurrentProvider,
  checkAIHealth,
  refreshAICredentialsCache,
  refreshOpenRouterFreeModelsList,
  AIProvider,
} from "@/services/aiService";
import {
  listSupportAiCredentials,
  addSupportAiCredential,
  activateSupportAiCredential,
  deleteSupportAiCredential,
  bulkAddOpenRouterCredentials,
  parseOpenRouterKeysFromPaste,
  type SupportAiCredentialRow,
} from "@/services/supportAiCredentials";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bot,
  Check,
  AlertCircle,
  Settings,
  Key,
  Zap,
  RefreshCw,
  Trash2,
  Star,
  Plus,
  Layers,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SubjectConfigPanel } from "./SubjectConfigPanel";

const PROVIDER_ICONS: Record<string, string> = {
  agentrouter: "🔀",
  openrouter: "🌌",
  openai: "🤖",
  groq: "⚡",
  gemini: "💎",
  ollama: "🦙",
};

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  agentrouter: "AgentRouter — OpenAI-compatible proxy for multiple models",
  openrouter: "Free-tier list from OpenRouter API ($0 prompt & completion, plus :free ids); refresh from settings.",
  openai: "OpenAI direct — GPT-4o, GPT-4o Mini",
  groq: "Ultra-fast inference — Llama, Mixtral",
  gemini: "Google Gemini 2.0 Flash, 1.5 Pro",
  ollama: "Local models — runs on your machine",
};

function maskApiKey(key: string): string {
  const t = key.trim();
  if (!t) return "—";
  if (t.length <= 6) return "••••••";
  return `••••${t.slice(-4)}`;
}

export function AISettings() {
  const { user, role: authRole } = useAuth();
  const [subjectConfigOpen, setSubjectConfigOpen] = useState(false);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [currentProvider, setCurrentProviderState] = useState<string>("agentrouter");
  const [currentModel, setCurrentModel] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("agentrouter");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelId, setCustomModelId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [activateOnSave, setActivateOnSave] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const [credentials, setCredentials] = useState<SupportAiCredentialRow[]>([]);
  const [credActionId, setCredActionId] = useState<string | null>(null);
  const [bulkPaste, setBulkPaste] = useState("");
  const [bulkActivateNum, setBulkActivateNum] = useState("");
  const [bulkImportModel, setBulkImportModel] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [freeModelsRefreshing, setFreeModelsRefreshing] = useState(false);

  const activeProvider = providers.find(p => p.id === selectedProvider);
  const openrouterProvider = providers.find(p => p.id === "openrouter");
  const models = activeProvider?.models || [];

  const effectiveModel =
    selectedProvider === "ollama"
      ? (isCustomModel ? customModelId.trim() : selectedModel)
      : isCustomModel
        ? customModelId.trim()
        : selectedModel;

  const loadCredentials = useCallback(async () => {
    try {
      const rows = await listSupportAiCredentials();
      setCredentials(rows);
    } catch {
      setCredentials([]);
    }
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [provList, current, health] = await Promise.all([
        getProviders(),
        getCurrentProvider(),
        checkAIHealth(),
      ]);
      setProviders(provList);
      setCurrentProviderState(current.provider);
      setCurrentModel(current.model);
      setSelectedProvider(current.provider);
      setSelectedModel(current.model);
      const providerConfig = provList.find(p => p.id === current.provider);
      const isCustom = providerConfig ? !providerConfig.models.find(m => m.id === current.model) : false;
      if (isCustom) {
        setIsCustomModel(true);
        setCustomModelId(current.model);
      }
      setOnline(health);
      await loadCredentials();
    } catch {
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [loadCredentials]);

  useEffect(() => {
    if (openrouterProvider && bulkImportModel === "") {
      setBulkImportModel(openrouterProvider.default_model);
    }
  }, [openrouterProvider, bulkImportModel]);

  async function handleSaveCredential() {
    if (!user?.id) {
      alert("يجب تسجيل الدخول أولاً.\nYou must be signed in to save credentials.");
      return;
    }
    if (authRole != null && authRole !== "support") {
      alert(
        "حفظ المفاتيح مسموح فقط لحسابات دور «الدعم» في قاعدة البيانات (جدول user_roles).\n إذا فتحت الصفحة عبر ?role=support بينما دورك الفعلي مختلف، سيمنعك Supabase من الحفظ.\n\nAPI key storage is only for accounts with the support role in user_roles."
      );
      return;
    }
    if (!effectiveModel) {
      alert("اختر أو أدخل نموذجاً.\nSelect or enter a model.");
      return;
    }
    const keyTrim = newApiKey.trim();
    if (selectedProvider !== "ollama" && !keyTrim) {
      alert(
        "أدخل مفتاح API (المتصفح قد يملأ الحقل تلقائياً دون تسجيله — جرّب الكتابة يدوياً أو الصق المفتاح).\nEnter an API key (browsers sometimes autofill without updating the form — try typing or pasting the key)."
      );
      return;
    }

    setSaving(true);
    try {
      await addSupportAiCredential({
        label: newLabel || `${selectedProvider} · ${new Date().toLocaleString()}`,
        provider: selectedProvider,
        model: effectiveModel,
        api_key: selectedProvider === "ollama" ? "" : keyTrim,
        created_by: user.id,
        makeActive: activateOnSave,
      });
      await loadCredentials();
      await refreshAICredentialsCache();
      const [provList, current] = await Promise.all([getProviders(), getCurrentProvider()]);
      setProviders(provList);
      setCurrentProviderState(current.provider);
      setCurrentModel(current.model);
      setNewApiKey("");
      setNewLabel("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(
        `فشل الحفظ:\n${msg}\n\nتحقق من: تطبيق migration للجدول support_ai_api_credentials، ووجود دور support في user_roles.\n\nSave failed: ${msg}`
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkOpenRouterImport() {
    if (!user?.id) {
      alert("يجب تسجيل الدخول أولاً.\nYou must be signed in to save credentials.");
      return;
    }
    if (authRole != null && authRole !== "support") {
      alert(
        "حفظ المفاتيح مسموح فقط لحسابات دور «الدعم» في قاعدة البيانات (جدول user_roles).\n\nAPI key storage is only for accounts with the support role in user_roles."
      );
      return;
    }
    const keys = parseOpenRouterKeysFromPaste(bulkPaste);
    if (!keys.length) {
      alert(
        "لم يُعثر على مفاتيح. الصق مصفوفة JSON أو سطراً لكل مفتاح sk-…\nNo keys found. Paste a JSON array, or one key per line."
      );
      return;
    }
    const model =
      bulkImportModel.trim() ||
      (selectedProvider === "openrouter" ? effectiveModel : "") ||
      openrouterProvider?.default_model ||
      "";
    if (!model) {
      alert("اختر نموذج OpenRouter.\nSelect an OpenRouter model.");
      return;
    }
    const rawN = bulkActivateNum.trim();
    const parsed = rawN === "" ? NaN : Number.parseInt(rawN, 10);
    const activateLabelNumber =
      Number.isFinite(parsed) && parsed >= 1 && parsed <= keys.length ? parsed : null;

    setBulkSaving(true);
    try {
      await bulkAddOpenRouterCredentials({
        keys,
        model,
        created_by: user.id,
        activateLabelNumber,
      });
      await loadCredentials();
      await refreshAICredentialsCache();
      const [provList, current] = await Promise.all([getProviders(), getCurrentProvider()]);
      setProviders(provList);
      setCurrentProviderState(current.provider);
      setCurrentModel(current.model);
      setBulkPaste("");
      setBulkActivateNum("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`فشل الاستيراد:\n${msg}\n\nImport failed: ${msg}`);
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleRefreshOpenRouterFreeModels() {
    setFreeModelsRefreshing(true);
    try {
      await refreshOpenRouterFreeModelsList();
      const [provList, current, health] = await Promise.all([
        getProviders(),
        getCurrentProvider(),
        checkAIHealth(),
      ]);
      setProviders(provList);
      setCurrentProviderState(current.provider);
      setCurrentModel(current.model);
      setOnline(health);
      const or = provList.find(p => p.id === "openrouter");
      if (or && selectedProvider === "openrouter") {
        const still = or.models.some(m => m.id === selectedModel);
        if (!still && or.default_model) {
          setSelectedModel(or.default_model);
          setIsCustomModel(false);
          setCustomModelId("");
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`تعذّر تحديث قائمة النماذج المجانية. تأكد أن الوكيل يعمل.\n\nRefresh failed: ${msg}`);
    } finally {
      setFreeModelsRefreshing(false);
    }
  }

  async function handleActivate(id: string) {
    setCredActionId(id);
    try {
      await activateSupportAiCredential(id);
      await loadCredentials();
      await refreshAICredentialsCache();
      const [provList, current] = await Promise.all([getProviders(), getCurrentProvider()]);
      setProviders(provList);
      setCurrentProviderState(current.provider);
      setCurrentModel(current.model);
    } catch {
      alert("Failed to activate credential.");
    } finally {
      setCredActionId(null);
    }
  }

  async function handleDelete(id: string, isActive: boolean) {
    if (!confirm(isActive ? "Delete the active credential? The agent will fall back to .env if nothing else is active." : "Delete this credential?")) return;
    setCredActionId(id);
    try {
      await deleteSupportAiCredential(id);
      await loadCredentials();
      await refreshAICredentialsCache();
      const [provList, current] = await Promise.all([getProviders(), getCurrentProvider()]);
      setProviders(provList);
      setCurrentProviderState(current.provider);
      setCurrentModel(current.model);
    } catch {
      alert("Failed to delete credential.");
    } finally {
      setCredActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-lg border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">AI Agent Settings</h2>
              <p className="text-xs text-muted-foreground">
                Credentials are stored in Supabase; the agent uses the active row (service role).
              </p>
            </div>
          </div>
          <div
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${
              online
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {online ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {online ? "Agent Online" : "Agent Offline"}
          </div>
        </div>

        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
          <Zap className="w-4 h-4 text-primary shrink-0" />
          <div className="text-sm">
            <span className="text-muted-foreground">Active in agent: </span>
            <span className="font-semibold text-foreground">
              {PROVIDER_ICONS[currentProvider]} {currentProvider.toUpperCase()}
            </span>
            <span className="text-muted-foreground mx-2">→</span>
            <span className="font-mono text-xs text-primary">{currentModel}</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-5">
        <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
          <Key className="w-4 h-4" /> Saved API keys
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          يمكنك حفظ عدة مفاتيح ثم تفعيل أحدهم فقط للوكيل. المفتاح النشط يُطبَّق على المحادثات بعد بضع ثوانٍ أو فور طلب التحديث.
        </p>
        {credentials.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
            لا توجد مفاتيح محفوظة بعد. أضف واحداً من القسم أدناه.
          </p>
        ) : (
          <div className="space-y-2">
            {credentials.map(row => (
              <div
                key={row.id}
                className={`flex flex-wrap items-center gap-3 justify-between p-3 rounded-lg border text-sm ${
                  row.is_active ? "border-primary/40 bg-primary/5" : "border-border bg-background/50"
                }`}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground truncate">{row.label || row.provider}</span>
                    {row.is_active && (
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {PROVIDER_ICONS[row.provider]} {row.provider} → <span className="font-mono">{row.model}</span>
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{maskApiKey(row.api_key)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!row.is_active && (
                    <button
                      type="button"
                      disabled={credActionId !== null}
                      onClick={() => handleActivate(row.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Star className="w-3.5 h-3.5" />
                      تفعيل
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={credActionId !== null}
                    onClick={() => handleDelete(row.id, row.is_active)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-5">
        <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4" /> Select AI Provider
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {providers.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedProvider(p.id);
                setSelectedModel(p.default_model);
                setIsCustomModel(false);
                setCustomModelId("");
              }}
              className={`relative p-4 rounded-lg border text-left transition-all ${
                selectedProvider === p.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              {selectedProvider === p.id && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="text-2xl mb-2">{PROVIDER_ICONS[p.id]}</div>
              <div className="font-semibold text-foreground text-sm capitalize">{p.id}</div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{PROVIDER_DESCRIPTIONS[p.id]}</div>
              <div
                className={`mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full inline-block ${
                  p.configured ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {p.configured ? "✓ Configured" : "⚠ Needs API Key"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {openrouterProvider && (
        <div className="bg-surface-elevated rounded-lg border border-border p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground space-y-1 min-w-[200px]">
            <p className="font-medium text-foreground">OpenRouter — النماذج المجانية (من واجهة OpenRouter)</p>
            <p dir="ltr" className="font-mono text-[11px]">
              {openrouterProvider.openrouter_free_models?.count ?? openrouterProvider.models.length} models ·{" "}
              {openrouterProvider.openrouter_free_models?.source ?? "—"}
              {openrouterProvider.openrouter_free_models?.fetched_at
                ? ` · ${new Date(openrouterProvider.openrouter_free_models.fetched_at).toLocaleString()}`
                : ""}
            </p>
            {openrouterProvider.openrouter_free_models?.error ? (
              <p className="text-amber-800 dark:text-amber-400">
                آخر خطأ جلب: {openrouterProvider.openrouter_free_models.error}
              </p>
            ) : null}
            <p className="text-[11px] leading-relaxed">
              يُحدَّث الوكيل القائمة تلقائياً كل ~6 ساعات؛ استخدم الزر لسحب أحدث النماذج المجانية (القديمة والجديدة).
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefreshOpenRouterFreeModels}
            disabled={freeModelsRefreshing || online === false}
            title={online === false ? "الوكيل غير متصل" : undefined}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted/50 disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${freeModelsRefreshing ? "animate-spin" : ""}`} />
            تحديث النماذج المجانية
          </button>
        </div>
      )}

      <div className="bg-surface-elevated rounded-lg border border-border p-5 space-y-4">
        <h3 className="font-medium text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add credential (هذا المزود + النموذج + المفتاح)
        </h3>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Label (optional)</label>
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="e.g. Production OpenRouter"
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Model</label>
          <select
            value={isCustomModel ? "custom" : selectedModel}
            onChange={e => {
              if (e.target.value === "custom") {
                setIsCustomModel(true);
                setCustomModelId("");
              } else {
                setIsCustomModel(false);
                setSelectedModel(e.target.value);
              }
            }}
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            <option value="custom">إضافة نموذج مخصص (Custom Model)</option>
          </select>
        </div>

        {isCustomModel && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Custom Model ID</label>
            <input
              type="text"
              value={customModelId}
              onChange={e => setCustomModelId(e.target.value)}
              placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
              dir="ltr"
            />
          </div>
        )}

        {selectedProvider !== "ollama" && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">API Key</label>
            <input
              type="password"
              name="support-ai-api-key"
              autoComplete="off"
              value={newApiKey}
              onChange={e => setNewApiKey(e.target.value)}
              onInput={e => setNewApiKey((e.target as HTMLInputElement).value)}
              placeholder="sk-..."
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground font-mono focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {selectedProvider === "ollama" && (
          <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            Ollama runs locally — no API key. The saved row stores an empty key.
          </div>
        )}

        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={activateOnSave}
            onChange={e => setActivateOnSave(e.target.checked)}
            className="rounded border-border"
          />
          تفعيل هذا المفتاح فور الحفظ
        </label>

        {authRole != null && authRole !== "support" && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            تنبيه: حفظ المفاتيح يعمل فقط إذا كان دور حسابك في المنصة <strong>support</strong> (جدول user_roles)، وليس فقط فتح الرابط بـ ?role=support.
          </p>
        )}

        <button
          type="button"
          onClick={handleSaveCredential}
          disabled={saving || !effectiveModel}
          title={
            !effectiveModel
              ? "اختر نموذجاً أولاً / Pick a model first"
              : saving
                ? "..."
                : "Save"
          }
          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            saved
              ? "bg-green-500 text-white"
              : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          }`}
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {saving ? "Saving..." : saved ? "Saved!" : "Save credential to database"}
        </button>
      </div>

      {openrouterProvider && (
        <div className="bg-surface-elevated rounded-lg border border-border p-5 space-y-4">
          <h3 className="font-medium text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4" /> Bulk import — OpenRouter (labels 1, 2, 3 …)
          </h3>
          <p className="text-xs text-muted-foreground">
            Each saved row uses label{" "}
            <span className="font-mono text-foreground">1</span>,{" "}
            <span className="font-mono text-foreground">2</span>, … for the order of keys after deduplication. Paste
            JSON <span className="font-mono">[&quot;key&quot;: &quot;sk-…&quot;]</span> or one <span className="font-mono">sk-</span> line per row.
          </p>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Model for imported keys</label>
            <select
              value={bulkImportModel || openrouterProvider.default_model}
              onChange={e => setBulkImportModel(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
            >
              {openrouterProvider.models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Keys (paste)</label>
            <textarea
              value={bulkPaste}
              onChange={e => setBulkPaste(e.target.value)}
              rows={8}
              placeholder='[{"key":"sk-or-v1-…"}, …] or sk-or-v1-… per line'
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground font-mono focus:outline-none focus:border-primary resize-y min-h-[120px]"
              dir="ltr"
              spellCheck={false}
            />
            {bulkPaste.trim() ? (
              <p className="text-xs text-muted-foreground mt-1.5">
                Detected:{" "}
                <span className="font-mono text-foreground">{parseOpenRouterKeysFromPaste(bulkPaste).length}</span> key(s)
              </p>
            ) : null}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Activate label # (optional, 1 = first key)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={bulkActivateNum}
              onChange={e => setBulkActivateNum(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="e.g. 2 — leave empty to import without activating"
              className="w-full max-w-xs text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
              dir="ltr"
            />
          </div>
          {authRole != null && authRole !== "support" && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              تنبيه: الاستيراد يعمل فقط مع دور <strong>support</strong> في user_roles.
            </p>
          )}
          <button
            type="button"
            onClick={handleBulkOpenRouterImport}
            disabled={bulkSaving || !bulkPaste.trim()}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {bulkSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            {bulkSaving ? "Importing…" : "Import OpenRouter keys to database"}
          </button>
        </div>
      )}

      {activeProvider && (
        <div className="bg-surface-elevated rounded-lg border border-border p-5">
          <h3 className="font-medium text-foreground mb-3 text-sm">Available Models — {activeProvider.id}</h3>
          <div className="space-y-1.5">
            {models.map(m => (
              <div
                key={m.id}
                className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                  !isCustomModel && selectedModel === m.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/30"
                }`}
              >
                <span className="font-mono text-foreground">{m.id}</span>
                <span className="text-muted-foreground">{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subject Configuration */}
      <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center gap-3 px-5 py-4 text-start hover:bg-muted/20 transition-colors"
          onClick={() => setSubjectConfigOpen(o => !o)}
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">إعداد المواد الدراسية</h3>
            <p className="text-xs text-muted-foreground">تحديد المواد الإلزامية والاختيارية لكل مرحلة وصف دراسي</p>
          </div>
          {subjectConfigOpen
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {subjectConfigOpen && (
          <div className="p-5 border-t border-border">
            <SubjectConfigPanel />
          </div>
        )}
      </div>
    </div>
  );
}
