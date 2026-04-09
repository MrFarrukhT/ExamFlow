// Eye Round 6: Cambridge A2-Key Reading-Writing Mock 1 — end-to-end
const path = require('path');
const { chromium } = require(path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright'));

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1217/chrome-win64/chrome.exe')
    });
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await context.newPage();
    page.on('dialog', async d => { console.log(`DIALOG: ${d.message().substring(0, 100)}`); await d.accept(); });

    page.on('response', async resp => {
        if (resp.request().method() === 'POST' && resp.url().includes('submission')) {
            let body = ''; try { body = await resp.text(); } catch(e) {}
            console.log(`<< ${resp.status()} POST — ${body.substring(0, 200)}`);
        }
    });

    const STUDENT_ID = '99924';
    const STUDENT_NAME = 'Eye Bot A2';
    const BASE = 'http://localhost:3003';

    try {
        // ===== LOGIN =====
        console.log('=== LOGIN ===');
        await page.goto(`${BASE}/index.html?exam=cambridge`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => { localStorage.clear(); localStorage.setItem('examType', 'Cambridge'); });
        await page.fill('#studentId', STUDENT_ID);
        await page.fill('#studentName', STUDENT_NAME);
        await page.click('#startTest');
        await page.waitForURL('**/dashboard-cambridge.html**', { timeout: 10000 });
        const wb = await page.$('#wg-start-btn');
        if (wb) { await wb.click(); await page.waitForTimeout(500); }

        await page.evaluate(() => {
            localStorage.setItem('cambridgeLevel', 'A2-Key');
            localStorage.setItem('selectedCambridgeMock', '1');
        });

        // Navigate to R&W test
        await page.goto(`${BASE}/Cambridge/MOCKs-Cambridge/A2-Key/reading-writing.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        console.log('On A2-Key Reading-Writing test');

        // Set start times
        await page.evaluate(() => {
            const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            localStorage.setItem('testStartTime', fiveMinAgo);
            localStorage.setItem('cambridge-reading-writingStartTime', fiveMinAgo);
            localStorage.setItem('cambridge-reading-writingStatus', 'in-progress');
        });

        // ===== SET ANSWERS =====
        console.log('=== SETTING ANSWERS ===');
        // A2-Key R&W has 30 questions (Parts 1-7), stored as numeric keys
        const rwAnswers = {};
        // Part 1: Q1-6 (multiple choice A/B/C)
        for (let i = 1; i <= 6; i++) rwAnswers[String(i)] = ['A', 'B', 'C', 'A', 'B', 'C'][i - 1];
        // Part 2: Q7-13 (matching)
        for (let i = 7; i <= 13; i++) rwAnswers[String(i)] = ['B', 'C', 'A', 'D', 'E', 'F', 'G'][i - 7];
        // Part 3: Q14-18 (multiple choice A/B/C)
        for (let i = 14; i <= 18; i++) rwAnswers[String(i)] = ['A', 'C', 'B', 'A', 'C'][i - 14];
        // Part 4: Q19-24 (matching/cloze)
        for (let i = 19; i <= 24; i++) rwAnswers[String(i)] = ['A', 'B', 'C', 'A', 'B', 'C'][i - 19];
        // Part 5: Q25-30 (text fill)
        const textAnswers = ['the', 'was', 'have', 'because', 'their', 'which'];
        for (let i = 25; i <= 30; i++) rwAnswers[String(i)] = textAnswers[i - 25];

        await page.evaluate((answers) => {
            localStorage.setItem('cambridge-reading-writingAnswers', JSON.stringify(answers));
        }, rwAnswers);
        console.log(`Set ${Object.keys(rwAnswers).length} answers`);

        // Navigate to last part and submit
        const frameEl = await page.$('#part-frame');
        if (frameEl) {
            await page.evaluate(() => {
                document.getElementById('part-frame').src = './Part 7.html';
            });
            await page.waitForTimeout(2000);

            const frame = await frameEl.contentFrame();
            if (frame) {
                const deliverBtn = await frame.$('#deliver-button');
                if (deliverBtn) {
                    await deliverBtn.click();
                    console.log('Clicked deliver button');
                }
            }
        }

        await page.waitForTimeout(2000);
        const reviewBtn = await page.$('#c-review-submit');
        if (reviewBtn) {
            await reviewBtn.click();
            console.log('Clicked c-review-submit');
        }

        await page.waitForTimeout(5000);
        console.log('URL:', page.url());

        // ===== VERIFY =====
        console.log('\n=== DB CHECK ===');
        const dbCheck = await page.evaluate(async () => {
            try {
                const lr = await fetch('/admin-login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:"Adm!n#2025$SecureP@ss"}) });
                const ld = await lr.json();
                const sr = await fetch('/cambridge-submissions?student_id=99924', { headers:{'Authorization':'Bearer '+ld.token} });
                const sd = await sr.json();
                const subs = Array.isArray(sd) ? sd : [];
                return subs.map(s => `${s.student_id} | ${s.student_name} | ${s.level} | ${s.skill} | ${Object.keys(s.answers||{}).length} ans`);
            } catch(e) { return [e.message]; }
        });
        dbCheck.forEach(s => console.log('  ' + s));
        const hasRW = dbCheck.some(s => s.includes('reading-writing'));

        console.log('\n=== ADMIN ===');
        await page.goto(`${BASE}/cambridge-admin-dashboard.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        await page.fill('#password', "Adm!n#2025$SecureP@ss");
        await page.click('#loginBtn');
        for (let i = 0; i < 15; i++) {
            await page.waitForTimeout(2000);
            const rows = await page.evaluate(() =>
                document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission').length
            );
            if (rows > 0) { console.log(`Table: ${rows} rows`); break; }
        }
        const adminRow = await page.evaluate(() => {
            const rows = document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission');
            for (const row of rows) {
                if (row.textContent.includes('99924')) return row.textContent.replace(/\s+/g, ' ').trim().substring(0, 200);
            }
            return null;
        });
        console.log('Admin:', adminRow || 'NOT FOUND');

        console.log('\n========================================');
        console.log(`Round 6: DB=${hasRW?'PASS':'FAIL'} Admin=${adminRow?'PASS':'CHECK'}`);
        console.log('========================================');

    } catch (error) {
        console.error('ERROR:', error.message);
        await page.screenshot({ path: '_eye-screenshots/cambridge-a2-rw-error.png' });
    } finally {
        await browser.close();
    }
})();
