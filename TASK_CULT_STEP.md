# Task: Add Cult Selection Wizard Step (Step 8.5)

## Context
You are working in `/tmp/mythras-pdf-decapod` on a single-file HTML character generator for Adventures in Glorantha (Mythras engine).

**Current pinned baseline commit: `77c6825`**

The app has a 12-step wizard. We need to add an optional cult selection step between the current rune affinities step and the folk magic step.

## Hard Constraints
1. **Surgical edit of `index.html` only.** Do not rewrite the file wholesale.
2. **Glorantha data stays inline** — add `CULTS_DATA` inline like `CULTURES_DATA` and `CAREERS_DATA`.
3. **The cult step is OPTIONAL** — a "No cult" choice must be available.
4. **Preserve all existing working behavior** — wizard, play mode, random gen, PDF export.
5. **Diff must be bounded** — only add the cult step, cult data, and cult-related rendering. Do not "clean up" unrelated areas.

## Data Sources Available
- `references/culture-cult-map.json` — maps each culture to its primary/secondary cults
- `references/cults-raw/cults.json` — 94 extracted cult records with fields: name, pantheon, cultSkills, folkMagic, miracles, personalityTraits, enemyCults, friendlyCults, associatedCults, requirements

## What to Build

### 1. Add `CULTS_DATA` inline constant
Create a `CULTS_DATA` array from the 94 cults in `references/cults-raw/cults.json`. Each cult needs at minimum:
```json
{
  "name": "Orlanth",
  "pantheon": "Storm",
  "runes": ["Storm", "Movement", "Mastery"],
  "cultSkills": ["Combat style (any)", "Athletics", "Evade", ...],
  "folkMagic": ["Bladesharp", "Demoralise", "Disruption", ...],
  "personalityTraits": ["Proud", "Just", "Authoritative", ...],
  "enemyCults": ["Bagog", "Cacodemon", ...],
  "friendlyCults": ["Argan Argar", "Foundchild", ...],
  "associatedCults": ["Chalana Arroy", "Issaries", ...],
  "requirements": { "initiate": "5 cult skills at 50%+" }
}
```

Also add `CULTURE_CULT_MAP` from `references/culture-cult-map.json`.

### 2. Add Wizard Step 8.5: Cult Selection
Insert a new wizard step after rune affinities. The step should:
- Show cults available for the selected culture (using `CULTURE_CULT_MAP`)
- Split into "Primary Cults" and "Secondary Cults" sections
- Each cult shown as a selectable card/button with:
  - Cult name
  - Pantheon
  - Personality traits (brief)
  - Folk magic spells available
- A "No Cult" option always visible at the top
- On selection: store `CharacterData.cult` with the cult name
- On selection: auto-add Devotion skill to character skills if not present
- On selection: add Loyalty (Cult) passion

### 3. Update Wizard Step Count
Currently "Step X of 11" — update to "Step X of 12" and renumber subsequent steps.

### 4. Update Play Mode
- Show cult name in the identity sidebar (after career)
- Show cult personality traits as a reference note
- If cult has folk magic, show in the magic section

### 5. Update PDF Export  
- Add cult name to the identity block
- Include cult folk magic in the magic section if present

### 6. Update Random Generation
- `App.generateRandomCharacter()` should pick a random cult from the character's culture's primary cults (or "No cult" 10% of the time for variety)
- Store the cult name in `CharacterData.cult`

### 7. Add Tests
Add to `test-chargen.js`:
- `CULTS_DATA` exists and has > 90 entries
- `CULTURE_CULT_MAP` exists and has entries for all 8 cultures  
- Random character has a `cult` field
- Random Sartarite character has a Storm pantheon cult (most of the time)

## Verification (MANDATORY)

### 1. Tests
Run `node test-chargen.js` — all existing tests must still pass, plus new cult tests.

### 2. Diff integrity
- `git diff --stat 77c6825..HEAD`
- `git diff --numstat 77c6825..HEAD`
- Explain why the diff is bounded and incremental

### 3. Adversarial self-review
List 3 concrete risks in the cult integration.

### 4. Commit and push
Commit with message: `feat: add cult selection wizard step (Step 8.5)`
Push to master.
