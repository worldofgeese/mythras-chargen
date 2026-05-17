# Implementation Plan: Full Magic System Coverage

**Source:** `docs/brainstorms/full-magic-system-coverage-requirements.md`  
**ADR:** `docs/adr/ADR-0006-full-magic-system-coverage.md`  
**Created:** 2026-05-16  
**Status:** Draft

---

## Overview

Expand the chargen from 2 magic systems (Folk Magic + Theism) to all 5 Mythras magic systems with correct mechanics per cult type. The core change is **cult type detection** from one-pager skill patterns, then branching the magic UI/logic per detected type.

## Architecture

```
Cult One-Pager JSON → detectCultType(cult) → { theist | animist | sorcery | mysticism | hybrid }
                                                    ↓
                                          Magic System Branch
                                    ┌─────────┼─────────┐
                                    ▼         ▼         ▼
                              Theist UI   Animist UI  Sorcery UI
                              (existing)  (new)       (new)
```

## Reference Data (✅ Complete)

| File | Status |
|------|--------|
| `references/mythras-raw/animism.json` | ✅ Extracted |
| `references/mythras-raw/sorcery.json` | ✅ Extracted |
| `references/mythras-raw/mysticism.json` | ✅ Extracted |
| `references/spirits-raw/monster-island.json` | ✅ Extracted |
| `references/spirits-raw/bird-in-hand.json` | ✅ Extracted |
| `references/mythras-raw/magic-overview.json` | ✅ Pre-existing |

---

## Phase 1: Cult Type Detection Engine

**Goal:** Given a cult's `cultSkills` array, automatically determine which magic system(s) it uses.

### Detection Rules (from ADR-0006 + one-pager analysis)

```javascript
function detectCultType(cult) {
  const skills = cult.cultSkills || [];
  const hasDevotionLike = skills.some(s => /^Devotion/i.test(s));
  const hasTranceLike = skills.some(s => /^Trance/i.test(s) || /^Binding/i.test(s));
  const hasInvocationLike = skills.some(s => /^Invocation/i.test(s) || /^Shaping/i.test(s));
  const hasMysticism = skills.some(s => /^Mysticism/i.test(s) || /^Meditation/i.test(s));

  const types = [];
  if (hasDevotionLike) types.push('theist');
  if (hasTranceLike) types.push('animist');
  if (hasInvocationLike) types.push('sorcery');
  if (hasMysticism) types.push('mysticism');

  // Fallback: if no magic skills detected, treat as theist (most common)
  if (types.length === 0) types.push('theist');

  return {
    primary: types[0],
    types: types,
    isHybrid: types.length > 1
  };
}
```

### Expected Results

| Cult | Skills Pattern | Detected Type |
|------|---------------|---------------|
| Orlanth | Devotion, Runic Affinity | `theist` |
| Daka Fal | Trance, Binding | `animist` |
| Arkat | Invocation, Shaping | `sorcery` |
| Waha | Devotion, Runic Affinity, Trance(Shaman), Binding(Shaman) | `theist + animist` (hybrid) |
| Storm Bull | Devotion, Runic Affinity, Trance(Shaman), Binding(Shaman) | `theist + animist` (hybrid) |

### Success Criteria
- [x] `detectCultType()` correctly classifies all 94 cults in CULTS_DATA
- [x] Unit test covers pure theist, pure animist, pure sorcery, and hybrid cases
- [x] No cult incorrectly receives a Devotional Pool when it lacks Devotion

### Files Modified
- `index.html` (add `detectCultType` function)
- `test-chargen.js` (add cult type detection tests)

---

## Phase 2: Fix Devotional Pool Assignment

**Goal:** Only assign Devotional Pool to cults that have Devotion in their cult skills.

### Current Code (Bug)
```javascript
// In App.selectCult():
if (cultName) {
  CharacterData.devotionalPool = Math.floor(CharacterData.characteristics.POW / 2);
}
```

### Fixed Code
```javascript
if (cultName) {
  const cult = CULTS_DATA.find(c => c.name === cultName);
  const cultType = detectCultType(cult);
  
  // Only theist cults get a Devotional Pool
  if (cultType.types.includes('theist')) {
    CharacterData.devotionalPool = Math.floor(CharacterData.characteristics.POW / 2);
  } else {
    CharacterData.devotionalPool = 0;
  }
  
  // Store cult type for UI branching
  CharacterData.cultType = cultType;
}
```

### Success Criteria
- [x] Daka Fal selection → devotionalPool = 0
- [x] Orlanth selection → devotionalPool = POW/2
- [x] Waha selection → devotionalPool = POW/2 (hybrid, has Devotion)
- [x] Arkat selection → devotionalPool = 0
- [x] Existing tests still pass

### Files Modified
- `index.html` (modify `selectCult()`)
- `test-chargen.js` (add devotional pool tests per cult type)

---

## Phase 3: Animist Resource Pool (Bound Spirit Slots)

**Goal:** For animist cults, calculate and display bound spirit slots instead of Devotional Pool.

### Data Model Addition
```javascript
// In CharacterData:
boundSpiritSlots: 0,      // CHA/2 for Spirit Worshipper rank
spiritRuneAffinity: 0,    // Replaces Binding per Hannu
spirits: [],              // Array of bound spirits at chargen
```

### Calculation
```javascript
// Per Mythras Core p.131 + Hannu's adaptation:
// Starting rank = Spirit Worshipper → CHA / 2 slots
if (cultType.types.includes('animist')) {
  CharacterData.boundSpiritSlots = Math.floor(CharacterData.characteristics.CHA / 2);
}
```

### UI: Spirit Selection Step (replaces Miracle Picker for pure animist cults)
- Show available spirit slots: `CHA/2`
- For now: display informational text about spirit selection
- Future: full spirit picker with Monster Island-style stat generation

### Success Criteria
- [x] Daka Fal → shows "Bound Spirit Slots: [CHA/2]" on character sheet
- [x] Waha (hybrid) → shows BOTH Devotional Pool AND Bound Spirit Slots
- [x] Spirit slots correctly calculated from CHA
- [ ] Character sheet PDF includes spirit slot information (Phase 7)

### Files Modified
- `index.html` (add animist resource calculation + UI)
- `test-chargen.js` (add animist resource tests)

---

## Phase 4: Sorcery Resource Display

**Goal:** For sorcery cults, display Magic Points as the casting resource and show Invocation/Shaping-equivalent info.

### Data Model Addition
```javascript
// In CharacterData:
sorcerySpells: [],           // Selected from cult one-pager spell list
invocationSkill: 0,         // Maps to Rune Affinity per AiG
shapingSkill: 0,            // Maps to Law Rune affinity per AiG
sorceryIntensity: 0,        // Invocation/10
sorceryShapingPoints: 0,    // Shaping/10
```

### Calculation
```javascript
if (cultType.types.includes('sorcery')) {
  // Resource is Magic Points (= POW)
  // Intensity = Invocation skill / 10 (in AiG: Rune Affinity / 10)
  // Shaping Points = Shaping skill / 10 (in AiG: Law Rune / 10)
  CharacterData.sorceryResource = CharacterData.characteristics.POW; // Magic Points
}
```

### UI: Sorcery Display
- Show "Resource: Magic Points ([POW])"
- Show "Casting: Rune Affinity + Law Rune (shaping)" per AiG adaptation
- Spell selection from cult one-pager's spell list (reuse existing miracle picker pattern)

### Success Criteria
- [x] Arkat → shows "Resource: Magic Points" and sorcery casting info
- [x] Arkat → does NOT show Devotional Pool
- [x] Sorcery spells listed from Arkat's one-pager data (uses existing miracle picker pattern)
- [ ] Character sheet PDF includes sorcery information (Phase 7)

### Files Modified
- `index.html` (add sorcery resource calculation + UI)
- `test-chargen.js` (add sorcery resource tests)

---

## Phase 5: Hybrid Cult UI

**Goal:** For hybrid cults (Devotion + Trance/Binding), show both systems' resources.

### UI Layout for Hybrids
```
┌─────────────────────────────────────┐
│ Waha (Theist + Animist Hybrid)      │
├─────────────────────────────────────┤
│ Theist Path                         │
│   Devotional Pool: 7 (POW/2)       │
│   Miracles: [picker]               │
├─────────────────────────────────────┤
│ Animist Path (Shaman)              │
│   Bound Spirit Slots: 6 (CHA/2)    │
│   Note: Available to Shaman-path   │
│   characters                        │
└─────────────────────────────────────┘
```

### "(Shaman)" Suffix Handling
Per Hannu: "You could do either way" — treat as GM-configurable. The chargen shows both paths; the player picks which to emphasize.

### Success Criteria
- [ ] Waha → shows both Devotional Pool AND spirit slots
- [ ] Storm Bull → shows both systems
- [ ] UI clearly labels which path each resource belongs to
- [ ] Existing miracle selection still works for hybrid cults' theist path

### Files Modified
- `index.html` (modify magic section rendering for hybrids)
- `test-chargen.js` (add hybrid cult tests)

---

## Phase 6: Mysticism Stub

**Goal:** Support mysticism detection (for future Kralori/Draconic cults) without full implementation.

### Implementation
- `detectCultType()` already handles Mysticism/Meditation skills
- Display informational message: "Mysticism system — uses Meditation + Path talents (Mythras Core p.155-161)"
- No current cults use this system

### Success Criteria
- [x] If a cult with Mysticism skills is added, it's correctly detected
- [x] No crash or incorrect display for mysticism cults
- [x] Informational display references correct rules

### Files Modified
- `index.html` (add mysticism stub in magic rendering)

---

## Phase 7: Character Sheet PDF Update

**Goal:** Update PDF generation to include correct magic system info per cult type.

### Changes
- Theist: Devotional Pool + Miracles (existing, no change)
- Animist: Bound Spirit Slots + Spirit Rune info
- Sorcery: Magic Points + Spell list + Intensity/Shaping info
- Hybrid: Both sections
- Mysticism: Path + Meditation info

### Success Criteria
- [ ] PDF for Daka Fal character shows animist info, not theist
- [ ] PDF for Arkat character shows sorcery info
- [ ] PDF for Waha character shows both systems
- [ ] Existing theist PDF output unchanged

### Files Modified
- `index.html` (PDF generation section)

---

## Phase 8: Validation & Regression

**Goal:** Ensure all 94 cults produce correct output and no regressions.

### Test Matrix
- Run `test-chargen.js` — all existing tests pass
- Run `test-100-chars.mjs` — 100-character generation still works
- Spot-check: Orlanth (theist), Daka Fal (animist), Arkat (sorcery), Waha (hybrid)
- Verify acceptance examples AE1-AE4 from requirements doc

### Success Criteria
- [ ] All existing tests pass
- [ ] AE1: Orlanth → Devotional Pool + Rune Affinity casting ✓
- [ ] AE2: Daka Fal → Bound Spirit Slots + Spirit Rune casting ✓
- [ ] AE3: Arkat → Magic Points + Rune Affinity + Law Rune ✓
- [ ] AE4: Waha → Both Devotional Pool + Spirit Slots ✓
- [ ] No cult incorrectly displays a Devotional Pool when it lacks Devotion

---

## Implementation Order & Dependencies

```
Phase 1 (Detection) ──→ Phase 2 (Fix DP) ──→ Phase 3 (Animist) ──→ Phase 5 (Hybrid)
                                            ↘ Phase 4 (Sorcery) ──→ Phase 5 (Hybrid)
                                            ↘ Phase 6 (Mysticism stub)
Phase 5 (Hybrid) ──→ Phase 7 (PDF) ──→ Phase 8 (Validation)
```

Phases 3, 4, and 6 can be done in parallel after Phase 2.
Phase 5 requires both 3 and 4.
Phase 7 requires Phase 5.
Phase 8 is the final gate.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing theist chargen | Phase 2 is minimal change; run full test suite after |
| Cult skill patterns not matching regex | Test against all 94 cults in Phase 1 |
| PDF field layout issues | Phase 7 can use existing field layout with conditional content |
| Spirit selection complexity | Phase 3 starts with informational display; full picker is future work |

---

## Out of Scope (for this plan)

- Full spirit stat generation/picker (requires more Monster Island data)
- Sorcery spell effect descriptions (just names from one-pager)
- Mysticism talent selection (no cults use it yet)
- Hannu's upcoming new one-pager format (will be a separate update)
