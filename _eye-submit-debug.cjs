// Debug: Submit IELTS Reading and capture network request/response
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

    // Capture all network requests
    const requests = [];
    page.on('request', req => {
        if (req.url().includes('submission')) {
            console.log(`>> REQUEST: ${req.method()} ${req.url()}`);
            if (req.postData()) {
                const body = req.postData();
                console.log(`>> BODY (first 500): ${body.substring(0, 500)}`);
                requests.push({ url: req.url(), method: req.method(), body });
            }
        }
    });
    page.on('response', async resp => {
        if (resp.url().includes('submission')) {
            const status = resp.status();
            let body = '';
            try { body = await resp.text(); } catch (e) { body = 'could not read body'; }
            console.log(`<< RESPONSE: ${status} ${resp.url()}`);
            console.log(`<< BODY (first 500): ${body.substring(0, 500)}`);
        }
    });

    // Also capture console errors
    page.on('console', msg => {
        if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    const BASE = 'http://localhost:3002';

    try {
        // Login
        await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.evaluate(() => localStorage.setItem('examType', 'IELTS'));
        await page.fill('#studentId', '99901');
        await page.fill('#studentName', 'Eye Bot Reading');
        await page.click('#startTest');
        await page.waitForURL('**/student-dashboard.html**', { timeout: 10000 });

        // Dismiss welcome guide + set mock
        const wb = await page.$('#wg-start-btn');
        if (wb) { await wb.click(); await page.waitForTimeout(500); }
        await page.evaluate(() => localStorage.setItem('selectedMock', '1'));

        // Go to reading
        await page.click('#readingButton');
        await page.waitForURL('**/reading.html**', { timeout: 10000 });
        await page.waitForTimeout(1000);

        // Fill just a few answers (minimum needed)
        // Q1-6 radios
        for (let q = 1; q <= 6; q++) {
            await page.click(`input[name="q${q}"][value="TRUE"]`);
        }
        // Q7-13 text
        for (let q = 7; q <= 13; q++) {
            await page.click(`#q${q}`);
            await page.waitForTimeout(50);
            await page.fill(`#q${q}`, `answer${q}`);
        }

        // Part 2
        await page.evaluate(() => switchToPart(2));
        await page.waitForTimeout(300);
        for (let q = 14; q <= 18; q++) {
            await page.click(`input[name="q${q}"][value="A"]`);
        }
        for (let q = 19; q <= 22; q++) {
            await page.click(`#q${q}`);
            await page.waitForTimeout(50);
            await page.fill(`#q${q}`, `answer${q}`);
        }
        for (let q = 23; q <= 26; q++) {
            await page.click(`input[name="q${q}"][value="B"]`);
        }

        // Part 3
        await page.evaluate(() => switchToPart(3));
        await page.waitForTimeout(300);
        for (let q = 27; q <= 30; q++) {
            await page.click(`input[name="q${q}"][value="A"]`);
        }
        for (let q = 31; q <= 34; q++) {
            await page.evaluate(({ qn, v }) => {
                const el = document.getElementById(`q${qn}`);
                if (el) { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }
            }, { qn: q, v: 'A' });
        }
        for (let q = 35; q <= 40; q++) {
            await page.click(`input[name="q${q}"][value="YES"]`);
        }

        // Force save answers to session before submit
        await page.evaluate(() => {
            if (typeof saveAnswersToSession === 'function') saveAnswersToSession();
        });
        await page.waitForTimeout(500);

        // Check what's in localStorage
        const lsData = await page.evaluate(() => {
            return {
                studentId: localStorage.getItem('studentId'),
                studentName: localStorage.getItem('studentName'),
                selectedMock: localStorage.getItem('selectedMock'),
                readingStartTime: localStorage.getItem('readingStartTime'),
                readingAnswers: localStorage.getItem('readingAnswers'),
            };
        });
        console.log('\n=== localStorage state ===');
        console.log('studentId:', lsData.studentId);
        console.log('studentName:', lsData.studentName);
        console.log('selectedMock:', lsData.selectedMock);
        console.log('readingStartTime:', lsData.readingStartTime);
        console.log('readingAnswers (first 300):', (lsData.readingAnswers || 'null').substring(0, 300));
        const answerCount = lsData.readingAnswers ? Object.keys(JSON.parse(lsData.readingAnswers)).length : 0;
        console.log('Answer count:', answerCount);

        // Now submit
        console.log('\n=== Clicking deliver button ===');
        await page.click('#deliver-button');
        await page.waitForTimeout(2000);

        // Click submit in review modal
        const submitBtn = await page.$('#review-submit-btn');
        if (submitBtn) {
            console.log('Found review-submit-btn, clicking...');
            await submitBtn.click();
        } else {
            console.log('No review modal found!');
        }

        // Wait for network requests
        await page.waitForTimeout(5000);

        console.log('\n=== Final state ===');
        console.log('URL:', page.url());
        console.log('Network requests captured:', requests.length);

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        await browser.close();
    }
})();
