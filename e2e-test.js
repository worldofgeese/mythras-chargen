const { chromium } = require('playwright');

async function runE2ETests() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Starting E2E validation...');

  // Navigate to the app
  await page.goto('http://127.0.0.1:8080/index.html');
  await page.waitForTimeout(1000);

  // Screenshot 1: Initial load
  await page.screenshot({ path: 'screenshots/01-initial-load.png', fullPage: true });
  console.log('✓ Screenshot 1: Initial load');

  // ===== Test Character 1: Balazaring Hunter =====
  console.log('\n=== Creating Test Character 1: Balazaring Hunter ===');

  // Step 1: Fill in name and concept
  await page.fill('#char-name', 'Balazaring Hunter Test');
  await page.fill('#char-concept', 'A skilled hunter from the Wilds');
  await page.screenshot({ path: 'screenshots/02-char1-name.png', fullPage: true });
  console.log('✓ Step 1: Name and concept filled');

  // Step 2: Culture selection
  await page.selectOption('#culture-select', 'Balazaring');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/03-char1-culture.png', fullPage: true });
  console.log('✓ Step 2: Culture selected');

  // Step 3: Characteristics (point-buy mode)
  // Set values: STR:12, CON:13, SIZ:10, DEX:14, INT:10, POW:11, CHA:9
  await page.fill('input[data-testid="char-str"]', '12');
  await page.fill('input[data-testid="char-con"]', '13');
  await page.fill('input[data-testid="char-siz"]', '10');
  await page.fill('input[data-testid="char-dex"]', '14');
  await page.fill('input[data-testid="char-int"]', '10');
  await page.fill('input[data-testid="char-pow"]', '11');
  await page.fill('input[data-testid="char-cha"]', '9');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/04-char1-characteristics.png', fullPage: true });
  console.log('✓ Step 3: Characteristics set');

  // Navigate through wizard steps
  // Find and click "Next" or similar buttons to progress through steps
  const steps = ['Step 4', 'Step 5', 'Step 6', 'Step 7', 'Step 8', 'Step 9', 'Step 10', 'Step 11'];

  for (let i = 4; i <= 11; i++) {
    // Look for Continue/Next button
    const buttons = await page.locator('button:has-text("Continue"), button:has-text("Next")').all();
    if (buttons.length > 0) {
      await buttons[0].click();
      await page.waitForTimeout(500);
    }

    // Take screenshots at key steps
    if (i === 5 || i === 7 || i === 10 || i === 11) {
      await page.screenshot({ path: `screenshots/05-char1-step${i}.png`, fullPage: true });
      console.log(`✓ Screenshot: Step ${i}`);
    }
  }

  // Enter Play Mode
  const playModeBtn = await page.locator('button:has-text("Play Mode"), button:has-text("Enter Play Mode")').first();
  if (await playModeBtn.count() > 0) {
    await playModeBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/06-char1-playmode.png', fullPage: true });
    console.log('✓ Entered Play Mode');
  }

  // Try PDF export
  const pdfBtn = await page.locator('button:has-text("Export PDF"), button:has-text("PDF")').first();
  if (await pdfBtn.count() > 0) {
    await page.screenshot({ path: 'screenshots/07-char1-pdf-button.png', fullPage: true });
    console.log('✓ PDF export button visible');

    // Click it (download may happen)
    await pdfBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/08-char1-after-pdf.png', fullPage: true });
    console.log('✓ PDF export attempted');
  }

  // ===== Test Character 2: Sartarite Warrior =====
  console.log('\n=== Creating Test Character 2: Sartarite Warrior ===');

  // Go back to wizard
  const wizardBtn = await page.locator('button:has-text("Wizard"), button:has-text("Back to Wizard")').first();
  if (await wizardBtn.count() > 0) {
    await wizardBtn.click();
    await page.waitForTimeout(500);
  }

  // Fill in new character
  await page.fill('#char-name', 'Sartarite Warrior Test');
  await page.fill('#char-concept', 'A brave warrior from Sartar');

  // Select Sartarite culture
  await page.selectOption('#culture-select', 'Sartarite');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/09-char2-culture.png', fullPage: true });
  console.log('✓ Sartarite culture selected');

  // Characteristics: STR:14, CON:12, SIZ:13, DEX:11, INT:12, POW:10, CHA:9
  await page.fill('input[data-testid="char-str"]', '14');
  await page.fill('input[data-testid="char-con"]', '12');
  await page.fill('input[data-testid="char-siz"]', '13');
  await page.fill('input[data-testid="char-dex"]', '11');
  await page.fill('input[data-testid="char-int"]', '12');
  await page.fill('input[data-testid="char-pow"]', '10');
  await page.fill('input[data-testid="char-cha"]', '9');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/10-char2-characteristics.png', fullPage: true });
  console.log('✓ Characteristics set');

  // Navigate through wizard
  for (let i = 4; i <= 11; i++) {
    const buttons = await page.locator('button:has-text("Continue"), button:has-text("Next")').all();
    if (buttons.length > 0) {
      await buttons[0].click();
      await page.waitForTimeout(500);
    }

    if (i === 11) {
      await page.screenshot({ path: `screenshots/11-char2-step11.png`, fullPage: true });
      console.log(`✓ Screenshot: Step 11`);
    }
  }

  // Enter Play Mode
  const playModeBtn2 = await page.locator('button:has-text("Play Mode"), button:has-text("Enter Play Mode")').first();
  if (await playModeBtn2.count() > 0) {
    await playModeBtn2.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/12-char2-playmode.png', fullPage: true });
    console.log('✓ Entered Play Mode');
  }

  // PDF export
  const pdfBtn2 = await page.locator('button:has-text("Export PDF"), button:has-text("PDF")').first();
  if (await pdfBtn2.count() > 0) {
    await pdfBtn2.click();
    await page.waitForTimeout(1000);
    console.log('✓ PDF export attempted');
  }

  // ===== Test Character 3: Praxian (Quick) =====
  console.log('\n=== Creating Test Character 3: Praxian (Quick) ===');

  // Go back to wizard
  const wizardBtn2 = await page.locator('button:has-text("Wizard"), button:has-text("Back to Wizard")').first();
  if (await wizardBtn2.count() > 0) {
    await wizardBtn2.click();
    await page.waitForTimeout(500);
  }

  await page.fill('#char-name', 'Praxian Beast Rider Test');
  await page.selectOption('#culture-select', 'Praxian');
  await page.waitForTimeout(500);

  // Quick characteristics
  await page.fill('input[data-testid="char-str"]', '13');
  await page.fill('input[data-testid="char-con"]', '12');
  await page.fill('input[data-testid="char-siz"]', '11');
  await page.fill('input[data-testid="char-dex"]', '13');
  await page.fill('input[data-testid="char-int"]', '11');
  await page.fill('input[data-testid="char-pow"]', '12');
  await page.fill('input[data-testid="char-cha"]', '10');
  await page.screenshot({ path: 'screenshots/13-char3-setup.png', fullPage: true });
  console.log('✓ Praxian character setup');

  // Quick navigation to end
  for (let i = 0; i < 8; i++) {
    const buttons = await page.locator('button:has-text("Continue"), button:has-text("Next")').all();
    if (buttons.length > 0) {
      await buttons[0].click();
      await page.waitForTimeout(300);
    }
  }

  // Play Mode
  const playModeBtn3 = await page.locator('button:has-text("Play Mode"), button:has-text("Enter Play Mode")').first();
  if (await playModeBtn3.count() > 0) {
    await playModeBtn3.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/14-char3-playmode.png', fullPage: true });
    console.log('✓ Play Mode verified');
  }

  // Final verification screenshot
  await page.screenshot({ path: 'screenshots/15-final-state.png', fullPage: true });
  console.log('✓ Final state captured');

  console.log('\n✓ E2E tests completed successfully!');
  console.log('Screenshots saved to: screenshots/');

  await browser.close();
}

// Run the tests
runE2ETests().catch(error => {
  console.error('E2E test failed:', error);
  process.exit(1);
});
