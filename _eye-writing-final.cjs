// Writing test — use waitForResponse to catch the submission POST
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
    page.on('dialog', async d => await d.accept());

    const BASE = 'http://localhost:3002';

    try {
        // Login
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

        // Fill tasks
        await page.fill('#task1-textarea', TASK1);
        await page.evaluate(() => document.getElementById('task1-textarea').dispatchEvent(new Event('input', { bubbles: true })));
        await page.evaluate(() => switchTask(2));
        await page.waitForTimeout(300);
        await page.fill('#task2-textarea', TASK2);
        await page.evaluate(() => document.getElementById('task2-textarea').dispatchEvent(new Event('input', { bubbles: true })));
        await page.waitForTimeout(500);

        // Intercept /submissions POST to see the response
        const submissionPromise = page.waitForResponse(
            resp => resp.url().includes('/submissions') && resp.request().method() === 'POST',
            { timeout: 15000 }
        ).catch(e => null); // Don't fail if not captured

        // Click submit
        console.log('Clicking submit...');
        await page.click('#deliver-button');

        // Wait for the submission response
        const resp = await submissionPromise;
        if (resp) {
            const status = resp.status();
            let body = '';
            try { body = await resp.text(); } catch (e) {}
            console.log(`Submission response: ${status} — ${body.substring(0, 300)}`);
        } else {
            console.log('No submission POST captured within 15s');
        }

        // Wait for redirect
        await page.waitForTimeout(3000);
        console.log('Final URL:', page.url());

        // Check DB directly
        const subs = await page.evaluate(async () => {
            try {
                const lr = await fetch('/admin-login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:"Adm!n#2025$SecureP@ss"}) });
                const ld = await lr.json();
                const sr = await fetch('/submissions?limit=3&sort=newest', { headers:{'Authorization':'Bearer '+ld.token} });
                const sd = await sr.json();
                return (sd.submissions||[]).slice(0,3).map(s => `${s.student_id} | ${s.student_name} | ${s.skill} | ${Object.keys(s.answers||{}).length} answers`);
            } catch(e) { return [e.message]; }
        });
        console.log('Top 3 submissions:', subs);

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        await browser.close();
    }
})();
