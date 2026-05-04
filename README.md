# Adventures in Glorantha — Character Sheet

Single-file HTML character generator for [Adventures in Glorantha](https://www.thedesignmechanism.com/) (Mythras engine). Covers the full 12-step creation process, provides a Play Mode for at-the-table use, and exports single-page PDF character sheets.

## Quick Start

Open `index.html` in any browser. No server, no build step. Everything is self-contained.

## Features

- **12-step wizard** — characteristics, culture, career, skills, combat, runes, **cult selection**, magic, equipment
- **94 Gloranthan cults** — Storm, Yelm, Lunar, Praxian, Darkness pantheons from [Notes from Pavis](https://notesfrompavis.blog/) Cult One-Pagers (2019 edition)
- **8 Gloranthan cultures** — Sartarite, Praxian (15 tribes), Esrolian, Lunar, Telmori, Balazaring, God Forgot, Lunar Provincial
- **10 RQG pre-gen characters** — Vasana, Yanioth, Harmast, Vishi Dunn, Vostor, Sorala, Nathem, Aranda, Dazarim, Ionara — with companion stat blocks and HP tracking
- **Play Mode** — interactive sheet with dice roller, difficulty modifiers, combat tracking, collapsible Special Effects reference
- **Random generation** — one-click fully valid character for any culture
- **PDF export** — single-page character sheet with characteristics, hit locations, weapons table, skills, runes, magic
- **Companion system** — mounts and animal companions with full stat blocks, hit location tracking, and attack tables
- **Attestable data** — every skill, weapon, combat style, and culture traces to a specific source page

## Pre-gen Characters

Load any of the 10 RQG Starter Set pre-gens via the **Load** button. Each is transcribed directly from the official [RQG Starter Set Pregen Folios](https://www.chaosium.com/runequest-starter-set/) PDF.

| Character | Cult | Companion |
|-----------|------|-----------|
| Vasana Farnan's Daughter | Orlanth | Molon (war bison) |
| Yanioth Vareena's Daughter | Ernalda | — (earth elemental, summoned) |
| Harmast Baranthos' Son | Issaries | — (riding zebras, non-combat) |
| Vishi Dunn | Waha | Cousin Monkey + High Llama |
| Vostor Son of Pyjeem | Seven Mothers | — (fire elemental, summoned) |
| Sorala Daughter of Toria | Lhankor Mhy | — |
| Nathem Son of Nhean | Odayla | Rurik (shadowcat) |
| Aranda of Nochet | Babeester Gor | — (riding horses, non-combat) |
| Dazarim Crescentblade | Yelmalio | Sevara (sable antelope) |
| Ionara Grand-daughter of Thiralda | Maran Gor | Teza (riding horse) |

## Sources

| Source | What It Provides |
|--------|-----------------|
| Mythras Core Rulebook (TDM, 3rd Printing 2018) | Skills, attributes, age tables, weapons, armour, careers, folk magic, combat |
| Adventures in Glorantha (TDM, GenCon 2015 Preview) | 8 cultures, 44 combat styles, rune affinities, culture-specific magic |
| Notes from Pavis Cult One-Pagers (2019 edition) | 94 cult definitions — skills, folk magic, miracles, personality traits, cult relationships |
| RQG Starter Set Pregen Folios (Chaosium, 2022) | 10 pre-gen character stat blocks, companion data, background narratives |

## Project Structure

```
├── index.html                  # Character sheet — wizard + play mode + PDF export
├── test-100-chars.mjs          # 100-character random generation E2E test (Playwright)
├── test-fixtures.mjs           # 10-fixture loading & companion E2E test (Playwright)
├── fixtures/                   # 10 RQG Starter Set pre-gen character fixtures
├── docs/decisions/             # Architecture Decision Records
├── .rpi/                       # Design artifacts (specs, designs, reviews)
├── lib/
│   └── pdf-lib.min.js          # PDF generation (also loaded via CDN fallback)
├── references/                 # Canonical reference data with page citations
│   ├── mythras-raw/            # Files from Mythras Core
│   ├── aig-raw/                # Files from Adventures in Glorantha
│   ├── cults-upstream/         # 286 cult one-pager PDFs (Notes from Pavis)
│   └── cults-raw/              # 94 extracted cult JSONs by pantheon
├── scripts/
│   ├── validate_character_sheet.py       # Validate character JSON against Mythras rules
│   ├── extract-cults.py                  # Extract cult data from upstream PDFs to JSON
│   ├── fix-cult-data.py                  # Clean OCR artifacts from cult personality traits
│   └── build-standalone.py               # Copy canonical index.html into dist/
└── dist/                       # Built standalone HTML
```

## Testing

```bash
# Start a local server
python3 -m http.server 8765

# Run 100-character random generation test (requires Playwright)
node test-100-chars.mjs

# Run pre-gen fixture loading test (requires Playwright)
node test-fixtures.mjs

# Browser-level testing with playwright-cli
npx playwright-cli open http://localhost:8765/index.html
npx playwright-cli snapshot
npx playwright-cli eval "CharacterData.name"
npx playwright-cli close
```

## Building Standalone

```bash
python3 scripts/build-standalone.py
# produces a distribution copy of the canonical self-contained index.html
```

## Licensing

- **"Mythras"** is a Registered Trademark of The Design Mechanism Inc, and is used with permission.
- Glorantha content uses trademarks and/or copyrights owned by Chaosium Inc/Moon Design Publications LLC, which are used under Chaosium Inc's Fan Material Policy. We are expressly prohibited from charging you to use or access this content. This tool is not published, endorsed, or specifically approved by Chaosium Inc. For more information about Chaosium Inc's products, please visit [www.chaosium.com](https://www.chaosium.com).
