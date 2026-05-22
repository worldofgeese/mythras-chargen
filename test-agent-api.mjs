#!/usr/bin/env node
/**
 * E2E Test: Agent API via agent-browser
 * Builds 5 characters (AE1-AE4 plus AE3b) using App.agent.buildCharacter(), verifies magic system mechanics.
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

function captureStep9(actionSource) {
  return evalPageJSON(`JSON.stringify((() => {
    const before = App.agent.getMagicState();
    const result = ${actionSource};
    const after = App.agent.getMagicState();
    return {before, result, after};
  })())`);
}

function captureStep9Set(payloadSource) {
  return captureStep9(`App.agent.setStep(9, ${payloadSource})`);
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
  try {
    execSync('agent-browser eval "localStorage.clear(); sessionStorage.clear();"', {
      encoding: 'utf8',
      timeout: 5000
    });
  } catch (e) { /* page may not be open yet */ }
  execSync(`agent-browser open http://127.0.0.1:8765/index.html?t=${Date.now()}`, {
    encoding: 'utf8',
    timeout: 15000
  });
}

// ═══════════════════════════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════════════════════════

console.log('\n\x1b[36m═══ E2E Acceptance Tests (AE1-AE4 plus AE3b) ═══\x1b[0m\n');
console.log('Opening browser...');
openBrowser();
try {

// ═══════════════════════════════════════════════════════════════
console.log('\n\x1b[36m═══ AE1: Orlanth (Theist) ═══\x1b[0m\n');
// ═══════════════════════════════════════════════════════════════

reload();

// Build character via agent API
evalPageJSON(`JSON.stringify(App.agent.buildCharacter({step1:{name:'Korlmar Blackspear',concept:'Vengeful warrior'},step2:{characteristics:{STR:14,CON:12,SIZ:11,DEX:10,INT:9,POW:12,CHA:7}},step4:{culture:'Sartarite (Heortling)',homeland:'Boldhome'},step5:{culturalSkills:{Athletics:15,Brawn:15,Endurance:15,Evade:10,Locale:10,Perception:10,Willpower:15,Ride:10},runeAffinities:{primary:'Air',secondary:'Movement',tertiary:'Death'},folkMagicSpells:['Bladesharp','Fanaticism','Protection']},step6:{passions:[{type:'Loyalty',subject:'Colymar Tribe',value:47},{type:'Hate',subject:'Lunars',value:47}]},step7:{age:21,gender:'Male',family:'Blackspear clan'},step8:{career:'Warrior',professionalSkills:[{name:'Lore (any)',specialization:'Tactics'},{name:'Craft (any)',specialization:'Weaponsmithing'},{name:'Survival'}]},step9:{cult:'Orlanth',miracles:['Shield','Lightning','Wind Words','Flight','Extension','Summon Sylph']},step10:{careerSkills:{Athletics:15,Perception:10,Endurance:15,Evade:10,Unarmed:10,'Combat Style (Hill Clan Levy)':15,'Lore (Tactics)':10,Ride:15},careerFolkMagic:['Disruption','Vigour']},step11:{bonusSkills:{Athletics:15,Ride:15,Endurance:15,Evade:15,Willpower:15,Unarmed:15,'Combat Style (Hill Clan Levy)':15,'Lore (Tactics)':15,Survival:15,Perception:15}},step12:{socialClass:'Freeman'}}))`);
// Query magic state via new API (no IIFE needed)
const ae1 = evalPageJSON(`JSON.stringify(App.agent.getMagicState())`);

assert(ae1.cultType.primary === 'theist', 'AE1: Orlanth detected as theist');
assert(ae1.cultType.isHybrid === false, 'AE1: Orlanth is not hybrid');
assert(ae1.devotionalPool === 6, 'AE1: Devotional Pool = POW/2 = 6');
assert(ae1.boundSpiritSlots === 0, 'AE1: No bound spirit slots');
assert(ae1.sorceryResource === 0, 'AE1: No sorcery resource');
assert(ae1.selectedMiracles.length === 6, 'AE1: 6 miracles selected');
assert(ae1.limits.miracles === 6, 'AE1: Miracle limit = devotionalPool = 6');

const ae1StringMiracles = captureStep9Set(`{cult:'Orlanth', miracles:'Shield'}`);
assert(ae1StringMiracles.before.selectedMiracles.length === 6 &&
  ae1StringMiracles.result?.success === false &&
  ae1StringMiracles.result.errors.some(error => /miracles must be an array/i.test(error)) &&
  ae1StringMiracles.after.cultName === 'Orlanth' &&
  ae1StringMiracles.after.selectedMiracles.length === 6,
  'AE1 invalid: App.agent.setStep(9) rejects string miracles without mutating');

const ae1UnknownMiracles = captureStep9Set(`{cult:'Orlanth', miracles:['Bogus1','Bogus2','Bogus3','Bogus4','Bogus5','Bogus6']}`);
assert(ae1UnknownMiracles.before.cultName === 'Orlanth' &&
  ae1UnknownMiracles.result?.success === false &&
  ae1UnknownMiracles.result.errors.some(error => /Unknown miracle/i.test(error)) &&
  ae1UnknownMiracles.after.cultName === 'Orlanth' &&
  ae1UnknownMiracles.after.selectedMiracles.length === 6,
  'AE1 invalid: App.agent.setStep(9) rejects unknown miracles without mutating');

const ae1DuplicateMiracles = captureStep9Set(`{cult:'Orlanth', miracles:['Shield','Shield','Shield','Shield','Shield','Shield']}`);
assert(ae1DuplicateMiracles.before.cultName === 'Orlanth' &&
  ae1DuplicateMiracles.result?.success === false &&
  ae1DuplicateMiracles.result.errors.some(error => /Duplicate miracle/i.test(error)) &&
  ae1DuplicateMiracles.after.cultName === 'Orlanth' &&
  ae1DuplicateMiracles.after.selectedMiracles.length === 6,
  'AE1 invalid: App.agent.setStep(9) rejects duplicate miracles without mutating');

// ═══════════════════════════════════════════════════════════════
console.log('\n\x1b[36m═══ AE2: Daka Fal (Animist) ═══\x1b[0m\n');
// ═══════════════════════════════════════════════════════════════

reload();

evalPageJSON(`JSON.stringify(App.agent.buildCharacter({step1:{name:'Wahagrim Spirit-Caller',concept:'Ancestor shaman'},step2:{characteristics:{STR:10,CON:11,SIZ:9,DEX:10,INT:13,POW:14,CHA:8}},step4:{culture:'Praxian',homeland:'Prax'},step5:{culturalSkills:{Athletics:10,Endurance:15,'First Aid':10,Locale:10,Perception:15,Ride:15,Stealth:10,Navigate:15},runeAffinities:{primary:'Spirit',secondary:'Man',tertiary:'Death'},folkMagicSpells:['Heal','Spiritshield','Second Sight']},step6:{passions:[{type:'Devotion',subject:'Daka Fal',value:47},{type:'Loyalty',subject:'Bison Tribe',value:47}]},step7:{age:28,gender:'Male',family:'Bison Tribe'},step8:{career:'Shaman',professionalSkills:[{name:'Lore (any)',specialization:'Spirit World'},{name:'Trance'},{name:'Healing'}]},step9:{cult:'Daka Fal',boundSpirits:[{name:'Ancestor Spirit — Sagacity (Int 1)',type:'Ancestor',ability:'Sagacity'}]},step10:{careerSkills:{'Binding (Daka Fal)':15,Endurance:5,Perception:15,Trance:15,Stealth:15,'First Aid':15,Navigate:10,Survival:10},careerFolkMagic:['Detect','Calm']},step11:{bonusSkills:{'Binding (Daka Fal)':20,Endurance:20,Perception:20,Trance:20,Stealth:20,'First Aid':20,Navigate:20,Survival:20,'Lore (Spirit World)':20,Willpower:20}},step12:{socialClass:'Freeman'}}))`);
const ae2 = evalPageJSON(`JSON.stringify(App.agent.getMagicState())`);

assert(ae2.cultType.primary === 'animist', 'AE2: Daka Fal detected as animist');
assert(ae2.cultType.isHybrid === false, 'AE2: Daka Fal is not hybrid');
assert(ae2.devotionalPool === 0, 'AE2: No Devotional Pool (no Devotion skill)');
assert(ae2.boundSpiritSlots === 4, 'AE2: Bound Spirit Slots = CHA/2 = 4');
assert(ae2.sorceryResource === 0, 'AE2: No sorcery resource');
assert(ae2.selectedMiracles.length === 0, 'AE2: No miracles (animist cult)');
assert(ae2.selectedSpirits.length === 1, 'AE2: 1 bound spirit selected');
assert(ae2.limits.spirits === 4, 'AE2: Spirit slot limit = CHA/2 = 4');

const ae2StringSpirits = captureStep9Set(`{cult:'Daka Fal', boundSpirits:'x'}`);
assert(ae2StringSpirits.before.selectedSpirits.length === 1 &&
  ae2StringSpirits.result?.success === false &&
  ae2StringSpirits.result.errors.some(error => /boundSpirits must be an array/i.test(error)) &&
  ae2StringSpirits.after.cultName === 'Daka Fal' &&
  ae2StringSpirits.after.selectedSpirits.length === 1,
  'AE2 invalid: App.agent.setStep(9) rejects string bound spirits without mutating');

const ae2ConflictingSpiritAliases = captureStep9Set(`{cult:'Daka Fal', boundSpirits:[], spirits:['Ancestor Spirit — Sagacity (Int 1)']}`);
assert(ae2ConflictingSpiritAliases.before.cultName === 'Daka Fal' &&
  ae2ConflictingSpiritAliases.result?.success === false &&
  ae2ConflictingSpiritAliases.result.errors.some(error => /boundSpirits and spirits cannot both be provided/i.test(error)) &&
  ae2ConflictingSpiritAliases.after.cultName === 'Daka Fal' &&
  ae2ConflictingSpiritAliases.after.selectedSpirits.length === 1,
  'AE2 invalid: App.agent.setStep(9) rejects conflicting bound-spirit aliases without mutating');

const ae2AliasOnlySpirits = captureStep9Set(`{cult:'Daka Fal', spirits:['Ancestor Spirit — Sagacity (Int 1)']}`);
assert(ae2AliasOnlySpirits.before.cultName === 'Daka Fal' &&
  ae2AliasOnlySpirits.result?.success === false &&
  ae2AliasOnlySpirits.result.errors.some(error => /spirits is not supported; use boundSpirits/i.test(error)) &&
  ae2AliasOnlySpirits.after.cultName === 'Daka Fal' &&
  ae2AliasOnlySpirits.after.selectedSpirits.length === 1,
  'AE2 invalid: App.agent.setStep(9) rejects alias-only spirits without mutating');

const ae2DeferredPayloadConsumed = evalPageJSON(`JSON.stringify((() => {
  const before = App.agent.getMagicState();
  const staleStep9 = Object.create({cult:'Daka Fal'});
  const buildResult = App.agent.buildCharacter({
    step1:{name:'Rejected Deferred Spirit',concept:'Rejected build'},
    step2:{characteristics:{STR:10,CON:11,SIZ:9,DEX:10,INT:13,POW:14,CHA:8}},
    step4:{culture:'Praxian',homeland:'Prax'},
    step8:{career:'Shaman',professionalSkills:[{name:'Lore (any)',specialization:'Spirit World'},{name:'Trance'},{name:'Healing'}]},
    step9:staleStep9
  });
  const afterBuild = App.agent.getMagicState();
  Object.setPrototypeOf(staleStep9, Object.prototype);
  staleStep9.cult = 'Daka Fal';
  staleStep9.boundSpirits = [];
  const result = App.agent.setStep(9, staleStep9);
  const after = App.agent.getMagicState();
  return {before, buildResult, afterBuild, result, after};
})())`);
assert(ae2DeferredPayloadConsumed.before.cultName === 'Daka Fal' &&
  ae2DeferredPayloadConsumed.buildResult?.success === false &&
  ae2DeferredPayloadConsumed.result?.success === false &&
  ae2DeferredPayloadConsumed.result.errors.some(error => /spirit/i.test(error)) &&
  ae2DeferredPayloadConsumed.after.cultName === 'Daka Fal' &&
  ae2DeferredPayloadConsumed.after.selectedSpirits.length === 1,
  'AE2 invalid: failed buildCharacter consumes deferred Step 9 payloads before later reuse');

const ae2UnknownSpirits = captureStep9Set(`{cult:'Daka Fal', boundSpirits:['Not a spirit']}`);
assert(ae2UnknownSpirits.before.cultName === 'Daka Fal' &&
  ae2UnknownSpirits.result?.success === false &&
  ae2UnknownSpirits.result.errors.some(error => /Unknown bound spirit/i.test(error)) &&
  ae2UnknownSpirits.after.cultName === 'Daka Fal' &&
  ae2UnknownSpirits.after.selectedSpirits.length === 1,
  'AE2 invalid: App.agent.setStep(9) rejects unknown bound spirits without mutating');

const ae2InheritedSpiritName = evalPageJSON(`JSON.stringify((() => {
  const before = App.agent.getMagicState();
  const inheritedSpirit = Object.create({name:'Ancestor Spirit — Sagacity (Int 1)'});
  const result = App.agent.setStep(9, {cult:'Daka Fal', boundSpirits:[inheritedSpirit]});
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae2InheritedSpiritName.before.cultName === 'Daka Fal' &&
  ae2InheritedSpiritName.result?.success === false &&
  ae2InheritedSpiritName.result.errors.some(error => /boundSpirits\[0\] must be a string or object with own name/i.test(error)) &&
  ae2InheritedSpiritName.after.cultName === 'Daka Fal' &&
  ae2InheritedSpiritName.after.selectedSpirits.length === 1,
  'AE2 invalid: App.agent.setStep(9) rejects inherited bound spirit names without mutating');

const ae2InheritedSpiritFields = evalPageJSON(`JSON.stringify((() => {
  const before = App.agent.getMagicState();
  const inheritedSpirit = Object.assign(Object.create({evil:true}), {name:'Ancestor Spirit — Sagacity (Int 1)'});
  const result = App.agent.setStep(9, {cult:'Daka Fal', boundSpirits:[inheritedSpirit]});
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae2InheritedSpiritFields.before.cultName === 'Daka Fal' &&
  ae2InheritedSpiritFields.result?.success === false &&
  ae2InheritedSpiritFields.result.errors.some(error => /boundSpirits\[0\] must use own fields only: evil/i.test(error)) &&
  ae2InheritedSpiritFields.after.cultName === 'Daka Fal' &&
  ae2InheritedSpiritFields.after.selectedSpirits.length === 1,
  'AE2 invalid: App.agent.setStep(9) rejects inherited bound spirit object fields without mutating');

const ae2InheritedSpiritArray = evalPageJSON(`JSON.stringify((() => {
  const before = App.agent.getMagicState();
  const inheritedSpirits = new Array(1);
  const prototype = Object.create(Array.prototype);
  prototype[0] = {name:'Ancestor Spirit — Sagacity (Int 1)'};
  Object.setPrototypeOf(inheritedSpirits, prototype);
  const result = App.agent.setStep(9, {cult:'Daka Fal', boundSpirits:inheritedSpirits});
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae2InheritedSpiritArray.before.cultName === 'Daka Fal' &&
  ae2InheritedSpiritArray.result?.success === false &&
  ae2InheritedSpiritArray.result.errors.some(error => /boundSpirits\[0\] must be an own array element/i.test(error)) &&
  ae2InheritedSpiritArray.after.cultName === 'Daka Fal' &&
  ae2InheritedSpiritArray.after.selectedSpirits.length === 1,
  'AE2 invalid: App.agent.setStep(9) rejects inherited bound spirit array slots without mutating');

const ae2InheritedSpiritArrayAfterLength = evalPageJSON(`JSON.stringify((() => {
  const before = App.agent.getMagicState();
  const inheritedSpirits = [];
  const prototype = Object.create(Array.prototype);
  prototype[0] = {name:'Ancestor Spirit — Sagacity (Int 1)'};
  Object.setPrototypeOf(inheritedSpirits, prototype);
  const result = App.agent.setStep(9, {cult:'Daka Fal', boundSpirits:inheritedSpirits});
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae2InheritedSpiritArrayAfterLength.before.cultName === 'Daka Fal' &&
  ae2InheritedSpiritArrayAfterLength.result?.success === false &&
  ae2InheritedSpiritArrayAfterLength.result.errors.some(error => /boundSpirits\[0\] must be an own array element/i.test(error)) &&
  ae2InheritedSpiritArrayAfterLength.after.cultName === 'Daka Fal' &&
  ae2InheritedSpiritArrayAfterLength.after.selectedSpirits.length === 1,
  'AE2 invalid: App.agent.setStep(9) rejects inherited bound spirit array slots beyond length without mutating');

const ae2DuplicateSpirits = evalPageJSON(`JSON.stringify((() => {
  const before = App.agent.getMagicState();
  const result = App.agent.setStep(9, {cult:'Daka Fal', boundSpirits:['Ancestor Spirit — Sagacity (Int 1)', 'Ancestor Spirit — Sagacity (Int 1)']});
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae2DuplicateSpirits.before.cultName === 'Daka Fal' &&
  ae2DuplicateSpirits.result?.success === false &&
  ae2DuplicateSpirits.result.errors.some(error => /Duplicate bound spirit/i.test(error)) &&
  ae2DuplicateSpirits.after.cultName === 'Daka Fal' &&
  ae2DuplicateSpirits.after.selectedSpirits.length === 1,
  'AE2 invalid: App.agent.setStep(9) rejects duplicate bound spirits without mutating');

// ═══════════════════════════════════════════════════════════════
console.log('\n\x1b[36m═══ AE3: Arkat (Sorcery) ═══\x1b[0m\n');
// ═══════════════════════════════════════════════════════════════

reload();

evalPageJSON(`JSON.stringify(App.agent.buildCharacter({step1:{name:'Malkion the Grey',concept:'Sorcerer philosopher'},step2:{characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:13,CHA:10}},step4:{culture:'God Forgot',homeland:'God Forgot'},step5:{culturalSkills:{Athletics:10,Endurance:10,'First Aid':15,Locale:15,Perception:15,Willpower:15,Influence:10,Insight:10},runeAffinities:{primary:'Law',secondary:'Truth',tertiary:'Stasis'},folkMagicSpells:['Avert','Calm','Calculate']},step6:{passions:[{type:'Loyalty',subject:'Brithini Order',value:47},{type:'Love',subject:'Knowledge',value:47}]},step7:{age:21,gender:'Male',family:'House Malkion'},step8:{career:'Sorcerer',professionalSkills:['Invocation','Shaping',{name:'Lore (any)',specialization:'Sorcery'}]},step9:{cult:'Arkat',sorcerySpells:['Holdfast']},step10:{careerSkills:{Willpower:15,Perception:15,Locale:15,Influence:15,Insight:15,'First Aid':10,Endurance:10,Athletics:5},careerFolkMagic:['Appraise','Befuddle']},step11:{bonusSkills:{Willpower:15,Perception:15,Locale:15,Influence:15,Insight:15,'First Aid':15,Endurance:15,Athletics:15,'Lore (Sorcery)':15,'Lore (Philosophy)':15}},step12:{socialClass:'Freeman'}}))`);
const ae3 = evalPageJSON(`JSON.stringify(App.agent.getMagicState())`);

assert(ae3.cultType.primary === 'sorcery', 'AE3: Arkat detected as sorcery');
assert(ae3.cultType.isHybrid === false, 'AE3: Arkat is not hybrid');
assert(ae3.devotionalPool === 0, 'AE3: No Devotional Pool');
assert(ae3.boundSpiritSlots === 0, 'AE3: No bound spirit slots');
assert(ae3.sorceryResource === 13, 'AE3: Sorcery Resource = POW = 13');
assert(ae3.selectedMiracles.length === 0, 'AE3: No miracles (sorcery cult)');
assert(ae3.selectedSpells.length === 1, 'AE3: 1 sorcery spell selected');
assert(ae3.limits.sorcerySpells === 3, 'AE3: Sorcery spell limit = 3');

const ae3DuplicateSpells = evalPageJSON(`JSON.stringify((() => {
  const before = App.agent.getMagicState();
  const result = App.agent.setStep(9, {cult:'Arkat', sorcerySpells:['Holdfast', 'Holdfast']});
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae3DuplicateSpells.before.cultName === 'Arkat' &&
  ae3DuplicateSpells.result?.success === false &&
  ae3DuplicateSpells.result.errors.some(error => /Duplicate sorcery spell/i.test(error)) &&
  ae3DuplicateSpells.after.cultName === 'Arkat' &&
  ae3DuplicateSpells.after.selectedSpells.length === 1,
  'AE3 invalid: App.agent.setStep(9) rejects duplicate sorcery spells without mutating');

const ae3ConflictingSpellAliases = evalPageJSON(`JSON.stringify((() => {
  const before = App.agent.getMagicState();
  const result = App.agent.setStep(9, {cult:'Arkat', sorcerySpells:[], spells:['Holdfast']});
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae3ConflictingSpellAliases.before.cultName === 'Arkat' &&
  ae3ConflictingSpellAliases.result?.success === false &&
  ae3ConflictingSpellAliases.result.errors.some(error => /sorcerySpells and spells cannot both be provided/i.test(error)) &&
  ae3ConflictingSpellAliases.after.cultName === 'Arkat' &&
  ae3ConflictingSpellAliases.after.selectedSpells.length === 1,
  'AE3 invalid: App.agent.setStep(9) rejects conflicting sorcery spell aliases without mutating');

const ae3AliasOnlySpells = evalPageJSON(`JSON.stringify((() => {
  const before = App.agent.getMagicState();
  const result = App.agent.setStep(9, {cult:'Arkat', spells:['Holdfast']});
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae3AliasOnlySpells.before.cultName === 'Arkat' &&
  ae3AliasOnlySpells.result?.success === false &&
  ae3AliasOnlySpells.result.errors.some(error => /spells is not supported; use sorcerySpells/i.test(error)) &&
  ae3AliasOnlySpells.after.cultName === 'Arkat' &&
  ae3AliasOnlySpells.after.selectedSpells.length === 1,
  'AE3 invalid: App.agent.setStep(9) rejects alias-only spells without mutating');

const ae3UnsupportedSelections = evalPageJSON(`JSON.stringify((() => {
  const before = App.agent.getMagicState();
  const miracleResult = App.agent.setStep(9, {cult:'Arkat', sorcerySpells:['Holdfast'], miracles:['Shield']});
  const afterMiracle = App.agent.getMagicState();
  App.agent.setStep(9, {cult:'Arkat', sorcerySpells:['Holdfast']});
  const spiritResult = App.agent.setStep(9, {cult:'Arkat', sorcerySpells:['Holdfast'], boundSpirits:['Ancestor Spirit — Sagacity (Int 1)']});
  const afterSpirit = App.agent.getMagicState();
  return {before, miracleResult, afterMiracle, spiritResult, afterSpirit};
})())`);
assert(ae3UnsupportedSelections.before.cultName === 'Arkat' &&
  ae3UnsupportedSelections.miracleResult?.success === false &&
  ae3UnsupportedSelections.miracleResult.errors.some(error => /miracles requires a theist cult/i.test(error)) &&
  ae3UnsupportedSelections.afterMiracle.cultName === 'Arkat' &&
  ae3UnsupportedSelections.afterMiracle.selectedMiracles.length === 0 &&
  ae3UnsupportedSelections.afterMiracle.selectedSpells.length === 1 &&
  ae3UnsupportedSelections.spiritResult?.success === false &&
  ae3UnsupportedSelections.spiritResult.errors.some(error => /boundSpirits requires an animist cult/i.test(error)) &&
  ae3UnsupportedSelections.afterSpirit.cultName === 'Arkat' &&
  ae3UnsupportedSelections.afterSpirit.selectedSpirits.length === 0 &&
  ae3UnsupportedSelections.afterSpirit.selectedSpells.length === 1,
  'AE3 invalid: App.agent.setStep(9) rejects miracles and spirits for sorcery-only cults');

// ═══════════════════════════════════════════════════════════════
console.log('\n\x1b[36m═══ AE3b: Zzistori School (Source-backed Sorcery) ═══\x1b[0m\n');
// ═══════════════════════════════════════════════════════════════

reload();

const ae3bBuild = evalPageJSON(`JSON.stringify(App.agent.buildCharacter({step1:{name:'Talor Zzistori',concept:'God Forgot school sorcerer'},step2:{characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}},step4:{culture:'God Forgot',homeland:'God Forgot'},step5:{culturalSkills:{Athletics:10,Endurance:10,'First Aid':15,Locale:15,Perception:15,Willpower:15,Influence:10,Insight:10},runeAffinities:{primary:'Law',secondary:'Truth',tertiary:'Stasis'},folkMagicSpells:['Avert','Calm','Calculate']},step6:{passions:[{type:'Loyalty',subject:'Zzistori School',value:47},{type:'Love',subject:'Knowledge',value:47}]},step7:{age:21,gender:'Male',family:'Zzistori school cell'},step8:{career:'Sorcerer',professionalSkills:[{name:'Invocation (Cult, School or Grimoire)',specialization:'Zzistori School'},{name:'Shaping'},{name:'Lore (any)',specialization:'Sorcery'}]},step9:{cult:null,sorcerySpells:['Holdfast','Animate (Substance)','Project (Sense)']},step10:{careerSkills:{Customs:10,Deceit:10,Influence:10,Insight:10,Locale:10,Perception:10,Willpower:10,'Invocation (Zzistori School)':10,Shaping:10,'Lore (Sorcery)':10},careerFolkMagic:['Appraise','Befuddle']},step11:{bonusSkills:{Customs:15,Deceit:15,Influence:15,Insight:15,Locale:15,Perception:15,Willpower:15,'Invocation (Zzistori School)':15,Shaping:15,'Lore (Sorcery)':15}},step12:{socialClass:'Freeman'}}))`);
const ae3b = evalPageJSON(`JSON.stringify(App.agent.getMagicState())`);

assert(ae3bBuild.success === true, 'AE3b: App.agent.buildCharacter builds No Cult Zzistori path');
assert(ae3b.cultName === null, 'AE3b: No cult selected');
assert(ae3b.cultType.primary === null, 'AE3b: No cult type for source-backed school');
assert(ae3b.activeSorcerySource && ae3b.activeSorcerySource.sourceLabel === 'Zzistori School (God Forgot sorcery)', 'AE3b: Active sorcery source is Zzistori School');
assert(ae3b.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)', 'AE3b: Magic state exposes UI source label');
assert(ae3b.sorceryResource === 15, 'AE3b: Sorcery Resource = POW = 15');
assert(ae3b.devotionalPool === 0, 'AE3b: No Devotional Pool');
assert(ae3b.selectedMiracles.length === 0, 'AE3b: No miracles');
assert(ae3b.selectedSpells.length === 3 && ae3b.selectedSpells.includes('Holdfast') && ae3b.selectedSpells.includes('Animate (Substance)') && ae3b.selectedSpells.includes('Project (Sense)'), 'AE3b: 3 Zzistori starting spells selected');
assert(ae3b.limits.sorcerySpells === 3, 'AE3b: Sorcery spell limit = 3');
assert(ae3bBuild.character?.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)', 'AE3b: buildCharacter character output exposes Zzistori label');
assert(ae3bBuild.character?.sorceryResource === 15, 'AE3b: buildCharacter character output exposes Magic Points');
assert(Array.isArray(ae3bBuild.character?.sorcerySpells) && ae3bBuild.character.sorcerySpells.length === 3, 'AE3b: buildCharacter character output keeps selected spells');

const ae3bPartialBuild = evalPageJSON(`JSON.stringify((() => {
  const before = App.agent.getState();
  const result = App.agent.buildCharacter({step9:{cult:null,sorcerySpells:[]}});
  const inheritedSpec = Object.create({
    step1:{name:'Inherited Required Steps',concept:'Prototype-only build'},
    step2:{characteristics:{STR:14,CON:12,SIZ:11,DEX:10,INT:9,POW:12,CHA:7}},
    step4:{culture:'Sartarite (Heortling)',homeland:'Boldhome'},
    step8:{career:'Warrior',professionalSkills:[{name:'Lore (any)',specialization:'Tactics'},{name:'Craft (any)',specialization:'Weaponsmithing'},{name:'Survival'}]},
    step9:{cult:null}
  });
  const inheritedResult = App.agent.buildCharacter(inheritedSpec);
  const falseStep9Result = App.agent.buildCharacter({
    step1:{name:'False Step 9',concept:'Falsey required payload'},
    step2:{characteristics:{STR:14,CON:12,SIZ:11,DEX:10,INT:9,POW:12,CHA:7}},
    step4:{culture:'Sartarite (Heortling)',homeland:'Boldhome'},
    step8:{career:'Warrior',professionalSkills:[{name:'Lore (any)',specialization:'Tactics'},{name:'Craft (any)',specialization:'Weaponsmithing'},{name:'Survival'}]},
    step9:false
  });
  const after = App.agent.getState();
  return {result, inheritedResult, falseStep9Result, beforeName: before.name, afterName: after.name, beforeMode: before.mode, afterMode: after.mode};
})())`);
assert(ae3bPartialBuild.result.success === false &&
  ae3bPartialBuild.result.failedStep === null &&
  ae3bPartialBuild.result.errors.some(error => /Missing required buildCharacter step\(s\): .*step1.*step2.*step4.*step8/i.test(error)) &&
  ae3bPartialBuild.inheritedResult.success === false &&
  ae3bPartialBuild.inheritedResult.failedStep === null &&
  ae3bPartialBuild.inheritedResult.errors.some(error => /Missing required buildCharacter step\(s\): .*step1.*step2.*step4.*step8.*step9/i.test(error)) &&
  ae3bPartialBuild.falseStep9Result.success === false &&
  ae3bPartialBuild.falseStep9Result.failedStep === 9 &&
  ae3bPartialBuild.falseStep9Result.errors.some(error => /Step 9 data object is required/i.test(error)) &&
  ae3bPartialBuild.afterName === ae3bPartialBuild.beforeName &&
  ae3bPartialBuild.afterMode === ae3bPartialBuild.beforeMode,
  'AE3b invalid: buildCharacter rejects partial, inherited, and falsey required specs without mutating accepted state');

const ae3bNoCultUnsupportedSelections = evalPageJSON(`JSON.stringify((() => {
  const before = App.agent.getMagicState();
  const miracleResult = App.agent.setStep(9, {cult:null, sorcerySpells:['Holdfast','Animate (Substance)','Project (Sense)'], miracles:['Shield']});
  const afterMiracle = App.agent.getMagicState();
  const spiritResult = App.agent.setStep(9, {cult:null, sorcerySpells:['Holdfast','Animate (Substance)','Project (Sense)'], boundSpirits:['Ancestor Spirit — Sagacity (Int 1)']});
  const afterSpirit = App.agent.getMagicState();
  return {before, miracleResult, afterMiracle, spiritResult, afterSpirit};
})())`);
assert(ae3bNoCultUnsupportedSelections.before.cultName === null &&
  ae3bNoCultUnsupportedSelections.miracleResult?.success === false &&
  ae3bNoCultUnsupportedSelections.miracleResult.errors.some(error => /miracles requires a theist cult/i.test(error)) &&
  ae3bNoCultUnsupportedSelections.afterMiracle.cultName === null &&
  ae3bNoCultUnsupportedSelections.afterMiracle.selectedMiracles.length === 0 &&
  ae3bNoCultUnsupportedSelections.afterMiracle.selectedSpells.length === 3 &&
  ae3bNoCultUnsupportedSelections.spiritResult?.success === false &&
  ae3bNoCultUnsupportedSelections.spiritResult.errors.some(error => /boundSpirits requires an animist cult/i.test(error)) &&
  ae3bNoCultUnsupportedSelections.afterSpirit.cultName === null &&
  ae3bNoCultUnsupportedSelections.afterSpirit.selectedSpirits.length === 0 &&
  ae3bNoCultUnsupportedSelections.afterSpirit.selectedSpells.length === 3,
  'AE3b invalid: No Cult Step 9 rejects miracle and spirit payloads without mutating source sorcery');

const ae3bPlay = evalPageJSON(`JSON.stringify({
  ui: App.agent.getUIState(),
  playMode: App.agent.assertPlayMode(),
  magicState: App.agent.getMagicState(),
  magicHtml: document.getElementById('play-magic') ? document.getElementById('play-magic').innerHTML : ''
})`);
assert(ae3bPlay.ui.mode === 'play', 'AE3b: buildCharacter switches to Play Mode');
assert(ae3bPlay.playMode.sections.includes('magic') &&
  !ae3bPlay.playMode.missing.some(item => item.includes('magic')) &&
  !ae3bPlay.playMode.errors.some(item => item.includes('Sorcery')),
  'AE3b: Play Mode readiness includes source-backed magic');
assert(ae3bPlay.magicHtml.includes('Zzistori School (God Forgot sorcery)') &&
  ae3bPlay.magicHtml.includes('Magic Points (15)') &&
  ae3bPlay.magicHtml.includes('Invocation skill') &&
  ae3bPlay.magicHtml.includes('Shaping skill') &&
  ae3bPlay.magicHtml.includes('Holdfast') &&
  ae3bPlay.magicHtml.includes('Animate (Substance)') &&
  ae3bPlay.magicHtml.includes('Project (Sense)') &&
  !ae3bPlay.magicHtml.includes('Devotional Pool'),
  'AE3b: Play Mode renders Zzistori label, Magic Points, skills, and selected spells');
assert(ae3bPlay.magicState.sorcerySourceLabel === ae3b.sorcerySourceLabel &&
  ae3bPlay.magicState.sorceryResource === ae3b.sorceryResource &&
  JSON.stringify(ae3bPlay.magicState.selectedSpells) === JSON.stringify(ae3b.selectedSpells),
  'AE3b: Magic state remains consistent after switching to Play Mode');

reload();

const ae3bGranular = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Granular Zzistori', concept:'God Forgot school sorcerer'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  const step8 = App.agent.setStep(8, {career:'Sorcerer', professionalSkills:[{name:'Invocation (Cult, School or Grimoire)', specialization:'Zzistori School'}, 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  const options = App.agent.getOptions(9);
  const select = App.agent.selectCult(null);
  const toggle = App.agent.toggleSpell('Holdfast');
  const magic = App.agent.getMagicState();
  return {step8, options, select, toggle, magic};
})())`);
assert(ae3bGranular.step8.success === true, 'AE3b granular: Step 8 Sorcerer setup succeeds');
assert(ae3bGranular.options.noCult?.activeSorcerySource?.sourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bGranular.options.sourceBackedSorcery?.startingSpellLimit === 3,
  'AE3b granular: getOptions(9) advertises No Cult Zzistori sorcery');

const ae3bForgedStep8 = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Forged Step 8', concept:'Farmer forging Invocation'});
  App.agent.setStep(2, {characteristics:{STR:10,CON:10,SIZ:10,DEX:10,INT:13,POW:13,CHA:10}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  const result = App.agent.setStep(8, {career:'Farmer', professionalSkills:['Invocation','Commerce','Track']});
  return {result, state: App.agent.getState()};
})())`);
assert(ae3bForgedStep8.result.success === false &&
  ae3bForgedStep8.result.errors.some(error => /Invocation.*not.*Farmer|not available.*Farmer/i.test(error)) &&
  ae3bForgedStep8.state.career !== 'Farmer',
  'AE3b invalid: Step 8 rejects forged Invocation for careers that do not grant it');

const ae3bForgedPublicProfessionalSkill = evalPageJSON(`JSON.stringify((() => {
  CharacterData.career = 'Farmer';
  CharacterData.selectedProfessionalSkills = [];
  CharacterData.careerSkills = {};
  const result = App.toggleProfessionalSkill('Invocation', true);
  return {
    result,
    selectedProfessionalSkills: CharacterData.selectedProfessionalSkills,
    careerSkills: CharacterData.careerSkills
  };
})())`);
assert(ae3bForgedPublicProfessionalSkill.result === false &&
  !ae3bForgedPublicProfessionalSkill.selectedProfessionalSkills.includes('Invocation') &&
  ae3bForgedPublicProfessionalSkill.careerSkills.Invocation === undefined,
  'AE3b invalid: public toggleProfessionalSkill rejects forged Invocation for non-Invocation careers');

assert(ae3bGranular.select.success === true &&
  ae3bGranular.select.magicState?.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bGranular.select.magicState?.cultName === null,
  'AE3b granular: selectCult(null) derives source-backed Zzistori state');
assert(ae3bGranular.toggle.success === true &&
  ae3bGranular.toggle.limit === 3 &&
  ae3bGranular.magic.selectedSpells.includes('Holdfast'),
  'AE3b granular: toggleSpell uses derived source spell limit');

const ae3bNoCultSwitch = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Switching Zzistori', concept:'God Forgot school sorcerer'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  const arkat = App.agent.selectCult('Arkat');
  const arkatSpell = App.agent.toggleSpell('Holdfast');
  const before = App.agent.getMagicState();
  const noCult = App.agent.selectCult(null);
  const after = App.agent.getMagicState();
  return {arkat, arkatSpell, before, noCult, after};
})())`);
assert(ae3bNoCultSwitch.before.cultName === 'Arkat' &&
  ae3bNoCultSwitch.before.selectedSpells.includes('Holdfast'),
  'AE3b granular switch: Arkat spell is selected before No Cult');
assert(ae3bNoCultSwitch.noCult.success === false &&
  ae3bNoCultSwitch.after.cultName === 'Arkat' &&
  ae3bNoCultSwitch.after.sorcerySourceLabel === 'Arkat' &&
  ae3bNoCultSwitch.after.selectedSpells.includes('Holdfast'),
  'AE3b invalid: selectCult(null) rejects source switch that would drop Arkat spells');

reload();

const ae3bArkatSwitch = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Arkat Switching', concept:'God Forgot school sorcerer'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult(null);
  App.agent.toggleSpell('Holdfast');
  const before = App.agent.getMagicState();
  const arkat = App.agent.selectCult('Arkat');
  const after = App.agent.getMagicState();
  return {before, arkat, after};
})())`);
assert(ae3bArkatSwitch.before.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bArkatSwitch.before.selectedSpells.includes('Holdfast'),
  'AE3b granular switch: Zzistori spell is selected before Arkat');
assert(ae3bArkatSwitch.arkat.success === false &&
  ae3bArkatSwitch.after.cultName === null &&
  ae3bArkatSwitch.after.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bArkatSwitch.after.selectedSpells.includes('Holdfast'),
  'AE3b invalid: selectCult(Arkat) rejects source switch that would drop Zzistori spells');

reload();

const ae3bPublicGenericSourceSwitch = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Public Generic Source Switch', concept:'God Forgot school sorcerer'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult(null);
  App.agent.toggleSpell('Holdfast');
  const before = App.agent.getMagicState();
  const result = App.selectCult('Arkat', {skipConfirmation: true});
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae3bPublicGenericSourceSwitch.before.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bPublicGenericSourceSwitch.before.selectedSpells.includes('Holdfast') &&
  ae3bPublicGenericSourceSwitch.result?.success === false &&
  ae3bPublicGenericSourceSwitch.after.cultName === null &&
  ae3bPublicGenericSourceSwitch.after.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bPublicGenericSourceSwitch.after.selectedSpells.includes('Holdfast'),
  'AE3b invalid: public App.selectCult(Arkat) rejects source switch that would drop generic Invocation spells');

reload();

const ae3bArkatInvalidSwitch = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Invalid Arkat Switching', concept:'God Forgot school sorcerer'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:[{name:'Invocation (Cult, School or Grimoire)', specialization:'Zzistori School'}, 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult(null);
  App.agent.toggleSpell('Holdfast');
  const before = App.agent.getMagicState();
  const arkat = App.agent.selectCult('Arkat');
  const after = App.agent.getMagicState();
  return {before, arkat, after};
})())`);
assert(ae3bArkatInvalidSwitch.before.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bArkatInvalidSwitch.before.selectedSpells.includes('Holdfast') &&
  ae3bArkatInvalidSwitch.arkat.success === false &&
  /Invocation specialization/i.test(ae3bArkatInvalidSwitch.arkat.error || '') &&
  ae3bArkatInvalidSwitch.after.cultName === null &&
  ae3bArkatInvalidSwitch.after.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bArkatInvalidSwitch.after.selectedSpells.includes('Holdfast'),
  'AE3b invalid: selectCult(Arkat) rejects mismatched Invocation and preserves Zzistori state');

reload();

const ae3bNoCultInvalidSwitch = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Invalid No Cult Switching', concept:'God Forgot Arkat sorcerer'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:[{name:'Invocation (Cult, School or Grimoire)', specialization:'Arkat'}, 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult('Arkat');
  App.agent.toggleSpell('Holdfast');
  const before = App.agent.getMagicState();
  const noCult = App.agent.selectCult(null);
  const after = App.agent.getMagicState();
  return {before, noCult, after};
})())`);
assert(ae3bNoCultInvalidSwitch.before.cultName === 'Arkat' &&
  ae3bNoCultInvalidSwitch.before.selectedSpells.includes('Holdfast') &&
  ae3bNoCultInvalidSwitch.noCult.success === false &&
  /Invocation specialization/i.test(ae3bNoCultInvalidSwitch.noCult.error || '') &&
  ae3bNoCultInvalidSwitch.after.cultName === 'Arkat' &&
  ae3bNoCultInvalidSwitch.after.sorcerySourceLabel === 'Arkat' &&
  ae3bNoCultInvalidSwitch.after.selectedSpells.includes('Holdfast'),
  'AE3b invalid: selectCult(null) rejects mismatched Invocation and preserves Arkat state');

reload();

const ae3bPublicCultInvalidSwitch = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Public Invalid Arkat Switching', concept:'God Forgot school sorcerer'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:[{name:'Invocation (Cult, School or Grimoire)', specialization:'Zzistori School'}, 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult(null);
  App.agent.toggleSpell('Holdfast');
  const before = App.agent.getMagicState();
  const result = App.selectCult('Arkat');
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae3bPublicCultInvalidSwitch.before.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bPublicCultInvalidSwitch.before.selectedSpells.includes('Holdfast') &&
  ae3bPublicCultInvalidSwitch.result?.success === false &&
  ae3bPublicCultInvalidSwitch.after.cultName === null &&
  ae3bPublicCultInvalidSwitch.after.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bPublicCultInvalidSwitch.after.selectedSpells.includes('Holdfast'),
  'AE3b invalid: public App.selectCult(Arkat) preserves Zzistori state on mismatched Invocation');

reload();

const ae3bPublicNoCultInvalidSwitch = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Public Invalid No Cult Switching', concept:'God Forgot Arkat sorcerer'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:[{name:'Invocation (Cult, School or Grimoire)', specialization:'Arkat'}, 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult('Arkat');
  App.agent.toggleSpell('Holdfast');
  const before = App.agent.getMagicState();
  const result = App.selectCult(null);
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae3bPublicNoCultInvalidSwitch.before.cultName === 'Arkat' &&
  ae3bPublicNoCultInvalidSwitch.before.selectedSpells.includes('Holdfast') &&
  ae3bPublicNoCultInvalidSwitch.result?.success === false &&
  ae3bPublicNoCultInvalidSwitch.after.cultName === 'Arkat' &&
  ae3bPublicNoCultInvalidSwitch.after.sorcerySourceLabel === 'Arkat' &&
  ae3bPublicNoCultInvalidSwitch.after.selectedSpells.includes('Holdfast'),
  'AE3b invalid: public App.selectCult(null) preserves Arkat state on mismatched Invocation');

reload();

const ae3bAgentNonSorcerySwitch = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Agent Non Sorcery Switch', concept:'Arkat sorcerer tempted by Orlanth'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult('Arkat');
  App.agent.toggleSpell('Holdfast');
  const before = App.agent.getMagicState();
  const result = App.agent.selectCult('Orlanth');
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae3bAgentNonSorcerySwitch.before.cultName === 'Arkat' &&
  ae3bAgentNonSorcerySwitch.before.selectedSpells.includes('Holdfast') &&
  ae3bAgentNonSorcerySwitch.result?.success === false &&
  ae3bAgentNonSorcerySwitch.after.cultName === 'Arkat' &&
  ae3bAgentNonSorcerySwitch.after.sorcerySourceLabel === 'Arkat' &&
  ae3bAgentNonSorcerySwitch.after.selectedSpells.includes('Holdfast'),
  'AE3b invalid: App.agent.selectCult(Orlanth) rejects non-sorcery switch that would drop spells');

reload();

const ae3bPublicNonSorcerySwitch = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Public Non Sorcery Switch', concept:'Arkat sorcerer tempted by Orlanth'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult('Arkat');
  App.agent.toggleSpell('Holdfast');
  const before = App.agent.getMagicState();
  const result = App.selectCult('Orlanth', {skipConfirmation: true});
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae3bPublicNonSorcerySwitch.before.cultName === 'Arkat' &&
  ae3bPublicNonSorcerySwitch.before.selectedSpells.includes('Holdfast') &&
  ae3bPublicNonSorcerySwitch.result?.success === false &&
  ae3bPublicNonSorcerySwitch.after.cultName === 'Arkat' &&
  ae3bPublicNonSorcerySwitch.after.sorcerySourceLabel === 'Arkat' &&
  ae3bPublicNonSorcerySwitch.after.selectedSpells.includes('Holdfast'),
  'AE3b invalid: public App.selectCult(Orlanth) rejects non-sorcery switch that would drop spells');

reload();

const ae3bAgentCareerDropsSource = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Agent Career Switch', concept:'God Forgot sorcerer turns farmer'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult(null);
  App.agent.toggleSpell('Holdfast');
  const beforeMagic = App.agent.getMagicState();
  const result = App.agent.setStep(8, {career:'Farmer', professionalSkills:['Commerce', 'Navigation', 'Survival']});
  const afterMagic = App.agent.getMagicState();
  const afterState = App.agent.getState();
  return {beforeMagic, result, afterMagic, afterState};
})())`);
assert(ae3bAgentCareerDropsSource.beforeMagic.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bAgentCareerDropsSource.beforeMagic.selectedSpells.includes('Holdfast') &&
  ae3bAgentCareerDropsSource.result?.success === false &&
  ae3bAgentCareerDropsSource.afterState.career === 'Sorcerer' &&
  ae3bAgentCareerDropsSource.afterMagic.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bAgentCareerDropsSource.afterMagic.selectedSpells.includes('Holdfast'),
  'AE3b invalid: App.agent.setStep(8) rejects career switch that would drop source-backed spells');

reload();

const ae3bPublicCareerDropsSource = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Public Career Switch', concept:'God Forgot sorcerer turns farmer'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult(null);
  App.agent.toggleSpell('Holdfast');
  const beforeMagic = App.agent.getMagicState();
  const result = App.selectCareer('Farmer');
  const afterMagic = App.agent.getMagicState();
  const afterState = App.agent.getState();
  return {beforeMagic, result, afterMagic, afterState};
})())`);
assert(ae3bPublicCareerDropsSource.beforeMagic.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bPublicCareerDropsSource.beforeMagic.selectedSpells.includes('Holdfast') &&
  ae3bPublicCareerDropsSource.result?.success === false &&
  ae3bPublicCareerDropsSource.afterState.career === 'Sorcerer' &&
  ae3bPublicCareerDropsSource.afterMagic.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bPublicCareerDropsSource.afterMagic.selectedSpells.includes('Holdfast'),
  'AE3b invalid: public App.selectCareer rejects career switch that would drop source-backed spells');

reload();

const ae3bStep9NoSourceDropsSpells = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Direct Step 9 No Source', concept:'Esrolian Arkat sorcerer'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'Esrolian', homeland:'Nochet'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult('Arkat');
  App.agent.toggleSpell('Holdfast');
  const before = App.agent.getMagicState();
  const result = App.agent.setStep(9, {cult:null});
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae3bStep9NoSourceDropsSpells.before.cultName === 'Arkat' &&
  ae3bStep9NoSourceDropsSpells.before.selectedSpells.includes('Holdfast') &&
  ae3bStep9NoSourceDropsSpells.result?.success === false &&
  ae3bStep9NoSourceDropsSpells.after.cultName === 'Arkat' &&
  ae3bStep9NoSourceDropsSpells.after.sorcerySourceLabel === 'Arkat' &&
  ae3bStep9NoSourceDropsSpells.after.selectedSpells.includes('Holdfast'),
  'AE3b invalid: App.agent.setStep(9, No Cult) rejects source-to-no-source spell loss');

reload();

const ae3bStep9NoSourcePayloadSpells = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Direct Step 9 No Source Spell Payload', concept:'Farmer with forged spells'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:13,POW:12,CHA:8}});
  App.agent.setStep(4, {culture:'Esrolian', homeland:'Nochet'});
  App.agent.setStep(8, {career:'Farmer', professionalSkills:['Commerce', 'Navigation', 'Survival']});
  const beforeState = App.agent.getState();
  const beforeMagic = App.agent.getMagicState();
  const result = App.agent.setStep(9, {cult:null, sorcerySpells:['Holdfast']});
  const afterState = App.agent.getState();
  const afterMagic = App.agent.getMagicState();
  return {beforeState, beforeMagic, result, afterState, afterMagic};
})())`);
assert(ae3bStep9NoSourcePayloadSpells.beforeState.step === 8 &&
  ae3bStep9NoSourcePayloadSpells.beforeMagic.sorcerySourceLabel === null &&
  ae3bStep9NoSourcePayloadSpells.result?.success === false &&
  ae3bStep9NoSourcePayloadSpells.result.errors.some(error => /active sorcery source/i.test(error)) &&
  ae3bStep9NoSourcePayloadSpells.afterState.step === 8 &&
  ae3bStep9NoSourcePayloadSpells.afterMagic.sorcerySourceLabel === null &&
  ae3bStep9NoSourcePayloadSpells.afterMagic.selectedSpells.length === 0,
  'AE3b invalid: App.agent.setStep(9) rejects sorcery spells without active source');

reload();

const ae3bStep9NonSorceryPayloadSpells = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Direct Step 9 Non-Sorcery Spell Payload', concept:'Orlanthi with forged sorcery'});
  App.agent.setStep(2, {characteristics:{STR:14,CON:12,SIZ:11,DEX:10,INT:9,POW:12,CHA:7}});
  App.agent.setStep(4, {culture:'Sartarite (Heortling)', homeland:'Boldhome'});
  App.agent.setStep(8, {career:'Warrior', professionalSkills:[{name:'Lore (any)',specialization:'Tactics'},{name:'Craft (any)',specialization:'Weaponsmithing'},{name:'Survival'}]});
  const beforeState = App.agent.getState();
  const beforeMagic = App.agent.getMagicState();
  const result = App.agent.setStep(9, {cult:'Orlanth', miracles:['Shield','Lightning','Wind Words','Flight','Extension','Summon Sylph'], sorcerySpells:['Holdfast'], __deferValidation:true});
  const afterState = App.agent.getState();
  const afterMagic = App.agent.getMagicState();
  return {beforeState, beforeMagic, result, afterState, afterMagic};
})())`);
assert(ae3bStep9NonSorceryPayloadSpells.beforeState.step === 8 &&
  ae3bStep9NonSorceryPayloadSpells.beforeMagic.sorcerySourceLabel === null &&
  ae3bStep9NonSorceryPayloadSpells.result?.success === false &&
  ae3bStep9NonSorceryPayloadSpells.result.errors.some(error => /active sorcery source/i.test(error)) &&
  ae3bStep9NonSorceryPayloadSpells.afterState.step === 8 &&
  ae3bStep9NonSorceryPayloadSpells.afterState.cult === null &&
  ae3bStep9NonSorceryPayloadSpells.afterMagic.sorcerySourceLabel === null &&
  ae3bStep9NonSorceryPayloadSpells.afterMagic.selectedSpells.length === 0,
  'AE3b invalid: App.agent.setStep(9, non-sorcery cult) rejects sorcery spells without active source');

reload();

const ae3bStep9NonArraySpellPayload = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Direct Step 9 Non-Array Spell Payload', concept:'Farmer with malformed spell payload'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:13,POW:12,CHA:8}});
  App.agent.setStep(4, {culture:'Esrolian', homeland:'Nochet'});
  App.agent.setStep(8, {career:'Farmer', professionalSkills:['Commerce', 'Navigation', 'Survival']});
  const beforeState = App.agent.getState();
  const result = App.agent.setStep(9, {cult:null, sorcerySpells:'Holdfast'});
  const afterState = App.agent.getState();
  const afterMagic = App.agent.getMagicState();
  return {beforeState, result, afterState, afterMagic};
})())`);
assert(ae3bStep9NonArraySpellPayload.beforeState.step === 8 &&
  ae3bStep9NonArraySpellPayload.result?.success === false &&
  ae3bStep9NonArraySpellPayload.result.errors.some(error => /sorcerySpells must be an array/i.test(error)) &&
  ae3bStep9NonArraySpellPayload.afterState.step === 8 &&
  ae3bStep9NonArraySpellPayload.afterMagic.selectedSpells.length === 0,
  'AE3b invalid: App.agent.setStep(9) rejects non-array sorcery spell payloads');

reload();

const ae3bStep9ExternalDeferBypass = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Direct Step 9 External Defer', concept:'Malformed deferred spell payload'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:13,CHA:10}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  const beforeState = App.agent.getState();
  const result = App.agent.setStep(9, {cult:'Arkat', sorcerySpells:['Definitely Not A Spell'], __deferValidation:true});
  const afterState = App.agent.getState();
  const afterMagic = App.agent.getMagicState();
  return {beforeState, result, afterState, afterMagic};
})())`);
assert(ae3bStep9ExternalDeferBypass.beforeState.step === 8 &&
  ae3bStep9ExternalDeferBypass.result?.success === false &&
  ae3bStep9ExternalDeferBypass.result.errors.some(error => /Unknown sorcery spell/i.test(error)) &&
  ae3bStep9ExternalDeferBypass.afterState.step === 8 &&
  ae3bStep9ExternalDeferBypass.afterMagic.cultName === null &&
  ae3bStep9ExternalDeferBypass.afterMagic.selectedSpells.length === 0,
  'AE3b invalid: App.agent.setStep(9) ignores external defer-validation bypass');

reload();

const ae3bStep9ArrayPayload = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Direct Step 9 Array Payload', concept:'Malformed step payload'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:13,CHA:10}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  const valid = App.agent.selectCult('Arkat');
  const before = App.agent.getMagicState();
  const result = App.agent.setStep(9, []);
  const after = App.agent.getMagicState();
  const afterState = App.agent.getState();
  return {valid, before, result, after, afterState};
})())`);
assert(ae3bStep9ArrayPayload.valid?.success === true &&
  ae3bStep9ArrayPayload.before.cultName === 'Arkat' &&
  ae3bStep9ArrayPayload.result?.success === false &&
  ae3bStep9ArrayPayload.result.errors.some(error => /Step 9 data object is required/i.test(error)) &&
  ae3bStep9ArrayPayload.after.cultName === 'Arkat' &&
  ae3bStep9ArrayPayload.afterState.step === 8,
  'AE3b invalid: App.agent.setStep(9) rejects array payload without clearing cult');

reload();

const ae3bStep9PrimitivePayload = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Direct Step 9 Primitive Payload', concept:'Malformed primitive step payload'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:13,CHA:10}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  const result = App.agent.setStep(9, 'x');
  const after = App.agent.getMagicState();
  return {result, after};
})())`);
assert(ae3bStep9PrimitivePayload.result?.success === false &&
  ae3bStep9PrimitivePayload.result.errors.some(error => /Step 9 data object is required/i.test(error)) &&
  ae3bStep9PrimitivePayload.result.state !== null &&
  ae3bStep9PrimitivePayload.after.cultName === null,
  'AE3b invalid: App.agent.setStep(9) rejects primitive payload cleanly');

reload();

const ae3bStep9PrototypePayload = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Direct Step 9 Prototype Payload', concept:'Inherited magic payload'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:13,CHA:10}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult('Arkat');
  const payload = Object.create({cult:'Arkat', sorcerySpells:['Definitely Not A Spell']});
  const result = App.agent.setStep(9, payload);
  const after = App.agent.getMagicState();
  return {result, after};
})())`);
assert(ae3bStep9PrototypePayload.result?.success === false &&
  ae3bStep9PrototypePayload.result.errors.some(error => /own fields/i.test(error)) &&
  ae3bStep9PrototypePayload.after.cultName === 'Arkat' &&
  ae3bStep9PrototypePayload.after.selectedSpells.length === 0,
  'AE3b invalid: App.agent.setStep(9) rejects inherited prototype payloads');

reload();

const ae3bStep9NonSorceryDropsSpells = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Direct Step 9 Orlanth', concept:'Esrolian Arkat sorcerer'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'Esrolian', homeland:'Nochet'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult('Arkat');
  App.agent.toggleSpell('Holdfast');
  const before = App.agent.getMagicState();
  const result = App.agent.setStep(9, {cult:'Orlanth', miracles:['Shield','Lightning','Wind Words','Flight','Extension','Summon Sylph'], __deferValidation:true});
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae3bStep9NonSorceryDropsSpells.before.cultName === 'Arkat' &&
  ae3bStep9NonSorceryDropsSpells.before.selectedSpells.includes('Holdfast') &&
  ae3bStep9NonSorceryDropsSpells.result?.success === false &&
  ae3bStep9NonSorceryDropsSpells.after.cultName === 'Arkat' &&
  ae3bStep9NonSorceryDropsSpells.after.sorcerySourceLabel === 'Arkat' &&
  ae3bStep9NonSorceryDropsSpells.after.selectedSpells.includes('Holdfast'),
  'AE3b invalid: App.agent.setStep(9, Orlanth) rejects non-sorcery spell loss');

reload();

const ae3bStep9SameSourceOmittedSpell = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Direct Step 9 Same Source', concept:'Arkat sorcerer partial payload'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'Esrolian', homeland:'Nochet'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult('Arkat');
  App.agent.toggleSpell('Holdfast');
  App.agent.toggleSpell('Animate (Substance)');
  const before = App.agent.getMagicState();
  const result = App.agent.setStep(9, {cult:'Arkat', sorcerySpells:['Holdfast'], __deferValidation:true});
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae3bStep9SameSourceOmittedSpell.before.cultName === 'Arkat' &&
  ae3bStep9SameSourceOmittedSpell.before.selectedSpells.includes('Holdfast') &&
  ae3bStep9SameSourceOmittedSpell.before.selectedSpells.includes('Animate (Substance)') &&
  ae3bStep9SameSourceOmittedSpell.result?.success === false &&
  ae3bStep9SameSourceOmittedSpell.after.cultName === 'Arkat' &&
  ae3bStep9SameSourceOmittedSpell.after.sorcerySourceLabel === 'Arkat' &&
  ae3bStep9SameSourceOmittedSpell.after.selectedSpells.includes('Holdfast') &&
  ae3bStep9SameSourceOmittedSpell.after.selectedSpells.includes('Animate (Substance)'),
  'AE3b invalid: App.agent.setStep(9) rejects same-source payload that omits existing spells');

reload();

const ae3bAgentCultureDropsSource = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Agent Culture Switch', concept:'God Forgot sorcerer changes culture'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult(null);
  App.agent.toggleSpell('Holdfast');
  const beforeMagic = App.agent.getMagicState();
  const result = App.agent.setStep(4, {culture:'Esrolian', homeland:'Nochet'});
  const afterMagic = App.agent.getMagicState();
  const afterState = App.agent.getState();
  return {beforeMagic, result, afterMagic, afterState};
})())`);
assert(ae3bAgentCultureDropsSource.beforeMagic.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bAgentCultureDropsSource.beforeMagic.selectedSpells.includes('Holdfast') &&
  ae3bAgentCultureDropsSource.result?.success === false &&
  ae3bAgentCultureDropsSource.afterState.culture === 'God Forgot' &&
  ae3bAgentCultureDropsSource.afterMagic.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bAgentCultureDropsSource.afterMagic.selectedSpells.includes('Holdfast'),
  'AE3b invalid: App.agent.setStep(4) rejects culture switch that would drop source-backed spells');

reload();

const ae3bPublicCultureDropsSource = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Public Culture Switch', concept:'God Forgot sorcerer changes culture'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult(null);
  App.agent.toggleSpell('Holdfast');
  const beforeMagic = App.agent.getMagicState();
  const result = App.selectCulture('Esrolian');
  const afterMagic = App.agent.getMagicState();
  const afterState = App.agent.getState();
  return {beforeMagic, result, afterMagic, afterState};
})())`);
assert(ae3bPublicCultureDropsSource.beforeMagic.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bPublicCultureDropsSource.beforeMagic.selectedSpells.includes('Holdfast') &&
  ae3bPublicCultureDropsSource.result?.success === false &&
  ae3bPublicCultureDropsSource.afterState.culture === 'God Forgot' &&
  ae3bPublicCultureDropsSource.afterMagic.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bPublicCultureDropsSource.afterMagic.selectedSpells.includes('Holdfast'),
  'AE3b invalid: public App.selectCulture rejects culture switch that would drop source-backed spells');

reload();

const ae3bIdempotentAgentCultSelect = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Idempotent Arkat Select', concept:'Arkat sorcerer reselects cult'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult('Arkat');
  App.agent.toggleSpell('Holdfast');
  const before = App.agent.getMagicState();
  const result = App.agent.selectCult('Arkat');
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae3bIdempotentAgentCultSelect.before.cultName === 'Arkat' &&
  ae3bIdempotentAgentCultSelect.before.selectedSpells.includes('Holdfast') &&
  ae3bIdempotentAgentCultSelect.result?.success === true &&
  ae3bIdempotentAgentCultSelect.after.cultName === 'Arkat' &&
  ae3bIdempotentAgentCultSelect.after.sorcerySourceLabel === 'Arkat' &&
  ae3bIdempotentAgentCultSelect.after.selectedSpells.includes('Holdfast'),
  'AE3b valid: App.agent.selectCult is idempotent for current sorcery cult with spells');

reload();

const ae3bPublicToggleMismatch = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Public Toggle Mismatch', concept:'God Forgot school sorcerer'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:[{name:'Invocation (Cult, School or Grimoire)', specialization:'Zzistori School'}, 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  const cultResult = App.selectCult('Arkat');
  const before = App.agent.getMagicState();
  const toggle = App.toggleSorcerySpell('Holdfast');
  const after = App.agent.getMagicState();
  return {cultResult, before, toggle, after};
})())`);
assert(ae3bPublicToggleMismatch.cultResult?.success === true &&
  ae3bPublicToggleMismatch.before.cultName === 'Arkat' &&
  ae3bPublicToggleMismatch.before.selectedSpells.length === 0 &&
  ae3bPublicToggleMismatch.toggle?.success === false &&
  ae3bPublicToggleMismatch.after.selectedSpells.length === 0,
  'AE3b invalid: public App.toggleSorcerySpell rejects mismatched Invocation source');

const ae3bAgentToggleMismatch = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Agent Toggle Mismatch', concept:'God Forgot school sorcerer'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:[{name:'Invocation (Cult, School or Grimoire)', specialization:'Zzistori School'}, 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  const cultResult = App.agent.selectCult('Arkat');
  const before = App.agent.getMagicState();
  const toggle = App.agent.toggleSpell('Holdfast');
  const after = App.agent.getMagicState();
  return {cultResult, before, toggle, after};
})())`);
assert(ae3bAgentToggleMismatch.cultResult?.success === true &&
  ae3bAgentToggleMismatch.before.cultName === 'Arkat' &&
  ae3bAgentToggleMismatch.before.selectedSpells.length === 0 &&
  ae3bAgentToggleMismatch.toggle?.success === false &&
  ae3bAgentToggleMismatch.after.selectedSpells.length === 0,
  'AE3b invalid: App.agent.toggleSpell rejects mismatched Invocation source after zero-spell cult selection');

const ae3bRollbackFromZeroSpellMismatch = evalPageJSON(`JSON.stringify((() => {
  const invalidBuild = App.agent.buildCharacter({step1:{name:'Rejected From Zero Mismatch',concept:'Rejected rollback from allowed mismatch'},step2:{characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}},step4:{culture:'God Forgot',homeland:'God Forgot'},step5:{culturalSkills:{Athletics:10,Endurance:10,'First Aid':15,Locale:15,Perception:15,Willpower:15,Influence:10,Insight:10},runeAffinities:{primary:'Law',secondary:'Truth',tertiary:'Stasis'},folkMagicSpells:['Avert','Calm','Calculate']},step6:{passions:[{type:'Loyalty',subject:'Zzistori School',value:47},{type:'Love',subject:'Knowledge',value:47}]},step7:{age:21,gender:'Male',family:'Zzistori school cell'},step8:{career:'Sorcerer',professionalSkills:[{name:'Invocation (Cult, School or Grimoire)',specialization:'Arkat'},'Shaping',{name:'Lore (any)',specialization:'Sorcery'}]},step9:{cult:null,sorcerySpells:['Holdfast']},step10:{careerSkills:{Customs:10,Deceit:10,Influence:10,Insight:10,Locale:10,Perception:10,Willpower:10,'Invocation (Arkat)':10,Shaping:10,'Lore (Sorcery)':10},careerFolkMagic:['Appraise','Befuddle']},step11:{bonusSkills:{Customs:15,Deceit:15,Influence:15,Insight:15,Locale:15,Perception:15,Willpower:15,'Invocation (Arkat)':15,Shaping:15,'Lore (Sorcery)':15}},step12:{socialClass:'Freeman'}});
  const afterBuild = App.agent.getMagicState();
  return {invalidBuild, afterBuild};
})())`);
assert(ae3bRollbackFromZeroSpellMismatch.invalidBuild.success === false &&
  ae3bRollbackFromZeroSpellMismatch.invalidBuild.failedStep === 9 &&
  ae3bRollbackFromZeroSpellMismatch.afterBuild.cultName === 'Arkat' &&
  ae3bRollbackFromZeroSpellMismatch.afterBuild.sorcerySourceLabel === 'Arkat' &&
  ae3bRollbackFromZeroSpellMismatch.afterBuild.selectedSpells.length === 0,
  'AE3b invalid: failed buildCharacter restores public zero-spell source mismatch snapshot');

const ae3bUnknownPublicCult = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Unknown Cult Guard', concept:'Valid Arkat sorcerer'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Invocation', 'Shaping', {name:'Lore (any)', specialization:'Sorcery'}]});
  App.agent.selectCult('Arkat');
  App.agent.toggleSpell('Holdfast');
  const before = App.agent.getMagicState();
  let result;
  try {
    result = App.selectCult('Typo Cult');
  } catch (error) {
    result = {success:false, error:String(error && error.message || error), threw:true};
  }
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae3bUnknownPublicCult.before.cultName === 'Arkat' &&
  ae3bUnknownPublicCult.result?.success === false &&
  ae3bUnknownPublicCult.result?.threw !== true &&
  ae3bUnknownPublicCult.result?.pendingConfirmation !== true &&
  ae3bUnknownPublicCult.after.cultName === ae3bUnknownPublicCult.before.cultName &&
  JSON.stringify(ae3bUnknownPublicCult.after.selectedSpells) === JSON.stringify(ae3bUnknownPublicCult.before.selectedSpells),
  'AE3b invalid: public App.selectCult rejects unknown cult without mutating state');

const ae3bNoSourceSpellToggles = evalPageJSON(`JSON.stringify((() => {
  CharacterData.culture = 'God Forgot';
  CharacterData.career = 'Warrior';
  CharacterData.cult = null;
  CharacterData.cultType = null;
  CharacterData.selectedProfessionalSkills = [];
  CharacterData.sorcerySpells = [];
  const agentToggle = App.agent.toggleSpell('Holdfast');
  const afterAgent = App.agent.getMagicState();
  const publicToggle = App.toggleSorcerySpell('Holdfast');
  const afterPublic = App.agent.getMagicState();
  return {agentToggle, afterAgent, publicToggle, afterPublic};
})())`);
assert(ae3bNoSourceSpellToggles.agentToggle?.success === false &&
  ae3bNoSourceSpellToggles.afterAgent.selectedSpells.length === 0 &&
  ae3bNoSourceSpellToggles.publicToggle?.success === false &&
  ae3bNoSourceSpellToggles.afterPublic.selectedSpells.length === 0,
  'AE3b invalid: sorcery spell toggles reject missing active source');

const ae3bGenericWithMismatch = evalPageJSON(`JSON.stringify(App.agent.buildCharacter({step1:{name:'Generic Invocation Zzistori',concept:'Generic Invocation with stale specialization'},step2:{characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}},step4:{culture:'God Forgot',homeland:'God Forgot'},step5:{culturalSkills:{Athletics:10,Endurance:10,'First Aid':15,Locale:15,Perception:15,Willpower:15,Influence:10,Insight:10},runeAffinities:{primary:'Law',secondary:'Truth',tertiary:'Stasis'},folkMagicSpells:['Avert','Calm','Calculate']},step6:{passions:[{type:'Loyalty',subject:'Zzistori School',value:47},{type:'Love',subject:'Knowledge',value:47}]},step7:{age:21,gender:'Male',family:'Zzistori school cell'},step8:{career:'Sorcerer',professionalSkills:['Invocation',{name:'Invocation (Cult, School or Grimoire)',specialization:'Arkat'},'Shaping']},step9:{cult:null,sorcerySpells:['Holdfast']},step10:{careerSkills:{Customs:10,Deceit:10,Influence:10,Insight:10,Locale:10,Perception:10,Willpower:10,Invocation:10,'Invocation (Arkat)':10,Shaping:10},careerFolkMagic:['Appraise','Befuddle']},step11:{bonusSkills:{Customs:15,Deceit:15,Influence:15,Insight:15,Locale:15,Perception:15,Willpower:15,Invocation:15,'Invocation (Arkat)':15,Shaping:15}},step12:{socialClass:'Freeman'}}))`);
assert(ae3bGenericWithMismatch.success === true &&
  ae3bGenericWithMismatch.character?.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bGenericWithMismatch.character?.sorcerySpells?.includes('Holdfast'),
  'AE3b valid: generic RAW Invocation satisfies Zzistori even with another Invocation specialization');

const ae3bInjectedGenericInvocation = evalPageJSON(`JSON.stringify(App.agent.buildCharacter({step1:{name:'Injected Invocation Zzistori',concept:'Injected generic Invocation allocation'},step2:{characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}},step4:{culture:'God Forgot',homeland:'God Forgot'},step5:{culturalSkills:{Athletics:10,Endurance:10,'First Aid':15,Locale:15,Perception:15,Willpower:15,Influence:10,Insight:10},runeAffinities:{primary:'Law',secondary:'Truth',tertiary:'Stasis'},folkMagicSpells:['Avert','Calm','Calculate']},step6:{passions:[{type:'Loyalty',subject:'Zzistori School',value:47},{type:'Love',subject:'Knowledge',value:47}]},step7:{age:21,gender:'Male',family:'Zzistori school cell'},step8:{career:'Sorcerer',professionalSkills:[{name:'Invocation (Cult, School or Grimoire)',specialization:'Arkat'},'Shaping',{name:'Lore (any)',specialization:'Sorcery'}]},step9:{cult:null,sorcerySpells:['Holdfast']},step10:{careerSkills:{Customs:10,Deceit:10,Influence:10,Insight:10,Locale:10,Perception:10,Willpower:10,'Invocation (Arkat)':10,Shaping:10,Invocation:10},careerFolkMagic:['Appraise','Befuddle']},step11:{bonusSkills:{Customs:15,Deceit:15,Influence:15,Insight:15,Locale:15,Perception:15,Willpower:15,'Invocation (Arkat)':15,Shaping:15,Invocation:15}},step12:{socialClass:'Freeman'}}))`);
assert(ae3bInjectedGenericInvocation.success === false &&
  ae3bInjectedGenericInvocation.failedStep === 9 &&
  ae3bInjectedGenericInvocation.errors.some(error => /Invocation specialization/i.test(error) && /Zzistori School/.test(error)),
  'AE3b invalid: injected generic Invocation allocation does not satisfy Zzistori source');

const ae3bInjectedSpecializedInvocation = evalPageJSON(`JSON.stringify(App.agent.buildCharacter({step1:{name:'Injected Specialized Invocation',concept:'Injected Zzistori Invocation allocation'},step2:{characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}},step4:{culture:'God Forgot',homeland:'God Forgot'},step5:{culturalSkills:{Athletics:10,Endurance:10,'First Aid':15,Locale:15,Perception:15,Willpower:15,Influence:10,Insight:10},runeAffinities:{primary:'Law',secondary:'Truth',tertiary:'Stasis'},folkMagicSpells:['Avert','Calm','Calculate']},step6:{passions:[{type:'Loyalty',subject:'Zzistori School',value:47},{type:'Love',subject:'Knowledge',value:47}]},step7:{age:21,gender:'Male',family:'Zzistori school cell'},step8:{career:'Sorcerer',professionalSkills:['Shaping',{name:'Lore (any)',specialization:'Sorcery'},'Literacy']},step9:{cult:null,sorcerySpells:['Holdfast']},step10:{careerSkills:{Customs:10,Deceit:10,Influence:10,Insight:10,Locale:10,Perception:10,Willpower:10,'Invocation (Zzistori School)':10,Shaping:10,Literacy:10},careerFolkMagic:['Appraise','Befuddle']},step11:{bonusSkills:{Customs:15,Deceit:15,Influence:15,Insight:15,Locale:15,Perception:15,Willpower:15,'Invocation (Zzistori School)':15,Shaping:15,Literacy:15}},step12:{socialClass:'Freeman'}}))`);
assert(ae3bInjectedSpecializedInvocation.success === false &&
  ae3bInjectedSpecializedInvocation.failedStep === 9 &&
  ae3bInjectedSpecializedInvocation.errors.some(error => /Invocation specialization/i.test(error) && /Zzistori School/.test(error)),
  'AE3b invalid: injected specialized Invocation allocation does not satisfy Zzistori source');

const ae3bInvalidSpells = evalPageJSON(`JSON.stringify(App.agent.buildCharacter({step1:{name:'Invalid Zzistori',concept:'Bad spell import'},step2:{characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}},step4:{culture:'God Forgot',homeland:'God Forgot'},step5:{culturalSkills:{Athletics:10,Endurance:10,'First Aid':15,Locale:15,Perception:15,Willpower:15,Influence:10,Insight:10},runeAffinities:{primary:'Law',secondary:'Truth',tertiary:'Stasis'},folkMagicSpells:['Avert','Calm','Calculate']},step6:{passions:[{type:'Loyalty',subject:'Zzistori School',value:47},{type:'Love',subject:'Knowledge',value:47}]},step7:{age:21,gender:'Male',family:'Zzistori school cell'},step8:{career:'Sorcerer',professionalSkills:[{name:'Invocation (Cult, School or Grimoire)',specialization:'Zzistori School'},{name:'Shaping'},{name:'Lore (any)',specialization:'Sorcery'}]},step9:{cult:null,sorcerySpells:['Bogus A','Bogus B','Bogus C']},step10:{careerSkills:{Customs:10,Deceit:10,Influence:10,Insight:10,Locale:10,Perception:10,Willpower:10,'Invocation (Zzistori School)':10,Shaping:10,'Lore (Sorcery)':10},careerFolkMagic:['Appraise','Befuddle']},step11:{bonusSkills:{Customs:15,Deceit:15,Influence:15,Insight:15,Locale:15,Perception:15,Willpower:15,'Invocation (Zzistori School)':15,Shaping:15,'Lore (Sorcery)':15}},step12:{socialClass:'Freeman'}}))`);
assert(ae3bInvalidSpells.success === false &&
  ae3bInvalidSpells.failedStep === 9 &&
  ae3bInvalidSpells.errors.some(error => /unknown sorcery spell/i.test(error)),
  'AE3b invalid: buildCharacter rejects unknown Zzistori sorcery spells');

const ae3bWrongSchool = evalPageJSON(`JSON.stringify(App.agent.buildCharacter({step1:{name:'Wrong School Zzistori',concept:'Bad school import'},step2:{characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}},step4:{culture:'God Forgot',homeland:'God Forgot'},step5:{culturalSkills:{Athletics:10,Endurance:10,'First Aid':15,Locale:15,Perception:15,Willpower:15,Influence:10,Insight:10},runeAffinities:{primary:'Law',secondary:'Truth',tertiary:'Stasis'},folkMagicSpells:['Avert','Calm','Calculate']},step6:{passions:[{type:'Loyalty',subject:'Zzistori School',value:47},{type:'Love',subject:'Knowledge',value:47}]},step7:{age:21,gender:'Male',family:'Zzistori school cell'},step8:{career:'Sorcerer',professionalSkills:[{name:'Invocation (Cult, School or Grimoire)',specialization:'Arkat'},{name:'Shaping'},{name:'Lore (any)',specialization:'Sorcery'}]},step9:{cult:null,sorcerySpells:['Holdfast']},step10:{careerSkills:{Customs:10,Deceit:10,Influence:10,Insight:10,Locale:10,Perception:10,Willpower:10,'Invocation (Arkat)':10,Shaping:10,'Lore (Sorcery)':10},careerFolkMagic:['Appraise','Befuddle']},step11:{bonusSkills:{Customs:15,Deceit:15,Influence:15,Insight:15,Locale:15,Perception:15,Willpower:15,'Invocation (Arkat)':15,Shaping:15,'Lore (Sorcery)':15}},step12:{socialClass:'Freeman'}}))`);
assert(ae3bWrongSchool.success === false &&
  ae3bWrongSchool.failedStep === 9 &&
  ae3bWrongSchool.errors.some(error => /Invocation specialization/i.test(error) && /Zzistori School/.test(error)),
  'AE3b invalid: buildCharacter rejects Arkat Invocation for No Cult Zzistori');

const ae3bWrongCultSchool = evalPageJSON(`JSON.stringify(App.agent.buildCharacter({step1:{name:'Wrong Cult School',concept:'Bad cult school import'},step2:{characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}},step4:{culture:'God Forgot',homeland:'God Forgot'},step5:{culturalSkills:{Athletics:10,Endurance:10,'First Aid':15,Locale:15,Perception:15,Willpower:15,Influence:10,Insight:10},runeAffinities:{primary:'Law',secondary:'Truth',tertiary:'Stasis'},folkMagicSpells:['Avert','Calm','Calculate']},step6:{passions:[{type:'Loyalty',subject:'Zzistori School',value:47},{type:'Love',subject:'Knowledge',value:47}]},step7:{age:21,gender:'Male',family:'Zzistori school cell'},step8:{career:'Sorcerer',professionalSkills:[{name:'Invocation (Cult, School or Grimoire)',specialization:'Zzistori School'},{name:'Shaping'},{name:'Lore (any)',specialization:'Sorcery'}]},step9:{cult:'Arkat',sorcerySpells:['Holdfast']},step10:{careerSkills:{Customs:10,Deceit:10,Influence:10,Insight:10,Locale:10,Perception:10,Willpower:10,'Invocation (Zzistori School)':10,Shaping:10,'Lore (Sorcery)':10},careerFolkMagic:['Appraise','Befuddle']},step11:{bonusSkills:{Customs:15,Deceit:15,Influence:15,Insight:15,Locale:15,Perception:15,Willpower:15,'Invocation (Zzistori School)':15,Shaping:15,'Lore (Sorcery)':15}},step12:{socialClass:'Freeman'}}))`);
assert(ae3bWrongCultSchool.success === false &&
  ae3bWrongCultSchool.failedStep === 9 &&
  ae3bWrongCultSchool.errors.some(error => /Invocation specialization/i.test(error) && /Arkat/.test(error)),
  'AE3b invalid: buildCharacter rejects Zzistori Invocation for Arkat cult');

const ae3bMissingInvocationBase = {
  step1: { name: 'Missing Invocation', concept: 'No Invocation import' },
  step2: { characteristics: { STR: 8, CON: 10, SIZ: 10, DEX: 9, INT: 15, POW: 15, CHA: 8 } },
  step4: { culture: 'God Forgot', homeland: 'God Forgot' },
  step5: {
    culturalSkills: { Athletics: 10, Endurance: 10, 'First Aid': 15, Locale: 15, Perception: 15, Willpower: 15, Influence: 10, Insight: 10 },
    runeAffinities: { primary: 'Law', secondary: 'Truth', tertiary: 'Stasis' },
    folkMagicSpells: ['Avert', 'Calm', 'Calculate']
  },
  step6: { passions: [{ type: 'Loyalty', subject: 'Zzistori School', value: 47 }, { type: 'Love', subject: 'Knowledge', value: 47 }] },
  step7: { age: 21, gender: 'Male', family: 'Zzistori school cell' },
  step8: { career: 'Sorcerer', professionalSkills: ['Shaping', { name: 'Lore (any)', specialization: 'Sorcery' }, 'Literacy'] },
  step10: {
    careerSkills: { Customs: 10, Deceit: 10, Influence: 10, Insight: 10, Locale: 10, Perception: 10, Willpower: 10, Shaping: 10, 'Lore (Sorcery)': 10, Literacy: 10 },
    careerFolkMagic: ['Appraise', 'Befuddle']
  },
  step11: { bonusSkills: { Customs: 15, Deceit: 15, Influence: 15, Insight: 15, Locale: 15, Perception: 15, Willpower: 15, Shaping: 15, 'Lore (Sorcery)': 15, Literacy: 15 } },
  step12: { socialClass: 'Freeman' }
};
const ae3bMissingSchool = evalPageJSON(`JSON.stringify(App.agent.buildCharacter(${JSON.stringify({
  ...ae3bMissingInvocationBase,
  step1: { name: 'Missing Zzistori Invocation', concept: 'No Zzistori Invocation import' },
  step9: { cult: null, sorcerySpells: ['Holdfast'] }
})}))`);
assert(ae3bMissingSchool.success === false &&
  ae3bMissingSchool.failedStep === 9 &&
  ae3bMissingSchool.errors.some(error => /Invocation specialization/i.test(error) && /Zzistori School/.test(error)),
  'AE3b invalid: buildCharacter rejects missing Invocation for No Cult Zzistori');

const ae3bMissingCultSchool = evalPageJSON(`JSON.stringify(App.agent.buildCharacter(${JSON.stringify({
  ...ae3bMissingInvocationBase,
  step1: { name: 'Missing Arkat Invocation', concept: 'No Arkat Invocation import' },
  step9: { cult: 'Arkat', sorcerySpells: ['Holdfast'] }
})}))`);
assert(ae3bMissingCultSchool.success === false &&
  ae3bMissingCultSchool.failedStep === 9 &&
  ae3bMissingCultSchool.errors.some(error => /Invocation specialization/i.test(error) && /Arkat/.test(error)),
  'AE3b invalid: buildCharacter rejects missing Invocation for Arkat cult');

reload();

const ae3bToggleMissingInvocation = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Toggle Missing Invocation', concept:'No Invocation direct toggle'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Shaping', {name:'Lore (any)', specialization:'Sorcery'}, 'Literacy']});
  App.agent.selectCult(null);
  const before = App.agent.getMagicState();
  const toggle = App.agent.toggleSpell('Holdfast');
  const after = App.agent.getMagicState();
  return {before, toggle, after};
})())`);
assert(ae3bToggleMissingInvocation.before.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bToggleMissingInvocation.toggle.success === false &&
  /Invocation specialization/i.test(ae3bToggleMissingInvocation.toggle.error || '') &&
  ae3bToggleMissingInvocation.after.selectedSpells.length === 0,
  'AE3b invalid: toggleSpell rejects and does not mutate missing Invocation Zzistori');

reload();

const ae3bStep9Rollback = evalPageJSON(`JSON.stringify((() => {
  App.agent.setStep(1, {name:'Rollback Missing Invocation', concept:'Rejected Step 9 mutation'});
  App.agent.setStep(2, {characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}});
  App.agent.setStep(4, {culture:'God Forgot', homeland:'God Forgot'});
  App.agent.setStep(8, {career:'Sorcerer', professionalSkills:['Shaping', {name:'Lore (any)', specialization:'Sorcery'}, 'Literacy']});
  const before = App.agent.getMagicState();
  const result = App.agent.setStep(9, {cult:'Arkat', sorcerySpells:['Holdfast']});
  const after = App.agent.getMagicState();
  return {before, result, after};
})())`);
assert(ae3bStep9Rollback.before.cultName === null &&
  ae3bStep9Rollback.result.success === false &&
  ae3bStep9Rollback.result.errors.some(error => /Invocation specialization/i.test(error) && /Arkat/.test(error)) &&
  ae3bStep9Rollback.after.cultName === null &&
  ae3bStep9Rollback.after.selectedSpells.length === 0,
  'AE3b invalid: failed Step 9 Arkat set rolls back rejected cult and spells');

reload();

const ae3bBuildRollback = evalPageJSON(`JSON.stringify((() => {
  const validSpec = {step1:{name:'Rollback Valid Zzistori',concept:'Valid source-backed sorcerer'},step2:{characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:15,CHA:8}},step4:{culture:'God Forgot',homeland:'God Forgot'},step5:{culturalSkills:{Athletics:10,Endurance:10,'First Aid':15,Locale:15,Perception:15,Willpower:15,Influence:10,Insight:10},runeAffinities:{primary:'Law',secondary:'Truth',tertiary:'Stasis'},folkMagicSpells:['Avert','Calm','Calculate']},step6:{passions:[{type:'Loyalty',subject:'Zzistori School',value:47},{type:'Love',subject:'Knowledge',value:47}]},step7:{age:21,gender:'Male',family:'Zzistori school cell'},step8:{career:'Sorcerer',professionalSkills:['Invocation','Shaping',{name:'Lore (any)',specialization:'Sorcery'}]},step9:{cult:null,sorcerySpells:['Holdfast']},step10:{careerSkills:{Customs:10,Deceit:10,Influence:10,Insight:10,Locale:10,Perception:10,Willpower:10,Invocation:10,Shaping:10,'Lore (Sorcery)':10},careerFolkMagic:['Appraise','Befuddle']},step11:{bonusSkills:{Customs:15,Deceit:15,Influence:15,Insight:15,Locale:15,Perception:15,Willpower:15,Invocation:15,Shaping:15,'Lore (Sorcery)':15}},step12:{socialClass:'Freeman'}};
  const valid = App.agent.buildCharacter(validSpec);
  const before = App.agent.getMagicState();
  const invalidEarly = App.agent.buildCharacter({...validSpec, step1:{name:'Rejected Forged Step 8',concept:'Rejected early build'}, step8:{career:'Farmer', professionalSkills:['Invocation','Commerce','Track']}});
  const afterEarly = App.agent.getMagicState();
  const invalid = App.agent.buildCharacter(${JSON.stringify({
    ...ae3bMissingInvocationBase,
    step1: { name: 'Rejected BuildCharacter', concept: 'Rejected complete build' },
    step9: { cult: 'Arkat', sorcerySpells: ['Holdfast'] }
  })});
  const afterMissing = App.agent.getMagicState();
  const invalidEmpty = App.agent.buildCharacter({...validSpec, step1:{name:'Rejected Empty Spells',concept:'Rejected empty sorcery build'}, step9:{cult:null, sorcerySpells:[]}});
  const afterEmpty = App.agent.getMagicState();
  const invalidOverLimit = App.agent.buildCharacter({...validSpec, step1:{name:'Rejected Too Many Spells',concept:'Rejected over-limit sorcery build'}, step9:{cult:null, sorcerySpells:['Holdfast','Animate (Substance)','Project (Sense)','Wrack (Substance or Harm)']}});
  const afterOverLimit = App.agent.getMagicState();
  const invalidDeferredThenStep10 = App.agent.buildCharacter({
    ...validSpec,
    step1:{name:'Rejected Deferred Step 9',concept:'Rejected later step build'},
    step9:{cult:null, sorcerySpells:[]},
    step10:{careerSkills:{Customs:10}, careerFolkMagic:[]}
  });
  const afterDeferredThenStep10 = App.agent.getMagicState();
  const invalidValidSorceryThenStep10 = App.agent.buildCharacter({
    ...validSpec,
    step1:{name:'Rejected Valid Sorcery Step 10',concept:'Rejected later step build with valid sorcery state'},
    step10:{careerSkills:{Customs:10,Deceit:10,Influence:10,Insight:10,Locale:10,Perception:10,Willpower:10,Invocation:10,Shaping:10,'Lore (Sorcery)':9},careerFolkMagic:['Appraise','Befuddle']}
  });
  const afterValidSorceryThenStep10 = App.agent.getMagicState();
  const afterValidSorceryThenStep10State = App.agent.getState();
  return {valid, before, invalidEarly, afterEarly, invalid, afterMissing, invalidEmpty, afterEmpty, invalidOverLimit, afterOverLimit, invalidDeferredThenStep10, afterDeferredThenStep10, invalidValidSorceryThenStep10, afterValidSorceryThenStep10, afterValidSorceryThenStep10State};
})())`);
assert(ae3bBuildRollback.valid.success === true &&
  ae3bBuildRollback.before.sorcerySourceLabel === 'Zzistori School (God Forgot sorcery)' &&
  ae3bBuildRollback.before.selectedSpells.includes('Holdfast') &&
  ae3bBuildRollback.invalidEarly.success === false &&
  ae3bBuildRollback.invalidEarly.failedStep === 8 &&
  ae3bBuildRollback.afterEarly.sorcerySourceLabel === ae3bBuildRollback.before.sorcerySourceLabel &&
  JSON.stringify(ae3bBuildRollback.afterEarly.selectedSpells) === JSON.stringify(ae3bBuildRollback.before.selectedSpells) &&
  ae3bBuildRollback.invalid.success === false &&
  ae3bBuildRollback.invalid.failedStep === 9 &&
  ae3bBuildRollback.afterMissing.sorcerySourceLabel === ae3bBuildRollback.before.sorcerySourceLabel &&
  JSON.stringify(ae3bBuildRollback.afterMissing.selectedSpells) === JSON.stringify(ae3bBuildRollback.before.selectedSpells) &&
  ae3bBuildRollback.invalidEmpty.success === false &&
  ae3bBuildRollback.invalidEmpty.failedStep === 9 &&
  ae3bBuildRollback.afterEmpty.sorcerySourceLabel === ae3bBuildRollback.before.sorcerySourceLabel &&
  JSON.stringify(ae3bBuildRollback.afterEmpty.selectedSpells) === JSON.stringify(ae3bBuildRollback.before.selectedSpells) &&
  ae3bBuildRollback.invalidOverLimit.success === false &&
  ae3bBuildRollback.invalidOverLimit.failedStep === 9 &&
  ae3bBuildRollback.afterOverLimit.sorcerySourceLabel === ae3bBuildRollback.before.sorcerySourceLabel &&
  JSON.stringify(ae3bBuildRollback.afterOverLimit.selectedSpells) === JSON.stringify(ae3bBuildRollback.before.selectedSpells) &&
  ae3bBuildRollback.invalidDeferredThenStep10.success === false &&
  ae3bBuildRollback.invalidDeferredThenStep10.failedStep === 10 &&
  ae3bBuildRollback.afterDeferredThenStep10.sorcerySourceLabel === ae3bBuildRollback.before.sorcerySourceLabel &&
  JSON.stringify(ae3bBuildRollback.afterDeferredThenStep10.selectedSpells) === JSON.stringify(ae3bBuildRollback.before.selectedSpells) &&
  ae3bBuildRollback.invalidValidSorceryThenStep10.success === false &&
  ae3bBuildRollback.invalidValidSorceryThenStep10.failedStep === 10 &&
  ae3bBuildRollback.afterValidSorceryThenStep10.sorcerySourceLabel === ae3bBuildRollback.before.sorcerySourceLabel &&
  JSON.stringify(ae3bBuildRollback.afterValidSorceryThenStep10.selectedSpells) === JSON.stringify(ae3bBuildRollback.before.selectedSpells) &&
  ae3bBuildRollback.afterValidSorceryThenStep10State.name === 'Rollback Valid Zzistori',
  'AE3b invalid: failed buildCharacter restores previous accepted magic state');

reload();

const ae3bBuildDeferredNonSorceryRollback = evalPageJSON(`JSON.stringify((() => {
  const validArkatSpec = {step1:{name:'Arkat Rollback Baseline',concept:'Existing Arkat sorcerer'},step2:{characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:13,CHA:10}},step4:{culture:'God Forgot',homeland:'God Forgot'},step5:{culturalSkills:{Athletics:10,Endurance:10,'First Aid':15,Locale:15,Perception:15,Willpower:15,Influence:10,Insight:10},runeAffinities:{primary:'Law',secondary:'Truth',tertiary:'Stasis'},folkMagicSpells:['Avert','Calm','Calculate']},step6:{passions:[{type:'Loyalty',subject:'Brithini Order',value:47},{type:'Love',subject:'Knowledge',value:47}]},step7:{age:21,gender:'Male',family:'House Malkion'},step8:{career:'Sorcerer',professionalSkills:['Invocation','Shaping',{name:'Lore (any)',specialization:'Sorcery'}]},step9:{cult:'Arkat',sorcerySpells:['Holdfast']},step10:{careerSkills:{Willpower:15,Perception:15,Locale:15,Influence:15,Insight:15,'First Aid':10,Endurance:10,Athletics:5},careerFolkMagic:['Appraise','Befuddle']},step11:{bonusSkills:{Willpower:15,Perception:15,Locale:15,Influence:15,Insight:15,'First Aid':15,Endurance:15,Athletics:15,'Lore (Sorcery)':15,'Lore (Philosophy)':15}},step12:{socialClass:'Freeman'}};
  const valid = App.agent.buildCharacter(validArkatSpec);
  const before = App.agent.getMagicState();
  const invalid = App.agent.buildCharacter({
    ...validArkatSpec,
    step1:{name:'Rejected Orlanth Deferred Step 9',concept:'Invalid non-sorcery magic payload'},
    step9:{cult:'Orlanth', miracles:[]}
  });
  const after = App.agent.getMagicState();
  const afterState = App.agent.getState();
  return {valid, before, invalid, after, afterState};
})())`);
assert(ae3bBuildDeferredNonSorceryRollback.valid.success === true &&
  ae3bBuildDeferredNonSorceryRollback.before.cultName === 'Arkat' &&
  ae3bBuildDeferredNonSorceryRollback.before.sorcerySourceLabel === 'Arkat' &&
  ae3bBuildDeferredNonSorceryRollback.before.selectedSpells.includes('Holdfast') &&
  ae3bBuildDeferredNonSorceryRollback.invalid.success === false &&
  ae3bBuildDeferredNonSorceryRollback.invalid.failedStep === 9 &&
  ae3bBuildDeferredNonSorceryRollback.invalid.errors.some(error => /miracle/i.test(error)) &&
  ae3bBuildDeferredNonSorceryRollback.after.cultName === 'Arkat' &&
  ae3bBuildDeferredNonSorceryRollback.after.sorcerySourceLabel === 'Arkat' &&
  ae3bBuildDeferredNonSorceryRollback.after.selectedSpells.includes('Holdfast') &&
  ae3bBuildDeferredNonSorceryRollback.afterState.name === 'Arkat Rollback Baseline',
  'AE3b invalid: failed deferred Step 9 buildCharacter restores previous sorcery state');

reload();

const ae3bBuildNonSorceryPayloadSpells = evalPageJSON(`JSON.stringify((() => {
  const invalid = App.agent.buildCharacter({step1:{name:'Rejected Orlanth Sorcery Payload',concept:'Forged non-sorcery spell payload'},step2:{characteristics:{STR:14,CON:12,SIZ:11,DEX:10,INT:9,POW:12,CHA:7}},step4:{culture:'Sartarite (Heortling)',homeland:'Boldhome'},step5:{culturalSkills:{Athletics:15,Brawn:15,Endurance:15,Evade:10,Locale:10,Perception:10,Willpower:15,Ride:10},runeAffinities:{primary:'Air',secondary:'Movement',tertiary:'Death'},folkMagicSpells:['Bladesharp','Fanaticism','Protection']},step6:{passions:[{type:'Loyalty',subject:'Colymar Tribe',value:47},{type:'Hate',subject:'Lunars',value:47}]},step7:{age:21,gender:'Male',family:'Blackspear clan'},step8:{career:'Warrior',professionalSkills:[{name:'Lore (any)',specialization:'Tactics'},{name:'Craft (any)',specialization:'Weaponsmithing'},{name:'Survival'}]},step9:{cult:'Orlanth',miracles:['Shield','Lightning','Wind Words','Flight','Extension','Summon Sylph'],sorcerySpells:['Holdfast']},step10:{careerSkills:{Athletics:15,Brawn:15,Endurance:15,Evade:10,Unarmed:10,'Combat Style (Hill Clan Levy)':15,'Lore (Tactics)':10,Survival:10},careerFolkMagic:['Disruption','Vigour']},step11:{bonusSkills:{Athletics:15,Brawn:15,Endurance:15,Evade:15,Willpower:15,Unarmed:15,'Combat Style (Hill Clan Levy)':15,'Lore (Tactics)':15,Survival:15,Perception:15}},step12:{socialClass:'Freeman'}});
  const after = App.agent.getMagicState();
  const state = App.agent.getState();
  return {invalid, after, state};
})())`);
assert(ae3bBuildNonSorceryPayloadSpells.invalid.success === false &&
  ae3bBuildNonSorceryPayloadSpells.invalid.failedStep === 9 &&
  ae3bBuildNonSorceryPayloadSpells.invalid.errors.some(error => /active sorcery source/i.test(error)) &&
  ae3bBuildNonSorceryPayloadSpells.after.sorcerySourceLabel === null &&
  ae3bBuildNonSorceryPayloadSpells.after.selectedSpells.length === 0 &&
  ae3bBuildNonSorceryPayloadSpells.state.name === '',
  'AE3b invalid: buildCharacter rejects non-sorcery cult sorcery spell payload');

reload();

const ae3bBuildNonArraySpellPayload = evalPageJSON(`JSON.stringify((() => {
  const validArkatSpec = {step1:{name:'Non-Array Payload Baseline',concept:'Existing Arkat sorcerer'},step2:{characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:15,POW:13,CHA:10}},step4:{culture:'God Forgot',homeland:'God Forgot'},step5:{culturalSkills:{Athletics:10,Endurance:10,'First Aid':15,Locale:15,Perception:15,Willpower:15,Influence:10,Insight:10},runeAffinities:{primary:'Law',secondary:'Truth',tertiary:'Stasis'},folkMagicSpells:['Avert','Calm','Calculate']},step6:{passions:[{type:'Loyalty',subject:'Brithini Order',value:47},{type:'Love',subject:'Knowledge',value:47}]},step7:{age:21,gender:'Male',family:'House Malkion'},step8:{career:'Sorcerer',professionalSkills:['Invocation','Shaping',{name:'Lore (any)',specialization:'Sorcery'}]},step9:{cult:'Arkat',sorcerySpells:['Holdfast']},step10:{careerSkills:{Willpower:15,Perception:15,Locale:15,Influence:15,Insight:15,'First Aid':10,Endurance:10,Athletics:5},careerFolkMagic:['Appraise','Befuddle']},step11:{bonusSkills:{Willpower:15,Perception:15,Locale:15,Influence:15,Insight:15,'First Aid':15,Endurance:15,Athletics:15,'Lore (Sorcery)':15,'Lore (Philosophy)':15}},step12:{socialClass:'Freeman'}};
  const valid = App.agent.buildCharacter(validArkatSpec);
  const before = App.agent.getMagicState();
  const invalid = App.agent.buildCharacter({step1:{name:'Rejected Non-Array Step 9',concept:'Malformed spell payload'},step2:{characteristics:{STR:8,CON:10,SIZ:10,DEX:9,INT:13,POW:12,CHA:13}},step4:{culture:'Esrolian',homeland:'Nochet'},step8:{career:'Farmer',professionalSkills:['Commerce','Navigation','Survival']},step9:{cult:null,sorcerySpells:'Holdfast'}});
  const after = App.agent.getMagicState();
  const state = App.agent.getState();
  const invalidShape = App.agent.buildCharacter({...validArkatSpec, step1:{name:'Rejected Array Step 9',concept:'Malformed Step 9 shape'}, step9:[]});
  const afterShape = App.agent.getMagicState();
  const stateShape = App.agent.getState();
  const inheritedStep9 = Object.create({cult:'Arkat', sorcerySpells:['Holdfast']});
  const invalidInherited = App.agent.buildCharacter({...validArkatSpec, step1:{name:'Rejected Inherited Step 9',concept:'Inherited Step 9 fields'}, step9: inheritedStep9});
  const afterInherited = App.agent.getMagicState();
  const stateInherited = App.agent.getState();
  return {valid, before, invalid, after, state, invalidShape, afterShape, stateShape, invalidInherited, afterInherited, stateInherited};
})())`);
assert(ae3bBuildNonArraySpellPayload.valid.success === true &&
  ae3bBuildNonArraySpellPayload.before.cultName === 'Arkat' &&
  ae3bBuildNonArraySpellPayload.before.selectedSpells.includes('Holdfast') &&
  ae3bBuildNonArraySpellPayload.invalid.success === false &&
  ae3bBuildNonArraySpellPayload.invalid.failedStep === 9 &&
  ae3bBuildNonArraySpellPayload.invalid.errors.some(error => /sorcerySpells must be an array/i.test(error)) &&
  ae3bBuildNonArraySpellPayload.after.cultName === 'Arkat' &&
  ae3bBuildNonArraySpellPayload.after.selectedSpells.includes('Holdfast') &&
  ae3bBuildNonArraySpellPayload.state.name === 'Non-Array Payload Baseline' &&
  ae3bBuildNonArraySpellPayload.invalidShape.success === false &&
  ae3bBuildNonArraySpellPayload.invalidShape.failedStep === 9 &&
  ae3bBuildNonArraySpellPayload.invalidShape.errors.some(error => /Step 9 data object is required/i.test(error)) &&
  ae3bBuildNonArraySpellPayload.afterShape.cultName === 'Arkat' &&
  ae3bBuildNonArraySpellPayload.afterShape.selectedSpells.includes('Holdfast') &&
  ae3bBuildNonArraySpellPayload.stateShape.name === 'Non-Array Payload Baseline' &&
  ae3bBuildNonArraySpellPayload.invalidInherited.success === false &&
  ae3bBuildNonArraySpellPayload.invalidInherited.failedStep === 9 &&
  ae3bBuildNonArraySpellPayload.invalidInherited.errors.some(error => /own fields/i.test(error)) &&
  ae3bBuildNonArraySpellPayload.afterInherited.cultName === 'Arkat' &&
  ae3bBuildNonArraySpellPayload.afterInherited.selectedSpells.includes('Holdfast') &&
  ae3bBuildNonArraySpellPayload.stateInherited.name === 'Non-Array Payload Baseline',
  'AE3b invalid: buildCharacter rejects non-array sorcery spell payload and restores prior state');

// ═══════════════════════════════════════════════════════════════
console.log('\n\x1b[36m═══ AE4: Waha (Hybrid Theist+Animist) ═══\x1b[0m\n');
// ═══════════════════════════════════════════════════════════════

reload();

evalPageJSON(`JSON.stringify(App.agent.buildCharacter({step1:{name:'Biturian Varosh',concept:'Beast rider khan'},step2:{characteristics:{STR:13,CON:12,SIZ:10,DEX:10,INT:9,POW:12,CHA:9}},step4:{culture:'Praxian',homeland:'Prax'},step5:{culturalSkills:{Athletics:15,Endurance:15,'First Aid':10,Locale:10,Perception:15,Ride:15,Stealth:10,Navigate:10},runeAffinities:{primary:'Beast',secondary:'Man',tertiary:'Spirit'},folkMagicSpells:['Bladesharp','Heal','Fanaticism']},step6:{passions:[{type:'Devotion',subject:'Waha',value:47},{type:'Loyalty',subject:'Bison Tribe',value:47}]},step7:{age:21,gender:'Male',family:'Bison Riders'},step8:{career:'Warrior',professionalSkills:[{name:'Lore (any)',specialization:'Tactics'},{name:'Survival'},{name:'Oratory'}]},step9:{cult:'Waha',miracles:['Extension','Find (Specific Thing)','Divination','Chastise','Alter Creature'],boundSpirits:[{name:'Nature Spirit — Camouflage (Int 2)',type:'Nature',ability:'Camouflage'}]},step10:{careerSkills:{Athletics:15,Endurance:15,Perception:10,Ride:15,'First Aid':10,Stealth:10,Survival:15,Locale:10},careerFolkMagic:['Vigour','Calm']},step11:{bonusSkills:{Athletics:15,Endurance:15,Perception:15,Ride:15,Stealth:15,Survival:15,Locale:15,'Lore (Tactics)':15,Willpower:15,Oratory:15}},step12:{socialClass:'Freeman'}}))`);
const ae4 = evalPageJSON(`JSON.stringify(App.agent.getMagicState())`);

assert(ae4.cultType.primary === 'theist', 'AE4: Waha primary type is theist');
assert(ae4.cultType.isHybrid === true, 'AE4: Waha is hybrid');
assert(ae4.cultType.types.includes('theist'), 'AE4: Waha has theist type');
assert(ae4.cultType.types.includes('animist'), 'AE4: Waha has animist type');
assert(ae4.devotionalPool === 6, 'AE4: Devotional Pool = POW/2 = 6');
assert(ae4.boundSpiritSlots === 4, 'AE4: Bound Spirit Slots = CHA/2 = 4');
assert(ae4.sorceryResource === 0, 'AE4: No sorcery resource');
assert(ae4.selectedMiracles.length === 5, 'AE4: 5 available miracles selected (theist path)');
assert(ae4.selectedSpirits.length === 1, 'AE4: 1 bound spirit selected (animist path)');
assert(ae4.limits.spirits === 4, 'AE4: Spirit slot limit = CHA/2 = 4');

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
