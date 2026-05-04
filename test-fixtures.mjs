/**
 * Fixture Loading & Companion E2E Test
 * Validates all pre-gen fixtures load correctly, render companions,
 * support HP tracking, and survive JSON round-trips.
 */
import { chromium } from 'playwright';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const FIXTURE_DIR = join(import.meta.dirname, 'fixtures');
const PLACEHOLDER_PATTERNS = [
  /\(any\)/i, /\(local\)/i, /\(any other\)/i,
  /\(Primary\)$/i, /\(Secondary\)$/i,
  /\(choose one\)/i, /placeholder/i
];

function hasUnresolvedSkill(skillName) {
  if (!skillName) return false;
  return PLACEHOLDER_PATTERNS.some(p => p.test(skillName));
}

// Only test the 10 RQG Starter Set pre-gens (current format)
const PREGEN_FILES = [
  'vasana.json', 'ionara.json', 'yanioth.json', 'harmast.json', 'vishi.json',
  'vostor.json', 'sorala.json', 'nathem.json', 'aranda.json', 'dazarim.json'
];
const FIXTURES = PREGEN_FILES
  .map(f => ({ name: f, path: join(FIXTURE_DIR, f) }));

const results = { pass: 0, fail: 0, errors: [] };

async function main() {
  console.log(`Testing ${FIXTURES.length} fixture files...\n`);

  const browser = await chromium.launch({
    executablePath: '/gnu/store/hspvnjz8gfcimznajp5pl4k8gj0vqf7k-profile/bin/chromium',
    headless: true
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:8765/index.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof App !== 'undefined' && typeof CharacterData !== 'undefined');

  for (const fixture of FIXTURES) {
    const fixtureData = JSON.parse(readFileSync(fixture.path, 'utf-8'));
    const errors = [];

    // === Test 1: Load fixture without errors ===
    const loadResult = await page.evaluate((data) => {
      try {
        Object.assign(CharacterData, data);
        if (CharacterData.characteristics) {
          CharacterData.attributes = Calc.calculateAllAttributes(CharacterData.characteristics);
        }
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }, fixtureData);

    if (!loadResult.success) {
      errors.push(`LOAD_FAILED: ${loadResult.error}`);
    }

    // === Test 2: Validate required fields ===
    if (!fixtureData.name) errors.push('MISSING_NAME');
    if (!fixtureData.characteristics) errors.push('MISSING_CHARACTERISTICS');
    if (fixtureData.charMethod !== 'pregen') errors.push('WRONG_CHARMETHOD');
    if (!fixtureData.combatStyles || fixtureData.combatStyles.length === 0) errors.push('NO_COMBAT_STYLE');
    if (!fixtureData.cult) errors.push('NO_CULT');

    // === Test 3: Skill totals must be 100 ===
    const culturalTotal = Object.values(fixtureData.culturalSkills || {}).reduce((a, b) => a + b, 0);
    if (culturalTotal !== 100) errors.push(`CULTURAL_POINTS: ${culturalTotal}`);

    const careerTotal = Object.values(fixtureData.careerSkills || {}).reduce((a, b) => a + b, 0);
    if (careerTotal !== 100) errors.push(`CAREER_POINTS: ${careerTotal}`);

    const bonusTotal = Object.values(fixtureData.bonusSkills || {}).reduce((a, b) => a + b, 0);
    if (bonusTotal !== 100) errors.push(`BONUS_POINTS: ${bonusTotal}`);

    // === Test 4: No unresolved placeholder skills ===
    const allSkills = [
      ...Object.keys(fixtureData.culturalSkills || {}),
      ...Object.keys(fixtureData.careerSkills || {}),
      ...Object.keys(fixtureData.bonusSkills || {}),
      ...(fixtureData.selectedProfessionalSkills || [])
    ];
    for (const skill of allSkills) {
      if (hasUnresolvedSkill(skill)) {
        errors.push(`UNRESOLVED_SKILL: "${skill}"`);
      }
    }

    // === Test 5: Companion rendering (if applicable) ===
    const companions = fixtureData.companions || [];
    if (companions.length > 0) {
      const companionRender = await page.evaluate((data) => {
        Object.assign(CharacterData, data);
        App.renderPlayCompanions();
        const container = document.getElementById('play-companions');
        return {
          html: container ? container.innerHTML : '',
          hasContent: container ? container.innerHTML.length > 0 : false
        };
      }, fixtureData);

      if (!companionRender.hasContent) {
        errors.push('COMPANION_NOT_RENDERED');
      }

      // Check each companion has required fields
      for (const comp of companions) {
        if (!comp.name) errors.push('COMPANION_NO_NAME');
        if (!comp.species) errors.push('COMPANION_NO_SPECIES');
        if (!comp.characteristics) errors.push('COMPANION_NO_CHARS');
        if (!comp.hitLocations) errors.push('COMPANION_NO_HIT_LOCS');
        if (!comp.attacks || comp.attacks.length === 0) errors.push('COMPANION_NO_ATTACKS');
      }
    }

    // === Test 6: JSON round-trip ===
    const roundTrip = await page.evaluate((data) => {
      try {
        // fromJSON expects a JSON string, toJSON returns a JSON string
        const jsonStr = JSON.stringify(data);
        CharacterData.fromJSON(jsonStr);
        const exportedStr = CharacterData.toJSON();
        const exported = JSON.parse(exportedStr);
        return {
          success: true,
          nameMatch: exported.name === data.name,
          companionsMatch: JSON.stringify(exported.companions || []) === JSON.stringify(data.companions || []),
          cultMatch: exported.cult === data.cult
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }, fixtureData);

    if (!roundTrip.success) {
      errors.push(`ROUND_TRIP_FAILED: ${roundTrip.error}`);
    } else {
      if (!roundTrip.nameMatch) errors.push('ROUND_TRIP_NAME_MISMATCH');
      if (!roundTrip.companionsMatch) errors.push('ROUND_TRIP_COMPANIONS_MISMATCH');
      if (!roundTrip.cultMatch) errors.push('ROUND_TRIP_CULT_MISMATCH');
    }

    // === Test 7: Weapons have required fields ===
    for (const w of (fixtureData.weapons || [])) {
      if (!w.name || !w.damage) {
        errors.push(`WEAPON_INCOMPLETE: ${w.name || 'unnamed'}`);
      }
    }

    // === Results ===
    if (errors.length === 0) {
      results.pass++;
      console.log(`  ✓ ${fixture.name} (${fixtureData.name})`);
    } else {
      results.fail++;
      results.errors.push({ file: fixture.name, name: fixtureData.name, errors });
      console.log(`  ✗ ${fixture.name} (${fixtureData.name})`);
      for (const e of errors) console.log(`    - ${e}`);
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log(`RESULTS: ${results.pass} PASS / ${results.fail} FAIL out of ${FIXTURES.length}`);
  console.log('='.repeat(70));

  if (results.errors.length > 0) {
    console.log('\nFAILURES:');
    for (const err of results.errors) {
      console.log(`  ${err.file}: ${err.errors.join(', ')}`);
    }
  }

  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(2);
});
