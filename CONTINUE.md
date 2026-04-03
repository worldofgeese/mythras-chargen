# CONTINUE.md — mythras-chargen

Generated: 2026-04-03T13:45 CEST
Source: OpenClaw session 2026-04-02/03

## Current State
The chargen wizard works end-to-end for character creation. Attestable provenance chains are complete. Play Mode has rendering gaps for Combat, Runes, Magic, and Equipment sections.

## What Was Done (2026-04-02/03 Session)

### Data Attestation (✅ Complete)
- Extracted 14 Mythras Core reference JSONs (skills, attributes, weapons, armour, etc.)
- Extracted 8 AiG cultures via Mistral OCR with page citations
- Full attestable chain validation report (`validation/validation-report.md`)
- All CULTURES_DATA rewritten from Mistral OCR (44 combat styles)
- Native Tongue/Language → INT+CHA (Mythras Core p.12)
- Initiative → Math.floor (Mythras Core p.11)
- 15-point per-skill caps enforced
- Both trademark statements in footer

### Architecture
- Modular Glorantha data (`data/glorantha.js`, removable)
- Browser-side PDF export via pdf-lib
- Hyperclay HTML export (self-contained character sheet)
- Build script (`scripts/build-standalone.py`)
- Merged rqim-starter-set-kit docs and scripts

### Grill Session Design Decisions
| Decision | Choice |
|----------|--------|
| PDF export | Browser-side (pdf-lib) |
| Custom char PDF | 3 pages (no cover) |
| Repo name | mythras-chargen |
| Glorantha data | Modular/removable |
| Pregen validation | Phase 2 |

## Known Issues (Fix These)

### Critical
1. **Play Mode blank sections** — Combat, Runes, Magic, Equipment render but show no data. CharacterData properties are empty because:
   - `weapons` array is never populated during wizard (no weapon selection step)
   - `runeAffinities` object may not persist properly to Play Mode
   - `equipment` may not carry over from Step 11 auto-populate
   - Root cause: need to trace data flow from wizard steps to CharacterData to Play Mode rendering

### High
2. **Step 11 renders twice** — duplicate review/summary content
3. **Special Effects Reference** — double ▼▶ toggle icon, empty content when clicked
4. **Sartarite and Lunar Provincial homelands** — buttons say "Select a culture first" even when culture is selected. Key mismatch: culture names use "Sartarite (Heortling)" and "Lunar Provincial" but homeland map may use different keys.

### Medium
5. **Combat Style names** — "Combat Style (Cultural Style)" is too ambiguous, needs proper named styles from the culture
6. **Folk magic spell tooltips** — need one-sentence description + page number for each spell
7. **Career vs Professional Skills** — terminology inconsistency in UI labels
8. **Export buttons confusing** — Print/Export PDF/Export HTML differences unclear to users

### Low
9. **Folk magic tooltips** — attestable provenance page numbers for each spell
10. **POW definition** — Step 5 should explain what POW is with Mythras Core page ref

## Pending Tasks (Not Started)
- TDD tests for every data field
- Playwright-CLI end-to-end tests
- OpenSpec + Decapod validation
- Full SDLC loop
- Phase 2: Pregen validation (needs local assets)

## Key Files
| File | Purpose |
|------|---------|
| `index.html` | The chargen app (3547 lines) |
| `data/glorantha.js` | Modular Glorantha culture data |
| `templates/mythras-sheet.pdf` | PDF template (1334 form fields) |
| `references/mythras-raw/*.json` | 14 Mythras attestable chain files |
| `references/aig-raw/*.json` | 7 AiG attestable chain files |
| `scripts/build-standalone.py` | Build inlined standalone HTML |
| `AGENTS.md` | Project rules and source hierarchy |
| `CLAUDE.md` | Claude Code project config |
| `PLAN.md` | Implementation plan + design decisions |

## How to Continue
1. Open this directory in Claude Code
2. Read CLAUDE.md for project context
3. Read AGENTS.md for source rules
4. Start with Critical issue #1 (Play Mode data flow)
5. Use browser dev tools to trace CharacterData through wizard steps
6. Fix the data flow, then address issues 2-10 in order
