# Feature: Folk Magic Tooltips

## Summary

Hover/focus tooltips displaying Adventures in Glorantha descriptions for 45 folk magic spells. Tooltips appear on spell names in both wizard and Play Mode.

## Source Files

- `index.html` (tooltip rendering, .skill-tooltip CSS)
- `references/aig-raw/folk-magic-aig.json` (45 spell descriptions)
- `references/mythras-raw/folk-magic-spells.json` (base spell data)

## Key Behaviors

1. Each folk magic spell name shows a tooltip on hover
2. Tooltip contains AiG-specific description text
3. 45 spells have descriptions (complete coverage)
4. Tooltips accessible via focus (keyboard navigation)
5. Mobile: tooltips fixed to bottom of screen
6. Tooltip does not overflow viewport

## Boundary Conditions

- Long description text wraps properly
- Spell with no AiG description shows no tooltip (graceful)
- Multiple tooltips don't stack/overlap
- Touch devices: tooltip appears on tap, dismisses on tap-away
- Tooltip z-index above other UI elements

## Existing Coverage

- `tests/unit/test-folk-magic-tooltips.html` (unit tests exist)

## Test Types Needed

- Unit: All 45 spells have matching descriptions (data completeness)
- Integration: Tooltip renders on hover for each spell
- Integration: Mobile fixed-position tooltip behavior
- Accessibility: Tooltip reachable via keyboard focus

## Fixtures to Use

- Any fixture with folk magic spells (most have them)
- `vasana.json`, `harmast.json`
