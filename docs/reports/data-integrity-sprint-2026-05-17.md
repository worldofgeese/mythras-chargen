# Data Integrity Sprint Report — 2026-05-17/18

## Summary

Vision-mode verification against source PDFs revealed that LLM-generated content in the Phase 2 implementation was incorrect. This sprint corrected all hallucinated data with verified PDF text.

## Key Fixes

### Sorcery Spells (U1, U3)
- **Before**: 34 spells with fabricated descriptions, INT/4 limit formula
- **After**: 53 spells (all from Mythras Core p.166-177), verified descriptions, 3-spell Dedicated rank limit (Core p.165)
- Wrong spell names fixed: `Repulse (Substance)` → `Repulse (Creatures)`, `Wrack (Species)` → `Wrack (Substance or Harm)`, added `Summon` + `Evoke` as separate spells

### Spirit Data (U2)
- **Before**: Fabricated abilities ("grants limbs greater alacrity", "+1 Action Point")
- **After**: Verified abilities from Bird in Hand PDF (Bless Initiative +2, Endowment Camouflage, Endowment Grappler)
- POW/CHA values corrected from vision-verified stat blocks

### Formulas (U3)
- Spell limit: `Math.ceil(INT/4)` → `3` (Dedicated rank, Core p.165: starting = Invocation/20)
- Spirit slots: CHA/2 **verified** as Mythras Core p.136 (not a house rule)

### House Rules (U4)
- Created ADR-0007 documenting all Hannu house rules with Discord screenshot citations
- 9 rules documented: casting, devotional pool, spell categories, rank progression

### Infrastructure
- Play Mode crash fixed (weapons string vs array)
- Architecture guidance updated (`.rpiv/guidance/`)
- Test case specs updated for corrected formulas
- CHANGELOG.md refreshed
- Demo screenshots captured

## Beads Closed

77/79 total beads closed across the full project lifecycle.

## Verification Method

All corrections used "vision mode" verification:
1. Render PDF page to image via pdftoppm
2. Read image with vision model
3. Compare against code/JSON
4. Fix discrepancies with exact book text

This caught errors that pdftotext missed (tables, stat blocks, formatted rules).

## Remaining Work

- `mythras-chargen-4g7`: README review and update (last bead)
- Future: Mysticism UI (blocked on Hannu publishing updated cult mechanics)
