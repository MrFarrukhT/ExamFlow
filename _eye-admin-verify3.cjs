// Admin + Invigilator: find EyeBot-R submission with proper filtering
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
    // Capture console logs from the page
    page.on('console', msg => {
        if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
    });

    const BASE = 'http://localhost:3002';
    const ADMIN_PASS = "Adm!n#2025$SecureP@ss";

    try {
        // ===== ADMIN DASHBOARD =====
        console.log('=== ADMIN DASHBOARD ===');
        await page.goto(`${BASE}/ielts-admin-dashboard.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1500);
        await page.fill('#password', ADMIN_PASS);
        await page.click('#loginBtn');
        console.log('Logged in');

        // Wait for data to load fully
        await page.waitForTimeout(6000);
        await page.screenshot({ path: '_eye-screenshots/admin-B1-loaded.png' });

        // Click "Today's Submissions" to narrow results
        const todayBtn = await page.$('button:has-text("Today"), .today-btn, #todayBtn');
        if (todayBtn) {
            await todayBtn.click();
            console.log('Clicked Today\'s Submissions');
            await page.waitForTimeout(3000);
        }

        await page.screenshot({ path: '_eye-screenshots/admin-B2-today.png' });

        // Now search by name "Eye Bot"
        const searchField = await page.$('input[placeholder*="Student"], input[placeholder*="student"], input[placeholder*="Search"], input[placeholder*="search"]');
        if (searchField) {
            await searchField.fill('Eye Bot');
            console.log('Searched for "Eye Bot"');
            await page.waitForTimeout(1000);

            // Click Apply Filters
            const applyBtn = await page.$('button:has-text("Apply")');
            if (applyBtn) {
                await applyBtn.click();
                await page.waitForTimeout(3000);
                console.log('Applied filters');
            }
        }

        // Check filtered count
        const stats = await page.evaluate(() => {
            const text = document.body.innerText;
            const match = text.match(/(\d+)\s*Filtered/);
            return match ? match[1] : 'unknown';
        });
        console.log('Filtered results:', stats);

        await page.screenshot({ path: '_eye-screenshots/admin-B3-filtered.png' });

        // Scroll to table
        await page.evaluate(() => {
            const heading = Array.from(document.querySelectorAll('h2, h3, h4')).find(h =>
                h.textContent.includes('Submission') || h.textContent.includes('Test')
            );
            if (heading) heading.scrollIntoView({ block: 'start' });
        });
        await page.waitForTimeout(500);
        await page.screenshot({ path: '_eye-screenshots/admin-B4-table.png' });

        // Check how many rows exist now
        const rowCount = await page.evaluate(() => {
            const tbody = document.querySelector('#submissionsTableBody, tbody');
            return tbody ? tbody.querySelectorAll('tr').length : 0;
        });
        console.log('Table rows:', rowCount);

        if (rowCount > 0) {
            // Find the Eye Bot row and click its view button
            const clicked = await page.evaluate(() => {
                const rows = document.querySelectorAll('#submissionsTableBody tr, tbody tr');
                for (const row of rows) {
                    const text = row.textContent;
                    if (text.includes('Eye Bot') || text.includes('99901')) {
                        // Find compare/view button
                        const btns = row.querySelectorAll('button');
                        for (const btn of btns) {
                            const btnText = btn.textContent.trim().toLowerCase();
                            if (btnText.includes('compare') || btnText.includes('view') || btnText.includes('detail')) {
                                btn.click();
                                return 'clicked: ' + btn.textContent.trim();
                            }
                        }
                        // Click first button in the row
                        if (btns.length > 0) {
                            btns[0].click();
                            return 'clicked first btn: ' + btns[0].textContent.trim();
                        }
                        return 'no buttons found in row';
                    }
                }
                // If no Eye Bot row, just click the first row's view button
                const firstRow = rows[0];
                if (firstRow) {
                    const text = firstRow.textContent.substring(0, 150);
                    const btn = firstRow.querySelector('button');
                    if (btn) {
                        btn.click();
                        return 'clicked first row button, row text: ' + text;
                    }
                    return 'first row has no button: ' + text;
                }
                return 'no rows at all';
            });
            console.log('Action:', clicked);
            await page.waitForTimeout(2000);

            // Take modal screenshots
            await page.screenshot({ path: '_eye-screenshots/admin-B5-modal.png' });

            // Scroll the modal content
            for (let i = 0; i < 5; i++) {
                const scrolled = await page.evaluate((idx) => {
                    // Try various scrollable containers
                    const containers = document.querySelectorAll('.modal-body, .modal-content, .compare-modal-body, .detail-body, [style*="overflow"]');
                    for (const c of containers) {
                        if (c.scrollHeight > c.clientHeight) {
                            c.scrollTop = (c.scrollHeight / 5) * (idx + 1);
                            return `scrolled to ${c.scrollTop}/${c.scrollHeight} in ${c.className}`;
                        }
                    }
                    // Try scrolling the page itself
                    window.scrollBy(0, 400);
                    return 'scrolled page';
                }, i);
                await page.waitForTimeout(400);
                await page.screenshot({ path: `_eye-screenshots/admin-B${6+i}-scroll${i+1}.png` });
                console.log(`Scroll ${i+1}:`, scrolled);
            }
        } else {
            console.log('No rows found. Trying to clear filters and load all...');
            // Clear filters
            const clearBtn = await page.$('button:has-text("Clear")');
            if (clearBtn) {
                await clearBtn.click();
                await page.waitForTimeout(4000);
                console.log('Cleared filters');
            }

            // Set skill filter to "reading" only
            const skillFilter = await page.$('#filterSkill, select[name="skill"]');
            if (skillFilter) {
                await skillFilter.selectOption({ label: 'Reading' });
                await page.waitForTimeout(500);
            }

            const applyBtn2 = await page.$('button:has-text("Apply")');
            if (applyBtn2) {
                await applyBtn2.click();
                await page.waitForTimeout(4000);
            }

            // Scroll to table again
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(500);
            await page.screenshot({ path: '_eye-screenshots/admin-B5-reading-filter.png' });

            // Find last row (most recent)
            const lastRowInfo = await page.evaluate(() => {
                const rows = document.querySelectorAll('#submissionsTableBody tr, tbody tr');
                if (rows.length === 0) return 'no rows';
                const last = rows[rows.length - 1];
                return last.textContent.substring(0, 300);
            });
            console.log('Last row:', lastRowInfo);
        }

        // ===== INVIGILATOR =====
        console.log('\n=== INVIGILATOR PANEL ===');
        // Navigate to invigilator (already authenticated from admin)
        await page.goto(`${BASE}/invigilator.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(3000);

        const authNeeded = await page.evaluate(() => document.body.innerText.includes('Authentication'));
        console.log('Auth needed:', authNeeded);

        if (authNeeded) {
            // Enter invigilator password
            const invPassField = await page.$('#invigilator-password, input[type="password"]');
            if (invPassField) {
                await invPassField.fill("InV!#2025$SecurePass");
                const invLoginBtn = await page.$('button:has-text("Login"), button:has-text("Enter"), .btn');
                if (invLoginBtn) {
                    await invLoginBtn.click();
                    await page.waitForTimeout(2000);
                }
            }
        }

        await page.screenshot({ path: '_eye-screenshots/invig-B1-panel.png' });

        // Scroll to Room Activity
        await page.evaluate(() => {
            const el = Array.from(document.querySelectorAll('h2, h3')).find(h => h.textContent.includes('Room') || h.textContent.includes('Activity') || h.textContent.includes('Submission'));
            if (el) el.scrollIntoView({ block: 'start' });
        });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '_eye-screenshots/invig-B2-activity.png' });

        const invContent = await page.evaluate(() => document.body.innerText.substring(0, 2000));
        console.log('Invigilator page content (first 500 chars):', invContent.substring(0, 500));

        console.log('\nDone!');

    } catch (error) {
        console.error('ERROR:', error.message);
        await page.screenshot({ path: '_eye-screenshots/admin-error.png' });
    } finally {
        await browser.close();
    }
})();
