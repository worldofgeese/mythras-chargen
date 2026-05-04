# Adventures in Glorantha Reference Extractions

## Status: Full Extraction Complete

This directory contains structured reference data extracted from **Adventures in Glorantha (GenCon 2015 Preview, GenCon 2015)**.

### Source PDF

`AiG.pdf` (193MB, 212 pages, gitignored) — downloaded from `files.geese.party`. The PDF is a hybrid: ~87 pages have text layers, ~125 pages are scanned images.

### Full OCR Extraction

`AiG-full-ocr.md` (14,638 lines) — complete text extraction using `claude-doc-tools` with Tesseract OCR for scanned pages. This is the authoritative text reference for page-level citations.

**Extraction method:** `python3.11 /tmp/claude-doc-tools/convert.py AiG.pdf`
- Text-layer pages: extracted via pdfplumber
- Scanned pages: OCR'd via Tesseract 5.3.0

### Structured JSON Files

| File | Status | Content | Source Pages |
|------|--------|---------|-------------|
| `cultures.json` | Complete | 8 cultures (skills, type) | p.26-41 |
| `cultures-mistral.json` | Complete | Extended culture data with passions | p.26-41 |
| `combat-styles-aig.json` | Partial (2/8) | Named combat styles | p.26-41 |
| `equipment-aig.json` | **Complete** | All 8 cultures' combat styles, starting money, equipment derivation | p.24-41 |
| `creation-summary-aig.json` | Complete | 12-step creation process | p.23-25 |
| `folk-magic-aig.json` | Partial (2/8) | Culture folk magic lists | p.26-41 |
| `rune-affinities.json` | Complete | Rune system mechanics | p.24 |

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
