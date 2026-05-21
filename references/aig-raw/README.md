# Adventures in Glorantha Reference Extractions

## Status: Legacy Structured Extractions (Source-Blocked)

This directory contains legacy structured reference data for **Adventures in Glorantha (GenCon 2015 Preview, GenCon 2015)**. Under the current source-authority policy, these records are source-blocked until bounded vision extraction and independent verification exist.

### Source PDF

The canonical locator is recorded in `references/sources/manifest.json`; `references/sources/pdfs/aig.pdf` is the ignored local hint. The observed source revision is recorded by SHA-256, size, and 212-page count, but the PDF is not committed.

### Validation Method

Earlier `pdftotext`/OCR-era checks are retained only as historical context. The current authoritative chain requires the source manifest, all-page blocked records, bounded vision evidence, and independent verifier artifacts before normalized AiG facts can be accepted.

### Structured JSON Files

| File | Status | Content | Source Pages |
|------|--------|---------|-------------|
| `cultures.json` | Legacy, source-blocked | 8 cultures (skills, passions, folk magic, CSE-linked combat styles) | p.26-41 |
| `cultures-mistral.json` | Superseded raw extraction | Historical Mistral extraction used during reconciliation | p.26-41 |
| `combat-styles-aig.json` | Superseded incomplete | Historical partial AiG combat-style extraction; app uses `../combat-styles.json` | p.26-41 |
| `equipment-aig.json` | Legacy, source-blocked | Starting money/equipment derivation; combat styles point to CSE authority | p.24-41 |
| `creation-summary-aig.json` | Legacy | 12-step creation process | p.23-25 |
| `folk-magic-aig.json` | Legacy, source-blocked | AiG Folk Magic spells plus all 8 culture folk magic lists | p.26-41, p.63-68 |
| `culture-magic-profiles-aig.json` | Legacy, source-blocked | Culture-level magic-system fit and caveats | p.26-41, p.59-62, p.136-137 |
| `rune-affinities.json` | Legacy | Rune system mechanics | p.24 |
| `magic-overview-aig.json` | Legacy, source-blocked overview | Magic system summaries and general casting rules | p.59-62 |
| `rune-magic-aig.json` | Legacy raw spell text | Rune spell names/pages/descriptions; stat-line metadata not yet normalized | p.69-122 |
| `spirit-magic-aig.json` | Legacy raw spirit text | Spirit traditions, abilities, passions, and spirits; rune associations not yet normalized | p.134-151 |

### Key Finding: Equipment Chapter

The AiG GenCon 2015 preview **does NOT contain a dedicated Equipment chapter**. The preface (p.4) lists "missing chapters" from the preview, and while "Equipment" appears in the table of contents, the chapter content was never published. The finished AiG was never released due to TDM/Chaosium separation.

**Equipment is derived from:**
1. Starting money formula per culture (p.24-25)
2. Combat style weapon lists per culture (p.26-41)
3. Mythras Core equipment prices (Core p.69-72) for purchasing additional gear
4. Cultural technology descriptions constrain available materials

### Copyright Notice

Adventures in Glorantha is ©2015 Moon Design Publications and The Design Mechanism.
These reference files contain structured game mechanics data with page citations only.
