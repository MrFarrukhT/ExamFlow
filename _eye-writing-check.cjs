// Check if saveTestToDatabase is accessible and what happens when called
const path = require('path');
const { chromium } = require(path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright'));

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1217/chrome-win64/chrome.exe')
    });
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await context.newPage();
    page.on('dialog', async d => await d.accept());

    const BASE = 'http://localhost:3002';

    try {
        await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => { localStorage.clear(); localStorage.setItem('examType', 'IELTS'); });
        await page.fill('#studentId', '99902');
        await page.fill('#studentName', 'Eye Bot Writing');
        await page.click('#startTest');
        await page.waitForURL('**/student-dashboard.html**', { timeout: 10000 });
        const wb = await page.$('#wg-start-btn');
        if (wb) { await wb.click(); await page.waitForTimeout(500); }

        await page.evaluate(() => localStorage.setItem('selectedMock', '1'));
        await page.click('#writingButton');
        await page.waitForURL('**/writing.html**', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Check function availability
        const checks = await page.evaluate(() => ({
            saveTestToDatabase: typeof saveTestToDatabase,
            saveAnswersToSession: typeof saveAnswersToSession,
            writingHandler: !!window.writingHandler,
            writingHandlerSubmit: typeof window.writingHandler?.submitWriting,
            prepareWritingData: typeof window.writingHandler?.prepareWritingData,
        }));
        console.log('Function checks:', JSON.stringify(checks, null, 2));

        // Try calling saveTestToDatabase directly with test data
        const testData = {
            studentId: '99902',
            studentName: 'Eye Bot Writing',
            mockNumber: 1,
            skill: 'writing',
            answers: { task_1: { text: 'test', word_count: 1 }, task_2: { text: 'test', word_count: 1 } },
            score: null,
            bandScore: null,
            startTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            endTime: new Date().toISOString(),
            antiCheat: {}
        };

        const result = await page.evaluate(async (data) => {
            try {
                if (typeof saveTestToDatabase !== 'function') return { error: 'not a function' };
                const r = await saveTestToDatabase(data);
                return { success: true, result: r };
            } catch (e) {
                return { error: e.message, stack: e.stack?.substring(0, 300) };
            }
        }, testData);
        console.log('Direct call result:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        await browser.close();
    }
})();
