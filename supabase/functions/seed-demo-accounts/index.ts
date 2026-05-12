import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Scope = {
  governorate_id?: string;
  administration_id?: string;
  school_id?: string;
};

const DEMO_ACCOUNTS = [
  { email: "demo-ministry@edu.gov.eg", password: "Demo@2026!", role: "ministry", name: "Ahmed Mohamed Hassan", nameAr: "أحمد محمد حسن", scope: {} as Scope },
  { email: "demo-directorate@edu.gov.eg", password: "Demo@2026!", role: "directorate", name: "Mahmoud Ali Ibrahim", nameAr: "محمود على إبراهيم", scope: { governorate_id: "a1000000-0000-0000-0000-000000000001" } },
  { email: "demo-admin@edu.gov.eg", password: "Demo@2026!", role: "administration", name: "Khaled Mostafa Saeed", nameAr: "خالد مصطفى سعيد", scope: { governorate_id: "a1000000-0000-0000-0000-000000000001", administration_id: "b1000000-0000-0000-0000-000000000001" } },
  { email: "demo-school@edu.gov.eg", password: "Demo@2026!", role: "school", name: "Hassan Ibrahim Mohamed", nameAr: "حسن إبراهيم محمد", scope: { governorate_id: "a1000000-0000-0000-0000-000000000001", administration_id: "b1000000-0000-0000-0000-000000000001", school_id: "c1000000-0000-0000-0000-000000000001" } },
  { email: "demo-teacher@edu.gov.eg", password: "Demo@2026!", role: "teacher", name: "Omar Youssef Adel", nameAr: "عمر يوسف عادل", scope: { governorate_id: "a1000000-0000-0000-0000-000000000001", administration_id: "b1000000-0000-0000-0000-000000000001", school_id: "c1000000-0000-0000-0000-000000000001" } },
  { email: "demo-student@edu.gov.eg", password: "Demo@2026!", role: "student", name: "Youssef Ahmed Ali", nameAr: "يوسف أحمد على", scope: { governorate_id: "a1000000-0000-0000-0000-000000000001", administration_id: "b1000000-0000-0000-0000-000000000001", school_id: "c1000000-0000-0000-0000-000000000001" } },
  { email: "demo-parent@edu.gov.eg", password: "Demo@2026!", role: "parent", name: "Mohamed Samir Hassan", nameAr: "محمد سمير حسن", scope: { governorate_id: "a1000000-0000-0000-0000-000000000001", administration_id: "b1000000-0000-0000-0000-000000000001", school_id: "c1000000-0000-0000-0000-000000000001" } },
  { email: "demo-support@edu.gov.eg", password: "Demo@2026!", role: "support", name: "Ali Kamal Nasser", nameAr: "على كمال ناصر", scope: {} as Scope },
  { email: "demo-support2@edu.gov.eg", password: "Demo@2026!", role: "support", name: "Sara Mohamed Fathy", nameAr: "سارة محمد فتحى", scope: {} as Scope },
];

async function upsertDemoRegistration(
  admin: ReturnType<typeof createClient>,
  userId: string,
  acct: (typeof DEMO_ACCOUNTS)[0],
): Promise<{ ok: boolean; message: string }> {
  const s = acct.scope;
  const approvedAt = new Date().toISOString();
  const row = {
    user_id: userId,
    email: acct.email,
    full_name: acct.name,
    full_name_ar: acct.nameAr,
    phone: null as string | null,
    national_id: null as string | null,
    parent_national_id: null as string | null,
    requested_role: acct.role,
    request_status: "approved",
    is_demo: true,
    notes: "Demo account — seed-demo-accounts edge function",
    governorate_id: s.governorate_id ?? null,
    administration_id: s.administration_id ?? null,
    school_id: s.school_id ?? null,
    approved_at: approvedAt,
    approved_by: null as string | null,
  };

  const { data: byUser } = await admin.from("registration_requests").select("id").eq("user_id", userId).maybeSingle();
  if (byUser?.id) {
    const { error } = await admin.from("registration_requests").update(row).eq("id", byUser.id);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "updated" };
  }

  const { data: byEmail } = await admin.from("registration_requests").select("id").eq("email", acct.email).maybeSingle();
  if (byEmail?.id) {
    const { error } = await admin.from("registration_requests").update(row).eq("id", byEmail.id);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "updated_by_email" };
  }

  const { error } = await admin.from("registration_requests").insert(row);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "inserted" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: initialList } = await admin.auth.admin.listUsers({ perPage: 200 });
    const usersByEmail = new Map((initialList?.users ?? []).map((u: { email?: string; id: string }) => [u.email, u]));

    const results: { email: string; status: string; auth: string; registration: string }[] = [];

    for (const acct of DEMO_ACCOUNTS) {
      let authStatus = "";
      let userId: string;

      const found = usersByEmail.get(acct.email) as { id: string } | undefined;
      if (found) {
        userId = found.id;
        authStatus = "exists";
      } else {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: acct.email,
          password: acct.password,
          email_confirm: true,
          user_metadata: { full_name: acct.name },
        });
        if (createErr) {
          results.push({ email: acct.email, status: `error: ${createErr.message}`, auth: `error: ${createErr.message}`, registration: "skipped" });
          continue;
        }
        userId = created.user.id;
        usersByEmail.set(acct.email, created.user);
        authStatus = "created";
      }

      await admin.from("user_roles").upsert(
        { user_id: userId, role: acct.role },
        { onConflict: "user_id,role" },
      );

      await admin.from("profiles").upsert(
        { user_id: userId, email: acct.email, full_name: acct.name, full_name_ar: acct.nameAr },
        { onConflict: "user_id" },
      );

      const scopeData: Record<string, unknown> = { user_id: userId, role: acct.role, is_active: true, notes: "Demo account scope", ...acct.scope };
      const { data: existingScope } = await admin.from("user_scope_assignments").select("id").eq("user_id", userId).limit(1).maybeSingle();
      if (!existingScope) {
        await admin.from("user_scope_assignments").insert(scopeData);
      }

      const reg = await upsertDemoRegistration(admin, userId, acct);
      const registration = reg.ok ? reg.message : `error: ${reg.message}`;

      results.push({ email: acct.email, status: authStatus, auth: authStatus, registration });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
