# Feature: PDF Export

## Summary

Generates a single-page PDF character sheet using pdf-lib. Exports all character data into a formatted PDF document. Must handle all cult types and their specific magic sections.

## Source Files

- `index.html` (App.exportSinglePagePDF function)
- `lib/pdf-lib.min.js` (PDF generation library)
- `references/pdf-field-map.json` (field mapping for PDF template)

## Key Behaviors

1. Export button enabled only when character has minimum data
2. PDF contains: identity, characteristics, attributes, skills, combat, magic, equipment
3. Magic section varies by cult type (theist/animist/sorcery/hybrid)
4. PDF renders without errors for all cult types
5. PDF file downloads with character name in filename
6. Hit locations table included
7. Passions and rune affinities included
8. Section separators (`line()` calls) between weapons, skills, passions, equipment
9. Stat bar spacing consistent (no overlapping headers)
10. Header collision avoidance (section headers don't overlap content from previous section)

## Boundary Conditions

- Very long character name truncates gracefully
- Many skills (30+) fit on single page or overflow handled
- Special characters in names (accents, apostrophes)
- Empty optional fields don't leave blank gaps
- Large equipment lists
- PDF file size reasonable (< 500KB)
- Header collision: section header must not overlap previous section's last content line
- Separator spacing: 9px gap before each separator line (lines 7633, 7678, 7710, 7851)
- Stat bar: y-coordinate tracking doesn't underflow (negative y values)
- Extra clearance separator before equipment section (different from others)

## Existing Coverage

- `test-chargen.js` has PDF-related validation (field mapping)
- `tests/integration/test-export-buttons.html` (button state tests)

## Test Types Needed

- Unit: PDF field mapping covers all CharacterData fields
- Unit: Section y-coordinate calculation doesn't produce negative values
- Unit: Separator spacing consistent (9px for all, extra for equipment)
- Integration: Export produces valid PDF blob
- Integration: Header collision test — section with many items doesn't overlap next header
- Integration: Stat bar renders without overlapping characteristic labels
- E2E: Export per cult type, verify PDF is non-empty and downloadable
- E2E: Export character with 30+ skills, verify no content clipping
- Regression: Each of 24 fixtures exports without error
- Visual: Render PDF to PNG, verify no overlapping text (vision mode)

## Fixtures to Use

- All 24 fixtures (regression: each must export cleanly)
- Focus fixtures: one per cult type
