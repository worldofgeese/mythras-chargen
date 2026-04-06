# Adventures in Glorantha — Character Sheet

Single-file HTML character generator for [Adventures in Glorantha](https://www.thedesignmechanism.com/) (Mythras engine). Covers the full 12-step creation process, provides a Play Mode for at-the-table use, and exports single-page PDF character sheets.

## Quick Start

Open `index.html` in any browser. No server, no build step. Everything is self-contained.

## Features

- **12-step wizard** — characteristics, culture, career, skills, combat, runes, **cult selection**, magic, equipment
- **94 Gloranthan cults** — Storm, Yelm, Lunar, Praxian, Darkness pantheons from [Notes from Pavis](https://notesfrompavis.blog/) Cult One-Pagers (2019 edition)
- **8 Gloranthan cultures** — Sartarite, Praxian (15 tribes), Esrolian, Lunar, Telmori, Balazaring, God Forgot, Lunar Provincial
- **Play Mode** — interactive sheet with dice roller, difficulty modifiers, combat tracking, collapsible Special Effects reference
- **Random generation** — one-click fully valid character for any culture
- **PDF export** — single-page character sheet with characteristics, hit locations, weapons table, skills, runes, magic
- **Attestable data** — every skill, weapon, combat style, and culture traces to a specific source page

## Sources

| Source | What It Provides |
|--------|-----------------|
| Mythras Core Rulebook (TDM, 3rd Printing 2018) | Skills, attributes, age tables, weapons, armour, careers, folk magic, combat |
| Adventures in Glorantha (TDM, GenCon 2015 Preview) | 8 cultures, 44 combat styles, rune affinities, culture-specific magic |
| Notes from Pavis Cult One-Pagers (2019 edition) | 94 cult definitions — skills, folk magic, miracles, personality traits, cult relationships |

## Project Structure

```
├── index.html                  # Character sheet — wizard + play mode + PDF export
├── test-chargen.js             # 221 tests (node, no dependencies)
├── lib/
│   └── pdf-lib.min.js          # PDF generation (also loaded via CDN fallback)
├── data/
│   └── glorantha.js            # Gloranthan culture data (source file; inlined into index.html)
├── references/                 # Canonical reference data with page citations
│   ├── mythras-raw/            # 12 files from Mythras Core
│   ├── aig-raw/                # 7 files from Adventures in Glorantha
│   ├── cults-upstream/         # 286 cult one-pager PDFs (Notes from Pavis)
│   ├── cults-raw/              # 94 extracted cult JSONs by pantheon
│   ├── culture-cult-map.json   # Which cults are available per culture
│   └── pdf-field-map.json      # PDF template field mapping
├── templates/
│   └── mythras-sheet.pdf       # Official Mythras PDF template (for pregen pipeline)
├── scripts/
│   ├── generate_starter_set_pregens.py   # Pregen pipeline: JSON → filled PDF + cover pages
│   ├── validate_character_sheet.py       # Validate character JSON against Mythras rules
│   ├── extract-cults.py                  # Extract cult data from upstream PDFs to JSON
│   ├── fix-cult-data.py                  # Clean OCR artifacts from cult personality traits
│   └── build-standalone.py               # Build dist/mythras-chargen-standalone.html
├── fixtures/                   # Test character fixtures (4 cultures)
├── docs/                       # GM reference docs
│   ├── conversion-guide.md
│   ├── worked-example-vasana.md
│   ├── pregen-template.md
│   ├── adventure-prep-checklists.md
│   ├── spell-conversion-worksheet.csv
│   └── handouts/               # Player/GM quickstart handouts
├── tests/                      # Browser-based test suites (unit + integration)
├── dist/                       # Built standalone HTML
├── AGENTS.md                   # AI development instructions
└── CLAUDE.md                   # Claude Code context
```

## Testing

```bash
# Node tests (no dependencies)
node test-chargen.js

# Browser tests — open in browser after starting a local server
python3 -m http.server 8765
# then visit http://localhost:8765/tests/test-runner.html
```

## Pregen Pipeline

The `scripts/generate_starter_set_pregens.py` pipeline converts character JSON into filled PDF character sheets combined with folio cover pages. It uses `templates/mythras-sheet.pdf` as the base template and `references/pdf-field-map.json` for field mapping.

```bash
python3 scripts/generate_starter_set_pregens.py
```

Requires local pregen assets not included in this repo (source character data, cover page PDFs).

## Building Standalone

```bash
python3 scripts/build-standalone.py
# produces dist/mythras-chargen-standalone.html
```

## Licensing

- **"Mythras"** is a Registered Trademark of The Design Mechanism Inc, and is used with permission.
- Glorantha content uses trademarks and/or copyrights owned by Chaosium Inc/Moon Design Publications LLC, which are used under Chaosium Inc's Fan Material Policy. We are expressly prohibited from charging you to use or access this content. This tool is not published, endorsed, or specifically approved by Chaosium Inc. For more information about Chaosium Inc's products, please visit [www.chaosium.com](https://www.chaosium.com).
