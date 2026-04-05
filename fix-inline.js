// Script to fix index.html:
// 1. Inline GLORANTHA_CULTURES_DATA directly (remove window fallback)
// 2. Replace broken homelandData with GLORANTHA_HOMELAND_MAP data
// 3. Fix Step 11 duplicate rendering
// 4. Fix concept not showing in Step 11
// 5. Fix rune affinities null display
// 6. Call updateStepIndicator() from renderCurrentStep()

const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Read the canonical data from data/glorantha.js
const glorantha = fs.readFileSync('data/glorantha.js', 'utf8');

// Extract GLORANTHA_CULTURES_DATA (it's on line 6, a single long line, ; is on next line)
const culturesLine = glorantha.split('\n').find(l => l.startsWith('const GLORANTHA_CULTURES_DATA'));
const culturesData = culturesLine.replace('const GLORANTHA_CULTURES_DATA = ', '');

// Extract GLORANTHA_HOMELAND_MAP
const homelandLines = glorantha.split('\n');
let homelandStart = homelandLines.findIndex(l => l.includes('GLORANTHA_HOMELAND_MAP'));
let homelandEnd = homelandLines.findIndex((l, i) => i > homelandStart && l.startsWith('};'));
const homelandBlock = homelandLines.slice(homelandStart, homelandEnd + 1).join('\n');
const homelandObj = homelandBlock.match(/= (\{[\s\S]*\});/)[1];

// Extract GLORANTHA_SUGGESTED_BUILDS
let buildsStart = homelandLines.findIndex(l => l.includes('GLORANTHA_SUGGESTED_BUILDS'));
let buildsEnd = homelandLines.findIndex((l, i) => i > buildsStart && l.startsWith('};'));
const buildsBlock = homelandLines.slice(buildsStart, buildsEnd + 1).join('\n');
const buildsObj = buildsBlock.match(/= (\{[\s\S]*\});/)[1];

// === FIX 1: Replace CULTURES_DATA line to use inline data directly ===
const oldCulturesLine = `const CULTURES_DATA = window.GLORANTHA_CULTURES_DATA || [{"name":"Generic","type":"Barbarian","standardSkills":["Athletics","Brawn","Endurance","Evade","Locale","Perception","Stealth","Willpower"],"professionalSkills":["Commerce","Craft (any)","Healing","Lore (any)","Musicianship","Navigation","Survival"],"combatStyles":[{"name":"Militia","weapons":["Spear","Shield","Sword"],"traits":["Formation Fighting"]}],"folkMagic":["Bladesharp","Heal","Protection"],"passions":["Loyalty (Clan)"],"startingMoney":"4d6x10","careers":"Any"}];`;
const newCulturesLine = `const CULTURES_DATA = ${culturesData};`;

if (html.includes(oldCulturesLine)) {
  html = html.replace(oldCulturesLine, newCulturesLine);
  console.log('✓ Fix 1: Inlined GLORANTHA_CULTURES_DATA');
} else {
  console.log('✗ Fix 1: Could not find CULTURES_DATA line to replace');
  // Try a more lenient match
  const culturesRegex = /const CULTURES_DATA = window\.GLORANTHA_CULTURES_DATA \|\| \[.*?\];/;
  if (culturesRegex.test(html)) {
    html = html.replace(culturesRegex, newCulturesLine);
    console.log('✓ Fix 1 (regex): Inlined GLORANTHA_CULTURES_DATA');
  } else {
    console.log('✗ Fix 1 (regex): Also failed');
  }
}

// === FIX 2: Replace broken homelandData with correct keys ===
const oldHomelandBlock = `const homelandData = {
    'Balazaring': ['Balazar', 'Elder Wilds', 'Votankiland'],
    'Esrolian': ['Nochet', 'Esrolia', 'Ezel'],
    'God Forgot': ['God Forgot', 'Holy Country'],
    'Lunar Heartland': ['Glamour', 'Alkoth', 'Raibanth', 'Yuthuppa'],
    'Praxian': ['Prax', 'The Wastes', 'Pavis County'],
    'Provincial Lunar/Tarsh': ['Furthest', 'Alda-Chur', 'Dunstop'],
    'Sartarite/Heortling': ['Boldhome', 'Jonstown', 'Clearwine', 'Apple Lane'],
    'Telmori Hsunchen': ['Telmori Wilds', 'Sartar borders']
  };
  return homelandData[culture] || [];`;

const newHomelandBlock = `const homelandData = {
    'Balazaring': ['Balazar', 'Dykene', 'Elkoi', 'Trilus'],
    'Esrolian': ['Esrolia', 'Nochet', 'Ezel'],
    'God Forgot': ['God Forgot', 'Casino Town'],
    'Lunar Heartland': ['Lunar Heartland', 'Glamour', 'Alkoth', 'Yuthuppa'],
    'Lunar Provincial': ['Tarsh', 'Furthest', 'Bagnot', 'Alda-Chur'],
    'Praxian': ['Prax', 'Pimper\\x27s Block', 'Pavis County'],
    'Sartarite (Heortling)': ['Sartar', 'Boldhome', 'Clearwine', 'Jonstown', 'Swenstown', 'Wilmskirk', 'Apple Lane'],
    'Telmori Hsunchen': ['Telmori Wilds', 'Telmori Forest']
  };
  return homelandData[culture] || [];`;

if (html.includes(oldHomelandBlock)) {
  html = html.replace(oldHomelandBlock, newHomelandBlock);
  console.log('✓ Fix 2: Fixed homeland keys to match CULTURES_DATA names');
} else {
  console.log('✗ Fix 2: Could not find homeland block');
}

// === FIX 3: Fix Step 11 duplicate - renderCurrentStep should clear before append ===
// The issue is that renderStep11 is called and appended, but something else also appends it.
// Let's check: renderCurrentStep does container.innerHTML = '' then appendChild. 
// The duplicate might come from generateCharacterSummary being rendered BOTH inside the
// template literal AND as a separate block. Let me check the actual renderStep11 function.

// Actually from the browser snapshot, Step 11 shows TWO identical blocks with the same content.
// This means renderCurrentStep is being called twice, or the function returns a div that
// contains the content twice. Let me add the updateStepIndicator call too.

const oldRenderCurrentStep = `renderCurrentStep() {
    const container = document.getElementById('wizard-steps');
    container.innerHTML = '';
    
    const step = this[\`renderStep\${this.currentStep}\`]();
    container.appendChild(step);
  },`;

const newRenderCurrentStep = `renderCurrentStep() {
    const container = document.getElementById('wizard-steps');
    container.innerHTML = '';
    
    const step = this[\`renderStep\${this.currentStep}\`]();
    container.appendChild(step);
    this.updateStepIndicator();
  },`;

if (html.includes(oldRenderCurrentStep)) {
  html = html.replace(oldRenderCurrentStep, newRenderCurrentStep);
  console.log('✓ Fix 3a: Added updateStepIndicator() to renderCurrentStep()');
} else {
  console.log('✗ Fix 3a: Could not find renderCurrentStep');
}

// For the duplicate Step 11 content, check if generateCharacterSummary produces a block
// AND the template literal also produces a block. The renderStep11 function has:
//   ${this.generateCharacterSummary()}  <-- block 1
//   AND a separate div with all the same data  <-- block 2
// That's the duplication! Both generateCharacterSummary AND the inline template show the same info.

// Fix: Remove the generateCharacterSummary() call from renderStep11, keep only the detailed block.
const oldStep11Summary = `    <div class="character-summary">
      \${this.generateCharacterSummary()}
    </div>

    <div style="background: #f5f5f5; padding: 20px; border: 1px solid #000;">`;
const newStep11Summary = `    <div style="background: #f5f5f5; padding: 20px; border: 1px solid #000;">`;

if (html.includes(oldStep11Summary)) {
  html = html.replace(oldStep11Summary, newStep11Summary);
  console.log('✓ Fix 3b: Removed duplicate generateCharacterSummary() from Step 11');
} else {
  console.log('✗ Fix 3b: Could not find Step 11 summary block');
}

// === FIX 4: Add concept to Step 11 review ===
const oldStep11Career = `      <p><strong>Career:</strong> \${CharacterData.career}</p>
      <p><strong>Age:</strong> \${CharacterData.age}</p>`;
const newStep11Career = `      <p><strong>Career:</strong> \${CharacterData.career}</p>
      \${CharacterData.concept ? \`<p><strong>Concept:</strong> \${CharacterData.concept}</p>\` : ''}
      \${CharacterData.homeland ? \`<p><strong>Homeland:</strong> \${CharacterData.homeland}</p>\` : ''}
      <p><strong>Age:</strong> \${CharacterData.age}</p>`;

if (html.includes(oldStep11Career)) {
  html = html.replace(oldStep11Career, newStep11Career);
  console.log('✓ Fix 4: Added concept and homeland to Step 11 review');
} else {
  console.log('✗ Fix 4: Could not find Step 11 career block');
}

// === FIX 5: Fix rune affinities null display ===
const oldRuneDisplay = `Rune Affinities: \${CharacterData.runeAffinities.primary}, \${CharacterData.runeAffinities.secondary}, \${CharacterData.runeAffinities.tertiary}`;
const newRuneDisplay = `Rune Affinities: \${CharacterData.runeAffinities.primary || 'None'}, \${CharacterData.runeAffinities.secondary || 'None'}, \${CharacterData.runeAffinities.tertiary || 'None'}`;

if (html.includes(oldRuneDisplay)) {
  html = html.replace(oldRuneDisplay, newRuneDisplay);
  console.log('✓ Fix 5: Fixed rune affinities null display');
} else {
  console.log('✗ Fix 5: Could not find rune display string');
}

// === FIX 6: Remove data/glorantha.js script tag if present ===
const scriptTag1 = '<script src="data/glorantha.js"></script>';
const scriptTag2 = `<script src="data/glorantha.js"><\/script>`;
if (html.includes(scriptTag1)) {
  html = html.replace(scriptTag1, '<!-- Glorantha data inlined into CULTURES_DATA -->');
  console.log('✓ Fix 6: Removed external glorantha.js script tag');
} else if (html.includes(scriptTag2)) {
  html = html.replace(scriptTag2, '<!-- Glorantha data inlined into CULTURES_DATA -->');
  console.log('✓ Fix 6: Removed external glorantha.js script tag (alt)');
} else {
  console.log('- Fix 6: No external script tag found (already inline or loaded differently)');
}

fs.writeFileSync('index.html', html);
console.log('\nDone. Wrote updated index.html');
console.log('Lines:', html.split('\n').length);
