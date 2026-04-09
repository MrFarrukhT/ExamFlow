// Debug writing submission — capture all network during submit
const path = require('path');
const { chromium } = require(path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright'));

const TASK1 = 'The table presents data on average daily food consumption in grams per person in Brazil India and Australia for the years 1961 and 2011. Overall all three countries experienced an increase in food intake across most categories over the fifty year period with Australia consistently consuming the most dairy and meat products. In 1961 Brazil consumed 515 grams of fruits and vegetables daily which rose to 706 grams by 2011. India showed a more dramatic increase from 199 to 450 grams. Australia fruit and vegetable intake grew from 480 to 661 grams. Regarding dairy and eggs Australia had the highest consumption in both years starting at 742 grams and slightly decreasing to 670 grams by 2011. Meat consumption varied significantly between countries.';
const TASK2 = 'The question of whether it is better for people to run their own business rather than work for someone else is a topic that generates considerable debate. While entrepreneurship offers significant advantages in terms of autonomy and financial potential I believe that the best choice depends largely on individual circumstances skills and risk tolerance. On the one hand running ones own business provides unparalleled freedom and control over ones professional life. Business owners can set their own schedules choose which projects to pursue and make decisions without seeking approval from supervisors. Moreover the financial rewards of successful entrepreneurship can far exceed what most employees earn. For instance many of the worlds wealthiest individuals built their fortunes through business ownership. Additionally entrepreneurs often report higher levels of job satisfaction because they are directly invested in the outcomes of their work. On the other hand working for an established company offers stability and security that self employment cannot guarantee. Employees typically receive regular salaries health insurance retirement benefits and paid leave which provide a safety net that entrepreneurs must fund themselves. Furthermore starting a business involves significant financial risk as statistics show that a large percentage of new businesses fail within their first five years. In my opinion neither option is universally superior. For individuals with innovative ideas strong business acumen and sufficient financial resources entrepreneurship can be incredibly rewarding. However for those who value stability and work life balance traditional employment may be the better choice. In conclusion while running a business offers exciting possibilities the decision should be based on personal strengths financial situation and life priorities.';

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1217/chrome-win64/chrome.exe')
    });
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await context.newPage();

    page.on('dialog', async dialog => {
        console.log(`DIALOG: ${dialog.type()} — ${dialog.message().substring(0, 150)}`);
        await dialog.accept();
    });
    page.on('console', msg => {
        if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text().substring(0, 200));
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message.substring(0, 200)));

    // Capture ALL network
    page.on('request', req => {
        if (req.method() === 'POST') {
            const body = req.postData() || '';
            console.log(`>> ${req.method()} ${req.url()} (${body.length} bytes)`);
            if (body.length > 0 && body.length < 500) console.log(`   BODY: ${body}`);
            else if (body.length >= 500) console.log(`   BODY (first 300): ${body.substring(0, 300)}`);
        }
    });
    page.on('response', async resp => {
        if (resp.request().method() === 'POST') {
            let body = '';
            try { body = await resp.text(); } catch (e) {}
            console.log(`<< ${resp.status()} ${resp.url()} — ${body.substring(0, 200)}`);
        }
    });

    const BASE = 'http://localhost:3002';

    try {
        // Login
        await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.evaluate(() => localStorage.setItem('examType', 'IELTS'));
        await page.fill('#studentId', '99902');
        await page.fill('#studentName', 'Eye Bot Writing');
        await page.click('#startTest');
        await page.waitForURL('**/student-dashboard.html**', { timeout: 10000 });
        const wb = await page.$('#wg-start-btn');
        if (wb) { await wb.click(); await page.waitForTimeout(500); }

        // Go to writing
        await page.evaluate(() => localStorage.setItem('selectedMock', '1'));
        await page.click('#writingButton');
        await page.waitForURL('**/writing.html**', { timeout: 10000 });
        await page.waitForTimeout(1000);

        // Set start time 5 min ago
        await page.evaluate(() => {
            localStorage.setItem('writingStartTime', new Date(Date.now() - 5 * 60 * 1000).toISOString());
        });

        // Fill Task 1
        await page.fill('#task1-textarea', TASK1);
        await page.evaluate(() => document.getElementById('task1-textarea').dispatchEvent(new Event('input', { bubbles: true })));
        const wc1 = await page.$eval('#task1-word-count', el => el.textContent);
        console.log(`Task 1: ${wc1}`);

        // Switch to Task 2 and fill
        await page.evaluate(() => switchTask(2));
        await page.waitForTimeout(500);
        await page.fill('#task2-textarea', TASK2);
        await page.evaluate(() => document.getElementById('task2-textarea').dispatchEvent(new Event('input', { bubbles: true })));
        const wc2 = await page.$eval('#task2-word-count', el => el.textContent);
        console.log(`Task 2: ${wc2}`);

        // Check writingHandler exists
        const handlerExists = await page.evaluate(() => !!window.writingHandler);
        console.log('writingHandler exists:', handlerExists);

        // Trigger answer save
        await page.evaluate(() => {
            if (typeof saveAnswersToSession === 'function') saveAnswersToSession();
        });
        await page.waitForTimeout(500);

        // Submit
        console.log('\n=== SUBMITTING ===');
        await page.click('#deliver-button');

        // Wait for network + redirect
        await page.waitForTimeout(8000);
        console.log('URL after submit:', page.url());

    } catch (error) {
        console.error('ERROR:', error.message);
        await page.screenshot({ path: '_eye-screenshots/writing-debug-error.png' });
    } finally {
        await browser.close();
    }
})();
