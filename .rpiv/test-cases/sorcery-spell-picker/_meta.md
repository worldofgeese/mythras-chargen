# Feature: Sorcery Spell Picker

## Summary

UI for selecting sorcery spells from a list of 53 available spells (Mythras Core p.166-177). Limited to 3 starting spells (Dedicated rank, per Core p.165: starting = Invocation/20 ≈ 3).

## Source Files

- `index.html` (SORCERY_SPELLS constant + spell picker UI in renderStep9)
- `references/mythras-raw/sorcery.json` (53 sorcery spell definitions with page citations)

## Key Behaviors

1. Display all 53 sorcery spells with resist types and descriptions
2. Enforce 3-spell selection limit (Dedicated rank)
3. Show remaining slots counter "(N / 3 — Dedicated rank, Core p.165)"
4. Prevent over-selection with toast error
5. Show tooltips with verified descriptions on info icon click
6. Selected spells persist to CharacterData.sorcerySpells[]
7. Selected spells render in Play Mode magic section
8. Selected spells appear in PDF export
9. Deselecting a cult clears sorcerySpells[] (orphan cleanup)
10. Sorcery info box shows: Resource, Casting skill, Shaping skill, Intensity formula

## Boundary Conditions

- Selecting 4th spell → toast error, no change to array
- Deselecting a spell frees a slot (count goes from 3 to 2)
- All 53 spells render without overflow/layout issues (scrollable list)
- Cult change from sorcery to non-sorcery clears selections
- Spell names match Mythras Core exactly (British spelling: Neutralise not Neutralize)
- Spells with (Substance/Species) variants display correctly

## Existing Coverage

- Unit test: SORCERY_SPELLS has 53 entries
- E2E: Arkat character builds with sorcery spells selected

## Test Types Needed

- Unit: All 53 spells present with non-empty descriptions
- Unit: Spell names match reference JSON exactly
- Integration: Spell list renders completely (53 items)
- Integration: 3-spell limit enforcement (select 3, try 4th → rejected)
- Integration: Tooltip displays for each spell
- Integration: Persistence through wizard steps and page reload
- E2E: Select spells → visible in Play Mode → visible in PDF export
- E2E: Cult switch from sorcery → theist clears sorcery spells

## Fixtures to Use

- `malkion-grey-arkat.json` (sorcery cult)
