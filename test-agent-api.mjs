#!/usr/bin/env node
/**
 * E2E Test: Agent API via Playwright
 * Builds 3 characters using only App.agent.* calls, verifies Play Mode state.
 *
 * Prerequisites:
 *   python3 -m http.server 8765 --directory . &
 *   npx playwright-cli open http://localhost:8765/index.html
 *
 * Run:
 *   node test-agent-api.mjs
 */

import { execSync } from 'child_process';

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
let passed = 0;
let failed = 0;

function evalPage(expr) {
  const result = execSync(`npx playwright-cli eval "${expr.replace(/"/g, '\\"')}" --raw`, {
    encoding: 'utf8',
    timeout: 15000
  }).trim();
  // Strip surrounding quotes if present
  if (result.startsWith('"') && result.endsWith('"')) {
    return JSON.parse(result);
  }
  return result;
}

function assert(condition, msg) {
  if (condition) {
    console.log(`${PASS} ${msg}`);
    passed++;
  } else {
    console.log(`${FAIL} ${msg}`);
    failed++;
  }
}

function reload() {
  execSync('npx playwright-cli goto http://127.0.0.1:8765/index.html', {
    encoding: 'utf8',
    timeout: 15000
  });
}

// ═══════════════════════════════════════════════════════════════
console.log('\n\x1b[36m═══ Test 1: Sartarite Warrior (Orlanth) ═══\x1b[0m\n');
// ═══════════════════════════════════════════════════════════════

reload();

const sartariteSpec = `(() => {
  var spec = {
    step1: {name: 'Korlmar Blackspear', concept: 'Vengeful warrior'},
    step2: {characteristics: {STR:15, CON:13, SIZ:12, DEX:11, INT:9, POW:8, CHA:7}},
    step4: {culture: 'Sartarite (Heortling)', homeland: 'Boldhome'},
    step5: {culturalSkills: {Athletics:15, Brawn:15, Endurance:15, Evade:10, Locale:10, Perception:10, Willpower:15, Ride:10}, runeAffinities: {primary:'Air', secondary:'Movement', tertiary:'Death'}, folkMagicSpells: ['Bladesharp','Fanaticism','Protection']},
    step6: {passions: [{type:'Loyalty', subject:'Colymar Tribe', value:47}, {type:'Hate', subject:'Lunars', value:47}]},
    step7: {age: 21, gender: 'Male', family: 'Blackspear clan'},
    step8: {career: 'Warrior', professionalSkills: [{name:'Lore (any)', specialization:'Strategy and Tactics'}, {name:'Craft (any)', specialization:'Weaponsmithing'}, {name:'Survival'}]},
    step9: {cult: 'Orlanth', miracles: ['Shield','Lightning','Wind Words','Leap']},
    step10: {careerSkills: {Athletics:15, Brawn:15, Endurance:15, Evade:10, Unarmed:10, 'Combat Style (Hill Clan Levy)':15, 'Lore (Strategy and Tactics)':10, Survival:10}, careerFolkMagic: ['Disruption','Vigour']},
    step11: {bonusSkills: {Athletics:15, Brawn:15, Endurance:15, Evade:15, Willpower:15, Unarmed:15, 'Combat Style (Hill Clan Levy)':15, 'Lore (Strategy and Tactics)':15, Survival:15, Perception:15}},
    step12: {socialClass: 'Freeman'}
  };
  return JSON.stringify(App.agent.buildCharacter(spec));
})()`;

const r1 = JSON.parse(evalPage(sartariteSpec));
assert(r1.success === true, 'Sartarite Warrior: buildCharacter succeeds');
assert(r1.character.name === 'Korlmar Blackspear', 'Sartarite Warrior: name correct');
assert(r1.character.culture === 'Sartarite (Heortling)', 'Sartarite Warrior: culture correct');
assert(r1.character.cult === 'Orlanth', 'Sartarite Warrior: cult is Orlanth');
assert(r1.character.miracles.length === 4, 'Sartarite Warrior: 4 miracles selected');
assert(r1.character.selectedProfessionalSkills.includes('Lore (Strategy and Tactics)'), 'Sartarite Warrior: Lore disambiguated');
assert(r1.character.selectedProfessionalSkills.includes('Craft (Weaponsmithing)'), 'Sartarite Warrior: Craft disambiguated');
assert(!r1.character.selectedProfessionalSkills.some(s => s.includes('(any)')), 'Sartarite Warrior: no placeholders remain');

// Check Play Mode
const playName = evalPage("document.getElementById('play-name')?.value || document.getElementById('play-name')?.textContent || ''");
assert(playName === 'Korlmar Blackspear', 'Sartarite Warrior: Play Mode shows name');

// ═══════════════════════════════════════════════════════════════
console.log('\n\x1b[36m═══ Test 2: Praxian Shaman (Daka Fal) ═══\x1b[0m\n');
// ═══════════════════════════════════════════════════════════════

reload();

const praxianSpec = `(() => {
  var spec = {
    step1: {name: 'Wahagrim Spirit-Caller', concept: 'Ancestor shaman'},
    step2: {characteristics: {STR:10, CON:12, SIZ:9, DEX:11, INT:13, POW:14, CHA:6}},
    step4: {culture: 'Praxian', homeland: 'Prax'},
    step5: {culturalSkills: {Athletics:10, Endurance:15, 'First Aid':10, Locale:10, Perception:15, Ride:15, Stealth:10, Navigate:15}, runeAffinities: {primary:'Spirit', secondary:'Man', tertiary:'Death'}, folkMagicSpells: ['Heal','Spiritshield','Second Sight']},
    step6: {passions: [{type:'Devotion', subject:'Daka Fal', value:47}, {type:'Loyalty', subject:'Bison Tribe', value:47}]},
    step7: {age: 28, gender: 'Male', family: 'Bison Tribe'},
    step8: {career: 'Shaman', professionalSkills: [{name:'Binding (Cult, Totem or Tradition)', specialization:'Daka Fal'}, {name:'Lore (any)', specialization:'Spirit World'}, {name:'Trance'}]},
    step9: {cult: 'Daka Fal', miracles: ['Summon Ancestor','Spirit Sight','Speak with Dead','Command Ghost','Soul Sight','Dismiss Spirit','Find Ancestor']},
    step10: {careerSkills: {Customs:10, Dance:15, Deceit:5, Influence:10, Insight:15, Locale:10, Willpower:15, 'Binding (Daka Fal)':10, 'Lore (Spirit World)':10}, careerFolkMagic: ['Befuddle','Detect Magic']},
    step11: {bonusSkills: {Willpower:20, Insight:20, Perception:20, Dance:15, Influence:15, Locale:15, 'Binding (Daka Fal)':15, 'Lore (Spirit World)':15, Trance:15, Endurance:15, Navigate:10, Ride:10, Stealth:5, 'First Aid':5, Athletics:5}},
    step12: {socialClass: 'Freeman'}
  };
  return JSON.stringify(App.agent.buildCharacter(spec));
})()`;

const r2 = JSON.parse(evalPage(praxianSpec));
assert(r2.success === true, 'Praxian Shaman: buildCharacter succeeds');
assert(r2.character.cult === 'Daka Fal', 'Praxian Shaman: cult is Daka Fal');
assert(r2.character.devotionalPool === 7, 'Praxian Shaman: devotional pool = POW/2 = 7');
assert(r2.character.selectedProfessionalSkills.includes('Binding (Daka Fal)'), 'Praxian Shaman: Binding disambiguated to cult');

// ═══════════════════════════════════════════════════════════════
console.log('\n\x1b[36m═══ Test 3: God Forgot Merchant (No Cult) ═══\x1b[0m\n');
// ═══════════════════════════════════════════════════════════════

reload();

const godForgotSpec = `(() => {
  var spec = {
    step1: {name: 'Ionara of Casino Town', concept: 'Pragmatic trader'},
    step2: {characteristics: {STR:8, CON:9, SIZ:10, DEX:12, INT:14, POW:10, CHA:12}},
    step4: {culture: 'God Forgot', homeland: 'Casino Town'},
    step5: {culturalSkills: {Conceal:10, Deceit:15, Drive:10, Influence:15, Insight:15, Locale:10, Perception:15, Commerce:10}, runeAffinities: {primary:'Truth', secondary:'Law', tertiary:'Man'}, folkMagicSpells: ['Appraise','Calculate','Glamour']},
    step6: {passions: [{type:'Desire', subject:'Wealth', value:47}]},
    step7: {age: 25, gender: 'Female', family: 'Merchant guild'},
    step8: {career: 'Merchant', professionalSkills: [{name:'Culture (any)', specialization:'Esrolian'}, {name:'Language (any)', specialization:'Esrolian'}, {name:'Streetwise'}]},
    step9: {cult: null},
    step10: {careerSkills: {Boating:10, Drive:10, Deceit:15, Insight:15, Influence:15, Locale:10, Ride:10, Commerce:15}, careerFolkMagic: ['Calm','Lock']},
    step11: {bonusSkills: {Deceit:15, Influence:15, Insight:15, Perception:15, Commerce:15, 'Culture (Esrolian)':15, 'Language (Esrolian)':15, Streetwise:15, Locale:15, Conceal:15}},
    step12: {socialClass: 'Gentry'}
  };
  return JSON.stringify(App.agent.buildCharacter(spec));
})()`;

const r3 = JSON.parse(evalPage(godForgotSpec));
assert(r3.success === true, 'God Forgot Merchant: buildCharacter succeeds');
assert(r3.character.cult === null, 'God Forgot Merchant: no cult (atheistic)');
assert(r3.character.miracles.length === 0, 'God Forgot Merchant: no miracles');
assert(r3.character.devotionalPool === 0, 'God Forgot Merchant: no devotional pool');
assert(r3.character.selectedProfessionalSkills.includes('Culture (Esrolian)'), 'God Forgot Merchant: Culture disambiguated');
assert(r3.character.selectedProfessionalSkills.includes('Language (Esrolian)'), 'God Forgot Merchant: Language disambiguated');

// ═══════════════════════════════════════════════════════════════
console.log('\n\x1b[36m═══ Test 4: Validation Errors ═══\x1b[0m\n');
// ═══════════════════════════════════════════════════════════════

reload();

// Get current state before invalid call
const stateBefore = JSON.parse(evalPage("JSON.stringify(App.agent.getState().characteristics)"));

// Test: invalid characteristics total
const badChars = evalPage("JSON.stringify(App.agent.setStep(2, {characteristics: {STR:18,CON:18,SIZ:18,DEX:18,INT:18,POW:18,CHA:18}}).success)");
assert(badChars === 'false', 'Validation: rejects characteristics total > 75');

// Test: invalid culture
const badCulture = evalPage("JSON.stringify(App.agent.setStep(4, {culture: 'INVALID'}).success)");
assert(badCulture === 'false', 'Validation: rejects unknown culture');

// Test: state unchanged after failed setStep (STR should still be what it was before)
const stateAfterFail = JSON.parse(evalPage("JSON.stringify(App.agent.getState().characteristics)"));
assert(stateAfterFail.STR === stateBefore.STR, 'Validation: state unchanged after failed setStep');

// ═══════════════════════════════════════════════════════════════
console.log('\n\x1b[36m═══ Summary ═══\x1b[0m\n');
// ═══════════════════════════════════════════════════════════════

console.log(`Total: ${passed + failed}`);
console.log(`\x1b[32mPassed: ${passed}\x1b[0m`);
if (failed > 0) console.log(`\x1b[31mFailed: ${failed}\x1b[0m`);
else console.log('\x1b[32m✓ All tests passed!\x1b[0m');
process.exit(failed > 0 ? 1 : 0);
