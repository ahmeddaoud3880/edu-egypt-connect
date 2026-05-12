import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

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
    await new Promise(r => setTimeout(r, 5000)); // More wait
    
    const html = await page.content();
    fs.writeFileSync('full_page.html', html);
    console.log("Saved full_page.html");
    await browser.close();
}
run();
