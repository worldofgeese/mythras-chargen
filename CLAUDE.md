# CLAUDE.md — mythras-chargen

**Read AGENTS.md first.**

This file provides context for AI-assisted development sessions (Claude Code, Codex, or similar).

## Project Summary

Single-file HTML character generator for the Mythras RPG with optional Glorantha support. Every data field has an attestable provenance chain to the source rulebook.

## Key Files

- `index.html` — the entire application (HTML + CSS + JS, ~2200 lines)
- `data/glorantha.js` — modular Glorantha culture data (removable without breaking the engine)
- `templates/mythras-sheet.pdf` — PDF form template for character export
- `references/` — JSON files with page-cited game data (the attestable chain)
- `AGENTS.md` — source hierarchy, active rules, what NOT to use
- `PLAN.md` — implementation plan with design decisions from the grill session

## Architecture

- **Engine**: Vanilla JavaScript, no frameworks, no build step
- **Data flow**: `SKILLS_DATA` + `CULTURES_DATA` + `WEAPONS_DATA` → wizard steps → `CharacterData` → Play Mode / PDF export
- **Modularity**: Glorantha content is in `data/glorantha.js`. If the file isn't loaded, `index.html` falls back to generic Mythras culture templates.
- **PDF export**: Two paths available via pdf-lib:
  - **Simple**: Single-page PDF created from scratch (quick export)
  - **Template**: Fills form fields in `templates/mythras-sheet.pdf` (required for Phase 2 pregens)

## Source Rules (read AGENTS.md for full details)

1. **Mythras Core Rulebook** (TDM, 3rd Printing 2018) — engine of truth
2. **Adventures in Glorantha** (TDM, GenCon 2015 Preview) — Glorantha overlay
3. **Do NOT use** RuneQuest 7 / Chaosium-era stats — different engine, incompatible

## Attestable Chain Pattern

Every data constant must trace to a reference JSON with a page citation:
```
Source PDF → pdftotext/Mistral OCR → references/*.json → HTML data constant
```

When adding or modifying game data:
1. Check the reference JSON first
2. If the data isn't in a reference file, extract it from the source PDF
3. Never guess or infer — if it's not attestable, don't ship it

## Active Constraints

- 75-point characteristic build for point-buy (Mythras Core p.9-10)
- INT/SIZ minimum 8 for point-buy
- Cultural/career skills: max 15 per skill, 100 total
- 1 hobby professional skill in bonus points
- Initiative Bonus rounds DOWN (Math.floor)
- Native Tongue and Language = INT + CHA (Mythras Core p.12)
- Both trademark statements must remain in the footer

## Licensing Status

- **Mythras (TDM)**: Permission pending — IP not the sticking point
- **Glorantha (Chaosium)**: Email sent, awaiting reply
- **Action**: Keep repo private until both permissions secured
- **Contingency**: If Chaosium says no, delete `data/glorantha.js` and ship as generic Mythras chargen

## Phase 2 (Not Yet Started)

Pregen validation requires local assets:
- 10 input JSONs (one per Starter Set pregen)
- 10 folio cover PDFs
- See PLAN.md for full Phase 2 spec
