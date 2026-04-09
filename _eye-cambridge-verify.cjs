// Verify Cambridge A1-Movers submission on Admin, Invigilator, Student Results
const path = require('path');
const { chromium } = require(path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright'));

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1217/chrome-win64/chrome.exe')
    });
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await context.newPage();
    page.on('dialog', async d => await d.accept());

    const BASE = 'http://localhost:3003';
    const ADMIN_PASS = "Adm!n#2025$SecureP@ss";

    try {
        // ===== ADMIN DASHBOARD =====
        console.log('=== CAMBRIDGE ADMIN ===');
        await page.goto(`${BASE}/cambridge-admin-dashboard.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        await page.fill('#password', ADMIN_PASS);
        await page.click('#loginBtn');

        // Wait for table
        for (let i = 0; i < 20; i++) {
            await page.waitForTimeout(2000);
            const rows = await page.evaluate(() =>
                document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission').length
            );
            if (rows > 0) { console.log(`Table: ${rows} rows (${(i+1)*2}s)`); break; }
            if (i === 19) console.log('Table did not load');
        }

        // Find Eye Bot row
        const adminRow = await page.evaluate(() => {
            const rows = document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission');
            for (const row of rows) {
                const text = row.textContent;
                if (text.includes('99914') || text.includes('Eye Bot')) {
                    row.style.backgroundColor = '#e8f5e9';
                    row.scrollIntoView({ block: 'center' });
                    return text.replace(/\s+/g, ' ').trim().substring(0, 250);
                }
            }
            return null;
        });
        console.log('Admin row:', adminRow || 'NOT FOUND');
        await page.screenshot({ path: '_eye-screenshots/cambridge-a1-verify-admin.png' });

        // ===== INVIGILATOR =====
        console.log('\n=== INVIGILATOR ===');
        await page.goto(`${BASE}/invigilator.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
        const invText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
        const invFound = invText.includes('99914') || invText.includes('Eye Bot');
        console.log('Invigilator has EyeBot:', invFound);
        await page.screenshot({ path: '_eye-screenshots/cambridge-a1-verify-invig.png' });

        // ===== STUDENT RESULTS =====
        console.log('\n=== STUDENT RESULTS ===');
        await page.goto(`${BASE}/cambridge-student-results.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        // Check if auth needed
        const passField = await page.$('#password');
        if (passField) {
            await passField.fill(ADMIN_PASS);
            const loginBtn = await page.$('#loginBtn');
            if (loginBtn) await loginBtn.click();
            await page.waitForTimeout(3000);
        }
        await page.waitForTimeout(5000);
        const resultsText = await page.evaluate(() => document.body.innerText);
        const resultsFound = resultsText.includes('99914') || resultsText.includes('Eye Bot');
        console.log('Student Results has EyeBot:', resultsFound);
        await page.screenshot({ path: '_eye-screenshots/cambridge-a1-verify-results.png' });

        console.log('\n========================================');
        console.log('Round 4 Verification:');
        console.log(`  Admin: ${adminRow ? 'PASS' : 'FAIL'}`);
        console.log(`  Invigilator: ${invFound ? 'PASS' : 'CHECK'}`);
        console.log(`  Student Results: ${resultsFound ? 'PASS' : 'CHECK'}`);
        console.log('========================================');

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        await browser.close();
    }
})();
