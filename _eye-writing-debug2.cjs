// Debug 2: Intercept saveTestToDatabase to see what happens
const path = require('path');
const { chromium } = require(path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright'));

const TASK1 = Array(160).fill(null).map((_, i) => ['The','data','shows','food','consumption','in','three','countries','between','1961','and','2011','which','reveals','significant','changes','over','time','period'][i % 19]).join(' ');
const TASK2 = Array(260).fill(null).map((_, i) => ['Running','a','business','offers','freedom','and','control','but','employment','provides','stability','security','benefits','and','predictable','income','for','workers','each','option'][i % 20]).join(' ');

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1217/chrome-win64/chrome.exe')
    });
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await context.newPage();

    page.on('dialog', async dialog => { console.log(`DIALOG: ${dialog.message().substring(0, 100)}`); await dialog.accept(); });
    page.on('console', msg => console.log(`[${msg.type()}] ${msg.text().substring(0, 200)}`));

    const BASE = 'http://localhost:3002';

    try {
        // Login
        await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => localStorage.setItem('examType', 'IELTS'));
        await page.fill('#studentId', '99902');
        await page.fill('#studentName', 'Eye Bot Writing');
        await page.click('#startTest');
        await page.waitForURL('**/student-dashboard.html**', { timeout: 10000 });
        const wb = await page.$('#wg-start-btn');
        if (wb) { await wb.click(); await page.waitForTimeout(500); }

        await page.evaluate(() => localStorage.setItem('selectedMock', '1'));
        await page.click('#writingButton');
        await page.waitForURL('**/writing.html**', { timeout: 10000 });
        await page.waitForTimeout(1500);

        // Set start time 5 min ago
        await page.evaluate(() => {
            localStorage.setItem('writingStartTime', new Date(Date.now() - 5 * 60 * 1000).toISOString());
        });

        // Fill tasks
        await page.fill('#task1-textarea', TASK1);
        await page.evaluate(() => document.getElementById('task1-textarea').dispatchEvent(new Event('input', { bubbles: true })));
        await page.evaluate(() => switchTask(2));
        await page.waitForTimeout(300);
        await page.fill('#task2-textarea', TASK2);
        await page.evaluate(() => document.getElementById('task2-textarea').dispatchEvent(new Event('input', { bubbles: true })));
        await page.waitForTimeout(300);

        const wc = await page.evaluate(() => ({
            t1: document.getElementById('task1-textarea').value.split(/\s+/).length,
            t2: document.getElementById('task2-textarea').value.split(/\s+/).length
        }));
        console.log(`Words: Task1=${wc.t1}, Task2=${wc.t2}`);

        // Monkey-patch saveTestToDatabase to log what it receives
        await page.evaluate(() => {
            const original = window.saveTestToDatabase;
            window.saveTestToDatabase = async function(data) {
                console.log('🔴 saveTestToDatabase CALLED with:', JSON.stringify({
                    studentId: data.studentId,
                    studentName: data.studentName,
                    skill: data.skill,
                    mockNumber: data.mockNumber,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    answersKeys: Object.keys(data.answers || {}),
                }));
                try {
                    const result = await original.call(this, data);
                    console.log('🟢 saveTestToDatabase RESULT:', JSON.stringify(result));
                    return result;
                } catch (err) {
                    console.log('🔴 saveTestToDatabase ERROR:', err.message);
                    throw err;
                }
            };
        });

        // Submit
        console.log('\n=== CLICKING SUBMIT ===');
        await page.click('#deliver-button');
        await page.waitForTimeout(8000);
        console.log('Final URL:', page.url());

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        await browser.close();
    }
})();
