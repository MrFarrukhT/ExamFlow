// Eye Round 4: Cambridge A1-Movers Reading-Writing Mock 1 — end-to-end
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

    page.on('response', async resp => {
        if (resp.request().method() === 'POST' && resp.url().includes('submission')) {
            let body = ''; try { body = await resp.text(); } catch(e) {}
            console.log(`<< ${resp.status()} POST ${resp.url()} — ${body.substring(0, 200)}`);
        }
    });

    const STUDENT_ID = '99914';
    const STUDENT_NAME = 'Eye Bot A1';
    const BASE = 'http://localhost:3003';
    const ADMIN_PASS = "Adm!n#2025$SecureP@ss";

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

        // Dismiss welcome guide if present
        const wb = await page.$('#wg-start-btn');
        if (wb) { await wb.click(); await page.waitForTimeout(500); }

        // ===== SELECT A1-MOVERS =====
        console.log('=== SELECT A1-MOVERS ===');
        await page.evaluate(() => {
            localStorage.setItem('cambridgeLevel', 'A1-Movers');
            localStorage.setItem('selectedCambridgeMock', '1');
        });

        // Click the A1-Movers level card
        const a1Card = await page.$('[data-level="A1-Movers"], .level-card:has-text("A1"), button:has-text("A1")');
        if (a1Card) {
            await a1Card.click();
            await page.waitForTimeout(1000);
            console.log('Clicked A1-Movers level');
        } else {
            console.log('No A1 card found, navigating directly');
        }

        // Navigate to the reading-writing test directly
        await page.goto(`${BASE}/Cambridge/MOCKs-Cambridge/A1-Movers/reading-writing.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        console.log('On A1-Movers Reading-Writing test');

        // Set start time to 5 min ago — answer-manager reads 'testStartTime'
        await page.evaluate(() => {
            const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            localStorage.setItem('testStartTime', fiveMinAgo);
            localStorage.setItem('cambridge-reading-writingStartTime', fiveMinAgo);
            localStorage.setItem('cambridge-reading-writingStatus', 'in-progress');
        });

        // ===== FILL ANSWERS VIA IFRAME =====
        console.log('=== FILLING ANSWERS ===');

        // Get the iframe
        const frameElement = await page.$('#part-frame');
        const frame = await frameElement.contentFrame();

        if (!frame) {
            console.log('ERROR: Could not access iframe content');
            throw new Error('No iframe access');
        }

        // Part 1: 5 text inputs (p1_q1 to p1_q5)
        console.log('Part 1:');
        const p1answers = ['a beard', 'a waterfall', 'shoulders', 'a stomach', 'mountains'];
        for (let i = 0; i < 5; i++) {
            const q = `p1_q${i + 1}`;
            const el = await frame.$(`#${q}`);
            if (el) {
                await el.click();
                await frame.waitForTimeout(50);
                await el.fill(p1answers[i]);
                console.log(`  ${q}: ${p1answers[i]}`);
            } else {
                console.log(`  ${q}: NOT FOUND`);
            }
        }

        // Navigate to Part 2 via Next button in iframe
        console.log('Part 2:');
        const nextBtn1 = await frame.$('#footer-nav-button-next');
        if (nextBtn1) {
            await nextBtn1.click();
            await page.waitForTimeout(2000);
        }

        // Re-get iframe after navigation (iframe src changed)
        let currentFrame = await (await page.$('#part-frame')).contentFrame();

        // Part 2: 5 radio groups (p2_q1 to p2_q5, values A/B/C)
        const p2answers = ['A', 'B', 'C', 'A', 'B'];
        for (let i = 0; i < 5; i++) {
            const name = `p2_q${i + 1}`;
            const val = p2answers[i];
            await currentFrame.click(`input[name="${name}"][value="${val}"]`);
            console.log(`  ${name}: ${val}`);
        }

        // Navigate to Part 3
        console.log('Part 3:');
        await currentFrame.click('#footer-nav-button-next');
        await page.waitForTimeout(2000);
        currentFrame = await (await page.$('#part-frame')).contentFrame();

        // Part 3: 5 text (p3_q1-q5) + 1 radio (p3_q6)
        const p3textAnswers = ['guitar', 'beach', 'playground', 'garden', 'hospital'];
        for (let i = 0; i < 5; i++) {
            const q = `p3_q${i + 1}`;
            const el = await currentFrame.$(`#${q}`);
            if (el) {
                await el.click();
                await currentFrame.waitForTimeout(50);
                await el.fill(p3textAnswers[i]);
                console.log(`  ${q}: ${p3textAnswers[i]}`);
            }
        }
        await currentFrame.click('input[name="p3_q6"][value="A"]');
        console.log('  p3_q6: A');

        // Navigate to Part 4
        console.log('Part 4:');
        await currentFrame.click('#footer-nav-button-next');
        await page.waitForTimeout(2000);
        currentFrame = await (await page.$('#part-frame')).contentFrame();

        // Part 4: 5 text inputs
        const p4answers = ['happy', 'swimming', 'cats', 'morning', 'seven'];
        for (let i = 0; i < 5; i++) {
            const q = `p4_q${i + 1}`;
            const el = await currentFrame.$(`#${q}`);
            if (el) {
                await el.click();
                await currentFrame.waitForTimeout(50);
                await el.fill(p4answers[i]);
                console.log(`  ${q}: ${p4answers[i]}`);
            }
        }

        // Navigate to Part 5
        console.log('Part 5:');
        await currentFrame.click('#footer-nav-button-next');
        await page.waitForTimeout(2000);
        currentFrame = await (await page.$('#part-frame')).contentFrame();

        // Part 5: 7 text inputs
        const p5answers = ['classroom', 'teacher', 'books', 'pencil', 'drawing', 'lunch', 'friends'];
        for (let i = 0; i < 7; i++) {
            const q = `p5_q${i + 1}`;
            const el = await currentFrame.$(`#${q}`);
            if (el) {
                await el.click();
                await currentFrame.waitForTimeout(50);
                await el.fill(p5answers[i]);
                console.log(`  ${q}: ${p5answers[i]}`);
            }
        }

        // Navigate to Part 6
        console.log('Part 6:');
        await currentFrame.click('#footer-nav-button-next');
        await page.waitForTimeout(2000);
        currentFrame = await (await page.$('#part-frame')).contentFrame();

        // Part 6: 6 text inputs
        const p6answers = ['sunny', 'park', 'brother', 'ice cream', 'bus', 'evening'];
        for (let i = 0; i < 6; i++) {
            const q = `p6_q${i + 1}`;
            const el = await currentFrame.$(`#${q}`);
            if (el) {
                await el.click();
                await currentFrame.waitForTimeout(50);
                await el.fill(p6answers[i]);
                console.log(`  ${q}: ${p6answers[i]}`);
            }
        }

        console.log('All answers filled!');
        await page.screenshot({ path: '_eye-screenshots/cambridge-a1-01-filled.png' });

        // ===== SUBMIT =====
        console.log('\n=== SUBMIT ===');
        // Click the deliver button inside the iframe
        const deliverBtn = await currentFrame.$('#deliver-button');
        if (deliverBtn) {
            await deliverBtn.click();
            console.log('Clicked deliver button in iframe');
        } else {
            console.log('No deliver button found in iframe');
        }
        await page.waitForTimeout(2000);

        // Check for review modal on parent page
        const reviewBtn = await page.$('#c-review-submit');
        if (reviewBtn) {
            await reviewBtn.click();
            console.log('Clicked c-review-submit');
        } else {
            console.log('No review modal found on parent');
            // Try confirm dialog
        }

        await page.waitForTimeout(5000);
        console.log('URL after submit:', page.url());
        await page.screenshot({ path: '_eye-screenshots/cambridge-a1-02-after-submit.png' });

        // ===== VERIFY DB =====
        console.log('\n=== DB CHECK ===');
        const dbResult = await page.evaluate(async () => {
            try {
                const lr = await fetch('/admin-login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:"Adm!n#2025$SecureP@ss"}) });
                const ld = await lr.json();
                const sr = await fetch('/cambridge-submissions?limit=5&sort=newest', { headers:{'Authorization':'Bearer '+ld.token} });
                const sd = await sr.json();
                return (sd.submissions||[]).slice(0,5).map(s => `${s.student_id} | ${s.student_name} | ${s.level} | ${s.skill} | ${Object.keys(s.answers||{}).length} answers`);
            } catch(e) { return [e.message]; }
        });
        console.log('Recent Cambridge submissions:');
        dbResult.forEach(s => console.log('  ' + s));

        const a1Sub = dbResult.find(s => s.includes('99904'));
        console.log(`\nA1 submission in DB: ${a1Sub ? 'YES' : 'NO'}`);

        // ===== ADMIN DASHBOARD =====
        console.log('\n=== CAMBRIDGE ADMIN ===');
        await page.goto(`${BASE}/cambridge-admin-dashboard.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        await page.fill('#password', ADMIN_PASS);
        await page.click('#loginBtn');

        // Wait for table to load
        for (let i = 0; i < 15; i++) {
            await page.waitForTimeout(2000);
            const rows = await page.evaluate(() =>
                document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission').length
            );
            if (rows > 0) { console.log(`Table: ${rows} rows (${(i+1)*2}s)`); break; }
        }
        await page.screenshot({ path: '_eye-screenshots/cambridge-a1-03-admin.png' });

        // ===== INVIGILATOR =====
        console.log('\n=== INVIGILATOR ===');
        await page.goto(`${BASE}/invigilator.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
        const invFound = await page.evaluate(() => {
            const t = document.body.innerText;
            return { has99904: t.includes('99904'), hasEyeBot: t.includes('Eye Bot A1') };
        });
        console.log('Invigilator:', JSON.stringify(invFound));
        await page.screenshot({ path: '_eye-screenshots/cambridge-a1-04-invig.png' });

        // ===== SUMMARY =====
        console.log('\n========================================');
        console.log('Round 4 Complete!');
        console.log(`Student: ${STUDENT_NAME} (${STUDENT_ID})`);
        console.log(`Test: Cambridge A1-Movers Reading-Writing Mock 1`);
        console.log(`DB: ${a1Sub ? 'PASS' : 'FAIL'}`);
        console.log(`Invigilator: ${invFound.hasEyeBot || invFound.has99904 ? 'PASS' : 'CHECK'}`);
        console.log('========================================');

    } catch (error) {
        console.error('ERROR:', error.message);
        await page.screenshot({ path: '_eye-screenshots/cambridge-a1-error.png' });
    } finally {
        await browser.close();
    }
})();
