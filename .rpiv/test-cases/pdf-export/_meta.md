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

## Boundary Conditions

- Very long character name truncates gracefully
- Many skills (30+) fit on single page or overflow handled
- Special characters in names (accents, apostrophes)
- Empty optional fields don't leave blank gaps
- Large equipment lists
- PDF file size reasonable (< 500KB)

## Existing Coverage

- `test-chargen.js` has PDF-related validation (field mapping)
- `tests/integration/test-export-buttons.html` (button state tests)

## Test Types Needed

- Unit: PDF field mapping covers all CharacterData fields
- Integration: Export produces valid PDF blob
- E2E: Export per cult type, verify PDF is non-empty and downloadable
- Regression: Each of 24 fixtures exports without error

## Fixtures to Use

- All 24 fixtures (regression: each must export cleanly)
- Focus fixtures: one per cult type
