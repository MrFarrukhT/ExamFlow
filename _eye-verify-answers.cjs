// Verify Round 1 answers: navigate to reading test with pre-filled answers and screenshot all 3 parts
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
        // Login as same student
        await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.evaluate(() => localStorage.setItem('examType', 'IELTS'));
        await page.fill('#studentId', '99901');
        await page.fill('#studentName', 'Eye Bot Reading');
        await page.click('#startTest');
        await page.waitForURL('**/student-dashboard.html**', { timeout: 10000 });

        // Dismiss welcome guide
        const welcomeBtn = await page.$('#wg-start-btn');
        if (welcomeBtn) { await welcomeBtn.click(); await page.waitForTimeout(500); }

        // Set mock and go to reading
        await page.evaluate(() => localStorage.setItem('selectedMock', '1'));
        await page.click('#readingButton');
        await page.waitForURL('**/reading.html**', { timeout: 10000 });
        await page.waitForTimeout(1000);

        // Fill all answers again for visual proof
        // Part 1: Q1-6 radios
        const q1_6 = ['TRUE', 'FALSE', 'NOT GIVEN', 'TRUE', 'FALSE', 'NOT GIVEN'];
        for (let q = 1; q <= 6; q++) {
            await page.click(`input[name="q${q}"][value="${q1_6[q-1]}"]`);
        }
        // Part 1: Q7-13 text
        const q7_13 = ['army', 'gardens', 'mosaic floors', 'wall', '93', 'gold ring', 'museum'];
        for (let i = 0; i < 7; i++) {
            const q = i + 7;
            await page.click(`#q${q}`);
            await page.waitForTimeout(50);
            await page.fill(`#q${q}`, q7_13[i]);
        }

        // Screenshot Part 1
        await page.evaluate(() => switchToPart(1));
        await page.waitForTimeout(500);
        await page.screenshot({ path: '_eye-screenshots/verify-part1-top.png', fullPage: false });

        // Scroll to see Q7-13
        await page.evaluate(() => {
            const q7 = document.getElementById('q7');
            if (q7) q7.scrollIntoView({ block: 'start' });
        });
        await page.waitForTimeout(300);
        await page.screenshot({ path: '_eye-screenshots/verify-part1-bottom.png', fullPage: false });

        // Switch to Part 2 and fill
        await page.evaluate(() => switchToPart(2));
        await page.waitForTimeout(500);

        const q14_18 = ['C', 'A', 'B', 'D', 'E'];
        for (let i = 0; i < 5; i++) {
            await page.click(`input[name="q${i+14}"][value="${q14_18[i]}"]`);
        }
        const q19_22 = ['emotions', 'butterfly', 'mystery', 'photography'];
        for (let i = 0; i < 4; i++) {
            await page.click(`#q${i+19}`);
            await page.waitForTimeout(50);
            await page.fill(`#q${i+19}`, q19_22[i]);
        }
        const q23_26 = ['B', 'D', 'A', 'F'];
        for (let i = 0; i < 4; i++) {
            await page.click(`input[name="q${i+23}"][value="${q23_26[i]}"]`);
        }

        // Screenshot Part 2 top (Q14-18 matching)
        await page.screenshot({ path: '_eye-screenshots/verify-part2-top.png', fullPage: false });

        // Scroll to Q19-26
        await page.evaluate(() => {
            const q19 = document.getElementById('q19');
            if (q19) q19.scrollIntoView({ block: 'start' });
        });
        await page.waitForTimeout(300);
        await page.screenshot({ path: '_eye-screenshots/verify-part2-mid.png', fullPage: false });

        await page.evaluate(() => {
            const el = document.querySelector('input[name="q23"]');
            if (el) el.scrollIntoView({ block: 'start' });
        });
        await page.waitForTimeout(300);
        await page.screenshot({ path: '_eye-screenshots/verify-part2-bottom.png', fullPage: false });

        // Switch to Part 3 and fill
        await page.evaluate(() => switchToPart(3));
        await page.waitForTimeout(500);

        const q27_30 = ['C', 'A', 'B', 'D'];
        for (let i = 0; i < 4; i++) {
            await page.click(`input[name="q${i+27}"][value="${q27_30[i]}"]`);
        }
        // Q31-34 drag-drop (hidden inputs)
        const q31_34 = ['B', 'A', 'C', 'E'];
        for (let i = 0; i < 4; i++) {
            await page.evaluate(({ qNum, val }) => {
                const input = document.getElementById(`q${qNum}`);
                if (input) { input.value = val; input.dispatchEvent(new Event('change', { bubbles: true })); }
            }, { qNum: i + 31, val: q31_34[i] });
        }
        const q35_40 = ['YES', 'NO', 'NOT GIVEN', 'YES', 'NO', 'YES'];
        for (let i = 0; i < 6; i++) {
            await page.click(`input[name="q${i+35}"][value="${q35_40[i]}"]`);
        }

        // Screenshot Part 3 top (Q27-30)
        await page.screenshot({ path: '_eye-screenshots/verify-part3-top.png', fullPage: false });

        // Scroll to Q31-34
        await page.evaluate(() => {
            const el = document.querySelector('[data-q-start="31"]');
            if (el) el.scrollIntoView({ block: 'start' });
        });
        await page.waitForTimeout(300);
        await page.screenshot({ path: '_eye-screenshots/verify-part3-mid.png', fullPage: false });

        // Scroll to Q35-40
        await page.evaluate(() => {
            const el = document.querySelector('input[name="q35"]');
            if (el) el.scrollIntoView({ block: 'start' });
        });
        await page.waitForTimeout(300);
        await page.screenshot({ path: '_eye-screenshots/verify-part3-bottom.png', fullPage: false });

        console.log('All verification screenshots saved!');

    } catch (error) {
        console.error('ERROR:', error.message);
        await page.screenshot({ path: '_eye-screenshots/verify-error.png' });
    } finally {
        await browser.close();
    }
})();
