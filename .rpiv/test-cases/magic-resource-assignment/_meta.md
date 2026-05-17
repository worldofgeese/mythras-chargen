# Feature: Magic Resource Assignment

## Summary

Assigns magic resources based on cult type: Devotional Pool (theist), Bound Spirit Slots (animist), Sorcery Resource (sorcery), or combinations for hybrid cults.

## Source Files

- `index.html` (magic resource calculation logic, Play Mode magic rendering)

## Key Behaviors

1. Theist cults → Devotional Pool = POW/4 (round up) magic points dedicated
2. Animist cults → Bound Spirit Slots = CHA/4 (round down)
3. Sorcery cults → Sorcery spells known limited by INT
4. Mysticism cults → Mysticism paths/talents
5. Hybrid cults → resources from each component type
6. Resources recalculate when characteristics change

## Boundary Conditions

- POW = 3 (minimum) → Devotional Pool = 1
- CHA = 3 (minimum) → Bound Spirit Slots = 0 or 1
- INT = 8 (minimum for magic users)
- Hybrid cult gets both pools (not doubled)
- Resource display in Play Mode matches calculation

## Existing Coverage

- `test-chargen.js` validates resource fields in fixture JSON

## Test Types Needed

- Unit: Resource calculation functions with various stat values
- Unit: Edge cases (minimum stats, maximum stats)
- Integration: Changing characteristics updates resources in real-time
- Integration: Hybrid cult shows multiple resource pools

## Fixtures to Use

- `leika-earthmother-ernalda.json` (theist, high POW)
- `garrath-spiritwalker-daka-fal.json` (animist)
- `malkion-grey-arkat.json` (sorcery)
- `yara-moonweaver-jakaleel.json` (hybrid)
