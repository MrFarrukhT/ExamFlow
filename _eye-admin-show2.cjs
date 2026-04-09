// Show the EyeBot-R submission on Admin Dashboard — no date filters
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
        console.log('Admin login submitted');
        await page.waitForTimeout(10000); // Long wait for full data

        // Screenshot the stats bar
        await page.screenshot({ path: '_eye-screenshots/SHOW2-admin-stats.png' });

        // Check stats
        const stats = await page.evaluate(() => {
            const el = document.body.innerText;
            return el.substring(0, 500);
        });
        console.log('Stats area:', stats.substring(0, 300));

        // Scroll down to table
        await page.evaluate(() => window.scrollTo(0, 600));
        await page.waitForTimeout(500);
        await page.screenshot({ path: '_eye-screenshots/SHOW2-admin-table-area.png' });

        // Count rows and check if our submission is there
        const tableInfo = await page.evaluate(() => {
            const rows = document.querySelectorAll('#submissionsTableBody tr, tbody tr');
            const data = [];
            rows.forEach((row, i) => {
                if (i < 5) data.push(row.textContent.replace(/\s+/g, ' ').trim().substring(0, 150));
            });
            return { count: rows.length, first5: data };
        });
        console.log('Table rows:', tableInfo.count);
        console.log('First 5 rows:');
        tableInfo.first5.forEach((r, i) => console.log(`  ${i+1}: ${r}`));

        // Search for EyeBot in the table
        const eyeRow = await page.evaluate(() => {
            const rows = document.querySelectorAll('#submissionsTableBody tr, tbody tr');
            for (let i = 0; i < rows.length; i++) {
                const text = rows[i].textContent;
                if (text.includes('99901') || text.includes('Eye Bot')) {
                    rows[i].style.backgroundColor = '#fffbe6';
                    rows[i].style.outline = '3px solid #f59e0b';
                    rows[i].scrollIntoView({ block: 'center' });
                    return { index: i, text: text.replace(/\s+/g, ' ').trim().substring(0, 300) };
                }
            }
            return null;
        });

        if (eyeRow) {
            console.log(`\nFound Eye Bot at row ${eyeRow.index}: ${eyeRow.text}`);
            await page.waitForTimeout(300);
            await page.screenshot({ path: '_eye-screenshots/SHOW2-admin-eyebot-row.png' });

            // Click the Compare/View button in that row
            const btnClicked = await page.evaluate(() => {
                const rows = document.querySelectorAll('#submissionsTableBody tr, tbody tr');
                for (const row of rows) {
                    if (row.textContent.includes('99901') || row.textContent.includes('Eye Bot')) {
                        const btns = row.querySelectorAll('button');
                        if (btns.length > 0) {
                            btns[0].click();
                            return btns[0].textContent.trim();
                        }
                    }
                }
                return null;
            });
            console.log('Clicked button:', btnClicked);
            await page.waitForTimeout(2000);
            await page.screenshot({ path: '_eye-screenshots/SHOW2-admin-modal-1.png' });

            // Scroll the modal content
            for (let scroll = 1; scroll <= 5; scroll++) {
                const scrolled = await page.evaluate((frac) => {
                    // Find the scrollable modal container
                    const candidates = document.querySelectorAll('[class*="modal"], [role="dialog"], [style*="overflow"]');
                    for (const c of candidates) {
                        if (c.scrollHeight > c.clientHeight + 100) {
                            c.scrollTop = Math.floor(c.scrollHeight * frac / 6);
                            return `${c.className.substring(0,40)}: ${c.scrollTop}/${c.scrollHeight}`;
                        }
                        // Check children
                        for (const child of c.children) {
                            if (child.scrollHeight > child.clientHeight + 100) {
                                child.scrollTop = Math.floor(child.scrollHeight * frac / 6);
                                return `${child.className.substring(0,40)}: ${child.scrollTop}/${child.scrollHeight}`;
                            }
                        }
                    }
                    return 'no scrollable found';
                }, scroll);
                console.log(`Scroll ${scroll}:`, scrolled);
                await page.waitForTimeout(300);
                await page.screenshot({ path: `_eye-screenshots/SHOW2-admin-modal-${scroll + 1}.png` });
            }
        } else {
            console.log('Eye Bot NOT found in table rows!');
            // Check pagination — the submission might be on the first page but sorted by newest
            // Try to find pagination and go to page 1
            const paginationInfo = await page.evaluate(() => {
                const text = document.body.innerText;
                const pageMatch = text.match(/Page (\d+) of (\d+)/);
                return pageMatch ? { current: pageMatch[1], total: pageMatch[2] } : null;
            });
            console.log('Pagination:', paginationInfo);
        }

        // ===== INVIGILATOR =====
        console.log('\n=== INVIGILATOR ===');
        await page.goto(`${BASE}/invigilator.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: '_eye-screenshots/SHOW2-invig-1.png' });

        // Check what's on the page
        const invContent = await page.evaluate(() => document.body.innerText.substring(0, 1000));
        console.log('Invigilator content (first 500):', invContent.substring(0, 500));

        // Check for password modal
        const passModal = await page.$('.modal input[type="password"], #invigilatorPasswordInput');
        if (passModal && await passModal.isVisible()) {
            await passModal.fill("InV!#2025$SecurePass");
            const modalBtn = await page.$('.modal button, #verifyInvigilatorBtn');
            if (modalBtn) await modalBtn.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: '_eye-screenshots/SHOW2-invig-2-logged-in.png' });
        }

        // Scroll down to activity/submissions
        await page.evaluate(() => window.scrollTo(0, 300));
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '_eye-screenshots/SHOW2-invig-3-scrolled.png' });

        console.log('\nDone!');

    } catch (error) {
        console.error('ERROR:', error.message);
        await page.screenshot({ path: '_eye-screenshots/SHOW2-error.png' });
    } finally {
        await browser.close();
    }
})();
