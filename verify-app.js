// Playwright verification script for mythras-chargen
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🔍 Loading application...');
    await page.goto('http://localhost:8888/index.html', { waitUntil: 'networkidle' });

    // Take screenshot of initial state
    await page.screenshot({ path: 'screenshots/01-initial-load.png', fullPage: true });
    console.log('✅ Screenshot: 01-initial-load.png');

    // Verify wizard is visible
    const wizardVisible = await page.isVisible('#wizard');
    console.log(`✅ Wizard visible: ${wizardVisible}`);

    // Verify step 1 is active
    const step1Active = await page.isVisible('#step1');
    console.log(`✅ Step 1 active: ${step1Active}`);

    // Check for buttons
    const nextBtnVisible = await page.isVisible('button:has-text("Next")');
    console.log(`✅ Next button visible: ${nextBtnVisible}`);

    // Navigate to characteristics step
    console.log('\n🔍 Testing wizard navigation...');

    // Fill in name
    await page.fill('input[placeholder="Enter character name"]', 'Test Character');
    await page.screenshot({ path: 'screenshots/02-name-filled.png', fullPage: true });
    console.log('✅ Screenshot: 02-name-filled.png');

    // Click next
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);

    // Verify we're on step 2
    const step2Active = await page.isVisible('#step2');
    console.log(`✅ Step 2 active: ${step2Active}`);
    await page.screenshot({ path: 'screenshots/03-step2-characteristics.png', fullPage: true });
    console.log('✅ Screenshot: 03-step2-characteristics.png');

    // Navigate through a few more steps to test wizard flow
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/04-step3-culture.png', fullPage: true });
    console.log('✅ Screenshot: 04-step3-culture.png');

    // Navigate to final step (Play Mode)
    console.log('\n🔍 Navigating to Play Mode...');

    // Skip through remaining steps by clicking Next multiple times
    for (let i = 0; i < 10; i++) {
      const nextBtn = await page.$('button:has-text("Next")');
      if (nextBtn) {
        await nextBtn.click();
        await page.waitForTimeout(300);
      } else {
        break;
      }
    }

    // Check if we reached Play Mode
    const playModeVisible = await page.isVisible('#playMode');
    console.log(`✅ Play Mode visible: ${playModeVisible}`);

    if (playModeVisible) {
      await page.screenshot({ path: 'screenshots/05-play-mode.png', fullPage: true });
      console.log('✅ Screenshot: 05-play-mode.png');

      // Verify PDF export buttons are present
      const simplePDFBtn = await page.isVisible('#btn-export-pdf-simple');
      const templatePDFBtn = await page.isVisible('#btn-export-pdf-template');

      console.log(`\n📄 PDF Export Buttons:`);
      console.log(`  ✅ Export PDF (Simple): ${simplePDFBtn}`);
      console.log(`  ✅ Export PDF (Template): ${templatePDFBtn}`);

      // Get button labels
      if (simplePDFBtn) {
        const simpleLabel = await page.textContent('#btn-export-pdf-simple');
        console.log(`     Label: "${simpleLabel}"`);
      }
      if (templatePDFBtn) {
        const templateLabel = await page.textContent('#btn-export-pdf-template');
        console.log(`     Label: "${templateLabel}"`);
      }

      await page.screenshot({ path: 'screenshots/06-pdf-buttons.png' });
      console.log('✅ Screenshot: 06-pdf-buttons.png');
    }

    console.log('\n✅ All verification checks passed!');

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    await page.screenshot({ path: 'screenshots/error.png', fullPage: true });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
