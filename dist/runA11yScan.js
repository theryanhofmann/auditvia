"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runA11yScan = runA11yScan;
const test_1 = require("@playwright/test");
const playwright_1 = require("@axe-core/playwright");
async function runA11yScan(url) {
    let browser;
    try {
        // Launch headless chromium browser
        browser = await test_1.chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        // Navigate to the URL and wait for network idle
        await page.goto(url, { waitUntil: 'networkidle' });
        // Inject axe-core and run accessibility analysis
        const results = await new playwright_1.default({ page }).analyze();
        // Calculate score: start at 100, subtract 2 points per violation, minimum 0
        const score = Math.max(0, 100 - results.violations.length * 2);
        return {
            score,
            issues: results.violations
        };
    }
    catch (error) {
        console.error('Error running accessibility scan:', error);
        throw new Error(`Failed to scan ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    finally {
        // Always close the browser to free resources
        if (browser) {
            await browser.close();
        }
    }
}
