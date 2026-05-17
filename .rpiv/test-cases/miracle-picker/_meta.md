# Feature: Miracle Picker

## Summary

UI for selecting miracles (theist magic) from a per-cult list. Limited by POW/2 (round down) miracles maximum. Each cult provides a specific miracle list from references/theism-miracles.json.

## Source Files

- `index.html` (miracle picker UI, miracle list rendering)
- `references/theism-miracles.json` (miracle definitions per cult)
- `references/cults-raw/` (cult-specific miracle lists)

## Key Behaviors

1. Display miracles available to the selected cult
2. Enforce POW/2 selection limit
3. Show remaining slots counter
4. Prevent over-selection (disable checkboxes or show warning)
5. Selected miracles persist to CharacterData
6. Selected miracles render in Play Mode magic section

## Boundary Conditions

- POW = 8 → max 4 miracles
- POW = 9 → max 4 miracles (floor)
- POW = 3 → max 1 miracle
- Cult with very few miracles (< POW/2 available)
- Deselecting a miracle frees a slot
- Cult change clears previous miracle selections

## Existing Coverage

- None

## Test Types Needed

- Unit: POW/2 limit calculation
- Integration: Miracle list populates from cult data
- Integration: Selection limit enforcement (UI disables at cap)
- Integration: Persistence through wizard steps
- E2E: Select miracles → visible in Play Mode

## Fixtures to Use

- `vargast-windborn-orlanth.json` (Orlanth miracles)
- `indrodar-greydog-humakt.json` (Humakt miracles)
- `torath-sunspear-yelmalio.json` (Yelmalio miracles)
- `leika-earthmother-ernalda.json` (Ernalda miracles)
