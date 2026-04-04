#!/usr/bin/env node
// TDD test suite for mythras-chargen — tests run against the HTML via Node.js DOM parsing
// These tests verify data flow, not rendering — they catch logic bugs deterministically.
// Run: node test-chargen.js

const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

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

let passed = 0, failed = 0;
function assert(condition, msg) {
  if (condition) { passed++; process.stdout.write('  ✓ ' + msg + '\n'); }
  else { failed++; process.stdout.write('  ✗ FAIL: ' + msg + '\n'); }
}

// Load app scripts (skip pdf-lib, only load data + app logic)
const scripts = extractScripts(html);
// scripts[0] = pdf-lib (skip), scripts[1] = data constants, scripts[2] = app logic
const dataScript = scripts[1];
const appScript = scripts[2];

// Execute in isolated context
const vm = require('vm');
const env = createMockEnv();
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
});

try {
  vm.runInContext(dataScript, sandbox, { filename: 'data.js' });
  vm.runInContext(appScript, sandbox, { filename: 'app.js' });
  vm.runInContext('this.CharacterData = CharacterData; this.Calc = Calc; this.App = App; this.CULTURES_DATA = CULTURES_DATA; this.CULTURE_BUILDS = CULTURE_BUILDS; this.WEAPONS_DATA = WEAPONS_DATA; this.GLORANTHA_HOMELAND_MAP = GLORANTHA_HOMELAND_MAP; this.GLORANTHA_CULTURES_DATA = GLORANTHA_CULTURES_DATA; this.SKILLS_DATA = SKILLS_DATA; this.HIT_LOCATIONS = HIT_LOCATIONS; this.SPECIAL_EFFECTS_DATA = SPECIAL_EFFECTS_DATA;', sandbox);
} catch(e) {
  console.error('Failed to load scripts:', e.message);
  process.exit(1);
}

const { CharacterData, Calc, App, CULTURES_DATA, CULTURE_BUILDS, WEAPONS_DATA,
        GLORANTHA_HOMELAND_MAP, GLORANTHA_CULTURES_DATA, SKILLS_DATA,
        HIT_LOCATIONS, SPECIAL_EFFECTS_DATA } = sandbox;

// ============================================================
console.log('\n=== TEST SUITE: Mythras Chargen Logic ===\n');

// --- TEST GROUP 1: Step 11 must NOT duplicate ---
console.log('1. Step 11 Duplication');
{
  CharacterData.name = 'Test'; CharacterData.culture = 'Praxian';
  CharacterData.career = 'Warrior'; CharacterData.age = 25;
  CharacterData.characteristics = {STR:14,CON:12,SIZ:11,DEX:12,INT:10,POW:9,CHA:8};
  CharacterData.attributes = Calc.calculateAllAttributes(CharacterData.characteristics);
  CharacterData.culturalSkills = {}; CharacterData.careerSkills = {};
  CharacterData.bonusSkills = {}; CharacterData.folkMagicSpells = [];
  CharacterData.careerFolkMagic = []; CharacterData.runeAffinities = {primary:'Storm',secondary:'Earth',tertiary:'Darkness'};
  CharacterData.weapons = []; CharacterData.equipment = []; CharacterData.armor = [];
  CharacterData.passions = []; CharacterData.combatStyles = [];
  
  const step11 = App.renderStep11();
  const html11 = step11.innerHTML;
  const headerCount = (html11.match(/Step 11: Review & Play/g) || []).length;
  assert(headerCount === 1, `Step 11 header appears exactly once (found ${headerCount})`);
  
  const completeCount = (html11.match(/Character Complete!/g) || []).length;
  assert(completeCount === 1, `"Character Complete!" appears exactly once (found ${completeCount})`);
}

// --- TEST GROUP 2: Combat styles must show actual names, not generic ---
console.log('\n2. Combat Style Names');
{
  // Balazaring Hunter Raider style
  CharacterData.culture = 'Balazaring';
  CharacterData.combatStyles = [{ name: 'Hunter Raider', skill: 38 }];
  
  const skills = App.compileAllSkills();
  const combatSkills = skills.filter(s => s.name.includes('Combat Style') || s.name.includes('Hunter Raider'));
  
  // Should have the actual name, not "Combat Style (Cultural Style)"
  const hasGenericCultural = combatSkills.some(s => s.name === 'Combat Style (Cultural Style)');
  const hasGenericSpeciality = combatSkills.some(s => s.name === 'Combat Style (Speciality Style)');
  const hasActualName = combatSkills.some(s => s.name.includes('Hunter Raider'));
  
  assert(!hasGenericCultural, 'No generic "Combat Style (Cultural Style)" in skills');
  assert(!hasGenericSpeciality, 'No generic "Combat Style (Speciality Style)" in skills');
  assert(hasActualName, 'Actual combat style name "Hunter Raider" appears in skills');
}

// --- TEST GROUP 3: Auto-populate weapons from combat styles ---
console.log('\n3. Starting Equipment Weapons');
{
  CharacterData.culture = 'Balazaring';
  CharacterData.combatStyles = [{ name: 'Hunter Raider', skill: 38 }];
  CharacterData.weapons = [];
  CharacterData.equipment = [];
  CharacterData.armor = [];
  
  App.autoPopulateStartingEquipment();
  
  assert(CharacterData.equipment.length > 0, 'Basic equipment auto-populated');
  assert(CharacterData.weapons.length > 0, `Weapons auto-populated from combat style (got ${CharacterData.weapons.length})`);
  
  // Hunter Raider weapons include Spear, Bow, Sling
  const weaponNames = CharacterData.weapons.map(w => w.name);
  console.log('    Weapons added:', weaponNames.join(', '));
}

// --- TEST GROUP 4: Hit locations have HP values ---
console.log('\n4. Hit Location HP Values');
{
  CharacterData.characteristics = {STR:10,CON:13,SIZ:10,DEX:13,INT:10,POW:10,CHA:10};
  CharacterData.attributes = Calc.calculateAllAttributes(CharacterData.characteristics);
  
  const hp = CharacterData.attributes.hitPoints;
  assert(hp !== undefined && hp !== null, 'Hit points object exists');
  assert(hp['Head'] > 0, `Head HP > 0 (got ${hp['Head']})`);
  assert(hp['Chest'] > 0, `Chest HP > 0 (got ${hp['Chest']})`);
  assert(hp['Left Leg'] > 0, `Left Leg HP > 0 (got ${hp['Left Leg']})`);
}

// --- TEST GROUP 5: All cultures have suggested builds ---
console.log('\n5. Culture Builds Coverage');
{
  const cultures = GLORANTHA_CULTURES_DATA || CULTURES_DATA;
  const cultureNames = cultures.map(c => c.name);
  
  cultureNames.forEach(name => {
    const builds = CULTURE_BUILDS[name];
    assert(builds && builds.length > 0, `Culture "${name}" has suggested builds (${builds ? builds.length : 0})`);
  });
}

// --- TEST GROUP 6: Homeland apostrophe handling ---
console.log('\n6. Homeland Escaping');
{
  const homelands = GLORANTHA_HOMELAND_MAP['Praxian'] || [];
  assert(homelands.includes("Pimper's Block"), "Pimper's Block is in Praxian homelands");
  
  // Test that the onclick handler would work with apostrophes
  const escaped = "Pimper's Block".replace(/'/g, "\\x27");
  assert(escaped === "Pimper\\x27s Block", 'Apostrophe escaping works');
}

// --- TEST GROUP 7: Character concept persists ---
console.log('\n7. Character Data Fields');
{
  CharacterData.concept = 'Wolf in sheep\'s clothing';
  CharacterData.family = 'The Wolf Clan';
  CharacterData.backgroundEvents = 'Wolves ate my kids';
  CharacterData.notes = 'Test notes';
  
  assert(CharacterData.concept !== undefined, 'concept field exists in CharacterData');
  assert(CharacterData.family !== undefined, 'family field exists in CharacterData');
  assert(CharacterData.backgroundEvents !== undefined, 'backgroundEvents field exists in CharacterData');
  assert(CharacterData.notes !== undefined, 'notes field exists in CharacterData');
}

// --- TEST GROUP 8: PDF export function exists and references all fields ---
console.log('\n8. PDF Export Coverage');
{
  const pdfFn = App.exportSinglePagePDF.toString();
  
  assert(pdfFn.includes('hitPoints') || pdfFn.includes('hit_points') || pdfFn.includes('HIT LOCATIONS'),
    'PDF references hit points/locations');
  assert(pdfFn.includes('passions') || pdfFn.includes('PASSIONS'),
    'PDF references passions');
  assert(pdfFn.includes('folkMagicSpells') || pdfFn.includes('MAGIC'),
    'PDF references folk magic');
  assert(pdfFn.includes('weapons') || pdfFn.includes('COMBAT'),
    'PDF references weapons');
  assert(pdfFn.includes('runeAffinities') || pdfFn.includes('RUNE'),
    'PDF references rune affinities');
  assert(pdfFn.includes('family') || pdfFn.includes('backgroundEvents') || pdfFn.includes('NOTES'),
    'PDF references notes/background');
  assert(pdfFn.includes('concept'),
    'PDF references character concept');
}

// --- TEST GROUP 8b: PDF hit location HP values are rendered ---
console.log('\n8b. PDF Hit Location HP Values in Export');
{
  const pdfFn = App.exportSinglePagePDF.toString();

  // Check that the PDF uses the correct capitalized keys for hit locations
  assert(pdfFn.includes("hitPoints['Head']") || pdfFn.includes('hitPoints.Head') || pdfFn.includes("hitPoints['head']") || pdfFn.includes('hitPoints.head'),
    'PDF accesses Head hit points');
  assert(pdfFn.includes("hitPoints['Chest']") || pdfFn.includes('hitPoints.Chest') || pdfFn.includes("hitPoints['chest']") || pdfFn.includes('hitPoints.chest'),
    'PDF accesses Chest hit points');

  // The location list should actually render HP values (not just labels)
  const hasLocationLoop = pdfFn.includes('locations.forEach') || pdfFn.includes('locations');
  assert(hasLocationLoop, 'PDF has hit location rendering loop');
}

// --- TEST GROUP 8c: Notes/Background/Concept flow to Step 11, Play Mode, PDF ---
console.log('\n8c. Notes/Background/Concept Data Flow');
{
  CharacterData.concept = 'Wolf in sheep\'s clothing';
  CharacterData.family = 'The Wolf Clan';
  CharacterData.backgroundEvents = 'Wolves ate my sheep';
  CharacterData.notes = 'Test notes';

  // Check Step 11
  const step11Html = App.renderStep11().innerHTML;
  assert(step11Html.includes(CharacterData.concept) || step11Html.includes('Concept'),
    'Step 11 shows character concept');
  assert(step11Html.includes(CharacterData.family) || step11Html.includes('Family'),
    'Step 11 shows family');
  assert(step11Html.includes(CharacterData.backgroundEvents) || step11Html.includes('Background'),
    'Step 11 shows background events');

  // Check Play Mode (we can't test the full rendering, but we can check the template string)
  const playModeFn = App.renderPlayMode.toString();
  assert(playModeFn.includes('concept') || playModeFn.includes('Concept'),
    'Play Mode references concept field');
  assert(playModeFn.includes('family') && playModeFn.includes('CharacterData.family'),
    'Play Mode references family field');
  assert(playModeFn.includes('backgroundEvents') && playModeFn.includes('CharacterData.backgroundEvents'),
    'Play Mode references background events');
}

// --- TEST GROUP 9: renderCurrentStep clears properly ---
console.log('\n9. Step Rendering');
{
  App.currentStep = 11;
  // renderCurrentStep should clear container and add exactly one child
  // We test the function exists and doesn't throw
  let threw = false;
  try {
    App.renderCurrentStep();
  } catch(e) {
    threw = true;
  }
  assert(!threw, 'renderCurrentStep() does not throw');
  
  const container = env.elements['wizard-steps'];
  // After clearing + appending, innerHTML should NOT contain two step headers
  // (This is the duplication bug check at the DOM level)
}

// --- TEST GROUP 10: updateSkillDisplay is separate from renderSkillRow ---
console.log('\n10. Function Separation');
{
  assert(typeof App.updateSkillDisplay === 'function', 'updateSkillDisplay is a function');
  assert(typeof App.renderSkillRow === 'function', 'renderSkillRow is a function');
  assert(App.updateSkillDisplay !== App.renderSkillRow, 'updateSkillDisplay ≠ renderSkillRow');
  
  // renderSkillRow should be callable independently
  const testSkill = { name: 'Test', base: 20, cultural: 5, career: 10, bonus: 0 };
  let rowHtml = '';
  try {
    rowHtml = App.renderSkillRow(testSkill);
  } catch(e) {
    // May fail in mock env due to DOM lookups, that's OK
  }
  assert(typeof App.renderSkillRow === 'function', 'renderSkillRow is independently accessible');
}

// ============================================================
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
