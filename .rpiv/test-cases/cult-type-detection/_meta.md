# Feature: Cult Type Detection

## Summary

Determines the magic system(s) a cult uses: theist, animist, sorcery, mysticism, or hybrid (combination). Detection drives which magic UI is shown and which resources are assigned.

## Source Files

- `index.html` (detectCultType function, cult data in references/cults-raw/)
- `references/cults-raw/cults.json` (master cult list with type annotations)

## Key Behaviors

1. Pure theist cults → "theist" type (e.g., Orlanth, Humakt, Ernalda)
2. Pure animist cults → "animist" type (e.g., Daka Fal, Horned Man)
3. Pure sorcery cults → "sorcery" type (e.g., Arkat, Lhankor Mhy sorcery path)
4. Mysticism cults → "mysticism" type (e.g., Path of Immanent Mastery)
5. Hybrid cults → combined type (e.g., Jakaleel = theist+animist)
6. Fallback to theist when type is ambiguous

## Boundary Conditions

- Cult name with special characters (e.g., "7 Mothers - Jakaleel")
- Cult not found in database → graceful fallback
- Case-insensitive matching
- Cults with multiple sub-types (e.g., Aldrya Gardener vs Aldrya Shaman)

## Existing Coverage

- `test-chargen.js` validates cult type in fixture data

## Test Types Needed

- Unit: detectCultType() with each cult category
- Unit: Edge cases (unknown cult, empty string, null)
- Integration: Cult selection triggers correct magic UI

## Fixtures to Use

- `vargast-windborn-orlanth.json` (theist)
- `garrath-spiritwalker-daka-fal.json` (animist)
- `malkion-grey-arkat.json` (sorcery)
- `yara-moonweaver-jakaleel.json` (hybrid: theist+animist)
- `telmori-wolfbrother.json` (animist, Telmor/Hsunchen)
