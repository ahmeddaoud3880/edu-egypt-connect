import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function run() {
    const browser = await puppeteer.launch({ 
        headless: true, 
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    });
    const page = await browser.newPage();
    await page.goto('https://search.emis.gov.eg/');
    await page.waitForSelector('#ContentPlaceHolder1_Button1');
    await page.click('#ContentPlaceHolder1_Button1');
    
    await page.waitForSelector('#ContentPlaceHolder1_ddlist_mud');
    await page.select('#ContentPlaceHolder1_ddlist_mud', '01');
    await new Promise(r => setTimeout(r, 2000));
    await page.select('#ContentPlaceHolder1_DDList_edara', '1102');
    await new Promise(r => setTimeout(r, 2000));
    await page.select('#ContentPlaceHolder1_ddlist_stage', '01');
    await page.click('#ContentPlaceHolder1_Button1');
    await new Promise(r => setTimeout(r, 3000));
    
    const data = await page.evaluate(() => {
        const header = Array.from(document.querySelectorAll('#ContentPlaceHolder1_GridView1 tr th')).map(th => th.innerText.trim());
        const row = Array.from(document.querySelectorAll('#ContentPlaceHolder1_GridView1 tr:nth-child(2) td')).map(td => td.innerText.trim());
        return { header, row };
    });
    
    console.log("Header:", data.header);
    console.log("Row 1:", data.row);
    await browser.close();
}
run();
