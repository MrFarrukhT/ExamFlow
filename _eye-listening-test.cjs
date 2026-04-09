// Eye Round 3: IELTS Listening Mock 1 — end-to-end
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
    page.on('console', msg => { if (msg.type() === 'error') console.log('ERR:', msg.text().substring(0, 150)); });

    // Capture submission POST
    page.on('response', async resp => {
        if (resp.request().method() === 'POST' && resp.url().includes('/submissions')) {
            let body = ''; try { body = await resp.text(); } catch(e) {}
            console.log(`<< ${resp.status()} POST ${resp.url()} — ${body.substring(0, 200)}`);
        }
    });

    const STUDENT_ID = '99903';
    const STUDENT_NAME = 'Eye Bot Listening';
    const BASE = 'http://localhost:3002';
    const ADMIN_PASS = "Adm!n#2025$SecureP@ss";

    try {
        // ===== LOGIN =====
        console.log('=== LOGIN ===');
        await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => { localStorage.clear(); localStorage.setItem('examType', 'IELTS'); });
        await page.fill('#studentId', STUDENT_ID);
        await page.fill('#studentName', STUDENT_NAME);
        await page.click('#startTest');
        await page.waitForURL('**/student-dashboard.html**', { timeout: 10000 });
        const wb = await page.$('#wg-start-btn');
        if (wb) { await wb.click(); await page.waitForTimeout(500); }
        console.log('Logged in');

        // ===== SELECT LISTENING =====
        console.log('=== SELECT LISTENING ===');
        await page.evaluate(() => localStorage.setItem('selectedMock', '1'));
        await page.click('#listeningButton');
        await page.waitForURL('**/listening.html**', { timeout: 10000 });
        await page.waitForTimeout(2000);
        console.log('On listening page');

        // Set start time 5 min ago (pass duration check)
        await page.evaluate(() => {
            localStorage.setItem('listeningStartTime', new Date(Date.now() - 5 * 60 * 1000).toISOString());
        });

        // Dismiss audio popup by clicking Play
        const playBtn = await page.$('#start-listening-btn');
        if (playBtn) {
            await playBtn.click();
            console.log('Dismissed audio popup (clicked Play)');
            await page.waitForTimeout(1000);
            // Mute the audio to avoid noise
            await page.evaluate(() => {
                const audio = document.getElementById('global-audio-player');
                if (audio) { audio.muted = true; audio.pause(); }
            });
        }

        // ===== FILL ANSWERS =====
        console.log('=== FILLING ANSWERS ===');

        // Q1-10: text inputs (Part 1)
        const textAnswersPart1 = ['Johnson', 'nine', 'donation', 'outdoor', 'story', '45', 'farm', 'painting', 'hat', 'Thursday'];
        for (let i = 0; i < 10; i++) {
            const q = i + 1;
            const el = await page.$(`#q${q}`);
            if (el) {
                await el.click();
                await page.waitForTimeout(50);
                await el.fill(textAnswersPart1[i]);
                console.log(`  Q${q}: ${textAnswersPart1[i]}`);
            } else {
                console.log(`  Q${q}: ELEMENT NOT FOUND`);
            }
        }

        // Switch to Part 2
        await page.evaluate(() => switchToPart(2));
        await page.waitForTimeout(500);
        console.log('  Switched to Part 2');

        // Q11-15: text inputs (Part 2)
        const textAnswersPart2 = ['library', 'castle', 'bridge', 'market', 'church'];
        for (let i = 0; i < 5; i++) {
            const q = i + 11;
            const el = await page.$(`#q${q}`);
            if (el) {
                await el.click();
                await page.waitForTimeout(50);
                await el.fill(textAnswersPart2[i]);
                console.log(`  Q${q}: ${textAnswersPart2[i]}`);
            }
        }

        // Q16-20: radio buttons (A/B/C)
        for (let q = 16; q <= 20; q++) {
            const val = ['A', 'B', 'C', 'A', 'B'][q - 16];
            await page.click(`input[name="q${q}"][value="${val}"]`);
            console.log(`  Q${q}: ${val}`);
        }

        // Switch to Part 3
        await page.evaluate(() => switchToPart(3));
        await page.waitForTimeout(500);
        console.log('  Switched to Part 3');

        // Q21-24: select dropdowns (A-F)
        for (let q = 21; q <= 24; q++) {
            const val = ['C', 'A', 'E', 'B'][q - 21];
            await page.selectOption(`#q${q}`, val);
            console.log(`  Q${q}: ${val} (select)`);
        }

        // Q25-30: radio buttons (A/B/C) — still Part 3
        for (let q = 25; q <= 30; q++) {
            const val = ['B', 'A', 'C', 'B', 'A', 'C'][q - 25];
            await page.click(`input[name="q${q}"][value="${val}"]`);
            console.log(`  Q${q}: ${val}`);
        }

        // Switch to Part 4
        await page.evaluate(() => switchToPart(4));
        await page.waitForTimeout(500);
        console.log('  Switched to Part 4');

        // Q31-32: radio buttons (A/B/C) — Part 4
        for (let q = 31; q <= 32; q++) {
            const val = ['A', 'B'][q - 31];
            await page.click(`input[name="q${q}"][value="${val}"]`);
            console.log(`  Q${q}: ${val}`);
        }

        // Q33-40: text inputs (Part 4)
        const textAnswersPart4 = ['function', 'trial and error', 'specialists', 'templates', 'interchangeable', 'software', 'complex', 'meet'];
        for (let i = 0; i < 8; i++) {
            const q = i + 33;
            const el = await page.$(`#q${q}`);
            if (el) {
                await el.click();
                await page.waitForTimeout(50);
                await el.fill(textAnswersPart4[i]);
                console.log(`  Q${q}: ${textAnswersPart4[i]}`);
            }
        }

        console.log('All 40 answers filled!');
        await page.screenshot({ path: '_eye-screenshots/listening-01-filled.png' });

        // ===== SUBMIT =====
        console.log('=== SUBMIT ===');
        await page.click('#deliver-button');
        await page.waitForTimeout(2000);

        // Check for review modal
        const reviewBtn = await page.$('#review-submit-btn');
        if (reviewBtn) {
            await reviewBtn.click();
            console.log('Clicked review-submit-btn');
        }
        await page.waitForTimeout(5000);
        console.log('URL after submit:', page.url());

        // ===== VERIFY DB =====
        console.log('\n=== DB CHECK ===');
        const subs = await page.evaluate(async () => {
            try {
                const lr = await fetch('/admin-login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:"Adm!n#2025$SecureP@ss"}) });
                const ld = await lr.json();
                const sr = await fetch('/submissions?limit=5&sort=newest', { headers:{'Authorization':'Bearer '+ld.token} });
                const sd = await sr.json();
                return (sd.submissions||[]).slice(0,5).map(s => `${s.student_id} | ${s.student_name} | ${s.skill} | mock ${s.mock_number} | ${Object.keys(s.answers||{}).length} answers`);
            } catch(e) { return [e.message]; }
        });
        subs.forEach(s => console.log('  ' + s));

        const listSubmission = subs.find(s => s.includes('99903'));
        console.log(`\nListening submission in DB: ${listSubmission ? 'YES' : 'NO'}`);

        // ===== ADMIN DASHBOARD =====
        console.log('\n=== ADMIN DASHBOARD ===');
        await page.goto(`${BASE}/ielts-admin-dashboard.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        await page.fill('#password', ADMIN_PASS);
        await page.click('#loginBtn');

        // Wait for table
        for (let i = 0; i < 15; i++) {
            await page.waitForTimeout(2000);
            const rows = await page.evaluate(() =>
                document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission').length
            );
            if (rows > 0) { console.log(`Table loaded: ${rows} rows (${(i+1)*2}s)`); break; }
        }

        const adminRow = await page.evaluate(() => {
            const rows = document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission');
            for (const row of rows) {
                if (row.textContent.includes('99903') || row.textContent.includes('Eye Bot Listening')) {
                    row.style.backgroundColor = '#e8f5e9';
                    row.style.outline = '3px solid #4CAF50';
                    row.scrollIntoView({ block: 'center' });
                    return row.textContent.replace(/\s+/g, ' ').trim().substring(0, 250);
                }
            }
            return null;
        });
        console.log('Admin row:', adminRow ? adminRow : 'NOT FOUND');
        await page.screenshot({ path: '_eye-screenshots/listening-02-admin.png' });

        // ===== INVIGILATOR =====
        console.log('\n=== INVIGILATOR ===');
        await page.goto(`${BASE}/invigilator.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
        const invFound = await page.evaluate(() => {
            const t = document.body.innerText;
            return { has99903: t.includes('99903'), hasEyeBot: t.includes('Eye Bot Listening') };
        });
        console.log('Invigilator:', JSON.stringify(invFound));
        await page.screenshot({ path: '_eye-screenshots/listening-03-invig.png' });

        // ===== SUMMARY =====
        console.log('\n========================================');
        console.log('Round 3 Complete!');
        console.log(`Student: ${STUDENT_NAME} (${STUDENT_ID})`);
        console.log(`Test: IELTS Listening Mock 1`);
        console.log(`DB: ${listSubmission ? 'PASS' : 'FAIL'}`);
        console.log(`Admin: ${adminRow ? 'PASS' : 'FAIL'}`);
        console.log(`Invigilator: ${invFound.hasEyeBot || invFound.has99903 ? 'PASS' : 'CHECK'}`);
        console.log('========================================');

    } catch (error) {
        console.error('ERROR:', error.message);
        await page.screenshot({ path: '_eye-screenshots/listening-error.png' });
    } finally {
        await browser.close();
    }
})();
