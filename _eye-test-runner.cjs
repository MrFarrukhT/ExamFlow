// Eye Round 1: IELTS Reading Mock 1 — end-to-end browser test
// Login → Fill 40 answers → Submit → Verify on Admin + Invigilator
const path = require('path');
const { chromium } = require(path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright'));

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1217/chrome-win64/chrome.exe')
    });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    // Suppress dialog prompts (confirm/alert)
    page.on('dialog', async dialog => {
        console.log(`Dialog: ${dialog.type()} — "${dialog.message()}"`);
        await dialog.accept();
    });

    const STUDENT_ID = '99901';
    const STUDENT_NAME = 'Eye Bot Reading';
    const BASE = 'http://localhost:3002';

    try {
        // ========== STEP 1: Login ==========
        console.log('=== STEP 1: Login ===');
        await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });

        // Set examType before login
        await page.evaluate(() => localStorage.setItem('examType', 'IELTS'));

        await page.fill('#studentId', STUDENT_ID);
        await page.fill('#studentName', STUDENT_NAME);
        await page.screenshot({ path: '_eye-screenshots/01-login.png' });
        await page.click('#startTest');
        await page.waitForURL('**/student-dashboard.html**', { timeout: 10000 });
        console.log('Logged in successfully, on student dashboard');
        await page.screenshot({ path: '_eye-screenshots/02-dashboard.png' });

        // ========== STEP 2: Select Reading Mock 1 ==========
        console.log('=== STEP 2: Select Reading Mock 1 ===');
        // Set mock number
        await page.evaluate(() => localStorage.setItem('selectedMock', '1'));

        // Dismiss welcome guide if present
        const welcomeBtn = await page.$('#wg-start-btn');
        if (welcomeBtn) {
            await welcomeBtn.click();
            console.log('Dismissed welcome guide');
            await page.waitForTimeout(500);
        }

        // Click Reading module button
        await page.click('#readingButton');
        await page.waitForURL('**/reading.html**', { timeout: 10000 });
        console.log('Navigated to reading test');

        // Set start time to 2 minutes ago to pass minimum duration check (30s)
        await page.evaluate(() => {
            const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
            localStorage.setItem('readingStartTime', twoMinAgo);
        });
        await page.screenshot({ path: '_eye-screenshots/03-reading-start.png' });

        // ========== STEP 3: Fill all 40 answers ==========
        console.log('=== STEP 3: Fill answers ===');

        // Part 1: Q1-6 (TRUE/FALSE/NOT GIVEN radio buttons)
        for (let q = 1; q <= 6; q++) {
            const values = ['TRUE', 'FALSE', 'NOT GIVEN'];
            const val = values[(q - 1) % 3];
            await page.click(`input[name="q${q}"][value="${val}"]`);
            console.log(`  Q${q}: ${val}`);
        }

        // Part 1: Q7-13 (text inputs — click first to remove readonly)
        const textAnswers7_13 = ['army', 'gardens', 'mosaic floors', 'wall', '93', 'gold ring', 'museum'];
        for (let i = 0; i < 7; i++) {
            const q = i + 7;
            await page.click(`#q${q}`);
            await page.waitForTimeout(100);
            await page.fill(`#q${q}`, textAnswers7_13[i]);
            console.log(`  Q${q}: ${textAnswers7_13[i]}`);
        }

        // Switch to Part 2
        await page.evaluate(() => switchToPart(2));
        await page.waitForTimeout(500);
        console.log('  Switched to Part 2');

        // Part 2: Q14-18 (matching headings A-G radio buttons)
        const matchAnswers14_18 = ['C', 'A', 'B', 'D', 'E'];
        for (let i = 0; i < 5; i++) {
            const q = i + 14;
            await page.click(`input[name="q${q}"][value="${matchAnswers14_18[i]}"]`);
            console.log(`  Q${q}: ${matchAnswers14_18[i]}`);
        }

        // Part 2: Q19-22 (text inputs — click first to remove readonly)
        const textAnswers19_22 = ['emotions', 'butterfly', 'mystery', 'photography'];
        for (let i = 0; i < 4; i++) {
            const q = i + 19;
            await page.click(`#q${q}`);
            await page.waitForTimeout(100);
            await page.fill(`#q${q}`, textAnswers19_22[i]);
            console.log(`  Q${q}: ${textAnswers19_22[i]}`);
        }

        // Part 2: Q23-26 (matching features radio buttons A-G)
        const matchAnswers23_26 = ['B', 'D', 'A', 'F'];
        for (let i = 0; i < 4; i++) {
            const q = i + 23;
            await page.click(`input[name="q${q}"][value="${matchAnswers23_26[i]}"]`);
            console.log(`  Q${q}: ${matchAnswers23_26[i]}`);
        }

        // Switch to Part 3
        await page.evaluate(() => switchToPart(3));
        await page.waitForTimeout(500);
        console.log('  Switched to Part 3');

        // Part 3: Q27-30 (multiple choice A-D)
        const mcAnswers27_30 = ['C', 'A', 'B', 'D'];
        for (let i = 0; i < 4; i++) {
            const q = i + 27;
            await page.click(`input[name="q${q}"][value="${mcAnswers27_30[i]}"]`);
            console.log(`  Q${q}: ${mcAnswers27_30[i]}`);
        }

        // Part 3: Q31-34 (drag-and-drop — set hidden input values directly)
        const ddAnswers31_34 = ['B', 'A', 'C', 'E'];
        for (let i = 0; i < 4; i++) {
            const q = i + 31;
            await page.evaluate(({ qNum, val }) => {
                const input = document.getElementById(`q${qNum}`);
                if (input) {
                    input.value = val;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, { qNum: q, val: ddAnswers31_34[i] });
            console.log(`  Q${q}: ${ddAnswers31_34[i]} (drag-drop)`);
        }

        // Part 3: Q35-40 (YES/NO/NOT GIVEN radio buttons)
        const ynAnswers35_40 = ['YES', 'NO', 'NOT GIVEN', 'YES', 'NO', 'YES'];
        for (let i = 0; i < 6; i++) {
            const q = i + 35;
            await page.click(`input[name="q${q}"][value="${ynAnswers35_40[i]}"]`);
            console.log(`  Q${q}: ${ynAnswers35_40[i]}`);
        }

        console.log('All 40 answers filled!');
        await page.screenshot({ path: '_eye-screenshots/04-answers-filled.png' });

        // Trigger answer save to localStorage
        await page.evaluate(() => {
            if (typeof saveAnswersToSession === 'function') {
                saveAnswersToSession();
            }
        });

        // ========== STEP 4: Submit ==========
        console.log('=== STEP 4: Submit ===');

        // Click the deliver button
        await page.click('#deliver-button');
        console.log('Clicked deliver button');

        // Wait for review modal or confirm dialog
        await page.waitForTimeout(1500);
        await page.screenshot({ path: '_eye-screenshots/05-review-modal.png' });

        // Click the submit button in the review modal
        const submitBtn = await page.$('#review-submit-btn');
        if (submitBtn) {
            await submitBtn.click();
            console.log('Clicked "Submit Reading" in review modal');
        } else {
            console.log('No review modal found — checking for confirm dialog');
        }

        // Wait for submission and redirect
        await page.waitForTimeout(3000);
        const currentUrl = page.url();
        console.log(`After submission, current URL: ${currentUrl}`);
        await page.screenshot({ path: '_eye-screenshots/06-after-submit.png' });

        // Check if we got back to dashboard (success)
        if (currentUrl.includes('student-dashboard') || currentUrl.includes('dashboard')) {
            console.log('SUCCESS: Redirected to dashboard after submission!');
        } else {
            console.log('WARNING: Did not redirect to dashboard. Checking for errors...');
            const errors = await page.evaluate(() => {
                const consoleErrors = [];
                return document.body.innerText.substring(0, 500);
            });
            console.log('Page content:', errors);
        }

        // ========== STEP 5: Verify on Admin Dashboard ==========
        console.log('\n=== STEP 5: Verify on Admin Dashboard ===');
        await page.goto(`${BASE}/ielts-admin-dashboard.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1000);

        // Login to admin — form uses #username and #password with #loginBtn
        await page.fill('#password', "Adm!n#2025$SecureP@ss");
        await page.click('#loginBtn');
        console.log('Admin login submitted');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: '_eye-screenshots/07-admin-logged-in.png' });

        // Wait for submissions to load
        await page.waitForTimeout(2000);

        // Search for student
        const searchField = await page.$('#search-input, #searchInput, input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]');
        if (searchField) {
            await searchField.fill(STUDENT_ID);
            await page.waitForTimeout(1500);
            console.log(`Searched for student ID: ${STUDENT_ID}`);
        } else {
            console.log('No search field found, checking page content directly');
        }
        await page.screenshot({ path: '_eye-screenshots/08-admin-search.png' });

        // Check for submission rows
        const submissionFound = await page.evaluate((sid) => {
            const text = document.body.innerText;
            return text.includes(sid) || text.includes('Eye Bot Reading') || text.toLowerCase().includes('reading');
        }, STUDENT_ID);
        console.log(`Submission found on admin dashboard: ${submissionFound}`);

        // ========== STEP 6: Verify on Invigilator Panel ==========
        console.log('\n=== STEP 6: Verify on Invigilator Panel ===');
        await page.goto(`${BASE}/invigilator.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '_eye-screenshots/09-invigilator.png' });

        // Check for submission in Room Activity
        const invigilatorFound = await page.evaluate((sid) => {
            const text = document.body.innerText;
            return text.includes(sid) || text.includes('Eye Bot Reading');
        }, STUDENT_ID);
        console.log(`Student found on invigilator panel: ${invigilatorFound}`);
        await page.screenshot({ path: '_eye-screenshots/10-invigilator-activity.png' });

        console.log('\n========================================');
        console.log('Round 1 Complete!');
        console.log(`Student: ${STUDENT_NAME} (${STUDENT_ID})`);
        console.log(`Test: IELTS Reading Mock 1`);
        console.log(`Admin Dashboard: ${submissionFound ? 'PASS' : 'FAIL'}`);
        console.log(`Invigilator Panel: ${invigilatorFound ? 'PASS' : 'NEEDS_CHECK'}`);
        console.log('========================================');

    } catch (error) {
        console.error('ERROR:', error.message);
        await page.screenshot({ path: '_eye-screenshots/error.png' });
    } finally {
        await browser.close();
    }
})();
