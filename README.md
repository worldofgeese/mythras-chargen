# mythras-chargen

A character creation tool for the Mythras roleplaying game, with optional Glorantha support via Adventures in Glorantha.

## What It Does

- **12-step character creation wizard** — follows the Mythras Core Rulebook character creation process
- **Play Mode** — interactive character sheet for at-the-table use with dice roller, skill checks, and combat tracking
- **PDF Export** — fill a standard Mythras character sheet PDF directly in the browser (Phase 1)
- **Attestable data** — every skill formula, culture, combat style, and derived attribute traces back to a specific source page

## Quick Start

Open `index.html` in any browser. That's it. No server, no build step, no dependencies.

With Glorantha cultures: keep `data/glorantha.js` alongside `index.html`.
Without Glorantha: delete `data/glorantha.js` — the tool falls back to generic Mythras culture templates.

## Sources

All game data is attested against:

| Source | What It Provides |
|--------|-----------------|
| Mythras Core Rulebook (TDM, 3rd Printing 2018) | Skills, attributes, age tables, weapons, armour, careers, folk magic, combat |
| Adventures in Glorantha (TDM, GenCon 2015 Preview) | 8 Gloranthan cultures, 44 combat styles, rune affinities, culture-specific magic |

Reference JSON files in `references/` contain the extracted data with page citations.

## Licensing

- **"Mythras"** is a Registered Trademark of The Design Mechanism Inc, and is used with permission.
- Glorantha content uses trademarks and/or copyrights owned by Chaosium Inc/Moon Design Publications LLC, which are used under Chaosium Inc's Fan Material Policy. We are expressly prohibited from charging you to use or access this content. This tool is not published, endorsed, or specifically approved by Chaosium Inc. For more information about Chaosium Inc's products, please visit www.chaosium.com.

## Project Structure

```
mythras-chargen/
├── index.html              # Character creation wizard + Play Mode
├── data/
│   └── glorantha.js        # Gloranthan cultures (optional, removable)
├── templates/
│   └── mythras-sheet.pdf   # PDF template for export
├── references/             # Attestable chain JSON files
│   ├── mythras-raw/        # 14 files from Mythras Core
│   └── aig-raw/            # 7 files from Adventures in Glorantha
├── docs/                   # GM conversion guides and handouts
├── scripts/                # Python tools (pregen generation, validation)
├── validation/             # Validation reports
├── AGENTS.md               # Project rules and provenance chains
├── CLAUDE.md               # Context for AI-assisted development
└── PLAN.md                 # Implementation plan with design decisions
```

## Phase 2 (Planned)

- Validate 10 RuneQuest Starter Set pregens against attestable chains
- Browser-side pregen loading and 4-page PDF export with folio covers
- Requires local pregen assets not included in this repo

## Contributing

This is a fan project. See licensing notes above. Do not publish publicly until licensing permissions are confirmed.
