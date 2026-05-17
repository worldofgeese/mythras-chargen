# Feature: Spirit Picker

## Summary

UI for selecting bound spirits from 12 spirit templates. Limited by min(3, CHA/2) spirit slots.

## Source Files

- `index.html` (spirit picker UI)
- `references/spirits-raw/` (spirit template definitions)
- `references/mythras-raw/animism.json` (animism rules)

## Key Behaviors

1. Display 12 spirit templates with descriptions
2. Enforce min(3, CHA/2) slot limit
3. Show remaining slots counter
4. Each spirit has a type, intensity, and abilities
5. Selected spirits persist to CharacterData
6. Selected spirits render in Play Mode magic section
7. Spirit abilities shown in Play Mode

## Boundary Conditions

- CHA = 3 → min(3, 1) = 1 spirit slot
- CHA = 6 → min(3, 3) = 3 spirit slots
- CHA = 10 → min(3, 5) = 3 spirit slots (capped at 3)
- CHA = 4 → min(3, 2) = 2 spirit slots
- Deselecting a spirit frees a slot
- Cult change to non-animist clears spirit selections

## Existing Coverage

- None

## Test Types Needed

- Unit: min(3, CHA/2) limit calculation
- Unit: All 12 spirit templates present in reference data
- Integration: Spirit list renders (12 templates)
- Integration: Selection limit enforcement
- Integration: Persistence through wizard steps
- E2E: Select spirits → visible in Play Mode

## Fixtures to Use

- `garrath-spiritwalker-daka-fal.json` (animist, Daka Fal)
- `telmori-wolfbrother.json` (animist, Telmor)
- `biturian-varosh-waha.json` (Waha, has spirit magic)
