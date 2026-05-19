# Feature: Miracle Picker

## Summary

UI for selecting miracles (theist magic) from a per-cult list. Limited by `effectiveMax = min(POW/2 floor, qualifiedMiracles.length)`. Integrates rune affinity matching via `getQualifiedInitiateMiracles()` to show qualified vs locked miracles. Each cult provides a specific miracle list from MIRACLES_DATA.

## Source Files

- `index.html` (miracle picker UI, `renderMiraclePicker`, `toggleMiracle`, `getQualifiedInitiateMiracles`)
- `index.html` (MIRACLES_DATA inline constant)
- `references/cults-raw/` (cult-specific miracle lists)

## Key Behaviors

1. Display miracles available to the selected cult (from `getQualifiedInitiateMiracles()`)
2. Qualified miracles selectable; locked miracles greyed out (rune mismatch)
3. Enforce `effectiveMax` selection limit (min of POW/2 and qualified count)
4. Show remaining slots counter: "Selected: N / effectiveMax"
5. Pool-capped indicator when effectiveMax < POW/2 (explanation text)
6. Prevent over-selection (toast error on exceeding limit)
7. `toggleMiracle()` preserves scroll position (no page jump)
8. Selected miracles persist to CharacterData.miracles[]
9. Selected miracles render in Play Mode magic section
10. Validation in nextStep: must select exactly effectiveMax miracles
11. Rune affinity highlighting on miracle cards
12. Separate #miracle-picker container (hidden for non-theist cults)

## Boundary Conditions

- POW = 8 → max 4 miracles (floor(8/2))
- POW = 9 → max 4 miracles (floor(9/2))
- POW = 3 → max 1 miracle
- effectiveMax capped by qualified count (fewer qualifying miracles than POW/2)
- 0 qualified miracles → no selection required, advance allowed
- Deselecting a miracle frees a slot and updates counter
- Cult change clears previous miracle selections (orphan cleanup)
- Scroll position preserved across toggleMiracle calls
- Hybrid cult (e.g., Waha) shows miracle picker alongside spirit picker

## Existing Coverage

- Unit tests validate miracle data structure
- E2E tests build characters with miracles
- Quick Boost panel (commit d403201) added initiation gate interaction

## Test Types Needed

- Unit: POW/2 limit calculation
- Unit: effectiveMax capping logic
- Unit: getQualifiedInitiateMiracles() rune matching
- Integration: Miracle list populates from cult data with qualified/locked split
- Integration: Selection limit enforcement (toast at effectiveMax)
- Integration: Pool-capped message appears when relevant
- Integration: Scroll preservation across toggleMiracle
- Integration: Locked miracles not clickable
- Integration: Rune affinity highlighting on cards
- Integration: Persistence through wizard steps
- E2E: Select miracles → visible in Play Mode
- Regression: Cult change clears selections without stale DOM

## Fixtures to Use

- `vargast-windborn-orlanth.json` (Orlanth miracles)
- `indrodar-greydog-humakt.json` (Humakt miracles)
- `torath-sunspear-yelmalio.json` (Yelmalio miracles)
- `leika-earthmother-ernalda.json` (Ernalda miracles)
