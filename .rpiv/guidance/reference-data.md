# Reference Data Pattern (ADR-003)

## Attestable Data Chain

Every data constant in the application must trace to a verifiable source:

```
Source PDF/Book
  → pdftotext / OCR extraction (scripts/)
    → references/*.json (with page citation)
      → HTML data constant (CULTS_DATA, SKILLS_DATA, etc.)
```

## Rules

1. **No data without a reference file.** If it's not in `references/`, it doesn't go in the app.
2. **Page citations required.** Every reference JSON must cite source + page.
3. **House rules are artifacts.** Screenshots, conversation logs stored in `docs/adr/artifacts/`.
4. **OCR must be human-verified.** Noisy output needs manual review. Rune prefix codes are error-prone.
5. **No LLM hallucination.** Uncertain values → `null` or `"UNVERIFIED"`, never a guess.
6. **Vision-mode verification.** Use PDF→image→vision to verify data, especially stats, formulas, and descriptions. pdftotext misses table formatting.

## Directory Structure

```
references/
├── aig-raw/                    # Adventures in Glorantha (AiG) extractions
│   ├── folk-magic-aig.json     # 45 folk magic spells
│   ├── rune-magic-aig.json     # Rune magic from AiG
│   ├── careers.json            # AiG career data
│   ├── cultures.json           # AiG culture data
│   └── ...
├── cults-raw/                  # Per-cult JSON from Notes from Pavis
│   ├── storm/                  # Storm pantheon (Orlanth, Ernalda, etc.)
│   ├── darkness/               # Darkness pantheon (Zorak Zoran, etc.)
│   ├── lunar/                  # Lunar pantheon (Seven Mothers, etc.)
│   ├── praxian/                # Praxian pantheon (Waha, Eiritha, etc.)
│   ├── yelm/                   # Solar pantheon
│   ├── chaos-genertela/        # Chaos cults
│   ├── independent/            # Independent cults
│   └── ...                     # ~15 pantheon directories
├── cults-upstream/             # Original PDF sources (Notes from Pavis)
├── mythras-raw/                # Mythras Core rulebook extractions
│   ├── sorcery.json            # 53 sorcery spells (verified against Core p.166-177)
│   ├── animism.json            # Animism rules
│   ├── mysticism.json          # Mysticism rules
│   ├── careers-detail.json     # Career definitions
│   ├── cultures.json           # Culture definitions
│   └── ...
├── spirits-raw/                # Spirit data
│   ├── monster-island.json     # Spirits from Monster Island
│   └── bird-in-hand.json       # Spirits from Bird in Hand
├── theism-miracles.json        # Per-cult miracle lists with rune tags
├── culture-cult-map.json       # Culture → available cults mapping
└── meta/                       # Extraction validation reports
    ├── aig-extraction-validation-report.md
    ├── aig-page-map.md
    └── mythras-page-map.md
```

## Source Books

| Abbreviation | Full Title | Content Used |
|--------------|-----------|--------------|
| AiG | Adventures in Glorantha | Folk magic, rune magic, cultures, careers |
| Mythras Core | Mythras Core Rules | Sorcery, animism, mysticism, base mechanics |
| NfP | Notes from Pavis (Cult One-Pagers) | 94 cult definitions with skills/miracles |
| MI | Monster Island | Spirit types |
| BiH | Bird in Hand | Spirit types |

## Verification Status

Reference files contain verification metadata:
- `verified: true` — data human-checked against source PDF via vision mode
- `verified: false` — data not yet verified, may contain OCR or LLM errors
- `verified_at` — date of verification
- `verification_notes` — method used (e.g., "Vision-verified against PDF pages 166-177")

Unverified data should be treated as potentially wrong. The Phase 2 sprint found 12/34 sorcery descriptions were hallucinated by the LLM — always verify against the actual book.

## Adding New Data

1. Extract from source PDF using a script in `scripts/`
2. Write to `references/` with page citations
3. Mark `verified: false` until human review
4. Reference the JSON from the HTML data constant
5. Document the extraction in `references/meta/`
