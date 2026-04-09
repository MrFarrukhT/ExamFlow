// Final admin dashboard + invigilator verification — long wait for loading
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
        console.log('=== ADMIN DASHBOARD ===');
        await page.goto(`${BASE}/ielts-admin-dashboard.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1500);
        await page.fill('#password', "Adm!n#2025$SecureP@ss");
        await page.click('#loginBtn');
        console.log('Logged in, waiting for table to load...');

        // Wait for "Loading submissions..." to disappear (up to 60s)
        for (let i = 0; i < 30; i++) {
            await page.waitForTimeout(2000);
            const loading = await page.evaluate(() => document.body.innerText.includes('Loading submissions'));
            const rowCount = await page.evaluate(() => document.querySelectorAll('#submissionsTableBody tr').length);
            console.log(`  ${(i+1)*2}s: loading=${loading}, rows=${rowCount}`);
            if (!loading || rowCount > 0) break;
        }

        // Get stats
        const statText = await page.evaluate(() => {
            const boxes = document.querySelectorAll('.stat-box, .stat-card, [class*="stat"]');
            return Array.from(boxes).map(b => b.textContent.replace(/\s+/g,' ').trim()).join(' | ');
        });
        console.log('Stats:', statText);

        // Scroll to table
        await page.evaluate(() => window.scrollTo(0, 600));
        await page.waitForTimeout(500);
        await page.screenshot({ path: '_eye-screenshots/FINAL-admin-1-table.png' });

        // Find EyeBot row
        const rowCount = await page.evaluate(() => document.querySelectorAll('#submissionsTableBody tr').length);
        console.log('Total rows in table:', rowCount);

        if (rowCount > 0) {
            // Look for Eye Bot row
            const eyeRow = await page.evaluate(() => {
                const rows = document.querySelectorAll('#submissionsTableBody tr');
                for (let i = 0; i < rows.length; i++) {
                    const text = rows[i].textContent;
                    if (text.includes('99901') || text.includes('Eye Bot')) {
                        rows[i].style.backgroundColor = '#fff3cd';
                        rows[i].style.outline = '3px solid #e67e22';
                        rows[i].scrollIntoView({ block: 'center' });
                        return { found: true, index: i, text: text.replace(/\s+/g,' ').trim().substring(0, 250) };
                    }
                }
                // Show first row for reference
                if (rows[0]) {
                    return { found: false, firstRow: rows[0].textContent.replace(/\s+/g,' ').trim().substring(0, 250) };
                }
                return { found: false };
            });
            console.log('Eye Bot search:', JSON.stringify(eyeRow, null, 2));
            await page.waitForTimeout(300);

            if (eyeRow.found) {
                await page.screenshot({ path: '_eye-screenshots/FINAL-admin-2-eyebot-row.png' });

                // Click the view/compare button
                await page.evaluate(() => {
                    const rows = document.querySelectorAll('#submissionsTableBody tr');
                    for (const row of rows) {
                        if (row.textContent.includes('99901') || row.textContent.includes('Eye Bot')) {
                            const btn = row.querySelector('button');
                            if (btn) btn.click();
                            break;
                        }
                    }
                });
                await page.waitForTimeout(2500);
                await page.screenshot({ path: '_eye-screenshots/FINAL-admin-3-modal.png' });

                // Scroll through the modal
                for (let s = 1; s <= 4; s++) {
                    await page.evaluate((f) => {
                        const els = document.querySelectorAll('[style*="overflow"], [class*="modal-body"], [class*="content"]');
                        for (const el of els) {
                            if (el.scrollHeight > el.clientHeight + 100) {
                                el.scrollTop = Math.floor(el.scrollHeight * f / 5);
                                return;
                            }
                        }
                    }, s);
                    await page.waitForTimeout(400);
                    await page.screenshot({ path: `_eye-screenshots/FINAL-admin-${3+s}-modal-scroll${s}.png` });
                }
            } else {
                await page.screenshot({ path: '_eye-screenshots/FINAL-admin-2-notfound.png' });
            }
        } else {
            console.log('Table still empty after waiting');
            await page.screenshot({ path: '_eye-screenshots/FINAL-admin-empty.png' });
        }

        // ===== INVIGILATOR =====
        console.log('\n=== INVIGILATOR ===');
        await page.goto(`${BASE}/invigilator.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(6000);
        await page.screenshot({ path: '_eye-screenshots/FINAL-invig-1.png' });

        console.log('\nDone!');
    } catch (error) {
        console.error('ERROR:', error.message);
        await page.screenshot({ path: '_eye-screenshots/FINAL-error.png' });
    } finally {
        await browser.close();
    }
})();
