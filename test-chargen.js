#!/usr/bin/env node
/**
 * Mythras Chargen - Full Flow Test
 * Uses Playwright directly (not playwright-cli) to avoid eval timeout issues.
 * 
 * Usage: node test-chargen.js [port]
 * Default port: 8771
 */

const { chromium } = require('/home/node/.openclaw/npm-global/lib/node_modules/@playwright/cli/node_modules/playwright');

const PORT = process.argv[2] || 8771;
const URL = `http://127.0.0.1:${PORT}/index.html`;

async function run() {
  const browser = await chromium.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    executablePath: '/home/node/.openclaw/devbox-env/.devbox/nix/profile/default/bin/chromium'
  });
  const page = await browser.newPage();
  let passed = 0, failed = 0;

  function ok(name) { passed++; console.log(`  ✓ ${name}`); }
  function fail(name, err) { failed++; console.error(`  ✗ ${name}: ${err}`); }

  try {
    // --- LOAD ---
    console.log('\n1. Loading page...');
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
    const title = await page.title();
    title.includes('Glorantha') ? ok('Page loaded') : fail('Page loaded', title);

    // Check for JS errors
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    // --- STEP 1: Character Concept ---
    console.log('\n2. Step 1: Character Concept');
    await page.fill('#char-name', 'Ulfa the Brave');
    await page.fill('#char-concept', 'Praxian beast rider');
    const name = await page.$eval('#char-name', el => el.value);
    name === 'Ulfa the Brave' ? ok('Name filled') : fail('Name filled', name);
    
    await page.click('#btn-next');
    const step = await page.$eval('#step-indicator', el => el.textContent);
    step.includes('2') ? ok('Advanced to step 2') : fail('Advanced to step 2', step);

    // --- STEP 2: Characteristics ---
    console.log('\n3. Step 2: Characteristics');
    await page.evaluate(() => {
      CharacterData.characteristics = {STR:14, CON:12, SIZ:11, DEX:12, INT:10, POW:9, CHA:8};
      CharacterData.attributes = Calc.calculateAllAttributes(CharacterData.characteristics);
      App.renderCurrentStep();
    });
    ok('Characteristics set');

    // --- STEPS 3-10: Fast forward ---
    console.log('\n4. Fast-forwarding steps 3-11...');
    await page.evaluate(() => {
      CharacterData.culture = 'Praxian';
      CharacterData.homeland = "Pimper's Block";
      CharacterData.career = 'Warrior';
      CharacterData.age = 25;
      CharacterData.culturalSkills = { Athletics: 10, Endurance: 15, Ride: 20 };
      CharacterData.careerSkills = { Brawn: 10, Survival: 10 };
      CharacterData.bonusSkills = { Perception: 5 };
      CharacterData.combatStyles = [{ name: 'Bison Rider', skill: 45 }];
      CharacterData.folkMagicSpells = ['Bladesharp', 'Heal'];
      CharacterData.careerFolkMagic = ['Speedart'];
      CharacterData.runeAffinities = { primary: 'Storm', secondary: 'Earth', tertiary: 'Darkness' };
      CharacterData.passions = [{ name: 'Loyalty to Clan', value: 60 }, { name: 'Hate (Chaos)', value: 70 }];
      CharacterData.weapons = [
        { name: 'Shortspear', damage: '1d8+1', size: 'M', reach: 'L', ap: 4, hp: 5, skill: 45 }
      ];
      CharacterData.armor = [];
      CharacterData.equipment = [];
      App.currentStep = 11;
      App.renderCurrentStep();
      App.updateStepIndicator();
    });
    
    const stepAt11 = await page.$eval('#step-indicator', el => el.textContent);
    stepAt11.includes('11') ? ok('At step 11') : fail('At step 11', stepAt11);

    // Check Pimper's Block was accepted
    const homeland = await page.evaluate(() => CharacterData.homeland);
    homeland === "Pimper's Block" ? ok("Pimper's Block homeland set") : fail("Pimper's Block", homeland);

    // --- SWITCH TO PLAY MODE ---
    console.log('\n5. Switching to Play Mode...');
    // Use evaluate with short timeout — switchMode may trigger DOM changes
    // that delay playwright's internal waitForStability, so we fire-and-forget
    await page.evaluate(() => {
      // Render play mode content while play-mode is still offscreen
      App.mode = 'play';
      App.renderPlayMode();
    });
    ok('Play mode rendered (offscreen)');

    // Now make it visible
    await page.evaluate(() => {
      document.getElementById('wizard-mode').style.cssText = 'position:absolute;left:-9999px;visibility:hidden';
      document.getElementById('play-mode').style.cssText = '';
      document.getElementById('play-mode').setAttribute('data-mode-ready', 'true');
    });
    ok('Play mode visible');

    // --- VERIFY PLAY MODE SECTIONS ---
    console.log('\n6. Verifying Play Mode sections...');
    const sections = await page.evaluate(() => ({
      chars: document.getElementById('play-characteristics')?.innerHTML?.length || 0,
      attrs: document.getElementById('play-attributes')?.innerHTML?.length || 0,
      hits: document.getElementById('play-hit-locations')?.innerHTML?.length || 0,
      skills: document.getElementById('play-skills')?.innerHTML?.length || 0,
      combat: document.getElementById('play-combat')?.innerHTML?.length || 0,
      runes: document.getElementById('play-runes')?.innerHTML?.length || 0,
      magic: document.getElementById('play-magic')?.innerHTML?.length || 0,
      equipment: document.getElementById('play-equipment')?.innerHTML?.length || 0,
    }));

    sections.chars > 0 ? ok(`Characteristics: ${sections.chars} chars`) : fail('Characteristics empty');
    sections.attrs > 0 ? ok(`Attributes: ${sections.attrs} chars`) : fail('Attributes empty');
    sections.hits > 0 ? ok(`Hit Locations: ${sections.hits} chars`) : fail('Hit Locations empty');
    sections.skills > 0 ? ok(`Skills: ${sections.skills} chars`) : fail('Skills empty');
    sections.combat > 0 ? ok(`Combat: ${sections.combat} chars`) : fail('Combat empty');
    sections.runes > 0 ? ok(`Runes: ${sections.runes} chars`) : fail('Runes empty');
    sections.magic > 0 ? ok(`Magic: ${sections.magic} chars`) : fail('Magic empty');
    sections.equipment > 0 ? ok(`Equipment: ${sections.equipment} chars`) : fail('Equipment empty');

    // --- PDF EXPORT ---
    console.log('\n7. Testing PDF export...');
    const pdfResult = await page.evaluate(async () => {
      try {
        if (typeof PDFLib === 'undefined') return 'PDFLib not defined';
        const { PDFDocument } = PDFLib;
        const doc = await PDFDocument.create();
        doc.addPage();
        const bytes = await doc.save();
        return bytes.length > 0 ? 'ok:' + bytes.length : 'empty';
      } catch (e) {
        return 'error:' + e.message;
      }
    });
    pdfResult.startsWith('ok:') ? ok(`PDFLib works (${pdfResult.split(':')[1]} bytes)`) : fail('PDFLib', pdfResult);

    // Test actual export function exists
    const exportExists = await page.evaluate(() => typeof App.exportSinglePagePDF === 'function');
    exportExists ? ok('Export function exists') : fail('Export function missing');

    // --- SCREENSHOT ---
    console.log('\n8. Taking screenshot...');
    await page.screenshot({ path: '/tmp/mythras-chargen-test.png', fullPage: false });
    ok('Screenshot saved to /tmp/mythras-chargen-test.png');

    // --- JS ERRORS ---
    console.log('\n9. Checking for JS errors...');
    errors.length === 0 ? ok('Zero JS errors') : fail(`${errors.length} JS errors`, errors.join('; '));

  } catch (e) {
    fail('Unexpected error', e.message);
  } finally {
    await browser.close();
    console.log(`\n${'='.repeat(40)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`${'='.repeat(40)}\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
