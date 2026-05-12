/**
 * Insert OpenRouter API keys into support_ai_api_credentials (labels "1", "2", …).
 * Uses the service role key so RLS does not block inserts.
 *
 * Setup: add keys to a LOCAL file (gitignored), e.g. openrouter-keys.local.json
 *
 *   npm run import:openrouter-keys -- openrouter-keys.local.json
 *   npm run import:openrouter-keys -- openrouter-keys.local.json --activate=2
 *
 * Env (.env): VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: IMPORT_OPENROUTER_CREATED_BY=<auth user uuid>
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env") });

function parseKeysFromJson(text) {
  const t = text.trim();
  let keys = [];
  if (t.startsWith("[")) {
    const arr = JSON.parse(t);
    if (!Array.isArray(arr)) throw new Error("JSON root must be an array");
    for (const item of arr) {
      if (item && typeof item === "object" && typeof item.key === "string" && item.key.trim()) {
        keys.push(item.key.trim());
      }
    }
  } else {
    const root = JSON.parse(t);
    if (root && Array.isArray(root.keys)) {
      for (const item of root.keys) {
        if (typeof item === "string" && item.trim()) keys.push(item.trim());
        else if (item && typeof item.key === "string" && item.key.trim()) keys.push(item.key.trim());
      }
    } else throw new Error('Expected JSON array or { "keys": [...] }');
  }
  return [...new Set(keys)];
}

function parseArgs(argv) {
  const pos = argv.filter(a => !a.startsWith("--"));
  const flags = Object.fromEntries(
    argv
      .filter(a => a.startsWith("--"))
      .map(a => {
        const [k, ...rest] = a.slice(2).split("=");
        return [k, rest.length ? rest.join("=") : true];
      }),
  );
  return { file: pos[0] || null, activate: flags.activate ? Number(flags.activate) : null, model: flags.model || "openrouter/free", dry: Boolean(flags["dry-run"]) };
}

async function main() {
  const { file, activate, model, dry } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error('Usage: node scripts/import_openrouter_keys.js <keys.json> [--activate=N] [--model=openrouter/free] [--dry-run]');
    process.exit(1);
  }

  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) {
    console.error("File not found:", path);
    process.exit(1);
  }

  const text = readFileSync(path, "utf8");
  const keys = parseKeysFromJson(text);
  if (!keys.length) {
    console.error("No keys found in file.");
    process.exit(1);
  }

  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const createdBy = process.env.IMPORT_OPENROUTER_CREATED_BY?.trim() || null;
  const activateIndex = activate != null && Number.isFinite(activate) && activate >= 1 ? Math.floor(activate) : null;

  console.log(`Keys: ${keys.length}, model: ${model}, activate label: ${activateIndex ?? "(none)"}, dry-run: ${dry}`);

  if (dry) {
    keys.forEach((k, i) => console.log(`  ${i + 1}. ${k.slice(0, 12)}…`));
    process.exit(0);
  }

  const supabase = createClient(url, serviceKey);
  const insertedIds = [];

  for (let i = 0; i < keys.length; i++) {
    const label = String(i + 1);
    const { data, error } = await supabase
      .from("support_ai_api_credentials")
      .insert({
        label,
        provider: "openrouter",
        model,
        api_key: keys[i],
        is_active: false,
        created_by: createdBy,
      })
      .select("id")
      .single();

    if (error) {
      console.error(`Insert failed at label ${label}:`, error.message);
      process.exit(1);
    }
    insertedIds.push(data.id);
    console.log(`Inserted label ${label} → ${data.id}`);
  }

  if (activateIndex != null && activateIndex <= insertedIds.length) {
    const id = insertedIds[activateIndex - 1];
    const { error: uerr } = await supabase.from("support_ai_api_credentials").update({ is_active: true }).eq("id", id);
    if (uerr) {
      console.error("Activate failed:", uerr.message);
      process.exit(1);
    }
    console.log(`Activated label ${activateIndex} (${id}).`);
  }

  console.log("Done. Restart the AI agent or POST /providers/refresh-cache if needed.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
