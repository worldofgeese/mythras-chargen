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
│   ├── sorcery.json            # 34 sorcery spells
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

Reference files may contain a `verified: false` field indicating the data has not yet been human-checked against the source PDF. Unverified data should be treated as potentially containing OCR errors.

## Adding New Data

1. Extract from source PDF using a script in `scripts/`
2. Write to `references/` with page citations
3. Mark `verified: false` until human review
4. Reference the JSON from the HTML data constant
5. Document the extraction in `references/meta/`
