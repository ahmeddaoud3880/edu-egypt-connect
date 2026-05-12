import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * EMIS School Directory Scraper/Importer
 * 
 * Attempts to scrape from the Egyptian EMIS (search.emis.gov.eg / schools.emis.gov.eg).
 * Falls back to batch import from provided JSON data.
 * 
 * Body params:
 *   - action: "scrape" | "import_batch"
 *   - governorate_name?: string (for targeted scrape)
 *   - schools?: Array<{name, name_ar, administration_name, governorate_name, school_type?, stage?, code?}>
 *   - batch_id?: string
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const body = await req.json();
    const action = body.action || "status";
    const batchId = body.batch_id || `batch-${Date.now()}`;

    if (action === "status") {
      // Return import coverage status
      const { data: coverage } = await admin.from("import_coverage").select("*").order("governorate_name");
      const { data: govs } = await admin.from("governorates").select("id, name, name_ar");
      const { data: admins } = await admin.from("administrations").select("id, name, governorate_id");
      const { count: schoolCount } = await admin.from("schools").select("id", { count: "exact", head: true }).eq("is_demo", false);
      
      return new Response(JSON.stringify({
        success: true,
        coverage,
        summary: {
          governorates: govs?.length || 0,
          administrations: admins?.length || 0,
          real_schools: schoolCount || 0,
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "scrape") {
      // Attempt to scrape EMIS — currently blocked by WAF
      const targetUrl = "https://search.emis.gov.eg/";
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const resp = await fetch(targetUrl, { 
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; EduPlatform/1.0)" }
        });
        clearTimeout(timeout);
        
        if (!resp.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: `EMIS site returned ${resp.status}. Site may be blocked or require manual browser access.`,
            recommendation: "Use 'import_batch' action with manually collected data instead.",
            import_status: "emis_blocked"
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const html = await resp.text();
        return new Response(JSON.stringify({
          success: true,
          note: "EMIS responded — HTML parsing needed",
          html_length: html.length,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (fetchErr: any) {
        return new Response(JSON.stringify({
          success: false,
          error: `EMIS unreachable: ${fetchErr.message}`,
          recommendation: "Use 'import_batch' action with manually collected data.",
          import_status: "emis_unreachable"
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (action === "import_batch") {
      const schools = body.schools || [];
      if (!schools.length) {
        return new Response(JSON.stringify({ success: false, error: "No schools provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const results: any[] = [];
      let inserted = 0, skipped = 0, errors = 0;

      // Cache lookups
      const { data: govs } = await admin.from("governorates").select("id, name, name_ar");
      const { data: admins } = await admin.from("administrations").select("id, name, name_ar, governorate_id");
      
      const govMap = new Map(govs?.map(g => [g.name.toLowerCase(), g]) || []);
      const adminMap = new Map(admins?.map(a => [`${a.governorate_id}:${a.name.toLowerCase()}`, a]) || []);

      for (const school of schools) {
        try {
          const gov = govMap.get(school.governorate_name?.toLowerCase());
          if (!gov) {
            results.push({ name: school.name, status: "error", reason: `Governorate not found: ${school.governorate_name}` });
            errors++;
            continue;
          }

          const adminKey = `${gov.id}:${school.administration_name?.toLowerCase()}`;
          let adminRecord = adminMap.get(adminKey);
          
          if (!adminRecord) {
            // Auto-create administration
            const { data: newAdmin, error: adminErr } = await admin.from("administrations").insert({
              governorate_id: gov.id,
              name: school.administration_name,
              name_ar: school.administration_name_ar || school.administration_name,
              source_system: "emis",
              import_batch_id: batchId,
              imported_at: new Date().toISOString(),
            }).select().single();
            if (adminErr) {
              results.push({ name: school.name, status: "error", reason: `Admin create failed: ${adminErr.message}` });
              errors++;
              continue;
            }
            adminRecord = newAdmin;
            adminMap.set(adminKey, newAdmin);
          }

          // Check for duplicate school
          const { data: existing } = await admin.from("schools")
            .select("id")
            .eq("administration_id", adminRecord.id)
            .eq("name", school.name)
            .limit(1)
            .maybeSingle();

          if (existing) {
            results.push({ name: school.name, status: "skipped", reason: "Already exists" });
            skipped++;
            continue;
          }

          // Insert school
          const { error: schoolErr } = await admin.from("schools").insert({
            administration_id: adminRecord.id,
            name: school.name,
            name_ar: school.name_ar || school.name,
            school_type: school.school_type || "general",
            code: school.code || null,
            is_demo: false,
            source_system: "emis",
            source_url: school.source_url || "https://search.emis.gov.eg/",
            source_governorate_name: school.governorate_name,
            source_administration_name: school.administration_name,
            source_stage: school.stage || null,
            source_school_type: school.school_type || null,
            import_batch_id: batchId,
            imported_at: new Date().toISOString(),
          });

          if (schoolErr) {
            results.push({ name: school.name, status: "error", reason: schoolErr.message });
            errors++;
          } else {
            results.push({ name: school.name, status: "inserted" });
            inserted++;
          }
        } catch (e: any) {
          results.push({ name: school.name, status: "error", reason: e.message });
          errors++;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        batch_id: batchId,
        summary: { total: schools.length, inserted, skipped, errors },
        results
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
