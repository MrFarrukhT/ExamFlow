// Click Compare on EyeBot row + show invigilator
const path = require('path');
const { chromium } = require(path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright'));

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1217/chrome-win64/chrome.exe')
    });
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await context.newPage();
    page.on('dialog', async dialog => await dialog.accept());

    const BASE = 'http://localhost:3002';

    try {
        // ===== ADMIN DASHBOARD =====
        await page.goto(`${BASE}/ielts-admin-dashboard.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1500);
        await page.fill('#password', "Adm!n#2025$SecureP@ss");
        await page.click('#loginBtn');
        console.log('Logged in, waiting for table...');

        // Wait until the table actually renders (poll for rows in submissionsContainer)
        for (let i = 0; i < 40; i++) {
            await page.waitForTimeout(2000);
            const rows = await page.evaluate(() => {
                return document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission').length;
            });
            if (rows > 0) {
                console.log(`Table loaded with ${rows} rows after ${(i+1)*2}s`);
                break;
            }
            if (i === 39) console.log('Table did not load after 80s');
        }

        // Scroll to the table
        await page.evaluate(() => {
            const el = document.getElementById('submissionsContainer');
            if (el) el.scrollIntoView({ block: 'start' });
        });
        await page.waitForTimeout(500);
        await page.screenshot({ path: '_eye-screenshots/FINAL2-admin-table.png' });

        // Find and highlight the EyeBot row, then click Compare
        const clickResult = await page.evaluate(() => {
            const rows = document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission');
            for (const row of rows) {
                const text = row.textContent;
                if (text.includes('99901') || text.includes('Eye Bot Reading')) {
                    row.style.backgroundColor = '#fff3cd';
                    row.style.outline = '3px solid #e67e22';
                    row.scrollIntoView({ block: 'center' });
                    // Find Compare button
                    const btns = row.querySelectorAll('button');
                    for (const btn of btns) {
                        if (btn.textContent.includes('Compare')) {
                            btn.click();
                            return { clicked: 'Compare', row: text.replace(/\s+/g,' ').trim().substring(0, 200) };
                        }
                    }
                    // Click the row itself (for date-group view)
                    if (row.onclick || row.getAttribute('onclick')) {
                        row.click();
                        return { clicked: 'row', row: text.replace(/\s+/g,' ').trim().substring(0, 200) };
                    }
                    return { clicked: null, row: text.replace(/\s+/g,' ').trim().substring(0, 200), btns: btns.length };
                }
            }
            return { found: false, totalRows: rows.length };
        });
        console.log('Click result:', JSON.stringify(clickResult, null, 2));

        if (clickResult.clicked) {
            // Wait for modal to open
            await page.waitForTimeout(3000);
            await page.screenshot({ path: '_eye-screenshots/FINAL2-admin-modal-1.png' });

            // Scroll through the modal to show all answers
            for (let s = 1; s <= 6; s++) {
                const scrolled = await page.evaluate((frac) => {
                    // Find scrollable containers
                    const all = document.querySelectorAll('*');
                    for (const el of all) {
                        if (el.scrollHeight > el.clientHeight + 200 &&
                            el.clientHeight > 100 &&
                            el.clientHeight < window.innerHeight &&
                            !el.matches('html, body')) {
                            el.scrollTop = Math.floor(el.scrollHeight * frac / 7);
                            return `${el.tagName}.${el.className.substring(0,30)}: ${el.scrollTop}/${el.scrollHeight}`;
                        }
                    }
                    return 'no scrollable';
                }, s);
                console.log(`Scroll ${s}:`, scrolled);
                await page.waitForTimeout(400);
                await page.screenshot({ path: `_eye-screenshots/FINAL2-admin-modal-${s+1}.png` });
            }
        }

        // ===== INVIGILATOR =====
        console.log('\n=== INVIGILATOR ===');
        await page.goto(`${BASE}/invigilator.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(6000);
        await page.screenshot({ path: '_eye-screenshots/FINAL2-invig.png' });

        console.log('Done!');

    } catch (error) {
        console.error('ERROR:', error.message);
        await page.screenshot({ path: '_eye-screenshots/FINAL2-error.png' });
    } finally {
        await browser.close();
    }
})();
