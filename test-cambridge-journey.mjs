// Cambridge student journey walkthrough — Playwright test
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3003';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // Collect console errors
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
    });
    page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));

    try {
        // Step 1: Root redirect
        console.log('--- Step 1: Root redirect ---');
        const resp = await page.goto(BASE, { waitUntil: 'networkidle' });
        console.log(`URL: ${page.url()}`);
        console.log(`Status: ${resp.status()}`);
        console.log(`Title: ${await page.title()}`);

        // Step 2: Check launcher page content
        console.log('\n--- Step 2: Launcher page ---');
        const launchBtn = await page.$('#launch-btn');
        console.log(`Launch button found: ${!!launchBtn}`);
        const launchText = await page.$eval('#launch-text', el => el.textContent);
        console.log(`Launch text: ${launchText}`);
        const isCambridge = await page.evaluate(() => document.body.classList.contains('cambridge'));
        console.log(`Cambridge theme applied: ${isCambridge}`);

        // Step 3: Click launch -> login page
        console.log('\n--- Step 3: Navigate to login ---');
        // Set localStorage for cambridge exam type before navigating
        await page.evaluate(() => {
            localStorage.setItem('examType', 'Cambridge');
        });
        await page.goto(`${BASE}/index.html?exam=cambridge`, { waitUntil: 'networkidle' });
        console.log(`URL: ${page.url()}`);
        console.log(`Title: ${await page.title()}`);

        // Check Cambridge badge
        const badge = await page.$eval('#examBadge', el => el.textContent);
        console.log(`Exam badge: ${badge}`);

        // Step 4: Fill login form
        console.log('\n--- Step 4: Fill login form ---');
        await page.fill('#studentId', '12345');
        await page.fill('#studentName', 'Test Student');

        // Check validation will pass
        const idVal = await page.$eval('#studentId', el => el.value);
        const nameVal = await page.$eval('#studentName', el => el.value);
        console.log(`ID: ${idVal}, Name: ${nameVal}`);

        // Click login
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle' }),
            page.click('#startTest')
        ]);
        console.log(`After login URL: ${page.url()}`);

        // Step 5: Dashboard
        console.log('\n--- Step 5: Dashboard ---');
        console.log(`Title: ${await page.title()}`);

        // Check student info displayed
        const welcomeText = await page.$eval('#welcomeText', el => el.textContent);
        console.log(`Welcome text: ${welcomeText}`);

        // Check level cards exist
        const levelCards = await page.$$('.level-card');
        console.log(`Level cards found: ${levelCards.length}`);

        // Step 5b: Dismiss welcome guide if present
        const welcomeBtn = await page.$('#wg-start-btn');
        if (welcomeBtn) {
            console.log('Welcome guide detected — dismissing');
            await welcomeBtn.click();
            await page.waitForTimeout(500);
        }

        // Step 6: Select A2-Key level
        console.log('\n--- Step 6: Select A2-Key level ---');
        await page.click('[data-level="A2-Key"]');
        await page.waitForTimeout(500);

        const modulesVisible = await page.$eval('#modulesSection', el => el.style.display !== 'none');
        console.log(`Modules section visible: ${modulesVisible}`);

        const moduleCards = await page.$$('.module-card');
        console.log(`Module cards: ${moduleCards.length}`);

        // List module buttons
        const buttons = await page.$$eval('.module-button', els => els.map(el => el.textContent));
        console.log(`Module buttons: ${JSON.stringify(buttons)}`);

        // Step 7: Try to navigate to reading-writing test
        console.log('\n--- Step 7: Navigate to Reading & Writing test ---');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle' }),
            page.click('#readingWritingButton')
        ]);
        console.log(`Test page URL: ${page.url()}`);
        console.log(`Title: ${await page.title()}`);

        // Check for iframe (test content)
        const iframes = await page.$$('iframe');
        console.log(`Iframes found: ${iframes.length}`);

        // Check if main content loaded
        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
        console.log(`Page content preview: ${bodyText.substring(0, 300)}`);

        // Screenshot the test page
        await page.screenshot({ path: 'screenshot-cambridge-rw-test.png', fullPage: true });
        console.log('Screenshot saved: screenshot-cambridge-rw-test.png');

        // Step 8: Go back to dashboard and test B1
        console.log('\n--- Step 8: Navigate to B1 level ---');
        await page.goto(`${BASE}/Cambridge/dashboard-cambridge.html`, { waitUntil: 'networkidle' });

        // Clear previous level state
        await page.evaluate(() => {
            localStorage.removeItem('cambridgeLevel');
            localStorage.removeItem('cambridge-reading-writingStatus');
            localStorage.removeItem('cambridge-reading-writingStartTime');
        });
        await page.reload({ waitUntil: 'networkidle' });

        // Select B1
        await page.click('[data-level="B1-Preliminary"]');
        await page.waitForTimeout(500);

        const b1Buttons = await page.$$eval('.module-button', els => els.map(el => el.textContent));
        console.log(`B1 Module buttons: ${JSON.stringify(b1Buttons)}`);

        // Step 9: Test B1 reading page
        console.log('\n--- Step 9: Navigate to B1 Reading test ---');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle' }),
            page.click('#readingButton')
        ]);
        console.log(`B1 Reading URL: ${page.url()}`);
        console.log(`B1 Reading Title: ${await page.title()}`);

        await page.screenshot({ path: 'screenshot-cambridge-b1-reading.png', fullPage: true });

        // Step 10: Test B2 level
        console.log('\n--- Step 10: Navigate to B2 level ---');
        await page.goto(`${BASE}/Cambridge/dashboard-cambridge.html`, { waitUntil: 'networkidle' });
        await page.evaluate(() => {
            localStorage.removeItem('cambridgeLevel');
            localStorage.removeItem('cambridge-readingStatus');
            localStorage.removeItem('cambridge-readingStartTime');
        });
        await page.reload({ waitUntil: 'networkidle' });

        await page.click('[data-level="B2-First"]');
        await page.waitForTimeout(500);

        const b2Buttons = await page.$$eval('.module-button', els => els.map(el => el.textContent));
        console.log(`B2 Module buttons: ${JSON.stringify(b2Buttons)}`);

        // Step 11: Test my-results page
        console.log('\n--- Step 11: My Results page ---');
        await page.goto(`${BASE}/Cambridge/my-results.html`, { waitUntil: 'networkidle' });
        console.log(`Results URL: ${page.url()}`);
        console.log(`Results Title: ${await page.title()}`);
        await page.screenshot({ path: 'screenshot-cambridge-results.png', fullPage: true });

        // Step 12: Test A1-Movers level
        console.log('\n--- Step 12: A1 Movers level ---');
        await page.goto(`${BASE}/Cambridge/dashboard-cambridge.html`, { waitUntil: 'networkidle' });
        await page.evaluate(() => {
            localStorage.removeItem('cambridgeLevel');
        });
        await page.reload({ waitUntil: 'networkidle' });

        await page.click('[data-level="A1-Movers"]');
        await page.waitForTimeout(500);

        const a1Buttons = await page.$$eval('.module-button', els => els.map(el => el.textContent));
        console.log(`A1 Module buttons: ${JSON.stringify(a1Buttons)}`);

        // Report errors
        console.log('\n\n=== ERRORS COLLECTED ===');
        if (errors.length === 0) {
            console.log('No errors found!');
        } else {
            errors.forEach(e => console.log(e));
        }

    } catch (err) {
        console.error('JOURNEY FAILED:', err.message);
        await page.screenshot({ path: 'screenshot-cambridge-error.png', fullPage: true });
        console.log('Error screenshot saved');
    } finally {
        await browser.close();
    }
})();
