// Eye Round 8: Cambridge B1-Preliminary Reading Mock 1
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

    const STUDENT_ID = '99934';
    const STUDENT_NAME = 'Eye Bot B1';
    const BASE = 'http://localhost:3003';

    try {
        // Login
        await page.goto(`${BASE}/index.html?exam=cambridge`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => { localStorage.clear(); localStorage.setItem('examType', 'Cambridge'); });
        await page.fill('#studentId', STUDENT_ID);
        await page.fill('#studentName', STUDENT_NAME);
        await page.click('#startTest');
        await page.waitForURL('**/dashboard-cambridge.html**', { timeout: 10000 });
        const wb = await page.$('#wg-start-btn');
        if (wb) { await wb.click(); await page.waitForTimeout(500); }

        await page.evaluate(() => {
            localStorage.setItem('cambridgeLevel', 'B1-Preliminary');
            localStorage.setItem('selectedCambridgeMock', '1');
        });

        // Navigate to reading test
        await page.goto(`${BASE}/Cambridge/MOCKs-Cambridge/B1-Preliminary/reading.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);

        // Set times
        await page.evaluate(() => {
            const t = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            localStorage.setItem('testStartTime', t);
            localStorage.setItem('cambridge-readingStartTime', t);
            localStorage.setItem('cambridge-readingStatus', 'in-progress');
        });

        // Set 30 reading answers in localStorage
        const answers = {};
        // Parts 1-3: MC (A/B/C), Parts 4-6: matching/cloze
        for (let i = 1; i <= 5; i++) answers[String(i)] = ['A', 'B', 'C', 'A', 'B'][i-1]; // Part 1
        for (let i = 6; i <= 10; i++) answers[String(i)] = ['B', 'A', 'C', 'B', 'A'][i-6]; // Part 2
        for (let i = 11; i <= 15; i++) answers[String(i)] = ['C', 'A', 'B', 'C', 'A'][i-11]; // Part 3
        for (let i = 16; i <= 20; i++) answers[String(i)] = ['D', 'A', 'B', 'C', 'E'][i-16]; // Part 4
        for (let i = 21; i <= 25; i++) answers[String(i)] = ['the', 'was', 'have', 'with', 'their'][i-21]; // Part 5
        for (let i = 26; i <= 30; i++) answers[String(i)] = ['B', 'A', 'C', 'D', 'A'][i-26]; // Part 6

        await page.evaluate((a) => localStorage.setItem('cambridge-readingAnswers', JSON.stringify(a)), answers);
        console.log(`Set ${Object.keys(answers).length} answers`);

        // Navigate to last reading part (Part 6) and submit
        const frameEl = await page.$('#part-frame');
        if (frameEl) {
            await page.evaluate(() => { document.getElementById('part-frame').src = './Part 6.html'; });
            await page.waitForTimeout(2000);
            const frame = await frameEl.contentFrame();
            if (frame) {
                // Dismiss any overlays
                await frame.evaluate(() => {
                    document.querySelectorAll('.audio-popup-overlay, [class*="popup-overlay"]').forEach(el => el.classList.add('hidden'));
                });
                const btn = await frame.$('#deliver-button');
                if (btn) { await btn.click({ force: true }); console.log('Clicked deliver'); }
            }
        }

        await page.waitForTimeout(2000);
        const reviewBtn = await page.$('#c-review-submit');
        if (reviewBtn) { await reviewBtn.click(); console.log('Clicked submit'); }
        await page.waitForTimeout(5000);
        console.log('URL:', page.url());

        // Verify
        const dbCheck = await page.evaluate(async () => {
            try {
                const lr = await fetch('/admin-login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:"Adm!n#2025$SecureP@ss"}) });
                const ld = await lr.json();
                const sr = await fetch('/cambridge-submissions?student_id=99934', { headers:{'Authorization':'Bearer '+ld.token} });
                const sd = await sr.json();
                return (Array.isArray(sd)?sd:[]).map(s => `${s.student_id}|${s.level}|${s.skill}|${Object.keys(s.answers||{}).length}ans`);
            } catch(e) { return [e.message]; }
        });
        dbCheck.forEach(s => console.log('  ' + s));
        const pass = dbCheck.some(s => s.includes('reading'));

        // Admin
        await page.goto(`${BASE}/cambridge-admin-dashboard.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        await page.fill('#password', "Adm!n#2025$SecureP@ss");
        await page.click('#loginBtn');
        for (let i = 0; i < 15; i++) { await page.waitForTimeout(2000); const r = await page.evaluate(() => document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission').length); if (r > 0) { console.log(`Table: ${r} rows`); break; } }
        const admin = await page.evaluate(() => { const rows = document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission'); for (const r of rows) { if (r.textContent.includes('99934') && r.textContent.toLowerCase().includes('read')) return r.textContent.replace(/\s+/g,' ').trim().substring(0,200); } return null; });
        console.log('Admin:', admin || 'NOT FOUND');

        console.log(`\nRound 8: DB=${pass?'PASS':'FAIL'} Admin=${admin?'PASS':'CHECK'}`);

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        await browser.close();
    }
})();
