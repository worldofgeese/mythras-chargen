# Feature: Spirit Picker

## Summary

UI for selecting bound spirits for animist characters. Limited by CHA/2 slots (Spirit Worshipper rank, Mythras Core p.136). Displays 14 spirit templates from Monster Island and Bird in Hand sources.

## Source Files

- `index.html` (STARTING_SPIRITS constant + spirit picker UI in renderStep9)
- `references/spirits-raw/bird-in-hand.json` (Bird in Hand spirits)
- `references/spirits-raw/monster-island.json` (Monster Island spirits)

## Key Behaviors

1. Display all 14 spirit templates with type, POW, CHA, and ability text
2. Enforce CHA/2 selection limit (Spirit Worshipper rank, Core p.136)
3. Show remaining slots counter "(N / limit)"
4. Prevent over-selection with toast error
5. Show spirit icon (🌀) for each entry
6. Selected spirits persist to CharacterData.boundSpirits[]
7. Selected spirits render in Play Mode magic section
8. Selected spirits appear in PDF export with ability descriptions
9. Deselecting a cult clears boundSpirits[] (orphan cleanup)
10. Spirit info box shows: Bound Spirit Slots formula, Casting Skill
11. `toggleBoundSpirit()` preserves scroll position (no page jump)
12. Separate #spirit-picker container (hidden for non-animist cults)
13. In-place DOM update pattern (no full re-render on toggle)

## Boundary Conditions

- CHA 7 → 3 slots (floor(7/2) = 3)
- CHA 14 → 7 slots
- CHA 6 → 3 slots (minimum meaningful)
- Selecting beyond limit → toast error, no change
- Deselecting a spirit frees a slot
- Cult change from animist to non-animist clears selections
- Hybrid cult (Waha) shows spirit picker alongside miracle picker

## Existing Coverage

- Unit test: STARTING_SPIRITS has 14 entries
- E2E: Daka Fal and Waha characters build with spirits selected

## Test Types Needed

- Unit: All spirits have POW, CHA, ability fields
- Unit: Spirit abilities use book-format text (Bless/Endowment/Sagacity)
- Integration: Spirit list renders completely (14 items)
- Integration: CHA/2 limit enforcement
- Integration: Hybrid cult shows both miracle and spirit pickers
- Integration: Persistence through wizard steps
- E2E: Select spirits → visible in Play Mode → visible in PDF
- E2E: Cult switch from animist → theist clears bound spirits

## Fixtures to Use

- `daka-fal-shaman.json` (animist cult)
- `waha-beast-rider.json` (hybrid theist+animist)
