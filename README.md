# Adventures in Glorantha — Character Generator

Single-file HTML character generator for [Adventures in Glorantha](https://www.thedesignmechanism.com/) (Mythras engine). Covers the full 12-step creation process with all 5 magic systems, provides Play Mode for at-the-table use, and exports single-page PDF character sheets.

## Quick Start

Open `index.html` in any browser. No server, no build step, no dependencies.

## Features

### Character Creation
- **12-step wizard** — characteristics, culture, career, skills, combat, cult, magic, equipment
- **94 Gloranthan cults** — Storm, Yelm, Lunar, Praxian, Darkness, Chaos, Independent pantheons from [Notes from Pavis](https://notesfrompavis.blog/) one-pagers
- **8 cultures** — Sartarite, Praxian, Esrolian, Lunar Heartland, Lunar Provincial, Balazaring, Telmori, God Forgot
- **Auto-detection** — cult type detected from skill patterns (theist, animist, sorcery, hybrid)
- **Random generation** — one-click fully valid character for any culture

### Magic Systems (all 5 Mythras systems)
- **Folk Magic** — 45 spells with AiG tooltips
- **Theism (Rune Magic)** — miracle picker with rune-affinity highlighting, devotional pool (POW/2)
- **Animism** — spirit picker with 14 templates, CHA/2 binding limit (Core p.136)
- **Sorcery** — 53 spells from Mythras Core p.166-177, 3 starting spells (Dedicated rank)
- **Mysticism** — implemented in code, awaiting cult data from Hannu

### Play Mode & Export
- **Play Mode** — interactive sheet with difficulty modifiers, skill breakdown table
- **PDF export** — single-page character sheet with characteristics, hit locations, skills, magic, combat styles
- **Combat style** detail with weapons and traits

### Progressive Learning Handouts
- **Combat Path** — 12-stage guide from basic attacks to advanced Special Effects
- **Magic Path** — 11-stage guide covering all 5 magic systems
- **Combined Path** — 7-stage integrated combat + magic progression

## Data Pipeline

### Ingesting new cult PDFs

When Hannu delivers updated cult one-pager PDFs, use the deterministic ingestion pipeline:

```bash
# 1. Place PDFs in references/cults-upstream/<pantheon>/
cp new-cults/*.pdf references/cults-upstream/Storm/

# 2. Run font-aware extraction (uv handles dependencies automatically)
./scripts/ingest-cults.py references/cults-upstream/Storm/NewCult.pdf

# 3. Review diff against existing data (dry run by default)
./scripts/ingest-cults.py --diff

# 4. Write updated reference JSONs
./scripts/ingest-cults.py --write

# 5. Validate no garbled entries remain
./scripts/ingest-cults.py --validate
```

The pipeline uses `pdfplumber` to detect the custom `GloranthaCoreRunes` font at the character level, cleanly separating rune annotations from miracle text — no regex heuristics needed.

### Rebuilding the rune glyph map

If new PDFs introduce unknown rune glyphs:

```bash
./scripts/build-rune-map.py          # Scan all PDFs, update references/rune-glyph-map.json
./scripts/build-rune-map.py --show   # Just display glyphs found (no write)
```

### Scripts

| Script | Purpose |
|--------|---------|
| `scripts/ingest-cults.py` | Font-aware cult PDF extraction — produces clean reference JSONs |
| `scripts/build-rune-map.py` | Scan PDFs for GloranthaCoreRunes glyphs → mapping table |
| `scripts/fix-garbled-miracles.js` | One-time cleanup of OCR garbage in existing references |

All Python scripts are self-contained via [PEP 723](https://peps.python.org/pep-0723/) inline metadata — just `chmod +x` and run. [uv](https://github.com/astral-sh/uv) handles dependencies automatically.

## Data Integrity

All game data is verifiable against source PDFs (ADR-003):

```
PDF → references/*.json → inline constant in index.html → UI
```

- Sorcery spells: vision-verified against Mythras Core p.166-177
- Spirit stats: vision-verified against Bird in Hand p.43-46
- Miracle data: font-aware extracted from 213 cult one-pager PDFs
- Formulas: cited with exact page references
- House rules: documented in ADR-0007 with Discord screenshot citations

## Sources

| Source | Content |
|--------|---------|
| Mythras Core Rulebook (TDM, 3rd Printing 2018) | Skills, attributes, weapons, sorcery (53 spells), animism, mysticism |
| Adventures in Glorantha (TDM, 2015) | 8 cultures, combat styles, rune affinities, folk magic (45 spells) |
| Notes from Pavis Cult One-Pagers (2019, v5.2) | 94 cults — skills, folk magic, miracles, personality traits |
| Bird in the Hand (TDM) | Spirit stat block examples (Whulla, Eous, Ghu, etc.) |
| Monster Island (TDM) | Spirit templates and abilities |

## Project Structure

```
index.html                — The entire application (~19,800 lines)
references/               — Source data (JSON) with page citations
  rune-glyph-map.json    — GloranthaCoreRunes font → rune name mapping (41 glyphs)
  aig-raw/                — Adventures in Glorantha extractions
  cults-raw/              — 94 cult JSONs by pantheon
  cults-upstream/         — Original cult PDF sources (not in git)
  mythras-raw/            — Mythras Core extractions (sorcery, animism)
  spirits-raw/            — Spirit data (Bird in Hand, Monster Island)
scripts/
  ingest-cults.py         — Deterministic cult PDF ingestion (PEP 723 + uv)
  build-rune-map.py       — Rune glyph font scanner (PEP 723 + uv)
  fix-garbled-miracles.js — One-time OCR cleanup utility
fixtures/                 — 24 character JSON files for regression testing
test-chargen.js           — 235 unit tests (Node.js, no browser needed)
test-agent-api.mjs        — E2E tests via playwright-cli
docs/
  adr/                    — Architecture Decision Records (ADR-001 to ADR-0007)
  handouts/               — Progressive learning handouts (HTML)
  plans/                  — Implementation plans
  reports/                — Sprint reports and acceptance tests
  screenshots/            — Demo screenshots
  solutions/              — Documented learnings
templates/                — PDF export templates
.rpiv/
  guidance/               — Architecture docs for AI agents
  test-cases/             — QA test case specifications
```

## Testing

```bash
# Unit tests (no browser needed)
node test-chargen.js

# E2E tests (requires agent-browser or playwright-cli)
python3 -m http.server 8765 &
node test-agent-api.mjs

# Validate reference data integrity
./scripts/ingest-cults.py --validate
```

## Architecture Decisions

| ADR | Topic |
|-----|-------|
| 001 | Magic System Architecture — regex-based cult classification |
| 002 | Rune Affinity Casting Model — house rules for devotional pool |
| 003 | Attestable Data Chain — all data traces to source PDF |
| 004 | Language-Homeland Mapping — culture → language derivation |
| 005 | Placeholder Skill Disambiguation — (any) skill resolution |
| 006 | Full Magic System Coverage — 5 systems supported |
| 007 | Hannu House Rules — casting, devotional pool, rank progression |

## Licensing

- **"Mythras"** is a Registered Trademark of The Design Mechanism Inc, and is used with permission.
- Glorantha content uses trademarks and/or copyrights owned by Chaosium Inc/Moon Design Publications LLC, used under Chaosium Inc's Fan Material Policy. This tool is not published, endorsed, or specifically approved by Chaosium Inc. For more information: [www.chaosium.com](https://www.chaosium.com).
