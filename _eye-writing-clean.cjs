// Clean writing submission test — capture ALL POST responses
const path = require('path');
const { chromium } = require(path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright'));

const TASK1 = Array(160).fill(null).map((_, i) => ['The','data','shows','food','consumption','in','three','countries','between','1961','and','2011','which','reveals','significant','changes','over','time','period'][i % 19]).join(' ');
const TASK2 = Array(260).fill(null).map((_, i) => ['Running','a','business','offers','freedom','and','control','but','employment','provides','stability','security','benefits','and','predictable','income','for','workers','each','option'][i % 20]).join(' ');

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1217/chrome-win64/chrome.exe')
    });
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await context.newPage();

    page.on('dialog', async dialog => { await dialog.accept(); });

    // Capture ALL POST requests and responses
    page.on('response', async resp => {
        if (resp.request().method() === 'POST' && resp.url().includes('localhost:3002')) {
            let body = '';
            try { body = await resp.text(); } catch (e) {}
            console.log(`<< ${resp.status()} ${resp.request().method()} ${resp.url()} — ${body.substring(0, 300)}`);
        }
    });

    const BASE = 'http://localhost:3002';

    try {
        await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => { localStorage.clear(); localStorage.setItem('examType', 'IELTS'); });
        await page.fill('#studentId', '99902');
        await page.fill('#studentName', 'Eye Bot Writing');
        await page.click('#startTest');
        await page.waitForURL('**/student-dashboard.html**', { timeout: 10000 });
        const wb = await page.$('#wg-start-btn');
        if (wb) { await wb.click(); await page.waitForTimeout(500); }

        await page.evaluate(() => localStorage.setItem('selectedMock', '1'));
        await page.click('#writingButton');
        await page.waitForURL('**/writing.html**', { timeout: 10000 });
        await page.waitForTimeout(1500);

        // Set start time 5 min ago
        await page.evaluate(() => {
            localStorage.setItem('writingStartTime', new Date(Date.now() - 5 * 60 * 1000).toISOString());
        });

        // Fill
        await page.fill('#task1-textarea', TASK1);
        await page.evaluate(() => document.getElementById('task1-textarea').dispatchEvent(new Event('input', { bubbles: true })));
        await page.evaluate(() => switchTask(2));
        await page.waitForTimeout(300);
        await page.fill('#task2-textarea', TASK2);
        await page.evaluate(() => document.getElementById('task2-textarea').dispatchEvent(new Event('input', { bubbles: true })));

        console.log('=== SUBMITTING (watch for POST /submissions) ===');
        await page.click('#deliver-button');
        await page.waitForTimeout(8000);
        console.log('URL:', page.url());

        // Now verify in DB
        console.log('\n=== CHECKING DB ===');
        // Use fetch within the page to check
        const dbCheck = await page.evaluate(async () => {
            try {
                // Login admin
                const loginResp = await fetch('/admin-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: 'admin', password: "Adm!n#2025$SecureP@ss" })
                });
                const loginData = await loginResp.json();
                if (!loginData.token) return { error: 'no token' };

                // Get recent submissions
                const subsResp = await fetch('/submissions?limit=5&sort=newest', {
                    headers: { 'Authorization': 'Bearer ' + loginData.token }
                });
                const subsData = await subsResp.json();
                const subs = subsData.submissions || [];
                return subs.slice(0, 5).map(s => ({
                    id: s.student_id,
                    name: s.student_name,
                    skill: s.skill,
                    mock: s.mock_number,
                    answers: Object.keys(s.answers || {}).length,
                    date: String(s.created_at).slice(0, 19)
                }));
            } catch (e) {
                return { error: e.message };
            }
        });
        console.log('Recent submissions:');
        if (Array.isArray(dbCheck)) {
            dbCheck.forEach(s => console.log(`  ${s.id} | ${s.name} | ${s.skill} | mock ${s.mock} | ${s.answers} answers | ${s.date}`));
        } else {
            console.log(JSON.stringify(dbCheck));
        }

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        await browser.close();
    }
})();
