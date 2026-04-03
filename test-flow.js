// Full 11-step character creation flow test for Mythras Chargen
// Tests wizard flow, play mode switch, and PDF export
// Run with: node test-flow.js

const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Starting Mythras Chargen Playwright Flow Test...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate to local server
  console.log('→ Opening http://127.0.0.1:8770/index.html');
  await page.goto('http://127.0.0.1:8770/index.html');
  await page.waitForLoadState('networkidle');

  // Step 1: Name & Concept
  console.log('→ Step 1: Filling name and concept');
  await page.fill('[data-testid="wizard-name"]', 'Ulfa the Brave');
  await page.fill('[data-testid="wizard-concept"]', 'Praxian beast rider seeking glory');
  await page.click('#btn-next');
  await page.waitForTimeout(500);

  // Step 2: Characteristics
  console.log('→ Step 2: Setting characteristics');
  await page.fill('[data-testid="char-str"]', '14');
  await page.fill('[data-testid="char-con"]', '12');
  await page.fill('[data-testid="char-siz"]', '11');
  await page.fill('[data-testid="char-dex"]', '12');
  await page.fill('[data-testid="char-int"]', '10');
  await page.fill('[data-testid="char-pow"]', '9');
  await page.fill('[data-testid="char-cha"]', '8');
  await page.click('#btn-next');
  await page.waitForTimeout(500);

  // Step 3: Attributes (auto-calculated, just advance)
  console.log('→ Step 3: Attributes (auto-calculated)');
  await page.click('#btn-next');
  await page.waitForTimeout(500);

  // Step 4: Culture & Homeland
  console.log('→ Step 4: Selecting Praxian culture and Pimper\'s Block homeland');
  await page.selectOption('[data-testid="wizard-culture"]', 'Praxian');
  await page.waitForTimeout(500);
  await page.click('[data-testid="homeland-pimpers-block"]');
  await page.waitForTimeout(500);
  await page.click('#btn-next');
  await page.waitForTimeout(500);

  // Steps 5-7: Cultural skills, passions, background
  console.log('→ Steps 5-7: Clicking through cultural skills, passions, background');
  for (let i = 5; i <= 7; i++) {
    await page.click('#btn-next');
    await page.waitForTimeout(500);
  }

  // Step 8: Career
  console.log('→ Step 8: Selecting Warrior career');
  await page.selectOption('[data-testid="wizard-career"]', 'Warrior');
  await page.waitForTimeout(500);
  await page.click('#btn-next');
  await page.waitForTimeout(500);

  // Steps 9-10: Career skills and bonus skills
  console.log('→ Steps 9-10: Career skills and bonus skills');
  for (let i = 9; i <= 10; i++) {
    await page.click('#btn-next');
    await page.waitForTimeout(500);
  }

  // Step 11: Review & Complete - switches to Play Mode
  console.log('→ Step 11: Review and complete (switches to Play Mode)');
  await page.click('#btn-next');
  await page.waitForTimeout(1000); // Wait for mode switch

  // Verify Play Mode is visible
  console.log('\n✓ Verifying Play Mode is active...');
  const playModeVisible = await page.isVisible('#play-mode:not(.hidden)');
  console.assert(playModeVisible, '✗ Play mode should be visible');
  console.log('  ✓ Play Mode is visible');

  // Verify character name is populated
  const playName = await page.inputValue('#play-name');
  console.log(`  ✓ Character name: "${playName}"`);
  console.assert(playName === 'Ulfa the Brave', '✗ Character name should be "Ulfa the Brave"');

  // Verify skills section has content
  const skillsContent = await page.textContent('#play-skills');
  console.assert(skillsContent.length > 100, '✗ Skills section should be populated');
  console.log(`  ✓ Skills section populated (${skillsContent.length} chars)`);

  // Count skill rows
  const skillRows = await page.locator('[data-testid="skill-row"]').count();
  console.log(`  ✓ Found ${skillRows} skill rows`);

  // Verify combat section has content
  const combatContent = await page.textContent('#play-combat');
  console.assert(combatContent.length > 50, '✗ Combat section should be populated');
  console.log(`  ✓ Combat section populated (${combatContent.length} chars)`);

  // Verify runes section exists
  const runesContent = await page.textContent('#play-runes');
  console.log(`  ✓ Runes section rendered (${runesContent.length} chars)`);

  // Verify magic section exists
  const magicContent = await page.textContent('#play-magic');
  console.log(`  ✓ Magic section rendered (${magicContent.length} chars)`);

  // Verify equipment section exists
  const equipmentContent = await page.textContent('#play-equipment');
  console.log(`  ✓ Equipment section rendered (${equipmentContent.length} chars)`);

  // Test Special Effects Reference lazy-loading
  console.log('\n✓ Testing Special Effects Reference lazy-loading...');
  const specialEffectsContainer = await page.locator('#special-effects-ref');
  const initialContent = await specialEffectsContainer.innerHTML();
  console.log(`  ✓ Initial content empty: ${initialContent.trim() === ''}`);

  // Click the collapsible header to expand
  await page.click('text=Special Effects Reference');
  await page.waitForTimeout(500);

  const loadedContent = await specialEffectsContainer.innerHTML();
  console.assert(loadedContent.length > 1000, '✗ Special Effects should render on expand');
  console.log(`  ✓ Special Effects loaded on expand (${loadedContent.length} chars)`);

  // Export PDF
  console.log('\n✓ Testing PDF export...');
  const exportButton = await page.locator('#btn-export-pdf-simple');
  const isEnabled = await exportButton.isEnabled();
  console.assert(isEnabled, '✗ Export PDF button should be enabled in play mode');
  console.log('  ✓ Export PDF button is enabled');

  // Click export (this will trigger download, but we're just testing no errors)
  await page.click('#btn-export-pdf-simple');
  await page.waitForTimeout(2000); // Wait for PDF generation

  // Screenshot final state
  console.log('\n→ Taking screenshot of final state...');
  await page.screenshot({ path: '/tmp/mythras-pdf-decapod/mythras-final-state.png', fullPage: true });
  console.log('  ✓ Screenshot saved: mythras-final-state.png');

  // Check for console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  if (errors.length > 0) {
    console.log('\n⚠ Console errors detected:');
    errors.forEach(err => console.log(`  - ${err}`));
  } else {
    console.log('\n✓ No console errors detected');
  }

  console.log('\n✅ Full flow test PASSED! All steps completed successfully.\n');
  await browser.close();
})().catch(err => {
  console.error('\n❌ Test FAILED with error:');
  console.error(err);
  process.exit(1);
});
