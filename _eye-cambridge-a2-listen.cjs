// Eye Round 7: Cambridge A2-Key Listening Mock 1
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

    const BASE = 'http://localhost:3003';

    try {
        // Login as same student
        await page.goto(`${BASE}/index.html?exam=cambridge`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => { localStorage.clear(); localStorage.setItem('examType', 'Cambridge'); });
        await page.fill('#studentId', '99924');
        await page.fill('#studentName', 'Eye Bot A2');
        await page.click('#startTest');
        await page.waitForURL('**/dashboard-cambridge.html**', { timeout: 10000 });
        const wb = await page.$('#wg-start-btn');
        if (wb) { await wb.click(); await page.waitForTimeout(500); }

        await page.evaluate(() => {
            localStorage.setItem('cambridgeLevel', 'A2-Key');
            localStorage.setItem('selectedCambridgeMock', '1');
        });

        // Navigate to listening
        await page.goto(`${BASE}/Cambridge/MOCKs-Cambridge/A2-Key/listening.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);

        // Set times
        await page.evaluate(() => {
            const t = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            localStorage.setItem('testStartTime', t);
            localStorage.setItem('cambridge-listeningStartTime', t);
            localStorage.setItem('cambridge-listeningStatus', 'in-progress');
        });

        // Dismiss audio popup via JS (more reliable than clicking)
        await page.evaluate(() => {
            const popup = document.getElementById('audio-popup');
            if (popup) popup.classList.add('hidden');
            const audio = document.getElementById('global-audio-player');
            if (audio) { audio.muted = true; }
        });
        console.log('Dismissed audio popup');

        // Set 25 listening answers
        const answers = {};
        for (let i = 1; i <= 5; i++) answers[`L${i}`] = ['Tom', 'Mary', 'Jim', 'Jane', 'Peter'][i-1];
        for (let i = 6; i <= 10; i++) answers[`L${i}`] = ['B', 'A', 'C', 'A', 'B'][i-6];
        for (let i = 11; i <= 15; i++) answers[`L${i}`] = ['garden', 'school', 'park', 'house', 'street'][i-11];
        for (let i = 16; i <= 20; i++) answers[`L${i}`] = ['C', 'A', 'B', 'A', 'C'][i-16];
        for (let i = 21; i <= 25; i++) answers[`L${i}`] = ['library', 'museum', 'cinema', 'hospital', 'station'][i-21];

        await page.evaluate((a) => localStorage.setItem('cambridge-listeningAnswers', JSON.stringify(a)), answers);
        console.log(`Set ${Object.keys(answers).length} answers`);

        // Navigate to last part and submit
        const frameEl = await page.$('#part-frame');
        if (frameEl) {
            await page.evaluate(() => { document.getElementById('part-frame').src = './Listening-Part-5.html'; });
            await page.waitForTimeout(2000);
            const frame = await frameEl.contentFrame();
            if (frame) {
                // Dismiss any audio popup inside the iframe too
                await frame.evaluate(() => {
                    const popup = document.getElementById('audio-popup');
                    if (popup) popup.classList.add('hidden');
                    document.querySelectorAll('.audio-popup-overlay').forEach(el => el.classList.add('hidden'));
                });
                await frame.waitForTimeout(300);
                const btn = await frame.$('#deliver-button');
                if (btn) {
                    await btn.click({ force: true });
                    console.log('Clicked deliver button');
                }
            }
        }
        await page.waitForTimeout(2000);
        const reviewBtn = await page.$('#c-review-submit');
        if (reviewBtn) await reviewBtn.click();
        await page.waitForTimeout(5000);
        console.log('URL:', page.url());

        // Verify DB
        const dbCheck = await page.evaluate(async () => {
            try {
                const lr = await fetch('/admin-login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:"Adm!n#2025$SecureP@ss"}) });
                const ld = await lr.json();
                const sr = await fetch('/cambridge-submissions?student_id=99924', { headers:{'Authorization':'Bearer '+ld.token} });
                const sd = await sr.json();
                return (Array.isArray(sd)?sd:[]).map(s => `${s.student_id}|${s.level}|${s.skill}|${Object.keys(s.answers||{}).length}ans`);
            } catch(e) { return [e.message]; }
        });
        dbCheck.forEach(s => console.log('  ' + s));
        const pass = dbCheck.some(s => s.includes('listening'));

        // Admin
        await page.goto(`${BASE}/cambridge-admin-dashboard.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        await page.fill('#password', "Adm!n#2025$SecureP@ss");
        await page.click('#loginBtn');
        for (let i = 0; i < 15; i++) { await page.waitForTimeout(2000); const r = await page.evaluate(() => document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission').length); if (r > 0) { console.log(`Table: ${r} rows`); break; } }
        const admin = await page.evaluate(() => { const rows = document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission'); for (const r of rows) { if (r.textContent.includes('99924') && r.textContent.toLowerCase().includes('listen')) return r.textContent.replace(/\s+/g,' ').trim().substring(0,200); } return null; });
        console.log('Admin:', admin || 'NOT FOUND');

        console.log(`\nRound 7: DB=${pass?'PASS':'FAIL'} Admin=${admin?'PASS':'CHECK'}`);

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        await browser.close();
    }
})();
