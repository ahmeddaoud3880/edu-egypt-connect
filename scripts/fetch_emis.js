import puppeteer from 'puppeteer';
import fs from 'fs';

async function fetchEmis() {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto('https://search.emis.gov.eg/', { waitUntil: 'networkidle2' });
    const html = await page.content();
    fs.writeFileSync('emis_source.html', html);
    await browser.close();
    console.log("HTML saved to emis_source.html");
}
fetchEmis();
