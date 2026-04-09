// Open admin dashboard, find EyeBot-R submission, open modal, screenshot answers
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
        // ===== Admin Dashboard Login =====
        console.log('Opening admin dashboard...');
        await page.goto(`${BASE}/ielts-admin-dashboard.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1000);

        // Login
        await page.fill('#password', ADMIN_PASS);
        await page.click('#loginBtn');
        console.log('Admin login submitted');
        await page.waitForTimeout(4000);

        // Screenshot the dashboard after login
        await page.screenshot({ path: '_eye-screenshots/admin-01-dashboard.png' });

        // Look for submissions table
        const pageText = await page.evaluate(() => document.body.innerText);
        console.log('Page contains "99901":', pageText.includes('99901'));
        console.log('Page contains "Eye Bot Reading":', pageText.includes('Eye Bot Reading'));
        console.log('Page contains "reading":', pageText.toLowerCase().includes('reading'));

        // Try to search for the student
        const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="search"], #searchStudents, .search-input');
        if (searchInput) {
            await searchInput.fill('99901');
            await page.waitForTimeout(1500);
            console.log('Searched for 99901');
        }

        await page.screenshot({ path: '_eye-screenshots/admin-02-after-search.png' });

        // Scroll down to see submissions table
        await page.evaluate(() => {
            const table = document.querySelector('.submissions-table, table, #submissionsTable, .table-container');
            if (table) table.scrollIntoView({ block: 'start' });
        });
        await page.waitForTimeout(500);
        await page.screenshot({ path: '_eye-screenshots/admin-03-submissions-table.png' });

        // Find and click on the EyeBot-R submission row to open the Compare/View modal
        // Look for a row containing '99901' or 'Eye Bot Reading' and click the view/compare button
        const viewBtnClicked = await page.evaluate(() => {
            const rows = document.querySelectorAll('tr, .submission-row, .submission-card');
            for (const row of rows) {
                const text = row.textContent || '';
                if (text.includes('99901') || text.includes('Eye Bot Reading')) {
                    // Look for a view/compare button in this row
                    const btn = row.querySelector('button, .btn, a, [onclick], .view-btn, .compare-btn');
                    if (btn) {
                        btn.click();
                        return 'clicked: ' + btn.textContent.trim();
                    }
                    // Or try clicking the row itself
                    row.click();
                    return 'clicked row: ' + text.substring(0, 100);
                }
            }
            return 'not found';
        });
        console.log('View button action:', viewBtnClicked);
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '_eye-screenshots/admin-04-modal-opened.png' });

        // If a modal is open, scroll through it
        const modal = await page.$('.modal, .modal-overlay, .modal-content, [role="dialog"], .compare-modal');
        if (modal) {
            console.log('Modal found! Taking screenshots...');
            await page.screenshot({ path: '_eye-screenshots/admin-05-modal-top.png' });

            // Scroll modal down
            await page.evaluate(() => {
                const m = document.querySelector('.modal-content, .modal-body, .compare-content, [role="dialog"] > div');
                if (m) m.scrollTop = m.scrollHeight / 3;
            });
            await page.waitForTimeout(500);
            await page.screenshot({ path: '_eye-screenshots/admin-06-modal-mid.png' });

            await page.evaluate(() => {
                const m = document.querySelector('.modal-content, .modal-body, .compare-content, [role="dialog"] > div');
                if (m) m.scrollTop = m.scrollHeight;
            });
            await page.waitForTimeout(500);
            await page.screenshot({ path: '_eye-screenshots/admin-07-modal-bottom.png' });
        } else {
            console.log('No modal found. Let me try clicking differently...');

            // Try to find any clickable element in the submissions area
            const links = await page.$$('a[href], button');
            const linkTexts = await Promise.all(links.map(async l => {
                const text = await l.textContent();
                const visible = await l.isVisible();
                return { text: text.trim(), visible };
            }));
            console.log('Visible buttons/links:', linkTexts.filter(l => l.visible && l.text).map(l => l.text).join(' | '));
        }

        console.log('Done!');

    } catch (error) {
        console.error('ERROR:', error.message);
        await page.screenshot({ path: '_eye-screenshots/admin-error.png' });
    } finally {
        await browser.close();
    }
})();
