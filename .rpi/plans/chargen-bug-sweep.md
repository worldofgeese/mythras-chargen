# Plan: Character Generator Bug Sweep

**Status:** active
**Design:** `../designs/chargen-bug-sweep.md`
**Spec:** `../specs/chargen-bug-sweep.md`

## Overview

Fix 19 bugs across 3 phases, all in `index.html`. Each phase is independently testable and committable.

---

## Phase 1: Blocking UI Fixes

**Spec scenarios:** 1, 2, 3, 4, 5, 6

### Task 1.1: Fix miracle picker element target
**File:** `index.html` ~line 15302
**Change:** Replace `this.renderMiraclePicker(div)` with:
```javascript
const pickerEl = div.querySelector('#miracle-picker');
if (pickerEl) this.renderMiraclePicker(pickerEl);
```
**Verify:** Ensure `#miracle-picker` div exists in the Step 9 template. Check line ~15270-15295 for a `<div id="miracle-picker">` in the step HTML.

- [x] Fix the element target at line 15302
- [x] Verify miracle cards render AND remain clickable after picker renders
- [x] Manual test: select a cult, verify miracle cards toggle on click

### Task 1.2: Rune dropdown uniqueness
**File:** `index.html` ~lines 14750-14769
**Change:** Each `<select>` filters out runes already chosen in other slots. Extract a helper:
```javascript
const runeOptions = (slot) => {
  const others = ['primary','secondary','tertiary'].filter(s => s !== slot).map(s => CharacterData.runeAffinities[s]);
  return RUNES_DATA.filter(r => r.short_name === CharacterData.runeAffinities[slot] || !others.includes(r.short_name));
};
```
Then use `runeOptions('primary')` etc. in each dropdown template. Also add `App.renderCurrentStep()` call on change so dropdowns re-render with filtered options.

- [x] Add `runeOptions()` helper or inline filtering in the template
- [x] Each onchange triggers re-render of the step (already calls `App.saveToLocalStorage()` — add `App.renderCurrentStep()`)
- [x] Manual test: select Moon as Primary → Moon disappears from Secondary/Tertiary

### Task 1.3: Passion subject inputs for non-choice passions
**File:** `index.html` ~lines 15010-15014 (passion rendering in Step 6)
**Change:** When a passion has `needsSubject: true` (even without `choice`), render an editable text input with datalist instead of a readonly input:
```javascript
} else if (passion.needsSubject) {
  // Named passion that needs a subject (e.g. "Loyalty" → "Loyalty (Clan)")
  const currentSubject = passion.name.match(/\((.+)\)/)?.[1] || '';
  const baseName = passion.name.replace(/\s*\(.*\)/, '');
  row.innerHTML = `
    <div style="display: flex; gap: 4px; align-items: center;">
      <span style="font-weight: 600;">${baseName}</span>
      <input type="text" value="${currentSubject}" placeholder="(to what?)"
        list="passion-subject-${idx}"
        onchange="App.updatePassionNameSubject(${idx}, '${baseName}', this.value)"
        onblur="App.updatePassionNameSubject(${idx}, '${baseName}', this.value)">
      ${passion.subjectSuggestions?.length ? `<datalist id="passion-subject-${idx}">${passion.subjectSuggestions.map(s => `<option value="${s}">`).join('')}</datalist>` : ''}
    </div>
    <input type="number" value="${passion.value}" readonly>
  `;
} else { ... }
```
Also add `App.updatePassionNameSubject(idx, baseName, subject)` function.

- [x] Add `needsSubject` branch in passion rendering (before the generic `else`)
- [x] Add `App.updatePassionNameSubject` function that sets `passion.name = subject ? baseName + ' (' + subject + ')' : baseName`
- [x] Auto-resolve "Loyalty (City)" → "Loyalty (homeland)" at passion init time (line ~14546-14556): detect `(City)` token and replace with `CharacterData.homeland`

### Task 1.4: Inline specialization in Career step (Step 8)
**File:** `index.html` ~lines 15176-15196 (toggleProfessionalSkill) and ~15216+ (renderCareerDetails)
**Change:** When a professional skill checkbox is checked and `needsDisambiguation(skillName)`:
- Show an inline text input below the checkbox
- The skill is stored under its resolved name once user types specialization
- If user unchecks, remove the resolved name

In `renderCareerDetails()` (line ~15216), modify the professional skill checkboxes template to include a conditional input:
```javascript
${career.professionalSkills.map(skill => {
  const isChecked = (CharacterData.selectedProfessionalSkills || []).includes(skill);
  const needsSpec = needsDisambiguation(skill);
  const resolved = /* look up resolved name in careerSkills */;
  return `
    <label><input type="checkbox" ${isChecked ? 'checked' : ''}
      onchange="App.toggleProfessionalSkill('${skill}', this.checked)"> ${skill}</label>
    ${isChecked && needsSpec ? `<input type="text" placeholder="Enter specialization..."
      value="${resolved || ''}" list="spec-list-${skill}"
      onchange="App.resolveProfessionalSkill('${skill}', this.value)">` : ''}
  `;
}).join('')}
```
Add `App.resolveProfessionalSkill(originalName, specialization)` that:
1. Removes old key from `careerSkills`
2. Parses category from `parsePlaceholderSkill(originalName)`
3. Stores under `Category (specialization)` in `careerSkills`

- [x] Modify `renderCareerDetails()` to show inline input for placeholder skills
- [x] Add `App.resolveProfessionalSkill()` function
- [x] Update validation (line 13839-13844) — it should now be unreachable but keep as safety net
- [x] Manual test: select Fisher, check "Lore (Primary Catch)" → input appears, type "Trout" → stored as "Lore (Trout)"

### Task 1.5: Cult passion visibility notice
**File:** `index.html` ~line 15441-15450 (selectCult)
**Change:** After pushing the cult passion, show a toast or inline notice. Also ensure the passion renders in Step 6 when navigating back (it's already in `CharacterData.passions` so it should render — just verify it does, including the correct name).

In the Step 9 template (where miracle picker renders), add a notice div:
```javascript
if (CharacterData.cult) {
  const cultPassion = CharacterData.passions.find(p => p.name && p.name.includes(CharacterData.cult));
  if (cultPassion) {
    // render: "Cult Passion: Loyalty (Yelmalio): 21% added to your character"
  }
}
```

- [x] Add cult passion notice in Step 9 render (after cult selection, before miracle picker)
- [x] Verify Step 6 renders cult passion when user navigates back (check that non-choice passions from cult also render in the passions list)
- [x] Manual test: select Yelmalio → notice appears with passion name and value

### Phase 1 Success Criteria
- [x] Miracle cards toggle selection on click (Scenario 1)
- [x] Rune dropdowns prevent duplicate selection (Scenario 2)
- [x] Passions with needsSubject show editable input (Scenario 3)
- [x] "Loyalty (City)" auto-resolves to homeland (Scenario 4)
- [x] Career placeholder skills show inline input (Scenario 5)
- [x] Cult passion notice visible in Step 9 (Scenario 6)
- [x] Commit phase 1

---

## Phase 2: Data/Logic Fixes

**Spec scenarios:** 7, 8, 9, 10

### Task 2.1: Customs() display name
**File:** `index.html` ~line 16990 and ~line 17573
**Change:** In `compileAllSkills()`, after building the skills array, replace the name:
```javascript
skills.forEach(s => {
  if (s.name === 'Customs()') {
    s.name = `Customs (${CharacterData.culture || ''})`;
  }
});
```
This affects both the skills list in Play Mode and the PDF export since both use `compileAllSkills()`.

- [x] Add name substitution in `compileAllSkills()` (after line ~17028)
- [x] Verify PDF shows "Customs (Balazaring)" not "Customs()"

### Task 2.2: Combat style unification
**File:** `index.html` — PDF section (~17508-17523) and `compileAllSkills()` (~16979-17038)

**Change A — PDF COMBAT STYLES section uses full compiled value:**
At line 17515, replace `style.skill || 0` with the full compiled value:
```javascript
const compiledSkills = App.compileAllSkills();
combatStyles.forEach(style => {
  // Find matching compiled skill for this style
  const csKey = Object.keys(CharacterData.careerSkills).find(k => k.startsWith('Combat Style'))
    || `Combat Style (${style.name})`;
  const compiled = compiledSkills.find(s => s.name.includes('Combat Style'));
  const fullValue = compiled ? compiled.base + compiled.cultural + compiled.career + compiled.bonus : style.skill || 0;
  ...
});
```
Actually simpler: compute inline from the same sources `compileAllSkills` uses:
```javascript
const {STR, DEX} = CharacterData.characteristics;
const csBase = STR + DEX;
const csCultural = CharacterData.culturalSkills[`Combat Style (${style.name})`] || CharacterData.culturalSkills['Combat Style (Cultural Style)'] || 0;
const csCareer = CharacterData.careerSkills[`Combat Style (${style.name})`] || CharacterData.careerSkills['Combat Style (Cultural Style)'] || 0;
const csBonus = CharacterData.bonusSkills[`Combat Style (${style.name})`] || CharacterData.bonusSkills['Combat Style (Cultural Style)'] || 0;
const fullSkill = csBase + csCultural + csCareer + csBonus;
```

**Change B — Exclude combat styles from SKILLS section:**
In `compileAllSkills()` or in the PDF skills filter (line 17555-17556), add:
```javascript
.filter(s => !s.name.startsWith('Combat Style'))
```

- [x] Compute full combat style value in PDF COMBAT STYLES section
- [x] Exclude "Combat Style (*)" entries from PDF SKILLS section
- [x] Verify PDF shows single "Pony Cavalry: 47%" entry (not split)

### Task 2.3: Career professional skills shown at base value
**File:** `index.html` ~line 17015-17017
**Change:** Add condition for selected professional skills:
```javascript
const isProfessionalSkill = (CharacterData.selectedProfessionalSkills || []).some(ps => {
  // Match resolved names (e.g., "Lore (Trout)" resolved from "Lore (Primary Catch)")
  return skillName === ps || skillName.startsWith(ps.split('(')[0].trim());
});
if (isStandardSkill || hasPoints || isProfessionalSkill) {
  skills.push({...});
}
```

- [x] Add `isProfessionalSkill` condition to the skill inclusion check
- [x] Verify resolved career skills appear on PDF even with 0 allocated points

### Task 2.4: Weapon skill% derivation
**File:** `index.html` ~line 16397-16414 (weapon creation) and ~17539-17547 (PDF weapons table)
**Change:** At PDF export time, derive weapon skill from parent combat style:
```javascript
weapons.forEach(w => {
  // Find which combat style owns this weapon
  const parentStyle = combatStyles.find(cs => (cs.weapons || []).includes(w.name));
  if (parentStyle) {
    // Use the full compiled value (same calculation as Task 2.2)
    w.skill = fullStyleValue(parentStyle); // reuse helper from 2.2
  }
});
```
Update the weapon rendering to use the derived value. Change `w.skill || ''` to show the number:
```javascript
[w.name || '', w.skill ? w.skill + '%' : '', w.damage || '', ...]
```

- [x] Add weapon→combat style skill derivation before PDF weapon table render
- [x] Verify Spear and Bow show "47%" in Skill column

### Task 2.5: Passion auto-resolution ("Loyalty (City)" → homeland)
**File:** `index.html` ~line 14546-14556 (passion initialization from culture)
**Change:** During passion initialization, detect and resolve "Loyalty (City)":
```javascript
return {
  name: p.name.replace(/\(City\)/i, `(${CharacterData.homeland || 'City'})`),
  value: this.evaluateFormula(p.formula),
  needsSubject: p.needsSubject,
  subjectSuggestions: p.subjectSuggestions
};
```
Also handle the case where `needsSubject: true` on named passions (not choice-type) — preserve the flag so the UI in Task 1.3 picks it up.

- [x] Add auto-resolution for "(City)" → homeland in passion initialization
- [x] Preserve `needsSubject` and `subjectSuggestions` on non-choice passions
- [x] Verify "Loyalty (Trilus)" appears instead of "Loyalty (City)" for Balazaring/Trilus

### Phase 2 Success Criteria
- [x] PDF shows "Customs (Balazaring)" (Scenario 7)
- [x] Single combat style entry with full compiled value (Scenario 8)
- [x] Weapons show combat style % in Skill column (Scenario 9)
- [x] Career professional skills appear even at 0 points (Scenario 10)
- [x] Commit phase 2

---

## Phase 3: PDF Layout

**Spec scenarios:** 11, 12

### Task 3.1: Inter-section spacing and separators
**File:** `index.html` ~lines 17505-17710 (all PDF sections)
**Change:** After each major section, add `y -= 5` for breathing room. Add separator lines between logical groups:

```javascript
// After hit locations (line 17505):
y -= 5;

// After COMBAT STYLES (line 17522):
y -= 5;
line(L, y, R); y -= 3;  // separator before WEAPONS

// After WEAPONS (line 17548):
y -= 5;
line(L, y, R); y -= 3;  // separator before SKILLS

// After SKILLS (line 17577):
y -= 5;
line(L, y, R); y -= 3;  // separator before PASSIONS

// After PASSIONS (line 17594):
y -= 3;

// After RUNE AFFINITIES (line 17610):
// no extra — flows into miracles naturally

// Before EQUIPMENT (line 17653):
line(L, y, R); y -= 3;
```

- [x] Add `y -= 5` gaps after hit locations, combat styles, weapons, skills
- [x] Add light separator lines between major logical groups
- [x] Verify no sections collide visually

### Task 3.2: Concept/Background legibility
**File:** `index.html` ~lines 17427-17438
**Change:** Increase font size from 5.5 to 7, add padding:
```javascript
if (bgParts.length > 0) {
  const bgText = bgParts.join(' | ');
  const bgLines = wrapText(bgText, W - 4, 6.5);  // was 5.5
  bgLines.slice(0, 3).forEach((ln, i) => {
    txt(ln, L + 2, y - (i * 8), { size: 6.5 });  // was 5.5, row height 7→8
  });
  y -= Math.min(bgLines.length, 3) * 8 + 3;  // extra padding
}
```

- [x] Increase concept/background font size to 6.5pt
- [x] Increase row height for readability
- [x] Verify text is legible in exported PDF

### Task 3.3: Attribute row spacing
**File:** `index.html` ~lines 17465-17477
**Change:** The current approach uses `W / 5` columns which works. The visual issue is that some attribute strings are wider than others. Increase the grid to use actual measured widths or just bump column count:

Actually reviewing the code, the current `attrColW = W / 5` with 9 items in 2 rows (5 + 4) is reasonable. The real issue is font size 6.5 with bold making things look cramped. Change to a 2-row layout with row 1 having the 5 most important, row 2 having 4 remaining:

Keep the existing approach but add 1px more row spacing:
```javascript
y -= Math.ceil(attrPairs.length / 5) * 10 + 4;  // was 9, now 10
```
And increase the per-row offset:
```javascript
txt(`${pair[0]}: ${pair[1]}`, x, y - row * 10, { size: 6.5, bold: true });  // was row * 9
```

- [x] Increase attribute row height from 9 to 10
- [x] Verify no overlap between attribute rows

### Phase 3 Success Criteria
- [x] No visual collisions between any sections (Scenario 11)
- [x] Concept/background text legible at >=6.5pt (Scenario 12)
- [x] Separator lines visible between major blocks (Scenario 11)
- [x] Bottom whitespace gap is reasonable — less than 40% of page (Scenario 12)
- [x] Export PDF and visually inspect
- [x] Commit phase 3

---

## Verification

After all phases:
- [x] Generate a random character end-to-end and export PDF
- [x] Verify all 12 spec scenarios pass via manual walkthrough
- [x] Verify no regressions in existing (any) skill disambiguation
- [x] Verify folk magic count remains 3+2=5
