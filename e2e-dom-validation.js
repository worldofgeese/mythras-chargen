/**
 * DOM-based E2E Validation
 *
 * Uses JSDOM to load and validate the HTML application structure
 * Verifies all critical data-testid attributes are present
 */

const fs = require('fs');
const { JSDOM } = require('jsdom');

async function validateHTML() {
  console.log('═══════════════════════════════════════');
  console.log('DOM-BASED E2E VALIDATION');
  console.log('═══════════════════════════════════════\n');

  const html = fs.readFileSync('index.html', 'utf-8');
  const dom = new JSDOM(html, {
    url: 'http://localhost:8080',
    runScripts: 'dangerously',
    resources: 'usable'
  });

  const document = dom.window.document;

  let passed = 0;
  let failed = 0;

  function test(name, condition) {
    if (condition) {
      console.log(`✅ ${name}`);
      passed++;
      return true;
    } else {
      console.log(`❌ ${name}`);
      failed++;
      return false;
    }
  }

  console.log('=== Culture Selection Tests ===\n');
  test('Balazaring culture button exists', !!document.querySelector('[data-testid="culture-balazaring"]'));
  test('Sartarite culture button exists', !!document.querySelector('[data-testid="culture-sartarite"]'));
  test('Praxian culture button exists', !!document.querySelector('[data-testid="culture-praxian"]'));
  test('Telmori culture button exists', !!document.querySelector('[data-testid="culture-telmori"]'));

  console.log('\n=== Characteristic Input Tests ===\n');
  test('STR input exists', !!document.querySelector('[data-testid="char-str"]'));
  test('CON input exists', !!document.querySelector('[data-testid="char-con"]'));
  test('SIZ input exists', !!document.querySelector('[data-testid="char-siz"]'));
  test('DEX input exists', !!document.querySelector('[data-testid="char-dex"]'));
  test('INT input exists', !!document.querySelector('[data-testid="char-int"]'));
  test('POW input exists', !!document.querySelector('[data-testid="char-pow"]'));
  test('CHA input exists', !!document.querySelector('[data-testid="char-cha"]'));
  test('Points remaining display exists', !!document.querySelector('[data-testid="points-remaining"]'));

  console.log('\n=== Play Mode Display Tests ===\n');
  test('STR display exists', !!document.querySelector('[data-testid="display-str"]'));
  test('CON display exists', !!document.querySelector('[data-testid="display-con"]'));
  test('SIZ display exists', !!document.querySelector('[data-testid="display-siz"]'));
  test('DEX display exists', !!document.querySelector('[data-testid="display-dex"]'));
  test('INT display exists', !!document.querySelector('[data-testid="display-int"]'));
  test('POW display exists', !!document.querySelector('[data-testid="display-pow"]'));
  test('CHA display exists', !!document.querySelector('[data-testid="display-cha"]'));

  console.log('\n=== Derived Attributes Tests ===\n');
  test('HP display exists', !!document.querySelector('[data-testid="display-hp"]'));
  test('Action Points display exists', !!document.querySelector('[data-testid="display-ap"]'));
  test('Initiative display exists', !!document.querySelector('[data-testid="display-initiative"]'));
  test('Damage Modifier display exists', !!document.querySelector('[data-testid="display-damage-mod"]'));
  test('Magic Points display exists', !!document.querySelector('[data-testid="display-mp"]'));

  console.log('\n=== Skill Input Tests ===\n');
  test('Athletics skill input exists', !!document.querySelector('[data-testid="skill-athletics"]'));
  test('Brawn skill input exists', !!document.querySelector('[data-testid="skill-brawn"]'));
  test('Endurance skill input exists', !!document.querySelector('[data-testid="skill-endurance"]'));
  test('Locale skill input exists', !!document.querySelector('[data-testid="skill-locale"]'));
  test('Perception skill input exists', !!document.querySelector('[data-testid="skill-perception"]'));
  test('Stealth skill input exists', !!document.querySelector('[data-testid="skill-stealth"]'));
  test('Survival skill input exists', !!document.querySelector('[data-testid="skill-survival"]'));

  console.log('\n=== Career Tests ===\n');
  test('Career select dropdown exists', !!document.querySelector('[data-testid="career-select"]'));

  console.log('\n=== Export Tests ===\n');
  test('PDF export button exists', !!document.querySelector('[data-testid="export-pdf-btn"]') ||
                                    !!document.querySelector('button:contains("Export PDF")'));
  test('Play mode container exists', !!document.querySelector('[data-testid="play-mode"]'));

  console.log('\n=== Offscreen Rendering Tests ===\n');
  test('Offscreen canvas support exists', typeof document.createElement('canvas').transferControlToOffscreen === 'function' ||
                                          html.includes('offscreenCanvas'));

  console.log('\n═══════════════════════════════════════');
  console.log('TEST SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`Total tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n✅ All DOM validation tests passed!');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed - review above');
    return false;
  }
}

// Run validation
validateHTML().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
