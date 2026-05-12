import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const delay = ms => new Promise(res => setTimeout(res, ms));

async function safeSelect(page, selector, value) {
    await page.waitForSelector(selector);
    const responsePromise = page.waitForResponse(response => 
        response.url().includes('search.emis.gov.eg') && response.status() === 200, 
        { timeout: 5000 }
    ).catch(() => {});
    
    await page.select(selector, value);
    await responsePromise;
    await delay(300); // Tiny buffer for React/DOM to render the new HTML
}

async function safeClick(page, selector) {
    await page.waitForSelector(selector);
    const responsePromise = page.waitForResponse(response => 
        response.url().includes('search.emis.gov.eg') && response.status() === 200, 
        { timeout: 5000 }
    ).catch(() => {});
    
    await page.click(selector);
    await responsePromise;
    await delay(300); // Tiny buffer for React/DOM to render the new HTML
}

async function ensureDistrictExists(districtName, govId) {
    if (!districtName) return null;
    let { data } = await supabase.from('districts').select('id').eq('name', districtName).maybeSingle();
    if (data) return data;
    const { data: newDist } = await supabase.from('districts').insert({ 
        name: districtName,
        governorate_id: govId
    }).select().maybeSingle();
    return newDist;
}

async function ensureStageExists(stageName) {
    if (!stageName) return null;
    let { data } = await supabase.from('stages').select('id').eq('name_ar', stageName).maybeSingle();
    if (data) return data;
    const { data: newStage } = await supabase.from('stages').insert({ name_ar: stageName }).select().maybeSingle();
    return newStage;
}

async function ensureAdminExists(adminName, govId) {
    if (!adminName) return null;
    let { data } = await supabase.from('administrations').select('id').eq('name_ar', adminName).maybeSingle();
    if (data) return data;
    const { data: newAdmin } = await supabase.from('administrations').insert({ 
        name_ar: adminName,
        name: adminName,
        governorate_id: govId
    }).select().maybeSingle();
    return newAdmin;
}

async function runScraper() {
    console.log("🚀 Starting FINAL PERFECT EMIS Scraper...");
    const { data: governorates } = await supabase.from('governorates').select('id, name');

    // FIND RESUME POINT
    const { data: lastSchool } = await supabase.from('schools')
        .select('administration_id, administrations(name_ar, governorate_id)')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    let lastGovId = lastSchool?.administrations?.governorate_id;
    let lastAdminName = lastSchool?.administrations?.name_ar;
    let skipGovs = !!lastGovId;
    let skipAdmins = !!lastAdminName;

    if (skipGovs && skipAdmins) {
        console.log(`⏩ Fast-forwarding to resume at Admin: ${lastAdminName}...`);
    }
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        defaultViewport: null
    });
    const page = await browser.newPage();
    
    await page.goto('https://search.emis.gov.eg/', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#ContentPlaceHolder1_Button1');
    await page.click('#ContentPlaceHolder1_Button1');

    const GOV_DROPDOWN = '#ContentPlaceHolder1_ddlist_mud';
    const ADMIN_DROPDOWN = '#ContentPlaceHolder1_DDList_edara';
    const STAGE_DROPDOWN = '#ContentPlaceHolder1_ddlist_stage';
    const SEARCH_BTN = '#ContentPlaceHolder1_Button1';
    
    await page.waitForSelector(GOV_DROPDOWN);
    const govOptions = await page.$$eval(`${GOV_DROPDOWN} option`, opts => 
        opts.map(o => ({ text: o.innerText.trim(), value: o.value })).filter(o => o.value !== "0")
    );
    
    for (const gov of govOptions) {
        try {
            let govId = governorates?.find(g => g.name === gov.text || gov.text.includes(g.name))?.id;
            
            if (skipGovs) {
                if (govId === lastGovId) {
                    skipGovs = false;
                } else {
                    continue; // Fast forward
                }
            }

            console.log(`📍 Gov: ${gov.text}`);
            
            await safeSelect(page, GOV_DROPDOWN, gov.value);
            
            const adminOptions = await page.$$eval(`${ADMIN_DROPDOWN} option`, opts => 
                opts.map(o => ({ text: o.innerText.trim(), value: o.value })).filter(o => o.value !== "0")
            );
            
            for (const admin of adminOptions) {
                try {
                    if (skipAdmins) {
                        if (admin.text === lastAdminName) {
                            skipAdmins = false;
                        } else {
                            continue; // Fast forward
                        }
                    }

                    console.log(`  🏢 Admin: ${admin.text}`);
                    const adminRecord = await ensureAdminExists(admin.text, govId);
                    
                    await safeSelect(page, ADMIN_DROPDOWN, admin.value);
                    
                    const stageOptions = await page.$$eval(`${STAGE_DROPDOWN} option`, opts => 
                        opts.map(o => ({ text: o.innerText.trim(), value: o.value })).filter(o => o.value !== "0")
                    );
                    
                    for (const stage of stageOptions) {
                        try {
                            console.log(`    📚 Stage: ${stage.text}`);
                            const stageRecord = await ensureStageExists(stage.text);

                            // PRE-CHECK: If we already have schools for this admin + stage, skip entirely!
                            const { data: existing } = await supabase.from('schools')
                                .select('id')
                                .eq('administration_id', adminRecord?.id)
                                .eq('stage_id', stageRecord?.id)
                                .limit(1);

                            if (existing && existing.length > 0) {
                                console.log(`      ⏭️ Stage ${stage.text} already scraped. Skipping browser interaction.`);
                                continue;
                            }
                            
                            await safeSelect(page, STAGE_DROPDOWN, stage.value);
                            await safeClick(page, SEARCH_BTN);
                            
                            const hasResults = await page.$('#ContentPlaceHolder1_GridView1');
                            if (hasResults) {
                                const schools = await page.evaluate(() => {
                                    const rows = Array.from(document.querySelectorAll('#ContentPlaceHolder1_GridView1 tr')).slice(1);
                                    return rows.map(row => {
                                        const cols = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim());
                                        return cols.length >= 5 ? {
                                            schoolName: cols[1],
                                            genderType: cols[2],
                                            adminName: cols[3],
                                            sectionName: cols[4]
                                        } : null;
                                    }).filter(s => s !== null);
                                });
                                
                                console.log(`      ✅ Found ${schools.length}`);
                                
                                if (schools.length > 0) {
                                    const dist = await ensureDistrictExists(schools[0].sectionName, govId);
                                    const toInsert = schools.map(s => ({
                                        name: s.schoolName,
                                        name_ar: s.schoolName,
                                        administration_id: adminRecord?.id,
                                        district_id: dist?.id,
                                        stage_id: stageRecord?.id,
                                        gender_type: s.genderType,
                                        is_demo: false,
                                        source_system: 'emis_scraper'
                                    }));
                                    const { error } = await supabase.from('schools').insert(toInsert);
                                    if (!error) console.log(`      💾 Saved ${schools.length} schools.`);
                                    else console.error("      ❌ Save Error:", error.message);
                                }
                            }
                        } catch (err) { console.error(`    ❌ Stage Error: ${err.message}`); }
                    }
                } catch (err) { console.error(`  ❌ Admin Error: ${err.message}`); }
            }
        } catch (err) { console.error(`📍 Gov Error: ${err.message}`); }
    }
    console.log("🎉 Done!");
    await browser.close();
}
runScraper().catch(console.error);
