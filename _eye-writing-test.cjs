// Eye Round 2: IELTS Writing Mock 1 — end-to-end browser test
// Login → Fill Task1 (150+ words) + Task2 (250+ words) → Submit → Verify Admin + Invigilator
const path = require('path');
const { chromium } = require(path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright'));

const TASK1_TEXT = `The table presents data on average daily food consumption in grams per person in Brazil, India, and Australia for the years 1961 and 2011. Overall, all three countries experienced an increase in food intake across most categories over the fifty-year period, with Australia consistently consuming the most dairy and meat products.

In 1961, Brazil consumed 515 grams of fruits and vegetables daily, which rose to 706 grams by 2011. India showed a more dramatic increase from 199 to 450 grams. Australia's fruit and vegetable intake grew from 480 to 661 grams. Regarding dairy and eggs, Australia had the highest consumption in both years, starting at 742 grams and slightly decreasing to 670 grams by 2011.

Meat consumption varied significantly between countries. India consumed the least meat in both years, with only 17 grams in 1961 and 29 grams in 2011, reflecting cultural dietary preferences. In contrast, Australia consumed 343 grams in 1961, rising to 423 grams. Brazil showed the largest proportional increase in meat consumption, from 92 to 290 grams.`;

const TASK2_TEXT = `The question of whether it is better for people to run their own business rather than work for someone else is a topic that generates considerable debate. While entrepreneurship offers significant advantages in terms of autonomy and financial potential, I believe that the best choice depends largely on individual circumstances, skills, and risk tolerance.

On the one hand, running one's own business provides unparalleled freedom and control over one's professional life. Business owners can set their own schedules, choose which projects to pursue, and make decisions without seeking approval from supervisors. Moreover, the financial rewards of successful entrepreneurship can far exceed what most employees earn. For instance, many of the world's wealthiest individuals built their fortunes through business ownership. Additionally, entrepreneurs often report higher levels of job satisfaction because they are directly invested in the outcomes of their work.

On the other hand, working for an established company offers stability and security that self-employment cannot guarantee. Employees typically receive regular salaries, health insurance, retirement benefits, and paid leave, which provide a safety net that entrepreneurs must fund themselves. Furthermore, starting a business involves significant financial risk, as statistics show that a large percentage of new businesses fail within their first five years. The stress of managing cash flow, finding customers, and handling all aspects of business operations can be overwhelming.

In my opinion, neither option is universally superior. For individuals with innovative ideas, strong business acumen, and sufficient financial resources, entrepreneurship can be incredibly rewarding. However, for those who value stability, work-life balance, and the opportunity to specialize in their field without the burden of business management, traditional employment may be the better choice.

In conclusion, while running a business offers exciting possibilities, the decision should be based on personal strengths, financial situation, and life priorities rather than a blanket assumption that one path is inherently better than the other.`;

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1217/chrome-win64/chrome.exe')
    });
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await context.newPage();

    page.on('dialog', async dialog => {
        console.log(`Dialog: ${dialog.type()} — "${dialog.message().substring(0, 100)}"`);
        await dialog.accept();
    });

    // Capture submission network traffic
    page.on('request', req => {
        if (req.url().includes('submission')) {
            console.log(`>> POST ${req.url()} (${(req.postData() || '').length} bytes)`);
        }
    });
    page.on('response', async resp => {
        if (resp.url().includes('submission')) {
            const status = resp.status();
            let body = '';
            try { body = await resp.text(); } catch (e) {}
            console.log(`<< ${status}: ${body.substring(0, 200)}`);
        }
    });

    const STUDENT_ID = '99902';
    const STUDENT_NAME = 'Eye Bot Writing';
    const BASE = 'http://localhost:3002';
    const ADMIN_PASS = "Adm!n#2025$SecureP@ss";

    try {
        // ========== STEP 1: Login ==========
        console.log('=== STEP 1: Login ===');
        await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.evaluate(() => localStorage.setItem('examType', 'IELTS'));
        await page.fill('#studentId', STUDENT_ID);
        await page.fill('#studentName', STUDENT_NAME);
        await page.click('#startTest');
        await page.waitForURL('**/student-dashboard.html**', { timeout: 10000 });
        console.log('Logged in');

        // Dismiss welcome guide
        const wb = await page.$('#wg-start-btn');
        if (wb) { await wb.click(); await page.waitForTimeout(500); }

        // ========== STEP 2: Select Writing Mock 1 ==========
        console.log('=== STEP 2: Select Writing Mock 1 ===');
        await page.evaluate(() => localStorage.setItem('selectedMock', '1'));
        await page.click('#writingButton');
        await page.waitForURL('**/writing.html**', { timeout: 10000 });
        console.log('Navigated to writing test');

        // Set start time to 5 minutes ago (passes minimum duration check)
        await page.evaluate(() => {
            localStorage.setItem('writingStartTime', new Date(Date.now() - 5 * 60 * 1000).toISOString());
        });
        await page.waitForTimeout(1000);

        // ========== STEP 3: Fill Task 1 ==========
        console.log('=== STEP 3: Fill Task 1 ===');
        await page.fill('#task1-textarea', TASK1_TEXT);
        // Trigger word count update
        await page.evaluate(() => {
            const ta = document.getElementById('task1-textarea');
            ta.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await page.waitForTimeout(500);
        const t1words = await page.evaluate(() => {
            const el = document.getElementById('task1-word-count');
            return el ? el.textContent : 'unknown';
        });
        console.log(`Task 1: ${t1words}`);
        await page.screenshot({ path: '_eye-screenshots/writing-01-task1.png' });

        // ========== STEP 4: Switch to Task 2 and fill ==========
        console.log('=== STEP 4: Fill Task 2 ===');
        await page.evaluate(() => switchTask(2));
        await page.waitForTimeout(500);
        await page.fill('#task2-textarea', TASK2_TEXT);
        await page.evaluate(() => {
            const ta = document.getElementById('task2-textarea');
            ta.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await page.waitForTimeout(500);
        const t2words = await page.evaluate(() => {
            const el = document.getElementById('task2-word-count');
            return el ? el.textContent : 'unknown';
        });
        console.log(`Task 2: ${t2words}`);
        await page.screenshot({ path: '_eye-screenshots/writing-02-task2.png' });

        // ========== STEP 5: Submit ==========
        console.log('=== STEP 5: Submit ===');
        await page.click('#deliver-button');
        console.log('Clicked Submit Writing');
        await page.waitForTimeout(5000);

        const currentUrl = page.url();
        console.log(`After submission, URL: ${currentUrl}`);
        await page.screenshot({ path: '_eye-screenshots/writing-03-after-submit.png' });

        if (currentUrl.includes('student-dashboard') || currentUrl.includes('dashboard')) {
            console.log('SUCCESS: Redirected to dashboard!');
        } else {
            console.log('WARNING: Did not redirect. Checking page state...');
        }

        // ========== STEP 6: Verify on Admin Dashboard ==========
        console.log('\n=== STEP 6: Admin Dashboard ===');
        await page.goto(`${BASE}/ielts-admin-dashboard.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1500);
        await page.fill('#password', ADMIN_PASS);
        await page.click('#loginBtn');

        // Wait for table to load
        for (let i = 0; i < 20; i++) {
            await page.waitForTimeout(2000);
            const rows = await page.evaluate(() =>
                document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission').length
            );
            if (rows > 0) { console.log(`Table loaded: ${rows} rows (${(i+1)*2}s)`); break; }
        }

        // Find and screenshot the EyeBot-W row
        const eyeRow = await page.evaluate(() => {
            const rows = document.querySelectorAll('#submissionsContainer table tbody tr, #submissionsContainer .date-group-submission');
            for (const row of rows) {
                const text = row.textContent;
                if (text.includes('99902') || text.includes('Eye Bot Writing')) {
                    row.style.backgroundColor = '#fff3cd';
                    row.style.outline = '3px solid #e67e22';
                    row.scrollIntoView({ block: 'center' });
                    // Click Compare button
                    const btn = Array.from(row.querySelectorAll('button')).find(b => b.textContent.includes('Compare'));
                    if (btn) btn.click();
                    return { found: true, text: text.replace(/\s+/g,' ').trim().substring(0, 250) };
                }
            }
            return { found: false };
        });
        console.log('Admin row:', JSON.stringify(eyeRow));
        await page.waitForTimeout(500);
        await page.screenshot({ path: '_eye-screenshots/writing-04-admin-row.png' });

        if (eyeRow.found) {
            await page.waitForTimeout(2500);
            await page.screenshot({ path: '_eye-screenshots/writing-05-admin-modal.png' });
            // Scroll modal
            for (let s = 1; s <= 3; s++) {
                await page.evaluate((f) => {
                    const els = document.querySelectorAll('*');
                    for (const el of els) {
                        if (el.scrollHeight > el.clientHeight + 200 && el.clientHeight > 100 && el.clientHeight < window.innerHeight && !el.matches('html, body')) {
                            el.scrollTop = Math.floor(el.scrollHeight * f / 4);
                            return;
                        }
                    }
                }, s);
                await page.waitForTimeout(400);
                await page.screenshot({ path: `_eye-screenshots/writing-06-admin-modal-${s}.png` });
            }
        }

        // ========== STEP 7: Verify on Invigilator ==========
        console.log('\n=== STEP 7: Invigilator ===');
        await page.goto(`${BASE}/invigilator.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: '_eye-screenshots/writing-07-invigilator.png' });

        const invFound = await page.evaluate(() => {
            const text = document.body.innerText;
            return { has99902: text.includes('99902'), hasEyeBot: text.includes('Eye Bot Writing') };
        });
        console.log('Invigilator:', JSON.stringify(invFound));

        // ========== SUMMARY ==========
        console.log('\n========================================');
        console.log('Round 2 Complete!');
        console.log(`Student: ${STUDENT_NAME} (${STUDENT_ID})`);
        console.log(`Test: IELTS Writing Mock 1`);
        console.log(`Task 1: ${t1words}`);
        console.log(`Task 2: ${t2words}`);
        console.log(`Admin Dashboard: ${eyeRow.found ? 'PASS' : 'FAIL'}`);
        console.log(`Invigilator: ${invFound.hasEyeBot || invFound.has99902 ? 'PASS' : 'CHECK'}`);
        console.log('========================================');

    } catch (error) {
        console.error('ERROR:', error.message);
        await page.screenshot({ path: '_eye-screenshots/writing-error.png' });
    } finally {
        await browser.close();
    }
})();
