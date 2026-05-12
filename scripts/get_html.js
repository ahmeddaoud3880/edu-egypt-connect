import puppeteer from 'puppeteer';
import fs from 'fs';

async function getHtml() {
    const browser = await puppeteer.launch({ 
        headless: "new",
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' 
    });
    const page = await browser.newPage();
    await page.goto('https://search.emis.gov.eg/', { waitUntil: 'networkidle2' });
    
    // Click button
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('#ContentPlaceHolder1_Button1')
    ]);
    
    const html = await page.content();
    fs.writeFileSync('emis_search_page.html', html);
    await browser.close();
}
getHtml();
