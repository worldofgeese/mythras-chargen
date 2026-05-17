# Feature: Character Creation Wizard

## Summary

12-step wizard guiding users through Mythras character creation. Steps: Concept, Characteristics, Culture, Career, Cult, Skills (cultural/career/bonus), Combat Styles, Magic, Equipment, Background, and Summary/Play Mode transition.

## Source Files

- `index.html` (wizard-mode section, App.nextStep/prevStep, step rendering logic)

## Key Behaviors

1. Step navigation (next/prev) with validation gates
2. Step indicator updates ("Step N of 12")
3. Data persistence across steps (CharacterData object)
4. Conditional steps (magic step varies by cult type)
5. Summary step aggregates all prior selections
6. Transition to Play Mode preserves all state

## Boundary Conditions

- Navigating backward preserves entered data
- Cannot advance past characteristics without valid sum (75)
- Cannot advance past culture without selection
- Cannot advance past career without selection
- Cult step adapts UI based on detected cult type
- Skill allocation steps enforce budget limits

## Existing Coverage

- `tests/e2e/character-creation-ux.spec.js` (Playwright, partial)

## Test Types Needed

- E2E: Full wizard walkthrough (happy path per cult type)
- Integration: Step transition validation gates
- Unit: Step index bounds, step visibility toggling

## Fixtures to Use

- `vasana.json` (theist, Orlanth)
- `garrath-spiritwalker-daka-fal.json` (animist)
- `malkion-grey-arkat.json` (sorcery)
- `yara-moonweaver-jakaleel.json` (hybrid)
