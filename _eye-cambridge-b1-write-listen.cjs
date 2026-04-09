// Eye Rounds 9+10: Cambridge B1-Preliminary Writing + Listening
const path = require('path');
const { chromium } = require(path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright'));

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1217/chrome-win64/chrome.exe')
    });
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await context.newPage();
    page.on('dialog', async d => { console.log(`DIALOG: ${d.message().substring(0, 80)}`); await d.accept(); });
    page.on('response', async resp => {
        if (resp.request().method() === 'POST' && resp.url().includes('submission')) {
            let body = ''; try { body = await resp.text(); } catch(e) {}
            console.log(`<< ${resp.status()} POST — ${body.substring(0, 150)}`);
        }
    });

    const SID = '99934';
    const SNAME = 'Eye Bot B1';
    const BASE = 'http://localhost:3003';
    const PASS = "Adm!n#2025$SecureP@ss";

    async function login() {
        await page.goto(`${BASE}/index.html?exam=cambridge`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => { localStorage.clear(); localStorage.setItem('examType', 'Cambridge'); });
        await page.fill('#studentId', SID);
        await page.fill('#studentName', SNAME);
        await page.click('#startTest');
        await page.waitForURL('**/dashboard-cambridge.html**', { timeout: 10000 });
        const wb = await page.$('#wg-start-btn');
        if (wb) { await wb.click(); await page.waitForTimeout(500); }
        await page.evaluate(() => {
            localStorage.setItem('cambridgeLevel', 'B1-Preliminary');
            localStorage.setItem('selectedCambridgeMock', '1');
        });
    }

    async function setTimes(module) {
        await page.evaluate((mod) => {
            const t = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            localStorage.setItem('testStartTime', t);
            localStorage.setItem(`cambridge-${mod}StartTime`, t);
            localStorage.setItem(`cambridge-${mod}Status`, 'in-progress');
        }, module);
    }

    async function submitViaIframe(partFile) {
        const frameEl = await page.$('#part-frame');
        if (frameEl) {
            await page.evaluate((f) => { document.getElementById('part-frame').src = f; }, partFile);
            await page.waitForTimeout(2000);
            const frame = await frameEl.contentFrame();
            if (frame) {
                await frame.evaluate(() => {
                    document.querySelectorAll('.audio-popup-overlay, [class*="popup-overlay"]').forEach(el => el.classList.add('hidden'));
                });
                const btn = await frame.$('#deliver-button');
                if (btn) { await btn.click({ force: true }); console.log('  Clicked deliver'); }
            }
        }
        await page.waitForTimeout(2000);
        const reviewBtn = await page.$('#c-review-submit');
        if (reviewBtn) { await reviewBtn.click(); console.log('  Clicked submit'); }
        await page.waitForTimeout(5000);
    }

    async function checkDB() {
        return await page.evaluate(async (args) => {
            try {
                const lr = await fetch('/admin-login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:args.pass}) });
                const ld = await lr.json();
                const sr = await fetch(`/cambridge-submissions?student_id=${args.sid}`, { headers:{'Authorization':'Bearer '+ld.token} });
                const sd = await sr.json();
                return (Array.isArray(sd)?sd:[]).map(s => `${s.skill}|${Object.keys(s.answers||{}).length}ans`);
            } catch(e) { return [e.message]; }
        }, { sid: SID, pass: PASS });
    }

    try {
        // ===== ROUND 9: B1 Writing =====
        console.log('========== ROUND 9: B1-PRELIMINARY WRITING ==========');
        await login();

        await page.goto(`${BASE}/Cambridge/MOCKs-Cambridge/B1-Preliminary/writing.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        await setTimes('writing');

        // B1 Writing: Part 7 has sentences/email, Part 8 has a story. Store as textareas.
        // Writing answers stored in cambridge-writingAnswers
        const writingAnswers = {};
        // Part 7: email writing (question 31 in the sequence, but stored as '1' in writing module)
        writingAnswers['1'] = 'Dear Maria, Thank you for your email about the school trip. I think we should go to the museum because it has many interesting exhibits about history and science. We could also visit the park for lunch. I hope you agree with my suggestion. Best wishes, Alex';
        // Part 8: story writing
        writingAnswers['2'] = 'Last summer I went on holiday with my family to a beautiful village near the mountains. The weather was sunny and warm every day. We spent our time swimming in the lake and hiking through the forest. One day we found a small waterfall hidden behind some trees. It was the most amazing thing I had ever seen. We took lots of photographs and had a picnic there. I will never forget that wonderful holiday.';

        await page.evaluate((a) => localStorage.setItem('cambridge-writingAnswers', JSON.stringify(a)), writingAnswers);
        console.log(`  Set ${Object.keys(writingAnswers).length} writing answers`);

        await submitViaIframe('./Part 8.html');
        console.log('  URL:', page.url());

        let db = await checkDB();
        console.log('  DB:', db.join(', '));
        const hasWriting = db.some(s => s.includes('writing'));
        console.log(`  Round 9: ${hasWriting ? 'PASS' : 'FAIL'}`);

        // ===== ROUND 10: B1 Listening =====
        console.log('\n========== ROUND 10: B1-PRELIMINARY LISTENING ==========');
        await login();

        await page.goto(`${BASE}/Cambridge/MOCKs-Cambridge/B1-Preliminary/listening.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        await setTimes('listening');

        // Dismiss audio popup
        await page.evaluate(() => {
            const popup = document.getElementById('audio-popup');
            if (popup) popup.classList.add('hidden');
            const audio = document.getElementById('global-audio-player');
            if (audio) { audio.muted = true; }
        });

        // B1 Listening: L1-L25 (Parts 1-4: 1-7, 8-13, 14-19, 20-25)
        const listenAnswers = {};
        for (let i = 1; i <= 7; i++) listenAnswers[`L${i}`] = ['B', 'A', 'C', 'B', 'A', 'C', 'B'][i-1];
        for (let i = 8; i <= 13; i++) listenAnswers[`L${i}`] = ['garden', 'school', 'bridge', 'station', 'market', 'church'][i-8];
        for (let i = 14; i <= 19; i++) listenAnswers[`L${i}`] = ['A', 'B', 'C', 'A', 'B', 'C'][i-14];
        for (let i = 20; i <= 25; i++) listenAnswers[`L${i}`] = ['hospital', 'library', 'cinema', 'park', 'museum', 'hotel'][i-20];

        await page.evaluate((a) => localStorage.setItem('cambridge-listeningAnswers', JSON.stringify(a)), listenAnswers);
        console.log(`  Set ${Object.keys(listenAnswers).length} listening answers`);

        await submitViaIframe('./Listening-Part-4.html');
        console.log('  URL:', page.url());

        db = await checkDB();
        console.log('  DB:', db.join(', '));
        const hasListening = db.some(s => s.includes('listening'));
        console.log(`  Round 10: ${hasListening ? 'PASS' : 'FAIL'}`);

        // ===== ADMIN CHECK =====
        console.log('\n=== ADMIN CHECK ===');
        await page.goto(`${BASE}/cambridge-admin-dashboard.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        await page.fill('#password', PASS);
        await page.click('#loginBtn');
        for (let i = 0; i < 15; i++) { await page.waitForTimeout(2000); const r = await page.evaluate(() => document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission').length); if (r > 0) { console.log(`Table: ${r} rows`); break; } }

        const adminRows = await page.evaluate(() => {
            const rows = document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission');
            const found = [];
            for (const r of rows) {
                if (r.textContent.includes('99934')) found.push(r.textContent.replace(/\s+/g,' ').trim().substring(0, 150));
            }
            return found;
        });
        console.log('Admin rows for 99934:');
        adminRows.forEach(r => console.log('  ' + r));

        console.log('\n========================================');
        console.log(`Round 9 (Writing): ${hasWriting ? 'PASS' : 'FAIL'}`);
        console.log(`Round 10 (Listening): ${hasListening ? 'PASS' : 'FAIL'}`);
        console.log('========================================');

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        await browser.close();
    }
})();
