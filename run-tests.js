#!/usr/bin/env node

/**
 * Test runner for browser-based tests
 * Opens each test HTML page and captures test results
 */

const puppeteer = require('puppeteer');
const path = require('path');

const TEST_PAGES = [
    'tests/unit/test-combat-styles.html',
    'tests/unit/test-folk-magic-tooltips.html',
    'tests/integration/test-terminology.html',
    'tests/integration/test-export-buttons.html'
];

async function runTest(page, testUrl) {
    console.log(`\n=== Running ${testUrl} ===`);

    try {
        await page.goto(testUrl, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Wait for tests to complete (max 10 seconds)
        await page.waitForFunction(() => {
            const summary = document.getElementById('summary');
            return summary && !summary.textContent.includes('Loading tests');
        }, { timeout: 10000 });

        // Extract results
        const results = await page.evaluate(() => {
            const summary = document.getElementById('summary');
            const resultsDiv = document.getElementById('results');

            return {
                summary: summary ? summary.textContent : 'No summary',
                html: resultsDiv ? resultsDiv.innerHTML : 'No results',
                pass: window.runner?.results?.pass || 0,
                fail: window.runner?.results?.fail || 0
            };
        });

        console.log(`Summary: ${results.summary}`);
        console.log(`Pass: ${results.pass} | Fail: ${results.fail}`);

        if (results.fail > 0) {
            // Extract error details
            const errors = await page.evaluate(() => {
                const errorDivs = document.querySelectorAll('.test-fail');
                return Array.from(errorDivs).map(div => {
                    const errorDetail = div.querySelector('.error-details');
                    return {
                        test: div.textContent.split('\n')[0].replace('✗', '').trim(),
                        error: errorDetail ? errorDetail.textContent : 'No error details'
                    };
                });
            });

            console.log('\nFailures:');
            errors.forEach(e => {
                console.log(`  - ${e.test}`);
                console.log(`    ${e.error}`);
            });
        }

        return results;

    } catch (error) {
        console.error(`ERROR running test: ${error.message}`);
        return { summary: `ERROR: ${error.message}`, pass: 0, fail: 1 };
    }
}

async function main() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Enable console logging
    page.on('console', msg => {
        const text = msg.text();
        if (!text.includes('favicon')) {
            console.log(`  [Browser] ${text}`);
        }
    });

    let totalPass = 0;
    let totalFail = 0;

    for (const testPage of TEST_PAGES) {
        const testUrl = `http://localhost:8765/${testPage}`;
        const result = await runTest(page, testUrl);
        totalPass += result.pass;
        totalFail += result.fail;
    }

    console.log(`\n=== TOTAL RESULTS ===`);
    console.log(`Pass: ${totalPass} | Fail: ${totalFail}`);
    console.log(`Total: ${totalPass + totalFail}`);

    await browser.close();

    process.exit(totalFail > 0 ? 1 : 0);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
