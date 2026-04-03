#!/usr/bin/env node

/**
 * Command-line test runner using JSDOM
 */

const { JSDOM } = require('jsdom');
const http = require('http');

const TEST_PAGES = [
    { name: 'Combat Styles (Unit)', url: 'http://localhost:8765/tests/unit/test-combat-styles.html' },
    { name: 'Folk Magic Tooltips (Unit)', url: 'http://localhost:8765/tests/unit/test-folk-magic-tooltips.html' },
    { name: 'Terminology (Integration)', url: 'http://localhost:8765/tests/integration/test-terminology.html' },
    { name: 'Export Buttons (Integration)', url: 'http://localhost:8765/tests/integration/test-export-buttons.html' }
];

function fetchPage(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => { resolve(data); });
        }).on('error', reject);
    });
}

async function runTest(testConfig) {
    console.log(`\n=== ${testConfig.name} ===`);

    try {
        const html = await fetchPage(testConfig.url);
        const dom = new JSDOM(html, {
            url: testConfig.url,
            runScripts: 'dangerously',
            resources: 'usable',
            beforeParse(window) {
                // Patch setTimeout to be faster
                window.setTimeout = (fn, delay) => {
                    return global.setTimeout(fn, Math.min(delay, 10));
                };
            }
        });

        // Wait for tests to complete
        await new Promise((resolve) => {
            const checkComplete = () => {
                const summary = dom.window.document.getElementById('summary');
                if (summary && summary.textContent && !summary.textContent.includes('Loading')) {
                    resolve();
                } else {
                    setTimeout(checkComplete, 100);
                }
            };

            // Start checking after DOM is ready
            dom.window.addEventListener('DOMContentLoaded', () => {
                setTimeout(checkComplete, 500);
            });

            // Fallback timeout
            setTimeout(() => {
                console.log('TIMEOUT: Tests did not complete');
                resolve();
            }, 15000);
        });

        // Extract results
        const summary = dom.window.document.getElementById('summary');
        const summaryText = summary ? summary.textContent : 'No summary found';

        console.log(`Result: ${summaryText}`);

        // Parse pass/fail counts
        const passMatch = summaryText.match(/Pass:\s*(\d+)/);
        const failMatch = summaryText.match(/Fail:\s*(\d+)/);

        const pass = passMatch ? parseInt(passMatch[1]) : 0;
        const fail = failMatch ? parseInt(failMatch[1]) : 0;

        if (fail > 0) {
            // Show failures
            const failDivs = dom.window.document.querySelectorAll('.test-fail');
            console.log('\nFailures:');
            failDivs.forEach(div => {
                const errorDetail = div.querySelector('.error-details');
                console.log(`  - ${div.textContent.split('\n')[0].replace('✗', '').trim()}`);
                if (errorDetail) {
                    console.log(`    ${errorDetail.textContent}`);
                }
            });
        }

        return { pass, fail };

    } catch (error) {
        console.error(`ERROR: ${error.message}`);
        return { pass: 0, fail: 1 };
    }
}

async function main() {
    console.log('=== Mythras CharGen Test Suite ===');

    let totalPass = 0;
    let totalFail = 0;

    for (const test of TEST_PAGES) {
        const result = await runTest(test);
        totalPass += result.pass;
        totalFail += result.fail;
    }

    console.log(`\n=== OVERALL RESULTS ===`);
    console.log(`Total: ${totalPass + totalFail} | Pass: ${totalPass} | Fail: ${totalFail}`);

    process.exit(totalFail > 0 ? 1 : 0);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
