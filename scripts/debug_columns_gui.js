import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    });
    const page = await browser.newPage();
    await page.goto('https://search.emis.gov.eg/');
    await page.waitForSelector('#ContentPlaceHolder1_Button1');
    await page.click('#ContentPlaceHolder1_Button1');
    await new Promise(r => setTimeout(r, 2000));
    
    await page.select('#ContentPlaceHolder1_ddlist_mud', '01');
    await new Promise(r => setTimeout(r, 2000));
    await page.select('#ContentPlaceHolder1_DDList_edara', '1102');
    await new Promise(r => setTimeout(r, 2000));
    await page.select('#ContentPlaceHolder1_ddlist_stage', '01');
    await page.click('#ContentPlaceHolder1_Button1');
    await new Promise(r => setTimeout(r, 4000));
    
    const schools = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('#ContentPlaceHolder1_GridView1 tr')).slice(1);
        return rows.map(row => {
            const cols = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim());
            return cols;
        });
    });
    
    console.log("Found:", schools.length, "rows.");
    if (schools.length > 0) {
        console.log("Columns for Row 1:", JSON.stringify(schools[0], null, 2));
    }
    await browser.close();
}
run();
