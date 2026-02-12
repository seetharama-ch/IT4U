const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', exception => console.log('PAGE ERROR:', exception));

    try {
        console.log('Navigating to http://localhost:8060/login...');
        await page.goto('http://localhost:8060/login', { timeout: 10000 }); // Short timeout
        await page.waitForTimeout(2000);
        console.log('Page content:', await page.content());
    } catch (e) {
        console.error('Navigation failed:', e.message);
    }

    await browser.close();
})();
