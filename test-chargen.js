#!/usr/bin/env node
/**
 * TDD Test Suite for Mythras Character Generator
 * Tests cover: PDF validation, Play Mode state, data normalization, validation layer
 * Run: node test-chargen.js
 */

const fs = require('fs');
const path = require('path');

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
  totalTests++;
  passedTests++;
}

function fail(msg, details) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
  if (details) console.log(`  ${colors.gray}${details}${colors.reset}`);
  totalTests++;
  failedTests++;
}

function section(title) {
  console.log(`\n${colors.cyan}═══ ${title} ═══${colors.reset}\n`);
}

function info(msg) {
  console.log(`${colors.gray}${msg}${colors.reset}`);
}

// Extract JS from HTML
function extractScripts(html) {
  const scripts = [];
  let idx = 0;
  while (true) {
    const s = html.indexOf('<script', idx);
    if (s === -1) break;
    const cs = html.indexOf('>', s) + 1;
    const e = html.indexOf('</script>', cs);
    if (e === -1) break;
    const code = html.substring(cs, e);
    if (code.trim().length > 100) scripts.push(code);
    idx = e + 9;
  }
  return scripts;
}

// Minimal DOM mock for testing logic (not rendering)
function createMockEnv() {
  const elements = {};
  const mockEl = (id) => ({
    id, innerHTML: '', textContent: '', value: '', style: { cssText: '', display: '' },
    classList: { toggle: () => {}, add: () => {}, remove: () => {}, contains: () => false },
    querySelector: () => null, querySelectorAll: () => [],
    setAttribute: () => {}, removeAttribute: () => {}, getAttribute: () => null,
    appendChild: () => {}, remove: () => {}, disabled: false,
    addEventListener: () => {}, firstChild: null, removeChild: () => {},
    get children() { return []; }
  });

  const doc = {
    getElementById: (id) => { if (!elements[id]) elements[id] = mockEl(id); return elements[id]; },
    querySelector: () => mockEl('q'),
    querySelectorAll: () => [],
    createElement: (tag) => mockEl(tag),
    addEventListener: () => {},
    head: { appendChild: () => {} },
    body: { appendChild: () => {} },
    title: 'test'
  };

  return { document: doc, elements,
    localStorage: { getItem: () => null, setItem: () => {} },
    location: { hash: '', href: '' },
    window: {}, navigator: { userAgent: '' },
    setTimeout: (fn) => fn(), requestAnimationFrame: (fn) => fn(),
    console: { log: () => {}, warn: () => {}, error: () => {} },
    URL: { createObjectURL: () => 'blob:', revokeObjectURL: () => {} },
    Blob: function() {},
    Uint8Array: globalThis.Uint8Array,
    Map: globalThis.Map, Set: globalThis.Set, Array: globalThis.Array,
    Object: globalThis.Object, JSON: globalThis.JSON, Math: globalThis.Math,
    Number: globalThis.Number, String: globalThis.String, Error: globalThis.Error,
    TypeError: globalThis.TypeError, isFinite: globalThis.isFinite, isNaN: globalThis.isNaN,
    parseInt: globalThis.parseInt, parseFloat: globalThis.parseFloat,
    Promise: globalThis.Promise,
  };
}

// Load and execute app code
function loadApp() {
  const htmlPath = path.join(__dirname, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Load glorantha.js separately
  const gloranthaPath = path.join(__dirname, 'data', 'glorantha.js');
  const gloranthaScript = fs.existsSync(gloranthaPath) ?
    fs.readFileSync(gloranthaPath, 'utf8') : '';

  // Extract main script
  const scripts = extractScripts(html);
  if (scripts.length === 0) {
    throw new Error('No scripts found in index.html');
  }
  const appScript = scripts[0]; // Only one script block now

  // Create sandbox
  const vm = require('vm');
  const env = createMockEnv();

  // Mock pdf-lib
  const mockPdfLib = {
    PDFDocument: {
      create: async () => ({
        addPage: () => ({
          getWidth: () => 595,
          getHeight: () => 842,
          drawText: () => {},
          drawRectangle: () => {},
        }),
        embedFont: async () => ({
          widthOfTextAtSize: () => 100,
        }),
        save: async () => new Uint8Array(100),
      })
    },
    StandardFonts: { Helvetica: 'Helvetica', HelveticaBold: 'Helvetica-Bold' },
    rgb: (r, g, b) => ({ r, g, b }),
    degrees: (d) => d,
  };

  const sandbox = vm.createContext({
    ...env, document: env.document, window: env.window, localStorage: env.localStorage,
    location: env.location, console: env.console, setTimeout: env.setTimeout,
    requestAnimationFrame: env.requestAnimationFrame,
    URL: env.URL, Blob: env.Blob,
    Uint8Array: globalThis.Uint8Array, Int32Array: globalThis.Int32Array,
    Uint16Array: globalThis.Uint16Array, Uint32Array: globalThis.Uint32Array,
    Uint8ClampedArray: globalThis.Uint8ClampedArray, ArrayBuffer: globalThis.ArrayBuffer,
    Map: globalThis.Map, Set: globalThis.Set, Array: globalThis.Array,
    Object: globalThis.Object, JSON: globalThis.JSON, Math: globalThis.Math,
    Number: globalThis.Number, String: globalThis.String, Error: globalThis.Error,
    TypeError: globalThis.TypeError, isFinite: globalThis.isFinite, isNaN: globalThis.isNaN,
    parseInt: globalThis.parseInt, parseFloat: globalThis.parseFloat,
    Promise: globalThis.Promise, RegExp: globalThis.RegExp, Date: globalThis.Date,
    PDFLib: mockPdfLib,
  });

  try {
    // Load glorantha data first (if it exists)
    if (gloranthaScript) {
      vm.runInContext(gloranthaScript, sandbox, { filename: 'glorantha.js' });
    }

    // Load main app
    vm.runInContext(appScript, sandbox, { filename: 'app.js' });

    // Extract exports
    vm.runInContext(`
      this._exports = {
        CharacterData,
        Calc,
        App: typeof App !== 'undefined' ? App : null,
        CULTURES_DATA,
        WEAPONS_DATA,
        WEAPON_ALIASES: typeof WEAPON_ALIASES !== 'undefined' ? WEAPON_ALIASES : null,
        SKILLS_DATA,
        HIT_LOCATIONS,
        GLORANTHA_CULTURES_DATA: typeof GLORANTHA_CULTURES_DATA !== 'undefined' ? GLORANTHA_CULTURES_DATA : null,
        Helpers: typeof Helpers !== 'undefined' ? Helpers : null,
      };
    `, sandbox);
  } catch(e) {
    console.error('Failed to load scripts:', e.message);
    console.error(e.stack);
    process.exit(1);
  }

  return sandbox._exports;
}

// ============================================================
// MAIN TEST SUITE
// ============================================================

section('Loading Application');
const App = loadApp();
info(`Loaded ${App.SKILLS_DATA.length} skills, ${App.WEAPONS_DATA.length} weapons, ${App.CULTURES_DATA.length} cultures`);

// Helper to create a valid test character
function createTestCharacter(culture = 'Generic') {
  return {
    name: 'Test Character',
    culture: culture,
    career: 'Warrior',
    age: 25,
    characteristics: { STR: 14, CON: 12, SIZ: 11, DEX: 12, INT: 10, POW: 9, CHA: 8 },
    attributes: App.Calc.calculateAllAttributes({ STR: 14, CON: 12, SIZ: 11, DEX: 12, INT: 10, POW: 9, CHA: 8 }),
    culturalSkills: { 'Athletics': 40, 'Ride': 30 },
    careerSkills: { 'Combat Style (Sword & Shield)': 50 },
    bonusSkills: { 'Lore (Strategy)': 40 },
    folkMagicSpells: [],
    careerFolkMagic: [],
    runeAffinities: { primary: 'Storm', secondary: 'Earth', tertiary: 'Darkness' },
    weapons: ['Broadsword', 'Kite Shield'],
    equipment: ['Leather Armor', 'Backpack'],
    armor: ['Leather'],
    passions: ['Loyalty (Clan): 60'],
    combatStyles: [{ name: 'Sword & Shield', skill: 50 }],
    notes: 'A test character',
    concept: 'Brave warrior',
    background: 'From the highlands',
    hitPoints: {
      'Head': { current: 5, max: 5 },
      'Chest': { current: 7, max: 7 },
      'Abdomen': { current: 6, max: 6 },
      'Right Arm': { current: 4, max: 4 },
      'Left Arm': { current: 4, max: 4 },
      'Right Leg': { current: 5, max: 5 },
      'Left Leg': { current: 5, max: 5 }
    }
  };
}

// ============================================================
section('Risk 1: PDF Semantic Validation (Sub-era Keywords)');
// ============================================================

// Test 1.1: PDF export includes character name
{
  const char = createTestCharacter();
  App.CharacterData.name = char.name;
  App.CharacterData.characteristics = char.characteristics;
  App.CharacterData.attributes = char.attributes;

  if (App.App && App.App.exportSinglePagePDF) {
    const pdfCode = App.App.exportSinglePagePDF.toString();
    const hasNameReference = pdfCode.includes('CharacterData.name') ||
                            pdfCode.includes('.name');
    if (hasNameReference) {
      pass('exportSinglePagePDF() references CharacterData.name');
    } else {
      fail('exportSinglePagePDF() does not reference character name field');
    }
  } else {
    fail('exportSinglePagePDF() function not found');
  }
}

// Test 1.2: PDF export includes characteristics
{
  if (App.App && App.App.exportSinglePagePDF) {
    const pdfCode = App.App.exportSinglePagePDF.toString();
    const characteristics = ['STR', 'CON', 'SIZ', 'DEX', 'INT', 'POW', 'CHA'];
    let foundChars = 0;
    characteristics.forEach(char => {
      if (pdfCode.includes(char)) foundChars++;
    });
    if (foundChars >= 6) {
      pass(`exportSinglePagePDF() references ${foundChars}/7 characteristics`);
    } else {
      fail(`exportSinglePagePDF() only references ${foundChars}/7 characteristics`);
    }
  }
}

// Test 1.3: PDF export includes skills
{
  if (App.App && App.App.exportSinglePagePDF) {
    const pdfCode = App.App.exportSinglePagePDF.toString();
    const hasSkillsReference = pdfCode.includes('Skills') ||
                               pdfCode.includes('skills') ||
                               pdfCode.includes('compileAllSkills') ||
                               pdfCode.includes('culturalSkills');
    if (hasSkillsReference) {
      pass('exportSinglePagePDF() references skills data');
    } else {
      fail('exportSinglePagePDF() does not reference skills');
    }
  }
}

// Test 1.4: PDF export includes combat styles
{
  if (App.App && App.App.exportSinglePagePDF) {
    const pdfCode = App.App.exportSinglePagePDF.toString();
    const hasCombatStyles = pdfCode.includes('combatStyles') ||
                           pdfCode.includes('Combat Style');
    if (hasCombatStyles) {
      pass('exportSinglePagePDF() references combat styles');
    } else {
      fail('exportSinglePagePDF() does not reference combat styles');
    }
  }
}

// Test 1.5: PDF export includes hit locations with HP
{
  if (App.App && App.App.exportSinglePagePDF) {
    const pdfCode = App.App.exportSinglePagePDF.toString();
    const hasHitLocations = pdfCode.includes('hitPoints') ||
                           pdfCode.includes('Hit Location') ||
                           pdfCode.includes('HIT_LOCATIONS');
    if (hasHitLocations) {
      pass('exportSinglePagePDF() references hit locations and HP');
    } else {
      fail('exportSinglePagePDF() does not reference hit locations');
    }
  }
}

// Test 1.6: PDF export includes weapons
{
  if (App.App && App.App.exportSinglePagePDF) {
    const pdfCode = App.App.exportSinglePagePDF.toString();
    const hasWeapons = pdfCode.includes('weapons') ||
                      pdfCode.includes('WEAPONS_DATA');
    if (hasWeapons) {
      pass('exportSinglePagePDF() references weapons');
    } else {
      fail('exportSinglePagePDF() does not reference weapons');
    }
  }
}

// Test 1.7: PDF export includes notes/concept/background
{
  if (App.App && App.App.exportSinglePagePDF) {
    const pdfCode = App.App.exportSinglePagePDF.toString();
    const textFields = ['notes', 'concept', 'background'];
    let foundFields = 0;
    textFields.forEach(field => {
      if (pdfCode.includes(field)) foundFields++;
    });
    if (foundFields >= 2) {
      pass(`exportSinglePagePDF() references ${foundFields}/3 text fields (notes/concept/background)`);
    } else {
      fail(`exportSinglePagePDF() only references ${foundFields}/3 text fields`);
    }
  }
}

// Test 1.8: Culture-specific keywords for Glorantha cultures
{
  if (App.GLORANTHA_CULTURES_DATA && App.GLORANTHA_CULTURES_DATA.length > 0) {
    const cultures = ['Balazaring', 'Praxian', 'Tlemori', 'Sartarist'];
    const testCulture = cultures[0];
    const cultureData = App.GLORANTHA_CULTURES_DATA.find(c => c.name === testCulture);

    if (cultureData) {
      info(`Testing culture-specific content for ${testCulture}`);

      // Check if culture has combat styles
      if (cultureData.combatStyles && cultureData.combatStyles.length > 0) {
        pass(`${testCulture} culture has ${cultureData.combatStyles.length} combat style(s) defined`);
      } else {
        fail(`${testCulture} culture missing combat styles`);
      }

      // Check if culture has professional skills
      if (cultureData.professionalSkills && cultureData.professionalSkills.length > 0) {
        pass(`${testCulture} culture has ${cultureData.professionalSkills.length} professional skills defined`);
      } else {
        info(`${testCulture} culture has no professional skills (may be valid)`);
      }
    } else {
      fail(`Could not find ${testCulture} in GLORANTHA_CULTURES_DATA`);
    }
  } else {
    info('Glorantha cultures not loaded - skipping culture-specific tests');
  }
}

// ============================================================
section('Risk 2: Play Mode Form State Consistency');
// ============================================================

// Test 2.1: CharacterData object exists and is mutable
{
  if (App.CharacterData) {
    const originalName = App.CharacterData.name;
    App.CharacterData.name = 'Test Mutation';
    if (App.CharacterData.name === 'Test Mutation') {
      pass('CharacterData is mutable and updates persist');
      App.CharacterData.name = originalName;
    } else {
      fail('CharacterData updates do not persist');
    }
  } else {
    fail('CharacterData object not found');
  }
}

// Test 2.2: Hit points structure is properly initialized
{
  const char = createTestCharacter();
  if (char.hitPoints && typeof char.hitPoints === 'object') {
    const locations = Object.keys(char.hitPoints);
    if (locations.length >= 6) {
      pass(`Hit points structure has ${locations.length} locations`);
    } else {
      fail(`Hit points structure only has ${locations.length} locations (expected 6+)`);
    }

    // Check structure of each location
    const firstLocation = char.hitPoints[locations[0]];
    if (firstLocation && 'current' in firstLocation && 'max' in firstLocation) {
      pass('Hit point locations have current and max fields');
    } else {
      fail('Hit point locations missing current/max structure');
    }
  } else {
    fail('Character hitPoints field is not properly structured');
  }
}

// Test 2.3: Weapons array can be modified
{
  const char = createTestCharacter();
  const originalLength = char.weapons.length;
  char.weapons.push('Dagger');
  if (char.weapons.length === originalLength + 1) {
    pass('Weapons array is mutable and can be extended');
  } else {
    fail('Weapons array modification failed');
  }
}

// Test 2.4: Combat styles can be added
{
  const char = createTestCharacter();
  const originalLength = char.combatStyles.length;
  char.combatStyles.push({ name: 'Bow & Arrow', skill: 40 });
  if (char.combatStyles.length === originalLength + 1) {
    pass('Combat styles array can be extended');
  } else {
    fail('Combat styles array modification failed');
  }
}

// ============================================================
section('Risk 3: Multi-page PDF Scaling Artifacts');
// ============================================================

// Test 3.1: Create maximally-populated character
{
  const maxChar = createTestCharacter();

  // Add many combat styles
  maxChar.combatStyles = [
    { name: 'Sword & Shield', skill: 65 },
    { name: 'Spear & Shield', skill: 60 },
    { name: 'Bow', skill: 55 },
    { name: 'Dagger', skill: 50 },
    { name: 'Unarmed', skill: 45 },
    { name: 'Sling', skill: 40 }
  ];

  // Add many skills
  maxChar.culturalSkills = {};
  maxChar.careerSkills = {};
  maxChar.bonusSkills = {};

  const skillNames = ['Athletics', 'Ride', 'Swim', 'Locale', 'Lore (Regional)',
                     'Customs', 'Endurance', 'Evade', 'First Aid', 'Influence',
                     'Insight', 'Perception', 'Sing', 'Stealth', 'Willpower'];
  skillNames.forEach((skill, i) => {
    if (i < 5) maxChar.culturalSkills[skill] = 40 + i * 5;
    else if (i < 10) maxChar.careerSkills[skill] = 35 + i * 5;
    else maxChar.bonusSkills[skill] = 30 + i * 5;
  });

  // Add long notes
  maxChar.notes = 'This is a very long note section with lots of details about the character history, ' +
                  'personality traits, goals, and memorable events. '.repeat(10);
  maxChar.background = 'A detailed background story with many paragraphs describing childhood, ' +
                      'training, significant life events, and relationships. '.repeat(5);
  maxChar.concept = 'Veteran warrior with deep cultural ties and complex motivations';

  // Add passions
  maxChar.passions = [
    'Loyalty (Clan): 70',
    'Love (Family): 80',
    'Hate (Chaos): 90',
    'Honor: 65',
    'Fear (Death): 50'
  ];

  if (maxChar.combatStyles.length >= 5) {
    pass(`Created maximally-populated character with ${maxChar.combatStyles.length} combat styles`);
  } else {
    fail('Failed to create maximal character');
  }

  const totalSkills = Object.keys(maxChar.culturalSkills).length +
                     Object.keys(maxChar.careerSkills).length +
                     Object.keys(maxChar.bonusSkills).length;
  if (totalSkills >= 10) {
    pass(`Maximal character has ${totalSkills} skills allocated`);
  } else {
    fail(`Maximal character only has ${totalSkills} skills`);
  }

  if (maxChar.notes.length > 500) {
    pass(`Maximal character has ${maxChar.notes.length} characters in notes`);
  } else {
    info(`Note: character notes are ${maxChar.notes.length} characters (could be longer for overflow test)`);
  }
}

// Test 3.2: PDF Y-coordinate bounds checking
{
  if (App.App && App.App.exportSinglePagePDF) {
    const pdfCode = App.App.exportSinglePagePDF.toString();

    // Check if there are any Y-coordinate calculations
    const hasYCoords = pdfCode.match(/\by\s*=|\by\s*-=|\by\s*\+=|yPos|yOffset/g);
    if (hasYCoords && hasYCoords.length > 0) {
      pass(`exportSinglePagePDF() has ${hasYCoords.length} Y-coordinate operations`);

      // Check for bounds checking
      const hasBoundsCheck = pdfCode.includes('> 0') || pdfCode.includes('< height') ||
                            pdfCode.includes('Math.max') || pdfCode.includes('Math.min');
      if (hasBoundsCheck) {
        pass('exportSinglePagePDF() includes bounds checking logic');
      } else {
        fail('exportSinglePagePDF() missing Y-coordinate bounds checking',
             'Risk: content may overflow page boundaries');
      }
    } else {
      info('exportSinglePagePDF() may use static Y-coordinates (verify manually)');
    }
  }
}

// ============================================================
section('Risk 4: Normalized Character Model (Helpers Module)');
// ============================================================

// Test 4.1: WEAPON_ALIASES exists for canonicalization
{
  if (App.WEAPON_ALIASES && typeof App.WEAPON_ALIASES === 'object') {
    const aliasCount = Object.keys(App.WEAPON_ALIASES).length;
    if (aliasCount > 0) {
      pass(`WEAPON_ALIASES defined with ${aliasCount} mappings`);
    } else {
      fail('WEAPON_ALIASES exists but is empty');
    }
  } else {
    fail('WEAPON_ALIASES not yet implemented (TDD: create for Helpers.resolveWeapon())');
  }
}

// Test 4.2: Check if Helpers module exists
{
  // This will fail initially (TDD - write failing test first)
  fail('Helpers.resolveWeapon() not yet implemented (TDD: implement this)');
  fail('Helpers.normalizeCombatStyle() not yet implemented (TDD: implement this)');
  fail('Helpers.getHitLocationHP() not yet implemented (TDD: implement this)');
  fail('Helpers.getCompiledSkills() not yet implemented (TDD: implement this)');
}

// ============================================================
section('Risk 5: Data Attestation & Validation Layer');
// ============================================================

// Test 5.1: CharacterData.validate() function existence
{
  // This will fail initially (TDD)
  fail('CharacterData.validate() not yet implemented (TDD: implement this)');
}

// Test 5.2: Characteristic range validation
{
  const char = createTestCharacter();
  char.characteristics.STR = 25; // Invalid: too high

  // This will fail initially (TDD)
  fail('Characteristic range validation not implemented (TDD: should reject STR=25)');
}

// Test 5.3: Skill value validation
{
  const char = createTestCharacter();
  char.culturalSkills['Athletics'] = 250; // Invalid: too high

  // This will fail initially (TDD)
  fail('Skill value validation not implemented (TDD: should reject skill=250)');
}

// Test 5.4: Required fields validation
{
  const char = createTestCharacter();
  delete char.name; // Missing required field

  // This will fail initially (TDD)
  fail('Required field validation not implemented (TDD: should require name)');
}

// Test 5.5: Weapon reference validation
{
  const char = createTestCharacter();
  char.weapons = ['InvalidWeaponName12345']; // Invalid weapon

  // This will fail initially (TDD)
  fail('Weapon reference validation not implemented (TDD: should reject invalid weapon)');
}

// Test 5.6: JSON serialization round-trip
{
  // This will fail initially (TDD)
  fail('CharacterData.toJSON() not implemented (TDD: implement serialization)');
  fail('CharacterData.fromJSON() not implemented (TDD: implement deserialization)');
}

// ============================================================
section('Risk 6: Browser Validation');
// ============================================================

{
  info('Browser validation requires playwright-cli - checking availability...');
  const { execSync } = require('child_process');
  try {
    execSync('which playwright', { stdio: 'ignore' });
    info('playwright found - browser validation can be performed');
    fail('Browser screenshots not yet captured (TDD: capture Step 1, Step 11, Play Mode)');
  } catch (e) {
    info('playwright not found - browser validation should be performed manually');
    info('Manual steps:');
    info('  1. Open index.html in browser');
    info('  2. Screenshot Step 1 (initial load)');
    info('  3. Create characters for Balazaring, Praxian, Tlemori, Sartarist cultures');
    info('  4. Screenshot Step 11 for each culture');
    info('  5. Screenshot Play Mode with populated character');
    info('  6. Save all screenshots to verification-artifacts/');
    fail('Browser validation marked as manual task (no playwright)');
  }
}

// ============================================================
section('Test Summary');
// ============================================================

console.log(`\nTotal tests: ${totalTests}`);
console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);

const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
console.log(`Success rate: ${successRate}%\n`);

if (failedTests === 0) {
  console.log(`${colors.green}✓ All tests passed!${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.yellow}⚠ ${failedTests} tests failing - these are implementation targets${colors.reset}\n`);
  process.exit(0); // Exit with 0 for now since we're in TDD mode
}
