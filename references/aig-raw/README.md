# Adventures in Glorantha Reference Extractions

## Status: Structured Extraction Complete

This directory contains structured reference data extracted from **Adventures in Glorantha (GenCon 2015 Preview, GenCon 2015)**.

### Source PDF

`/home/worldofgeese/Downloads/RuneQuest_TDM_Sixth_Edition_Adventures_in_Glorantha_Special_GenCon.pdf` (193MB, 212 pages) is the source PDF used for page-level validation. The PDF is a hybrid: text-layer pages plus scanned images.

### Validation Method

`AiG-full-ocr.md` was removed as an active data store after the vision/OCR validation pass. The authoritative chain is now the source PDF plus structured JSON with page citations. Validation used `pdftotext`, rendered page images, and OCR spot checks against the local PDF.

### Structured JSON Files

| File | Status | Content | Source Pages |
|------|--------|---------|-------------|
| `cultures.json` | Complete, validated | 8 cultures (skills, passions, folk magic, CSE-linked combat styles) | p.26-41 |
| `cultures-mistral.json` | Superseded raw extraction | Historical Mistral extraction used during reconciliation | p.26-41 |
| `combat-styles-aig.json` | Superseded incomplete | Historical partial AiG combat-style extraction; app uses `../combat-styles.json` | p.26-41 |
| `equipment-aig.json` | Complete, validated | Starting money/equipment derivation; combat styles point to CSE authority | p.24-41 |
| `creation-summary-aig.json` | Complete | 12-step creation process | p.23-25 |
| `folk-magic-aig.json` | Complete, validated | AiG Folk Magic spells plus all 8 culture folk magic lists | p.26-41, p.63-68 |
| `culture-magic-profiles-aig.json` | Complete, validated | Culture-level magic-system fit and caveats | p.26-41, p.59-62, p.136-137 |
| `rune-affinities.json` | Complete | Rune system mechanics | p.24 |
| `magic-overview-aig.json` | Complete, validated overview | Magic system summaries and general casting rules | p.59-62 |
| `rune-magic-aig.json` | Validated raw spell text | Rune spell names/pages/descriptions; stat-line metadata not yet normalized | p.69-122 |
| `spirit-magic-aig.json` | Validated raw spirit text | Spirit traditions, abilities, passions, and spirits; rune associations not yet normalized | p.134-151 |

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
