// Open admin dashboard, find EyeBot-R submission, screenshot answers + invigilator
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
    const ADMIN_PASS = "Adm!n#2025$SecureP@ss";

    try {
        // ===== ADMIN DASHBOARD =====
        console.log('=== ADMIN DASHBOARD ===');
        await page.goto(`${BASE}/ielts-admin-dashboard.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1000);
        await page.fill('#password', ADMIN_PASS);
        await page.click('#loginBtn');
        console.log('Admin login submitted');

        // Wait for submissions to fully load
        await page.waitForTimeout(8000);

        // Search for student 99901
        const searchField = await page.$('#searchStudents');
        if (searchField) {
            await searchField.fill('99901');
            await page.waitForTimeout(1500);
            console.log('Searched for 99901 in search field');
        } else {
            // Try other search selectors
            const altSearch = await page.$('input[placeholder*="Student"], input[placeholder*="student"], input[placeholder*="Search"]');
            if (altSearch) {
                await altSearch.fill('99901');
                await page.waitForTimeout(1500);
                console.log('Searched via alt search field');
            } else {
                console.log('No search field found, listing available inputs:');
                const inputs = await page.$$eval('input:not([type="password"])', els =>
                    els.map(e => ({ id: e.id, placeholder: e.placeholder, type: e.type, class: e.className }))
                );
                console.log(JSON.stringify(inputs, null, 2));
            }
        }

        // Click "Apply Filters" if exists
        const applyBtn = await page.$('button:has-text("Apply"), #applyFilters, .apply-filters');
        if (applyBtn) {
            await applyBtn.click();
            await page.waitForTimeout(3000);
            console.log('Applied filters');
        }

        // Scroll to submissions table
        await page.evaluate(() => {
            const el = document.querySelector('#submissionsTableBody, .submissions-table, h3');
            const tables = document.querySelectorAll('table');
            const target = el || (tables.length > 1 ? tables[1] : tables[0]);
            if (target) target.scrollIntoView({ block: 'start' });
        });
        await page.waitForTimeout(500);
        await page.screenshot({ path: '_eye-screenshots/admin-A1-table.png' });

        // Find the EyeBot submission row
        const rowInfo = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tr, .submission-row');
            const found = [];
            for (const row of rows) {
                const text = row.textContent;
                if (text.includes('99901') || text.includes('Eye Bot')) {
                    found.push(text.trim().substring(0, 200));
                    // Find view/compare button
                    const btns = row.querySelectorAll('button, a');
                    return {
                        text: text.trim().substring(0, 300),
                        buttons: Array.from(btns).map(b => ({ text: b.textContent.trim(), class: b.className }))
                    };
                }
            }
            // If not found in rows, search ALL text
            return { found: false, total_rows: rows.length };
        });
        console.log('Row search result:', JSON.stringify(rowInfo, null, 2));

        // If row found with buttons, click the Compare/View button
        if (rowInfo.buttons && rowInfo.buttons.length > 0) {
            // Click the first action button (usually Compare or View)
            const btnText = rowInfo.buttons[0].text;
            await page.evaluate(() => {
                const rows = document.querySelectorAll('table tr');
                for (const row of rows) {
                    if (row.textContent.includes('99901') || row.textContent.includes('Eye Bot')) {
                        const btn = row.querySelector('button, a');
                        if (btn) btn.click();
                        break;
                    }
                }
            });
            console.log(`Clicked button: "${btnText}"`);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: '_eye-screenshots/admin-A2-modal.png' });

            // Scroll modal to see all answers
            await page.evaluate(() => {
                const scrollable = document.querySelector('.modal-body, .modal-content, .compare-content, .detail-content');
                if (scrollable) scrollable.scrollTop = 0;
            });
            await page.waitForTimeout(300);
            await page.screenshot({ path: '_eye-screenshots/admin-A3-modal-top.png' });

            // Scroll down in modal
            for (let i = 1; i <= 4; i++) {
                await page.evaluate((fraction) => {
                    const scrollable = document.querySelector('.modal-body, .modal-content, .compare-content, .detail-content');
                    if (scrollable) scrollable.scrollTop = scrollable.scrollHeight * fraction;
                }, i / 4);
                await page.waitForTimeout(400);
                await page.screenshot({ path: `_eye-screenshots/admin-A${3+i}-modal-scroll${i}.png` });
            }
        } else {
            // No specific row found, take full page screenshot
            console.log('Row not found directly. Taking full page screenshot...');
            await page.screenshot({ path: '_eye-screenshots/admin-A2-fullpage.png', fullPage: true });
        }

        // ===== INVIGILATOR PANEL =====
        console.log('\n=== INVIGILATOR PANEL ===');
        await page.goto(`${BASE}/invigilator.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: '_eye-screenshots/invig-01-panel.png' });

        // Check if auth is needed
        const authNeeded = await page.evaluate(() => document.body.innerText.includes('Authentication required'));
        if (authNeeded) {
            console.log('Invigilator requires admin auth — navigating to admin first');
            // The invigilator uses the same admin session. Let's login via admin dashboard first
            await page.goto(`${BASE}/ielts-admin-dashboard.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForTimeout(1000);
            await page.fill('#password', ADMIN_PASS);
            await page.click('#loginBtn');
            await page.waitForTimeout(3000);
            // Now go back to invigilator
            await page.goto(`${BASE}/invigilator.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForTimeout(3000);
        }

        await page.screenshot({ path: '_eye-screenshots/invig-02-after-auth.png' });

        // Search for the student on invigilator
        const invSearch = await page.$('input[placeholder*="Search"], input[placeholder*="search"], #searchInput');
        if (invSearch) {
            await invSearch.fill('99901');
            await page.waitForTimeout(1500);
            console.log('Searched for 99901 on invigilator');
        }

        // Scroll to Room Activity
        await page.evaluate(() => {
            const h = document.querySelector('h2, h3');
            if (h) h.scrollIntoView();
        });
        await page.waitForTimeout(500);
        await page.screenshot({ path: '_eye-screenshots/invig-03-activity.png' });

        // Check if student is visible
        const invText = await page.evaluate(() => document.body.innerText);
        console.log('Invigilator has "99901":', invText.includes('99901'));
        console.log('Invigilator has "Eye Bot":', invText.includes('Eye Bot'));

        console.log('\nDone!');

    } catch (error) {
        console.error('ERROR:', error.message);
        await page.screenshot({ path: '_eye-screenshots/admin-error.png' });
    } finally {
        await browser.close();
    }
})();
