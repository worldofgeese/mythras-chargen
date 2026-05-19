---
date: 2026-05-19
author: worldofgeese
commit: 4df3293
branch: main
repository: mythras-chargen
topic: "Cult Selection Flow"
tags: [test-cases, outline, CSF, cult-selection-flow]
status: pending
feature: "Cult Selection Flow"
module: CSF
portal: Wizard
slug: cult-selection-flow
tc_count: 0
last_updated: 2026-05-19
last_updated_by: worldofgeese
---

## Routes
- `Wizard Step 9` — Cult Selection (main cult picker, type detection, UI routing)

## Endpoints
- N/A (client-side only)

## Scope Decisions
- In scope: `selectCult()`, scroll preservation, cult type detection → UI switch, cult card rendering
- In scope: Clearing previous magic selections on cult change
- Out of scope: Miracle picker details (covered in miracle-picker)
- Out of scope: Spirit picker details (covered in spirit-picker)
- Out of scope: Sorcery picker details (covered in sorcery-spell-picker)
- Out of scope: Initiation gate (covered in initiation-gate-validation)

## Domain Context
- `selectCult(cultName)` sets CharacterData.cult and triggers magic UI switch
- Scroll preservation (line ~4811): saves scrollTop before re-render, restores after
- `detectCultType()` classifies cult → drives which container (#miracle-picker, #spirit-picker, #sorcery-picker) is shown
- Cult change clears: miracles[], boundSpirits[], sorcerySpells[] (orphan cleanup)
- Separate containers pattern: each magic type has its own DOM container, only one visible at a time
- Cult cards: clickable cards showing cult name, pantheon, description
- Selected cult highlighted with visual indicator

## Test Data Requirements
- Multiple cults of different types (theist, animist, sorcery, hybrid)
- Character with existing magic selections before cult change

## Key Behaviors

1. Cult cards render from CULTS_DATA
2. Clicking a cult card calls `selectCult(cultName)`
3. Selected cult visually highlighted
4. `detectCultType()` called on selection
5. Correct magic picker container shown based on type
6. Other magic picker containers hidden
7. Previous magic selections cleared on cult change
8. Scroll position preserved across selection (no jump to top)
9. Cult info panel shows: pantheon, description, skills, rank requirements
10. CharacterData.cult updated and persisted

## Boundary Conditions

- Selecting same cult twice → no-op (no unnecessary clear/re-render)
- Switching from theist to animist → miracles cleared, spirit picker shown
- Switching from animist to sorcery → spirits cleared, sorcery picker shown
- Hybrid cult → both miracle and spirit picker shown simultaneously
- Cult with very long name or description → layout doesn't break
- Cult not found in CULTS_DATA → graceful fallback
- Scroll position restoration with varying content heights
- Rapidly switching cults → no race conditions in DOM updates
- Cult with no skills defined → skill boost section adapts
- Mysticism cult → mysticism container shown (if implemented)

## Existing Coverage
- `test-chargen.js` tests `detectCultType()` for various cults
- E2E tests select cults but don't test scroll preservation or rapid switching

## Test Types Needed

- Unit: `selectCult()` updates CharacterData correctly
- Unit: `detectCultType()` classification for each cult category
- Unit: Magic selection clearing on cult change
- Integration: Correct picker container visibility based on cult type
- Integration: Scroll preservation across cult selection
- Integration: Hybrid cult shows both pickers
- Integration: Cult info panel populates correctly
- E2E: Select cult → see correct picker → select magic → advance
- E2E: Change cult mid-flow → previous magic cleared
- Regression: Cult change doesn't corrupt unrelated CharacterData fields

## Fixtures to Use
- `vargast-windborn-orlanth.json` (theist, Orlanth)
- `garrath-spiritwalker-daka-fal.json` (animist, Daka Fal)
- `malkion-grey-arkat.json` (sorcery, Arkat)
- `yara-moonweaver-jakaleel.json` (hybrid, Jakaleel)
- `telmori-wolfbrother.json` (animist, Telmor)

## Checkpoint History
### 2026-05-19
**Q: Does scroll preservation work for all sub-interactions in Step 9?**
A: Yes — selectCult, toggleMiracle, toggleBoundSpirit, toggleSorcerySpell all preserve scroll position.
