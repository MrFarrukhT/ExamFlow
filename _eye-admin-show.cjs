// Show the EyeBot-R submission on Admin Dashboard + Invigilator Panel
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
        await page.waitForTimeout(1500);
        await page.fill('#password', ADMIN_PASS);
        await page.click('#loginBtn');
        await page.waitForTimeout(8000); // Wait for full data load

        // Click "Today's Submissions"
        const todayBtn = await page.locator('button:has-text("Today")').first();
        if (await todayBtn.count()) {
            await todayBtn.click();
            await page.waitForTimeout(3000);
            console.log('Filtered to Today');
        }

        await page.screenshot({ path: '_eye-screenshots/SHOW-admin-01-stats.png' });

        // Scroll to the submissions table
        await page.evaluate(() => {
            const h = Array.from(document.querySelectorAll('h2, h3, h4')).find(el => el.textContent.includes('Submission'));
            if (h) h.scrollIntoView({ block: 'start' });
        });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '_eye-screenshots/SHOW-admin-02-table.png' });

        // Find the Eye Bot Reading row and click its Compare/View button
        const found = await page.evaluate(() => {
            const rows = document.querySelectorAll('tbody tr');
            for (const row of rows) {
                const text = row.textContent;
                if (text.includes('99901') || text.includes('Eye Bot Reading')) {
                    // Highlight the row
                    row.style.background = '#ffffcc';
                    row.style.border = '2px solid #ff6600';
                    row.scrollIntoView({ block: 'center' });

                    // Find and click the Compare button
                    const btns = row.querySelectorAll('button');
                    for (const btn of btns) {
                        const t = btn.textContent.trim().toLowerCase();
                        if (t.includes('compare') || t.includes('view') || t.includes('detail')) {
                            btn.click();
                            return { found: true, clicked: btn.textContent.trim(), rowText: text.substring(0, 200) };
                        }
                    }
                    // Click the first button if no named one found
                    if (btns.length) {
                        btns[0].click();
                        return { found: true, clicked: btns[0].textContent.trim(), rowText: text.substring(0, 200) };
                    }
                    return { found: true, clicked: null, rowText: text.substring(0, 200) };
                }
            }
            return { found: false, totalRows: rows.length };
        });
        console.log('Search result:', JSON.stringify(found, null, 2));
        await page.waitForTimeout(500);
        await page.screenshot({ path: '_eye-screenshots/SHOW-admin-03-row-found.png' });

        if (found.clicked) {
            await page.waitForTimeout(2000);
            await page.screenshot({ path: '_eye-screenshots/SHOW-admin-04-modal-top.png' });

            // Scroll through the modal to see all answers
            for (let i = 1; i <= 6; i++) {
                await page.evaluate((frac) => {
                    const containers = document.querySelectorAll('.modal-body, .modal-content, .compare-modal, [class*="modal"]');
                    for (const c of containers) {
                        if (c.scrollHeight > c.clientHeight + 50) {
                            c.scrollTop = (c.scrollHeight * frac) / 7;
                            return;
                        }
                    }
                    // Also try main scrollable areas
                    const overlays = document.querySelectorAll('[style*="overflow"], [class*="scroll"]');
                    for (const o of overlays) {
                        if (o.scrollHeight > o.clientHeight + 50) {
                            o.scrollTop = (o.scrollHeight * frac) / 7;
                            return;
                        }
                    }
                    window.scrollTo(0, document.body.scrollHeight * frac / 7);
                }, i);
                await page.waitForTimeout(400);
                await page.screenshot({ path: `_eye-screenshots/SHOW-admin-05-modal-scroll${i}.png` });
            }
        }

        // ===== INVIGILATOR PANEL =====
        console.log('\n=== INVIGILATOR PANEL ===');
        await page.goto(`${BASE}/invigilator.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(4000);

        // The invigilator uses WebSocket for real-time data, but may also show today's submissions via REST
        await page.screenshot({ path: '_eye-screenshots/SHOW-invig-01-panel.png' });

        // Check if there's a password prompt
        const passPrompt = await page.$('input[type="password"]');
        if (passPrompt) {
            console.log('Invigilator requires password');
            await passPrompt.fill("InV!#2025$SecurePass");
            const loginBtn = await page.$('button');
            if (loginBtn) await loginBtn.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: '_eye-screenshots/SHOW-invig-02-after-login.png' });
        }

        // Search for student
        const invSearch = await page.$('input[placeholder*="Search"], input[placeholder*="search"]');
        if (invSearch) {
            await invSearch.fill('99901');
            await page.waitForTimeout(2000);
        }

        // Scroll to activity area
        await page.evaluate(() => {
            const el = Array.from(document.querySelectorAll('h2, h3')).find(h =>
                h.textContent.includes('Room') || h.textContent.includes('Activity') || h.textContent.includes('Submission')
            );
            if (el) el.scrollIntoView({ block: 'start' });
        });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '_eye-screenshots/SHOW-invig-03-activity.png' });

        // Check page content for Eye Bot
        const hasStudent = await page.evaluate(() => {
            const text = document.body.innerText;
            return {
                has99901: text.includes('99901'),
                hasEyeBot: text.includes('Eye Bot'),
                hasReading: text.includes('Reading') || text.includes('reading')
            };
        });
        console.log('Invigilator content:', hasStudent);

        console.log('\nDone!');

    } catch (error) {
        console.error('ERROR:', error.message);
        await page.screenshot({ path: '_eye-screenshots/SHOW-error.png' });
    } finally {
        await browser.close();
    }
})();
