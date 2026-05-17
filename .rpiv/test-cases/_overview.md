# Test Cases Overview — mythras-chargen

## Project Summary

Single-page HTML application for creating Mythras TTRPG characters with Glorantha (Adventures in Glorantha) support. No build step; vanilla JS with pdf-lib for export. Existing tests use a custom browser-based harness (tests/) and a Node-based fixture validator (test-chargen.js).

## Test Infrastructure

| Layer | Tool | Location |
|-------|------|----------|
| Unit (browser) | Custom assert harness | `tests/unit/*.html` |
| Integration (browser) | Custom harness + iframe runner | `tests/integration/*.html` |
| E2E | Playwright | `tests/e2e/` |
| Fixture validation | Node.js script | `test-chargen.js` |

## Feature Inventory (15 features)

| # | Feature | Directory | Priority | Existing Coverage |
|---|---------|-----------|----------|-------------------|
| 1 | Character creation wizard | `character-creation-wizard/` | P0 | Partial (E2E spec) |
| 2 | Cult type detection | `cult-type-detection/` | P0 | Fixture validation |
| 3 | Magic resource assignment | `magic-resource-assignment/` | P0 | Fixture validation |
| 4 | Miracle picker | `miracle-picker/` | P1 | None |
| 5 | Sorcery spell picker | `sorcery-spell-picker/` | P1 | None |
| 6 | Spirit picker | `spirit-picker/` | P1 | None |
| 7 | Folk magic tooltips | `folk-magic-tooltips/` | P2 | Unit test exists |
| 8 | Play Mode rendering | `play-mode-rendering/` | P1 | None |
| 9 | PDF export | `pdf-export/` | P1 | Partial (test-chargen.js) |
| 10 | Fixture loading | `fixture-loading/` | P0 | test-chargen.js |
| 11 | Progressive handouts | `progressive-handouts/` | P2 | None |
| 12 | Cultural skill allocation | `cultural-skill-allocation/` | P0 | None |
| 13 | Career skill allocation | `career-skill-allocation/` | P0 | None |
| 14 | Bonus skill allocation | `bonus-skill-allocation/` | P0 | None |
| 15 | Characteristics validation | `characteristics-validation/` | P0 | Fixture validation |

## Recommended Test Order

1. Characteristics validation (pure logic, no UI)
2. Fixture loading (validates data integrity)
3. Cult type detection (pure logic)
4. Magic resource assignment (pure logic)
5. Cultural/Career/Bonus skill allocation (budget logic)
6. Character creation wizard (E2E flow)
7. Miracle/Sorcery/Spirit pickers (UI + logic)
8. Play Mode rendering (visual)
9. PDF export (output validation)
10. Folk magic tooltips (already covered, extend)
11. Progressive handouts (static content)
