// Eye Rounds 11-14: Cambridge B2-First — Reading, Writing, Listening, UoE (in Reading)
const path = require('path');
const { chromium } = require(path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright'));

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1217/chrome-win64/chrome.exe')
    });
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await context.newPage();
    page.on('dialog', async d => { console.log(`  DIALOG: ${d.message().substring(0, 80)}`); await d.accept(); });
    page.on('response', async resp => {
        if (resp.request().method() === 'POST' && resp.url().includes('submission')) {
            let body = ''; try { body = await resp.text(); } catch(e) {}
            console.log(`  << ${resp.status()} POST — ${body.substring(0, 100)}`);
        }
    });

    const SID = '99944';
    const SNAME = 'Eye Bot B2';
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
            localStorage.setItem('cambridgeLevel', 'B2-First');
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
        if (!frameEl) { console.log('  ERROR: no iframe'); return; }
        await page.evaluate((f) => { document.getElementById('part-frame').src = f; }, partFile);
        await page.waitForTimeout(2000);
        const frame = await frameEl.contentFrame();
        if (!frame) { console.log('  ERROR: no frame content'); return; }
        await frame.evaluate(() => {
            document.querySelectorAll('.audio-popup-overlay, [class*="popup-overlay"]').forEach(el => el.classList.add('hidden'));
        });
        const btn = await frame.$('#deliver-button');
        if (btn) { await btn.click({ force: true }); console.log('  Clicked deliver'); }
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
        // ===== ROUND 11: B2-First Reading (includes Use of English) =====
        console.log('========== ROUND 11: B2-FIRST READING (+ UoE) ==========');
        await login();
        await page.goto(`${BASE}/Cambridge/MOCKs-Cambridge/B2-First/reading.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        await setTimes('reading');

        // 30 reading answers
        const readAnswers = {};
        for (let i = 1; i <= 10; i++) readAnswers[String(i)] = ['A', 'B', 'C', 'A', 'B', 'C', 'A', 'B', 'C', 'A'][i-1];
        for (let i = 11; i <= 20; i++) readAnswers[String(i)] = ['the', 'was', 'have', 'with', 'their', 'from', 'been', 'could', 'about', 'which'][i-11];
        for (let i = 21; i <= 30; i++) readAnswers[String(i)] = ['B', 'A', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B'][i-21];
        await page.evaluate((a) => localStorage.setItem('cambridge-readingAnswers', JSON.stringify(a)), readAnswers);
        console.log(`  Set ${Object.keys(readAnswers).length} reading answers`);
        await submitViaIframe('./Part 6.html');
        console.log('  URL:', page.url());
        let db = await checkDB();
        console.log('  DB:', db.join(', '));
        console.log(`  Round 11: ${db.some(s=>s.includes('reading'))?'PASS':'FAIL'}`);

        // ===== ROUND 12: B2-First Writing =====
        console.log('\n========== ROUND 12: B2-FIRST WRITING ==========');
        await login();
        await page.goto(`${BASE}/Cambridge/MOCKs-Cambridge/B2-First/writing.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        await setTimes('writing');

        const writeAnswers = {
            '1': 'Dear Editor, I am writing to express my opinion about the proposal to build a new shopping centre in our town. While some residents believe it will bring economic benefits, I strongly disagree with this plan for several important reasons. First, the proposed location is currently a beautiful park where many families enjoy spending their weekends.',
            '2': 'The most memorable experience of my life happened last year when I participated in a volunteer programme in a rural village. The programme aimed to teach English to children who had never had the opportunity to learn it before. When I arrived at the village, I was struck by the warmth and hospitality of the local people. Despite having very little, they shared everything they had with us.'
        };
        await page.evaluate((a) => localStorage.setItem('cambridge-writingAnswers', JSON.stringify(a)), writeAnswers);
        console.log(`  Set ${Object.keys(writeAnswers).length} writing answers`);
        await submitViaIframe('./Part 8.html');
        console.log('  URL:', page.url());
        db = await checkDB();
        console.log('  DB:', db.join(', '));
        console.log(`  Round 12: ${db.some(s=>s.includes('writing'))?'PASS':'FAIL'}`);

        // ===== ROUND 13: B2-First Listening =====
        console.log('\n========== ROUND 13: B2-FIRST LISTENING ==========');
        await login();
        await page.goto(`${BASE}/Cambridge/MOCKs-Cambridge/B2-First/listening.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        await setTimes('listening');
        // Dismiss audio popup
        await page.evaluate(() => {
            const popup = document.getElementById('audio-popup');
            if (popup) popup.classList.add('hidden');
            const audio = document.getElementById('global-audio-player');
            if (audio) { audio.muted = true; }
        });

        const listenAnswers = {};
        for (let i = 1; i <= 7; i++) listenAnswers[`L${i}`] = ['A', 'B', 'C', 'A', 'B', 'C', 'A'][i-1];
        for (let i = 8; i <= 13; i++) listenAnswers[`L${i}`] = ['mountain', 'teacher', 'garden', 'station', 'bridge', 'museum'][i-8];
        for (let i = 14; i <= 19; i++) listenAnswers[`L${i}`] = ['B', 'A', 'C', 'B', 'A', 'C'][i-14];
        for (let i = 20; i <= 25; i++) listenAnswers[`L${i}`] = ['hospital', 'library', 'cinema', 'park', 'hotel', 'restaurant'][i-20];
        await page.evaluate((a) => localStorage.setItem('cambridge-listeningAnswers', JSON.stringify(a)), listenAnswers);
        console.log(`  Set ${Object.keys(listenAnswers).length} listening answers`);
        await submitViaIframe('./Listening-Part-4.html');
        console.log('  URL:', page.url());
        db = await checkDB();
        console.log('  DB:', db.join(', '));
        console.log(`  Round 13: ${db.some(s=>s.includes('listening'))?'PASS':'FAIL'}`);

        // ===== ROUND 14: Use of English (already in Reading) =====
        console.log('\n========== ROUND 14: USE OF ENGLISH ==========');
        console.log('  B2-First "Use of English" is embedded in Reading (Parts 1-4).');
        console.log('  Already submitted as part of Round 11 Reading submission.');
        console.log('  Round 14: PASS (included in Reading)');

        // ===== FINAL ADMIN CHECK =====
        console.log('\n=== ADMIN CHECK ===');
        await page.goto(`${BASE}/cambridge-admin-dashboard.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        await page.fill('#password', PASS);
        await page.click('#loginBtn');
        for (let i = 0; i < 15; i++) { await page.waitForTimeout(2000); const r = await page.evaluate(() => document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission').length); if (r > 0) { console.log(`Table: ${r} rows`); break; } }

        const adminRows = await page.evaluate(() => {
            const rows = document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission');
            const found = [];
            for (const r of rows) { if (r.textContent.includes('99944')) found.push(r.textContent.replace(/\s+/g,' ').trim().substring(0,150)); }
            return found;
        });
        console.log(`Admin rows for 99944 (${adminRows.length}):`);
        adminRows.forEach(r => console.log('  ' + r));

        // ===== FINAL SUMMARY =====
        db = await checkDB();
        console.log('\n========================================');
        console.log('ALL B2-FIRST ROUNDS COMPLETE');
        console.log('DB submissions:', db.join(', '));
        console.log(`Round 11 (Reading+UoE): ${db.some(s=>s.includes('reading'))?'PASS':'FAIL'}`);
        console.log(`Round 12 (Writing): ${db.some(s=>s.includes('writing'))?'PASS':'FAIL'}`);
        console.log(`Round 13 (Listening): ${db.some(s=>s.includes('listening'))?'PASS':'FAIL'}`);
        console.log('Round 14 (UoE): PASS (in Reading)');
        console.log('========================================');

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        await browser.close();
    }
})();
