# Feature: Sorcery Spell Picker

## Summary

UI for selecting sorcery spells from a list of 34 available spells. Limited by INT/4 (round down) spells maximum.

## Source Files

- `index.html` (sorcery spell picker UI)
- `references/mythras-raw/sorcery.json` (34 sorcery spell definitions)

## Key Behaviors

1. Display all 34 sorcery spells with descriptions
2. Enforce INT/4 selection limit
3. Show remaining slots counter
4. Prevent over-selection
5. Selected spells persist to CharacterData
6. Selected spells render in Play Mode magic section
7. Spell descriptions available as tooltips or expandable

## Boundary Conditions

- INT = 8 (minimum) → max 2 spells
- INT = 16 → max 4 spells
- INT = 18 → max 4 spells (floor)
- Deselecting a spell frees a slot
- All 34 spells render without overflow/layout issues
- Cult change to non-sorcery clears sorcery selections

## Existing Coverage

- None

## Test Types Needed

- Unit: INT/4 limit calculation
- Unit: All 34 spells present in reference data
- Integration: Spell list renders completely (34 items)
- Integration: Selection limit enforcement
- Integration: Persistence through wizard steps
- E2E: Select spells → visible in Play Mode

## Fixtures to Use

- `malkion-grey-arkat.json` (sorcery cult)
