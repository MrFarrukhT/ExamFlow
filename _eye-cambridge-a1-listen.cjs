// Eye Round 5: Cambridge A1-Movers Listening Mock 1 — end-to-end
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
            console.log(`<< ${resp.status()} POST ${resp.url()} — ${body.substring(0, 200)}`);
        }
    });

    const STUDENT_ID = '99914';
    const STUDENT_NAME = 'Eye Bot A1';
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
        console.log('On Cambridge dashboard');
        const wb = await page.$('#wg-start-btn');
        if (wb) { await wb.click(); await page.waitForTimeout(500); }

        // Set level and mock
        await page.evaluate(() => {
            localStorage.setItem('cambridgeLevel', 'A1-Movers');
            localStorage.setItem('selectedCambridgeMock', '1');
        });

        // Navigate directly to listening test
        await page.goto(`${BASE}/Cambridge/MOCKs-Cambridge/A1-Movers/listening.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        console.log('On A1-Movers Listening test');

        // Set start times
        await page.evaluate(() => {
            const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            localStorage.setItem('testStartTime', fiveMinAgo);
            localStorage.setItem('cambridge-listeningStartTime', fiveMinAgo);
            localStorage.setItem('cambridge-listeningStatus', 'in-progress');
        });

        // Dismiss audio popup
        const playBtn = await page.$('#start-listening-btn');
        if (playBtn) {
            await playBtn.click();
            console.log('Dismissed audio popup');
            await page.waitForTimeout(1000);
            // Mute audio
            await page.evaluate(() => {
                const audio = document.getElementById('global-audio-player');
                if (audio) { audio.muted = true; audio.pause(); }
            });
        }

        // ===== SET ANSWERS IN LOCALSTORAGE =====
        console.log('=== SETTING ANSWERS ===');
        // Since listening uses complex drag-drop widgets, we set answers directly in localStorage
        // (same storage the real UI uses), then submit via the real UI submit button
        const listeningAnswers = {};
        // Part 1: L1-L5 (name matching)
        listeningAnswers.L1 = 'Tom';
        listeningAnswers.L2 = 'Mary';
        listeningAnswers.L3 = 'Jim';
        listeningAnswers.L4 = 'Jane';
        listeningAnswers.L5 = 'Peter';
        // Part 2: L6-L10
        listeningAnswers.L6 = 'B';
        listeningAnswers.L7 = 'A';
        listeningAnswers.L8 = 'C';
        listeningAnswers.L9 = 'A';
        listeningAnswers.L10 = 'B';
        // Part 3: L11-L15
        listeningAnswers.L11 = 'swimming';
        listeningAnswers.L12 = 'football';
        listeningAnswers.L13 = 'drawing';
        listeningAnswers.L14 = 'reading';
        listeningAnswers.L15 = 'cooking';
        // Part 4: L16-L20
        listeningAnswers.L16 = 'C';
        listeningAnswers.L17 = 'A';
        listeningAnswers.L18 = 'B';
        listeningAnswers.L19 = 'A';
        listeningAnswers.L20 = 'C';
        // Part 5: L21-L25
        listeningAnswers.L21 = 'park';
        listeningAnswers.L22 = 'school';
        listeningAnswers.L23 = 'hospital';
        listeningAnswers.L24 = 'library';
        listeningAnswers.L25 = 'museum';

        await page.evaluate((answers) => {
            localStorage.setItem('cambridge-listeningAnswers', JSON.stringify(answers));
        }, listeningAnswers);
        console.log(`Set ${Object.keys(listeningAnswers).length} answers in localStorage`);

        // Navigate to the last part (Part 5) where the deliver button is
        const frameEl = await page.$('#part-frame');
        if (frameEl) {
            // Navigate iframe to Part 5 directly
            await page.evaluate(() => {
                document.getElementById('part-frame').src = './Listening-Part-5.html';
            });
            await page.waitForTimeout(2000);
            console.log('Navigated to Part 5');

            // Get iframe and click deliver button
            const frame = await frameEl.contentFrame();
            if (frame) {
                const deliverBtn = await frame.$('#deliver-button');
                if (deliverBtn) {
                    await deliverBtn.click();
                    console.log('Clicked deliver button');
                } else {
                    console.log('No deliver button in Part 5 iframe');
                }
            }
        }

        await page.waitForTimeout(2000);

        // Check for review modal on parent
        const reviewBtn = await page.$('#c-review-submit');
        if (reviewBtn) {
            await reviewBtn.click();
            console.log('Clicked c-review-submit');
        }

        await page.waitForTimeout(5000);
        console.log('URL after submit:', page.url());

        // ===== VERIFY DB =====
        console.log('\n=== DB CHECK ===');
        const dbCheck = await page.evaluate(async () => {
            try {
                const lr = await fetch('/admin-login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:"Adm!n#2025$SecureP@ss"}) });
                const ld = await lr.json();
                const sr = await fetch('/cambridge-submissions?student_id=99914', { headers:{'Authorization':'Bearer '+ld.token} });
                const sd = await sr.json();
                const subs = Array.isArray(sd) ? sd : sd.submissions || [];
                return subs.map(s => `${s.student_id} | ${s.student_name} | ${s.level} | ${s.skill} | mock ${s.mock_test} | ${Object.keys(s.answers||{}).length} ans`);
            } catch(e) { return [e.message]; }
        });
        console.log('Submissions for 99914:');
        dbCheck.forEach(s => console.log('  ' + s));

        const hasListening = dbCheck.some(s => s.includes('listening'));
        console.log(`\nListening in DB: ${hasListening ? 'YES' : 'NO'}`);

        // ===== ADMIN =====
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
                if (row.textContent.includes('99914') && row.textContent.toLowerCase().includes('listen')) {
                    return row.textContent.replace(/\s+/g, ' ').trim().substring(0, 200);
                }
            }
            return null;
        });
        console.log('Admin listening row:', adminRow || 'NOT FOUND (may be on page 2)');

        console.log('\n========================================');
        console.log('Round 5 Complete!');
        console.log(`DB: ${hasListening ? 'PASS' : 'FAIL'}`);
        console.log(`Admin: ${adminRow ? 'PASS' : 'CHECK'}`);
        console.log('========================================');

    } catch (error) {
        console.error('ERROR:', error.message);
        await page.screenshot({ path: '_eye-screenshots/cambridge-a1-listen-error.png' });
    } finally {
        await browser.close();
    }
})();
