#!/usr/bin/env node
/**
 * E2E Test: Agent API via agent-browser
 * Builds 4 characters (AE1-AE4) using App.agent.buildCharacter(), verifies magic system mechanics.
 *
 * Prerequisites:
 *   python3 -m http.server 8765 --directory . &
 *   agent-browser (installed globally via: npm i -g agent-browser && agent-browser install)
 *
 * Run:
 *   node test-agent-api.mjs
 *
 * The script opens/closes its own browser session via agent-browser.
 */

import { execSync } from 'child_process';

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
let passed = 0;
let failed = 0;

function openBrowser() {
  execSync('agent-browser open http://127.0.0.1:8765/index.html', {
    encoding: 'utf8',
    timeout: 30000
  });
}

function closeBrowser() {
  try {
    execSync('agent-browser close', { encoding: 'utf8', timeout: 10000 });
  } catch (e) { /* ignore */ }
}

function evalPage(expr) {
  const result = execSync(`agent-browser eval "${expr.replace(/"/g, '\\"')}"`, {
    encoding: 'utf8',
    timeout: 15000
  }).trim();
  // Strip surrounding quotes if present
  if (result.startsWith('"') && result.endsWith('"')) {
    return JSON.parse(result);
  }
  return result;
}

function evalPageJSON(expr) {
  const raw = evalPage(expr);
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`JSON parse failed. Raw output: ${raw.slice(0, 200)}\nParse error: ${e.message}`);
  }
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
  execSync('agent-browser open http://127.0.0.1:8765/index.html', {
    encoding: 'utf8',
    timeout: 15000
  });
}

// ═══════════════════════════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════════════════════════

console.log('\n\x1b[36m═══ E2E Acceptance Tests (AE1-AE4) ═══\x1b[0m\n');
console.log('Opening browser...');
openBrowser();
try {

// ═══════════════════════════════════════════════════════════════
console.log('\n\x1b[36m═══ AE1: Orlanth (Theist) ═══\x1b[0m\n');
// ═══════════════════════════════════════════════════════════════

reload();

const ae1 = evalPageJSON(`(() => {
  const r = App.agent.buildCharacter({
    step1:{name:'Korlmar Blackspear',concept:'Vengeful warrior'},
    step2:{characteristics:{STR:14,CON:12,SIZ:11,DEX:10,INT:9,POW:12,CHA:7}},
    step4:{culture:'Sartarite (Heortling)',homeland:'Boldhome'},
    step5:{culturalSkills:{Athletics:15,Brawn:15,Endurance:15,Evade:10,Locale:10,Perception:10,Willpower:15,Ride:10},runeAffinities:{primary:'Air',secondary:'Movement',tertiary:'Death'},folkMagicSpells:['Bladesharp','Fanaticism','Protection']},
    step6:{passions:[{type:'Loyalty',subject:'Colymar Tribe',value:47},{type:'Hate',subject:'Lunars',value:47}]},
    step7:{age:21,gender:'Male',family:'Blackspear clan'},
    step8:{career:'Warrior',professionalSkills:[{name:'Lore (any)',specialization:'Tactics'},{name:'Craft (any)',specialization:'Weaponsmithing'},{name:'Survival'}]},
    step9:{cult:'Orlanth',miracles:['Shield','Lightning','Wind Words','Leap','Extension','Summon Sylph']},
    step10:{careerSkills:{Athletics:15,Brawn:15,Endurance:15,Evade:10,Unarmed:10,'Combat Style (Hill Clan Levy)':15,'Lore (Tactics)':10,Survival:10},careerFolkMagic:['Disruption','Vigour']},
    step11:{bonusSkills:{Athletics:15,Brawn:15,Endurance:15,Evade:15,Willpower:15,Unarmed:15,'Combat Style (Hill Clan Levy)':15,'Lore (Tactics)':15,Survival:15,Perception:15}},
    step12:{socialClass:'Freeman'}
  });
  const ct = detectCultType(CULTS_DATA.find(c => c.name === 'Orlanth'));
  return JSON.stringify({success:r.success, errors:r.errors, cultType:ct, devotionalPool:CharacterData.devotionalPool, boundSpiritSlots:CharacterData.boundSpiritSlots, sorceryResource:CharacterData.sorceryResource, miracles:CharacterData.miracles.length});
})()`);

assert(ae1.success === true, 'AE1: buildCharacter succeeds');
assert(ae1.cultType.primary === 'theist', 'AE1: Orlanth detected as theist');
assert(ae1.cultType.isHybrid === false, 'AE1: Orlanth is not hybrid');
assert(ae1.devotionalPool === 6, 'AE1: Devotional Pool = POW/2 = 6');
assert(ae1.boundSpiritSlots === 0, 'AE1: No bound spirit slots');
assert(ae1.sorceryResource === 0, 'AE1: No sorcery resource');
assert(ae1.miracles === 6, 'AE1: 6 miracles selected');

// ═══════════════════════════════════════════════════════════════
console.log('\n\x1b[36m═══ AE2: Daka Fal (Animist) ═══\x1b[0m\n');
// ═══════════════════════════════════════════════════════════════

reload();

const ae2 = evalPageJSON(`(() => {
  const r = App.agent.buildCharacter({
    step1:{name:'Wahagrim Spirit-Caller',concept:'Ancestor shaman'},
    step2:{characteristics:{STR:10,CON:11,SIZ:9,DEX:10,INT:13,POW:14,CHA:8}},
    step4:{culture:'Praxian',homeland:'Prax'},
    step5:{culturalSkills:{Athletics:10,Endurance:15,'First Aid':10,Locale:10,Perception:15,Ride:15,Stealth:10,Navigate:15},runeAffinities:{primary:'Spirit',secondary:'Man',tertiary:'Death'},folkMagicSpells:['Heal','Spiritshield','Second Sight']},
    step6:{passions:[{type:'Devotion',subject:'Daka Fal',value:47},{type:'Loyalty',subject:'Bison Tribe',value:47}]},
    step7:{age:28,gender:'Male',family:'Bison Tribe'},
    step8:{career:'Shaman',professionalSkills:[{name:'Lore (any)',specialization:'Spirit World'},{name:'Survival'},{name:'Healing'}]},
    step9:{cult:'Daka Fal'},
    step10:{careerSkills:{Athletics:10,Endurance:15,Perception:15,Ride:10,Stealth:15,'First Aid':15,Navigate:10,Survival:10},careerFolkMagic:['Detect','Calm']},
    step11:{bonusSkills:{Athletics:20,Endurance:20,Perception:20,Ride:20,Stealth:20,'First Aid':20,Navigate:20,Survival:20,'Lore (Spirit World)':20,Willpower:20}},
    step12:{socialClass:'Freeman'}
  });
  const ct = detectCultType(CULTS_DATA.find(c => c.name === 'Daka Fal'));
  return JSON.stringify({success:r.success, errors:r.errors, cultType:ct, devotionalPool:CharacterData.devotionalPool, boundSpiritSlots:CharacterData.boundSpiritSlots, sorceryResource:CharacterData.sorceryResource, miracles:CharacterData.miracles.length});
})()`);

assert(ae2.success === true, 'AE2: buildCharacter succeeds');
assert(ae2.cultType.primary === 'animist', 'AE2: Daka Fal detected as animist');
assert(ae2.cultType.isHybrid === false, 'AE2: Daka Fal is not hybrid');
assert(ae2.devotionalPool === 0, 'AE2: No Devotional Pool (no Devotion skill)');
assert(ae2.boundSpiritSlots === 4, 'AE2: Bound Spirit Slots = CHA/2 = 4');
assert(ae2.sorceryResource === 0, 'AE2: No sorcery resource');
assert(ae2.miracles === 0, 'AE2: No miracles (animist cult)');

// ═══════════════════════════════════════════════════════════════
console.log('\n\x1b[36m═══ AE3: Arkat (Sorcery) ═══\x1b[0m\n');
// ═══════════════════════════════════════════════════════════════

reload();

const ae3 = evalPageJSON(`(() => {
  const r = App.agent.buildCharacter({
    step1:{name:'Malkion the Grey',concept:'Sorcerer philosopher'},
    step2:{characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:13,CHA:10}},
    step4:{culture:'God Forgot',homeland:'God Forgot'},
    step5:{culturalSkills:{Athletics:10,Endurance:10,'First Aid':15,Locale:15,Perception:15,Willpower:15,Influence:10,Insight:10},runeAffinities:{primary:'Law',secondary:'Truth',tertiary:'Stasis'},folkMagicSpells:['Avert','Calm','Calculate']},
    step6:{passions:[{type:'Loyalty',subject:'Brithini Order',value:47},{type:'Love',subject:'Knowledge',value:47}]},
    step7:{age:21,gender:'Male',family:'House Malkion'},
    step8:{career:'Scholar',professionalSkills:[{name:'Lore (any)',specialization:'Sorcery'},{name:'Lore (any)',specialization:'Philosophy'},{name:'Language (any)',specialization:'Old Brithini'}]},
    step9:{cult:'Arkat'},
    step10:{careerSkills:{Willpower:15,Perception:15,Locale:15,Influence:15,Insight:15,'First Aid':10,Endurance:10,Athletics:5},careerFolkMagic:['Appraise','Befuddle']},
    step11:{bonusSkills:{Willpower:15,Perception:15,Locale:15,Influence:15,Insight:15,'First Aid':15,Endurance:15,Athletics:15,'Lore (Sorcery)':15,'Lore (Philosophy)':15}},
    step12:{socialClass:'Freeman'}
  });
  const ct = detectCultType(CULTS_DATA.find(c => c.name === 'Arkat'));
  return JSON.stringify({success:r.success, errors:r.errors, cultType:ct, devotionalPool:CharacterData.devotionalPool, boundSpiritSlots:CharacterData.boundSpiritSlots, sorceryResource:CharacterData.sorceryResource, miracles:CharacterData.miracles.length});
})()`);

assert(ae3.success === true, 'AE3: buildCharacter succeeds');
assert(ae3.cultType.primary === 'sorcery', 'AE3: Arkat detected as sorcery');
assert(ae3.cultType.isHybrid === false, 'AE3: Arkat is not hybrid');
assert(ae3.devotionalPool === 0, 'AE3: No Devotional Pool');
assert(ae3.boundSpiritSlots === 0, 'AE3: No bound spirit slots');
assert(ae3.sorceryResource === 13, 'AE3: Sorcery Resource = POW = 13');
assert(ae3.miracles === 0, 'AE3: No miracles (sorcery cult)');

// ═══════════════════════════════════════════════════════════════
console.log('\n\x1b[36m═══ AE4: Waha (Hybrid Theist+Animist) ═══\x1b[0m\n');
// ═══════════════════════════════════════════════════════════════

reload();

const ae4 = evalPageJSON(`(() => {
  const r = App.agent.buildCharacter({
    step1:{name:'Biturian Varosh',concept:'Beast rider khan'},
    step2:{characteristics:{STR:13,CON:12,SIZ:10,DEX:10,INT:9,POW:12,CHA:9}},
    step4:{culture:'Praxian',homeland:'Prax'},
    step5:{culturalSkills:{Athletics:15,Endurance:15,'First Aid':10,Locale:10,Perception:15,Ride:15,Stealth:10,Navigate:10},runeAffinities:{primary:'Beast',secondary:'Man',tertiary:'Spirit'},folkMagicSpells:['Bladesharp','Heal','Fanaticism']},
    step6:{passions:[{type:'Devotion',subject:'Waha',value:47},{type:'Loyalty',subject:'Bison Tribe',value:47}]},
    step7:{age:21,gender:'Male',family:'Bison Riders'},
    step8:{career:'Warrior',professionalSkills:[{name:'Lore (any)',specialization:'Tactics'},{name:'Survival'},{name:'Track'}]},
    step9:{cult:'Waha',miracles:['Extension','Find (Specific Thing)','Divination','Chastise','Summon Gnome','Command Herd Beast']},
    step10:{careerSkills:{Athletics:15,Endurance:15,Perception:10,Ride:15,'First Aid':10,Stealth:10,Survival:15,Navigate:10},careerFolkMagic:['Vigour','Calm']},
    step11:{bonusSkills:{Athletics:15,Endurance:15,Perception:15,Ride:15,Stealth:15,Survival:15,Navigate:15,'Lore (Tactics)':15,Willpower:15,Track:15}},
    step12:{socialClass:'Freeman'}
  });
  const ct = detectCultType(CULTS_DATA.find(c => c.name === 'Waha'));
  return JSON.stringify({success:r.success, errors:r.errors, cultType:ct, devotionalPool:CharacterData.devotionalPool, boundSpiritSlots:CharacterData.boundSpiritSlots, sorceryResource:CharacterData.sorceryResource, miracles:CharacterData.miracles.length});
})()`);

assert(ae4.success === true, 'AE4: buildCharacter succeeds');
assert(ae4.cultType.primary === 'theist', 'AE4: Waha primary type is theist');
assert(ae4.cultType.isHybrid === true, 'AE4: Waha is hybrid');
assert(ae4.cultType.types.includes('theist'), 'AE4: Waha has theist type');
assert(ae4.cultType.types.includes('animist'), 'AE4: Waha has animist type');
assert(ae4.devotionalPool === 6, 'AE4: Devotional Pool = POW/2 = 6');
assert(ae4.boundSpiritSlots === 4, 'AE4: Bound Spirit Slots = CHA/2 = 4');
assert(ae4.sorceryResource === 0, 'AE4: No sorcery resource');
assert(ae4.miracles === 6, 'AE4: 6 miracles selected (theist path)');

// ═══════════════════════════════════════════════════════════════
// Teardown
// ═══════════════════════════════════════════════════════════════

} finally {
  closeBrowser();
}

console.log(`\n\x1b[36m═══ Test Summary ═══\x1b[0m\n`);
console.log(`Total tests: ${passed + failed}`);
console.log(`\x1b[32mPassed: ${passed}\x1b[0m`);
if (failed > 0) console.log(`\x1b[31mFailed: ${failed}\x1b[0m`);
console.log(`Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed > 0) {
  console.log('\n\x1b[31m✗ Some tests failed!\x1b[0m');
  process.exit(1);
} else {
  console.log('\n\x1b[32m✓ All acceptance tests passed!\x1b[0m');
}
