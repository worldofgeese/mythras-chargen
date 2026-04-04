# Task Brief: Fix Mythras Chargen Bugs

## Project
Single-file HTML character sheet generator for Mythras/Glorantha RPG.
File: `/tmp/mythras-pdf-decapod/index.html` (~835KB, all-in-one with pdf-lib inlined)
Repo: `git@github.com:worldofgeese/mythras-chargen.git` on branch `master`

## Test Suite
`test-chargen.js` — deterministic Node.js test suite using vm.runInContext to test app logic.
Run: `node /tmp/mythras-pdf-decapod/test-chargen.js`
Currently 3 failures, 34 passes. All 3 failures are real bugs you must fix.

## Bugs to Fix (in priority order)

### Bug 1: Step 11 Duplicate Headers
**What happens:** Step 11 shows TWO "Step 11: Review & Play / Character Complete!" blocks.
**Root cause:** `renderCurrentStep()` is appending without clearing, OR `renderStep11()` is called twice.
The test for this passes in the mock (because it tests renderStep11 output in isolation), but the duplication happens in the browser. Look at how `renderCurrentStep` populates the `wizard-steps` container — it may be appending instead of replacing.
**Test:** Currently passes (needs a browser-level fix, not logic fix). Verify manually.

### Bug 2: Combat Style Names Are Generic (TEST FAILS)
**What happens:** Skills list shows "Combat Style (Cultural Style)" and "Combat Style (Speciality Style)" instead of actual names like "Hunter Raider".
**Root cause:** `compileAllSkills()` reads from `CharacterData.culturalSkills` and `CharacterData.careerSkills` which store points under the GENERIC keys. There's a `resolveStyleName()` function but it's not called during compilation.
**Fix approach:** In `compileAllSkills()`, when a skill name matches a generic combat style pattern, resolve it to the actual style name from `CharacterData.combatStyles` array or from CULTURES_DATA. The `CharacterData.combatStyles` array stores objects like `{name: "Hunter Raider", skill: 38}`.
**Test:** `test-chargen.js` test group 2 — must pass.

### Bug 3: Weapons Not Auto-Populated from Combat Styles (TEST FAILS)
**What happens:** "Starting equipment" gives only a backpack/bedroll kit. No weapons despite having combat styles.
**Root cause:** `autoPopulateStartingEquipment()` tries to look up weapons from `CULTURES_DATA.combatStyles[].weapons`, but:
  - The weapon names in CULTURES_DATA (e.g. "Spear", "Bow") may not exactly match names in WEAPONS_DATA (e.g. "Shortspear", "Short Bow")
  - The lookup `WEAPONS_DATA.find(w => w.name === wName)` fails on fuzzy matches
**Fix approach:** Use fuzzy/partial matching when looking up weapons — `wName.includes()` or normalize both sides. Also consider adding the weapons directly from the style data even without full WEAPONS_DATA lookup.
**Test:** `test-chargen.js` test group 3 — must have `CharacterData.weapons.length > 0`.

### Bug 4: PDF Missing Character Concept (TEST FAILS)
**What happens:** Character concept entered in Step 1 ("Wolf in sheep's clothing") never appears in PDF export.
**Root cause:** `exportSinglePagePDF()` doesn't reference `CharacterData.concept`.
**Fix:** Add concept to the PDF after the name/culture/career header line.
**Test:** `test-chargen.js` test group 8 — PDF function source must include 'concept'.

### Bug 5: PDF Missing Hit Location HP Values
**What happens:** PDF shows "Head: " "Chest: " etc. with no HP numbers.
**Root cause:** Look at the PDF export's hit locations section — it reads from `CharacterData.attributes.hitPoints` but formats may be wrong or the key names don't match.
**Fix:** Ensure hit location HP values render in the PDF.

### Bug 6: PDF Sparse/Missing Content
**What happens:** PDF is mostly empty space — missing weapons, armor, passions list, full spell list, equipment details.
**Root cause:** The PDF rendering code exists for these sections but may have logic bugs (empty arrays, wrong property names).
**Fix:** Audit each PDF section against what CharacterData actually contains after a full character creation.

### Bug 7: Notes/Background/Concept Not Flowing Through
**What happens:** Data entered in wizard steps (concept, family, background events) should appear in:
  1. Step 11 review
  2. Play Mode
  3. PDF export
**Current state:** Some of these were partially fixed but need verification.

## Approach

1. Run the test suite first: `node /tmp/mythras-pdf-decapod/test-chargen.js`
2. Fix failures one at a time, re-running tests after each fix
3. Add NEW tests for bugs 5-7 to the test suite before fixing them
4. After all tests pass, verify the HTML parses: `node -e "const fs=require('fs');const h=fs.readFileSync('/tmp/mythras-pdf-decapod/index.html','utf8');let i=0,e=0,s=0;while(true){const a=h.indexOf('<script',i);if(a===-1)break;const b=h.indexOf('>',a)+1;const c=h.indexOf('</script>',b);if(c===-1)break;s++;const d=h.substring(b,c);if(d.trim().length>10){try{new Function(d)}catch(x){console.log('Script',s,':',x.message.slice(0,100));e++}}i=c+9}console.log(e?e+' ERRORS':'All '+s+' scripts parse OK')"`
5. Commit with descriptive message
6. Push to origin/master

## Constraints
- Single file: ALL changes go in `index.html`
- Tests go in `test-chargen.js`
- Do NOT restructure the file or split into modules
- Do NOT touch pdf-lib (script block 1)
- Preserve all existing functionality
- Git config: user.name="Kypris" user.email="kypris@openclaw.ai"
